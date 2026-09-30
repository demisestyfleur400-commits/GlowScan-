import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount } from "./proRoutes";
import { uploadScanImageToStorage } from "./routes";
import { recordRelayPayment, releaseRelayCase, WalletError } from "./wallet";
import { RELAY_TIERS, RELAY_DISEASES, isAutonomous, relayLevelOf, AUTONOMY_CONTROL_RATE, diseaseLabel, LESSON_TIPS } from "@shared/relay";
import { splitRelay } from "@shared/splits";

// ════════════════════════════════════════════════════════════════════════
// Réseau des relais — téléexpertise et formation (étape 5, README §4 points 7-9).
//
//  Relais : choisit son dermatologue référent, envoie un cas (photos + contexte)
//  en proposant SON diagnostic d'abord ; l'IA n'est rattachée qu'après (le
//  serveur refuse l'IA tant que l'hypothèse n'est pas enregistrée). Paiement par
//  la patiente au CSI (Mobile Money, ID vérifié par l'admin) ou par un programme.
//  Référent : file « À valider », verdict (confirmé / corrigé + la leçon),
//  promotion au niveau Formateur. Progression par maladie : autonome à ≥ 85 %
//  d'accord sur ≥ 20 cas ; même autonome, un cas sur cinq reste contrôlé.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const DISEASE_CODES = new Set(RELAY_DISEASES.map((d) => d.code));

function requireProfile(profile: "relay" | "derm") {
  return (req: any, res: any, next: any) => {
    const p = req.proAccount?.profile || "derm";
    if (req.isSecretary || p !== profile) {
      return res.status(403).json({ message: profile === "relay" ? "Réservé aux relais." : "Réservé au dermatologue référent." });
    }
    next();
  };
}

async function relaySummary(relayId: number) {
  const acc = Rows(await db.execute(sql`SELECT relay_level, city FROM pro_accounts WHERE id = ${relayId}`))[0] || {};
  const progress = Rows(await db.execute(sql`
    SELECT disease_code, cases, agreements, autonomous_at FROM relay_progress WHERE relay_id = ${relayId} ORDER BY cases DESC`));
  const validated = progress.reduce((s: number, p: any) => s + Number(p.cases || 0), 0);
  const autonomous = progress.filter((p: any) => p.autonomous_at).length;
  const level = relayLevelOf({ promoted: Number(acc.relay_level) || 0, validatedCases: validated, autonomousDiseases: autonomous });
  return {
    level,
    validatedCases: validated,
    progress: progress.map((p: any) => ({
      code: p.disease_code, label: diseaseLabel(p.disease_code),
      cases: Number(p.cases), agreements: Number(p.agreements),
      accuracy: Number(p.cases) ? Math.round((Number(p.agreements) / Number(p.cases)) * 100) : null,
      autonomous: !!p.autonomous_at,
    })),
  };
}

export function registerRelayRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const relayOnly = [requireActivePro, requireProfile("relay")];
  const dermOnly = [requireActivePro, requireProfile("derm")];

  // ── Relais : son espace ───────────────────────────────────────────────
  app.get("/api/relay/me", ...relayOnly, async (req: any, res) => {
    try {
      const me = req.proAccount;
      const link = Rows(await db.execute(sql`
        SELECT l.derm_id, p.full_name, p.city, p.cabinet_name FROM relay_links l
        JOIN pro_accounts p ON p.id = l.derm_id WHERE l.relay_id = ${me.id}`))[0] || null;
      const programs = Rows(await db.execute(sql`
        SELECT g.id, g.name FROM program_members m JOIN programs g ON g.id = m.program_id WHERE m.relay_id = ${me.id}`));
      res.json({
        ...(await relaySummary(me.id)),
        referent: link ? { id: link.derm_id, fullName: link.full_name, city: link.city, cabinetName: link.cabinet_name } : null,
        programs,
        center: me.cabinetName || null,
        city: me.city || null,
      });
    } catch (e) {
      console.error("[relay/me]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Dermatologues du réseau que le relais peut choisir comme référent.
  app.get("/api/relay/referents", ...relayOnly, async (_req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT id, full_name, city, cabinet_name FROM pro_accounts
        WHERE COALESCE(profile, 'derm') = 'derm'
          AND (subscription_status = 'active' OR (subscription_status = 'trial' AND trial_ends_at > NOW()))
        ORDER BY city NULLS LAST, full_name LIMIT 200`));
      res.json({ referents: rows.map((r: any) => ({ id: r.id, fullName: r.full_name, city: r.city, cabinetName: r.cabinet_name })) });
    } catch { res.json({ referents: [] }); }
  });

  app.post("/api/relay/referent", ...relayOnly, async (req: any, res) => {
    try {
      const dermId = Number(req.body?.dermId);
      const ok = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE id = ${dermId} AND COALESCE(profile, 'derm') = 'derm'`))[0];
      if (!ok) return res.status(404).json({ message: "Dermatologue introuvable" });
      await db.execute(sql`
        INSERT INTO relay_links (relay_id, derm_id) VALUES (${req.proAccount.id}, ${dermId})
        ON CONFLICT (relay_id) DO UPDATE SET derm_id = EXCLUDED.derm_id, created_at = NOW()`);
      notifyProAccount(dermId, { title: "Un relais vous a choisi comme référent", body: `${req.proAccount.fullName} vous enverra ses cas.`, url: "/derm/reseau" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[relay/referent]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Nouveau cas : l'hypothèse du relais est OBLIGATOIRE et enregistrée avant l'IA.
  app.post("/api/relay/cases", ...relayOnly, async (req: any, res) => {
    try {
      const data = z.object({
        centerName: z.string().max(120).optional().nullable(),
        patientAge: z.number().int().min(0).max(120).optional().nullable(),
        patientSex: z.enum(["F", "M"]).optional().nullable(),
        zone: z.string().max(80).optional().nullable(),
        symptoms: z.string().max(1500).optional().nullable(),
        photos: z.array(z.string()).min(1).max(3),
        relayDiagnosis: z.string().min(2).max(200),
        relayDiseaseCode: z.string().max(40).optional().nullable(),
        tier: z.enum(["simple", "urgent"]),
        payer: z.enum(["patient", "program"]),
        programId: z.number().int().optional().nullable(),
      }).parse(req.body);
      const me = req.proAccount;
      const link = Rows(await db.execute(sql`SELECT derm_id FROM relay_links WHERE relay_id = ${me.id}`))[0];
      if (!link) return res.status(409).json({ code: "NO_REFERENT", message: "Choisissez d'abord votre dermatologue référent." });
      const code = data.relayDiseaseCode && DISEASE_CODES.has(data.relayDiseaseCode) ? data.relayDiseaseCode : "autre";

      let programId: number | null = null;
      if (data.payer === "program") {
        const m = Rows(await db.execute(sql`
          SELECT program_id FROM program_members WHERE relay_id = ${me.id} ${data.programId ? sql`AND program_id = ${data.programId}` : sql``} LIMIT 1`))[0];
        if (!m) return res.status(403).json({ message: "Vous n'êtes rattaché à aucun programme." });
        programId = Number(m.program_id);
      }

      // Autonome sur cette maladie : le relais traite seul, sauf 1 cas sur 5 contrôlé.
      const prog = Rows(await db.execute(sql`SELECT cases, agreements FROM relay_progress WHERE relay_id = ${me.id} AND disease_code = ${code}`))[0];
      const autonomousCase = code !== "autre" && prog && isAutonomous(Number(prog.cases), Number(prog.agreements)) && Math.random() >= AUTONOMY_CONTROL_RATE;

      const urls: string[] = [];
      for (const p of data.photos) { const u = await uploadScanImageToStorage(p).catch(() => null); if (u) urls.push(u); }
      if (!urls.length) return res.status(400).json({ message: "Photo illisible. Reprenez-la." });

      const tier = RELAY_TIERS[data.tier];
      // Cas « programme » (gratuit pour la patiente) : bloqué tant que GlowScan ne l'a pas activé.
      const status = autonomousCase ? "autonomous" : "awaiting_payment";
      const [row] = Rows(await db.execute(sql`
        INSERT INTO relay_cases (relay_id, derm_id, center_name, patient_age, patient_sex, zone, symptoms, photos,
          relay_diagnosis, relay_disease_code, tier, price_fcfa, payer, program_id, status, payment_status, due_at)
        VALUES (${me.id}, ${Number(link.derm_id)}, ${data.centerName || me.cabinetName || null}, ${data.patientAge ?? null}, ${data.patientSex ?? null},
          ${data.zone || null}, ${data.symptoms || null}, ${JSON.stringify(urls)}::jsonb,
          ${data.relayDiagnosis.trim()}, ${code}, ${data.tier}, ${autonomousCase ? 0 : tier.priceFcfa},
          ${autonomousCase ? "none" : data.payer}, ${programId}, ${status},
          ${autonomousCase ? "pending" : data.payer === "program" ? "program_pending" : "pending"},
          NULL)
        RETURNING id, status, price_fcfa`));
      // Le délai de réponse démarre à la vérification du paiement ou à l'activation du cas programme.
      res.json({ case: { id: row.id, status: row.status, priceFcfa: Number(row.price_fcfa) } });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Cas incomplet : photo et hypothèse obligatoires." });
      console.error("[relay/cases] create", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Rattache l'analyse IA (lancée APRÈS l'hypothèse) au cas du relais.
  app.post("/api/relay/cases/:id/ai", ...relayOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id), scanId = Number(req.body?.scanId);
      const c = Rows(await db.execute(sql`SELECT id, relay_diagnosis, ai_scan_id FROM relay_cases WHERE id = ${id} AND relay_id = ${req.proAccount.id}`))[0];
      if (!c) return res.status(404).json({ message: "Cas introuvable" });
      if (!c.relay_diagnosis) return res.status(409).json({ message: "Votre hypothèse d'abord." });
      const s = Rows(await db.execute(sql`SELECT id, condition, recommendations FROM scans WHERE id = ${scanId} AND user_id = ${req.proAccount.userId}`))[0];
      if (!s) return res.status(404).json({ message: "Analyse introuvable" });
      const full = (s.recommendations && (s.recommendations._fullResult || s.recommendations)) || {};
      const confidence = String(full.confidence || full.confiance || "") || null;
      await db.execute(sql`UPDATE relay_cases SET ai_scan_id = ${scanId}, ai_diagnosis = ${s.condition || null}, ai_confidence = ${confidence} WHERE id = ${id}`);
      res.json({ aiDiagnosis: s.condition || null, aiConfidence: confidence });
    } catch (e) {
      console.error("[relay/cases/ai]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // La patiente a payé le CSI : le relais saisit l'ID de transaction, l'admin le vérifie.
  app.post("/api/relay/cases/:id/payment", ...relayOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const txn = String(req.body?.operatorTxnId || "").trim();
      if (!/^[A-Za-z0-9._-]{6,60}$/.test(txn)) return res.status(400).json({ message: "ID de transaction invalide (au moins 6 caractères)." });
      const r = Rows(await db.execute(sql`
        UPDATE relay_cases SET operator_txn_id = ${txn}
        WHERE id = ${id} AND relay_id = ${req.proAccount.id} AND status = 'awaiting_payment' AND payment_status = 'pending'
        RETURNING id`));
      if (!r.length) return res.status(409).json({ message: "Ce cas n'attend pas de paiement." });
      res.json({ success: true });
    } catch (e: any) {
      if (String(e?.message || "").includes("relay_cases_txn_uidx")) return res.status(409).json({ message: "Cet ID de transaction a déjà servi." });
      console.error("[relay/cases/payment]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/relay/cases", ...relayOnly, async (req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT c.*, p.full_name AS derm_name FROM relay_cases c LEFT JOIN pro_accounts p ON p.id = c.derm_id
        WHERE c.relay_id = ${req.proAccount.id} ORDER BY c.created_at DESC LIMIT 100`));
      res.json({ cases: rows });
    } catch { res.json({ cases: [] }); }
  });

  // ── Dermatologue référent ─────────────────────────────────────────────
  app.get("/api/relay/review-queue", ...dermOnly, async (req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT c.*, p.full_name AS relay_name, p.city AS relay_city FROM relay_cases c
        JOIN pro_accounts p ON p.id = c.relay_id
        WHERE c.derm_id = ${req.proAccount.id} AND c.status = 'awaiting_review'
        ORDER BY (c.tier = 'urgent') DESC, c.due_at ASC NULLS LAST LIMIT 100`));
      res.json({ cases: rows });
    } catch { res.json({ cases: [] }); }
  });

  app.get("/api/relay/my-relays", ...dermOnly, async (req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT p.id, p.full_name, p.city, p.cabinet_name, p.relay_level FROM relay_links l
        JOIN pro_accounts p ON p.id = l.relay_id WHERE l.derm_id = ${req.proAccount.id} ORDER BY p.full_name`));
      const relays = [];
      for (const r of rows) {
        const sum = await relaySummary(Number(r.id));
        const tot = sum.progress.reduce((s, p) => s + p.cases, 0);
        const agr = sum.progress.reduce((s, p) => s + p.agreements, 0);
        relays.push({
          id: r.id, fullName: r.full_name, city: r.city, center: r.cabinet_name, level: sum.level,
          accuracy: tot ? Math.round((agr / tot) * 100) : null, cases: tot,
          canPromote: sum.level === 2,
        });
      }
      const atlas = Rows(await db.execute(sql`
        SELECT COUNT(*)::int AS network, COUNT(*) FILTER (WHERE derm_id = ${req.proAccount.id})::int AS mine
        FROM relay_cases WHERE status = 'answered'`))[0] || { network: 0, mine: 0 };
      res.json({ relays, atlas: { network: Number(atlas.network) || 0, mine: Number(atlas.mine) || 0 } });
    } catch (e) {
      console.error("[relay/my-relays]", e);
      res.json({ relays: [], atlas: { network: 0, mine: 0 } });
    }
  });

  // Verdict : « Relais a raison » (confirm) ou « Corriger » (+ la leçon).
  app.post("/api/relay/cases/:id/verdict", ...dermOnly, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const data = z.object({
        verdict: z.enum(["confirm", "correct"]),
        dermDiagnosis: z.string().max(200).optional().nullable(),
        dermDiseaseCode: z.string().max(40).optional().nullable(),
        note: z.string().max(1500).optional().nullable(),
        tip: z.string().max(40).optional().nullable(),
      }).parse(req.body);
      const c = Rows(await db.execute(sql`
        SELECT * FROM relay_cases WHERE id = ${id} AND derm_id = ${req.proAccount.id} AND status = 'awaiting_review'`))[0];
      if (!c) return res.status(404).json({ message: "Cas introuvable ou déjà traité." });
      if (data.verdict === "correct" && !(data.dermDiagnosis || "").trim()) return res.status(400).json({ message: "Indiquez le bon diagnostic." });
      const finalCode = data.verdict === "confirm"
        ? c.relay_disease_code
        : (data.dermDiseaseCode && DISEASE_CODES.has(data.dermDiseaseCode) ? data.dermDiseaseCode : "autre");
      const tip = data.tip && (LESSON_TIPS as readonly string[]).includes(data.tip) ? data.tip : null;

      await db.execute(sql`
        UPDATE relay_cases SET status = 'answered', derm_verdict = ${data.verdict},
          derm_diagnosis = ${data.verdict === "confirm" ? c.relay_diagnosis : data.dermDiagnosis!.trim()},
          derm_disease_code = ${finalCode}, derm_note = ${(data.note || "").trim() || null}, lesson_tip = ${tip}, answered_at = NOW()
        WHERE id = ${id}`);

      // Formation : on compte le cas sur la maladie RETENUE par le dermatologue.
      if (finalCode && finalCode !== "autre") {
        const agree = data.verdict === "confirm" ? 1 : 0;
        const p = Rows(await db.execute(sql`
          INSERT INTO relay_progress (relay_id, disease_code, cases, agreements) VALUES (${c.relay_id}, ${finalCode}, 1, ${agree})
          ON CONFLICT (relay_id, disease_code) DO UPDATE SET cases = relay_progress.cases + 1,
            agreements = relay_progress.agreements + ${agree}, updated_at = NOW()
          RETURNING cases, agreements, autonomous_at`))[0];
        if (p && !p.autonomous_at && isAutonomous(Number(p.cases), Number(p.agreements))) {
          await db.execute(sql`UPDATE relay_progress SET autonomous_at = NOW() WHERE relay_id = ${c.relay_id} AND disease_code = ${finalCode}`);
          notifyProAccount(Number(c.relay_id), { title: `Autonome sur ${diseaseLabel(finalCode)}`, body: "Vous traitez désormais seul cette affection. Un cas sur cinq reste contrôlé.", url: "/derm/relais" }).catch(() => {});
        }
      }
      if (c.payment_status === "verified") await releaseRelayCase(id);
      notifyProAccount(Number(c.relay_id), {
        title: data.verdict === "confirm" ? "Le dermatologue confirme votre diagnostic" : "Le dermatologue a corrigé votre diagnostic",
        body: (data.note || "").trim().slice(0, 120) || (data.verdict === "confirm" ? c.relay_diagnosis : data.dermDiagnosis!.trim()),
        url: "/derm/relais",
      }).catch(() => {});
      const share = c.payment_status === "verified" ? splitRelay(Number(c.price_fcfa) || 0).derm : 0;
      res.json({ success: true, dermShare: share });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Verdict invalide." });
      console.error("[relay/verdict]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Promotion au niveau Formateur (seulement depuis « Relais autonome »).
  app.post("/api/relay/relays/:id/promote", ...dermOnly, async (req: any, res) => {
    try {
      const relayId = Number(req.params.id);
      const link = Rows(await db.execute(sql`SELECT 1 FROM relay_links WHERE relay_id = ${relayId} AND derm_id = ${req.proAccount.id}`))[0];
      if (!link) return res.status(404).json({ message: "Relais introuvable" });
      const sum = await relaySummary(relayId);
      if (sum.level !== 2) return res.status(409).json({ message: "Le relais doit d'abord être autonome sur une affection." });
      await db.execute(sql`UPDATE pro_accounts SET relay_level = 3 WHERE id = ${relayId}`);
      notifyProAccount(relayId, { title: "Vous êtes Formateur", body: "Vous pouvez désormais former les nouveaux relais de votre région.", url: "/derm/relais" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[relay/promote]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Admin : vérification des paiements Mobile Money des cas relais ─────
  app.get("/api/admin/relay-cases", async (req: any, res) => {
    if (!deps.checkAdmin(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const rows = Rows(await db.execute(sql`
        SELECT c.id, c.tier, c.price_fcfa, c.operator_txn_id, c.status, c.payment_status, c.created_at, c.due_at,
               r.full_name AS relay_name, d.full_name AS derm_name
        FROM relay_cases c JOIN pro_accounts r ON r.id = c.relay_id LEFT JOIN pro_accounts d ON d.id = c.derm_id
        WHERE c.status IN ('awaiting_payment', 'refund_due') ORDER BY c.created_at DESC LIMIT 200`));
      res.json({ cases: rows });
    } catch { res.json({ cases: [] }); }
  });

  app.post("/api/admin/relay-cases/:id/confirm", async (req: any, res) => {
    if (!deps.checkAdmin(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const id = Number(req.params.id);
      const c = Rows(await db.execute(sql`SELECT id, tier, derm_id, relay_id, relay_diagnosis, status FROM relay_cases WHERE id = ${id}`))[0];
      if (!c || c.status !== "awaiting_payment") return res.status(409).json({ message: "Ce cas n'attend pas de paiement." });
      const ps = Rows(await db.execute(sql`SELECT payment_status FROM relay_cases WHERE id = ${id}`))[0];
      if (ps?.payment_status !== "pending") return res.status(409).json({ message: "Cas payé par un programme : utilisez « Activer »." });
      // L'admin a comparé l'ID saisi par le relais à son relevé : ID opérateur obligatoire, unique.
      try { await recordRelayPayment(id, String(req.body?.operatorRef || "")); }
      catch (e: any) {
        if (e instanceof WalletError) return res.status(e.code === "TXN_ALREADY_USED" ? 409 : 400).json({ message: e.message });
        throw e;
      }
      const hours = RELAY_TIERS[c.tier as "simple" | "urgent"]?.hours || 24;
      await db.execute(sql`
        UPDATE relay_cases SET payment_status = 'verified', paid_at = NOW(), status = 'awaiting_review',
          operator_txn_id = ${String(req.body?.operatorRef).trim()}, due_at = NOW() + make_interval(hours => ${hours})
        WHERE id = ${id}`);
      notifyProAccount(Number(c.derm_id), {
        title: c.tier === "urgent" ? "Avis urgent demandé (2 h)" : "Nouvel avis relais",
        body: String(c.relay_diagnosis || "Cas à valider"), url: "/derm/reseau",
      }).catch(() => {});
      notifyProAccount(Number(c.relay_id), { title: "Paiement vérifié", body: "Votre cas est transmis au dermatologue.", url: "/derm/relais" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[admin/relay-cases/confirm]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Cas payé par un programme (ONG) : activé par GlowScan avant d'aller au dermatologue.
  app.post("/api/admin/relay-cases/:id/approve-program", async (req: any, res) => {
    if (!deps.checkAdmin(req)) return res.status(403).json({ message: "Accès refusé" });
    try {
      const id = Number(req.params.id);
      const c = Rows(await db.execute(sql`SELECT id, tier, derm_id, relay_id, relay_diagnosis FROM relay_cases WHERE id = ${id} AND status = 'awaiting_payment' AND payment_status = 'program_pending'`))[0];
      if (!c) return res.status(409).json({ message: "Ce cas n'attend pas d'activation." });
      const hours = RELAY_TIERS[c.tier as "simple" | "urgent"]?.hours || 24;
      await db.execute(sql`
        UPDATE relay_cases SET status = 'awaiting_review', payment_status = 'program', due_at = NOW() + make_interval(hours => ${hours})
        WHERE id = ${id}`);
      notifyProAccount(Number(c.derm_id), {
        title: c.tier === "urgent" ? "Avis urgent demandé (2 h)" : "Nouvel avis relais",
        body: String(c.relay_diagnosis || "Cas à valider"), url: "/derm/reseau",
      }).catch(() => {});
      notifyProAccount(Number(c.relay_id), { title: "Cas activé", body: "Votre cas est transmis au dermatologue.", url: "/derm/relais" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[admin/relay-cases/approve-program]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/relay-cases/:id/refunded", async (req: any, res) => {
    if (!deps.checkAdmin(req)) return res.status(403).json({ message: "Accès refusé" });
    const ref = String(req.body?.operatorRef || "").trim();
    if (!/^[A-Za-z0-9._-]{6,60}$/.test(ref)) return res.status(400).json({ message: "ID de transaction du remboursement requis" });
    const r = Rows(await db.execute(sql`
      UPDATE relay_cases SET status = 'refunded', payment_status = 'refunded', refunded_at = NOW(), refund_operator_ref = ${ref}
      WHERE id = ${Number(req.params.id)} AND status = 'refund_due' RETURNING id`));
    if (!r.length) return res.status(409).json({ message: "Ce cas n'attend pas de remboursement." });
    res.json({ success: true });
  });
}
