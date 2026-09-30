import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount } from "./proRoutes";
import { uploadScanImageToStorage } from "./routes";
import { reservePeerReview, recordPeerMomoPayment, settlePeerReview, refundPeerReview, WalletError, isOperatorTxnId } from "./wallet";
import { teleFieldsSchema } from "@shared/teleexpertise";
import { PEER_TIERS, PEER_OFFER_COUNT, PEER_QUESTION_MIN, type PeerTier } from "@shared/peer";

// ════════════════════════════════════════════════════════════════════════
// Confrères (étape 8, ADDENDUM_confreres_compte_rendu.md) — messagerie entre
// dermatologues : « Cas complexe » (avis payant, dossier anonymisé épinglé) ou
// « Discussion ». Avis simple 3 000 F / 48 h, urgent 5 000 F / 24 h ; 80 % au
// confrère, 20 % à GlowScan ; réservé sur le portefeuille du demandeur, débité
// à la réponse, rendu si le délai est dépassé. Portefeuille insuffisant :
// Mobile Money vérifié par GlowScan. Jamais le nom, le téléphone, l'email ni
// l'adresse du patient : le confrère ne voit que l'instantané anonymisé.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const dermOnly = (req: any, res: any, next: any) => {
  if (req.isSecretary || (req.proAccount?.profile || "derm") !== "derm") return res.status(403).json({ message: "Réservé aux dermatologues." });
  next();
};
const clean = (n?: string | null) => String(n || "").replace(/^dr\.?\s*/i, "").trim();

/** Experts les mieux placés : disponibles, actifs, triés par délai moyen puis nombre d'avis rendus. */
export async function pickExperts(exclude: number[], limit = PEER_OFFER_COUNT): Promise<number[]> {
  const ex = exclude.length ? exclude : [0];
  const r = Rows(await db.execute(sql`
    SELECT p.id,
      (SELECT AVG(EXTRACT(EPOCH FROM (pr.answered_at - pr.created_at)) / 3600) FROM peer_reviews pr WHERE pr.accepted_by = p.id AND pr.answered_at IS NOT NULL) AS resp_h,
      (SELECT COUNT(*) FROM peer_reviews pr WHERE pr.accepted_by = p.id AND pr.answered_at IS NOT NULL) AS n
    FROM pro_accounts p
    WHERE COALESCE(p.profile, 'derm') = 'derm' AND p.peer_available = TRUE
      AND (p.subscription_status = 'active' OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()))
      AND NOT (p.id = ANY(${sql.raw(`ARRAY[${ex.map(Number).join(",")}]::int[]`)}))
    ORDER BY resp_h ASC NULLS LAST, n DESC, p.id ASC
    LIMIT ${limit}`));
  return r.map((x: any) => Number(x.id));
}

/** Cas payé : transmis au confrère choisi, ou proposé aux experts (« premier disponible »). */
export async function dispatchPeerCase(reviewId: number) {
  const c = Rows(await db.execute(sql`SELECT * FROM peer_reviews WHERE id = ${reviewId}`))[0];
  if (!c) return;
  const hours = PEER_TIERS[(c.tier as PeerTier) || "simple"].hours;
  await db.execute(sql`UPDATE peer_reviews SET due_at = NOW() + make_interval(hours => ${hours}) WHERE id = ${reviewId} AND due_at IS NULL`);
  const title = c.tier === "urgent" ? "Avis urgent demandé par un confrère" : "Un confrère demande votre avis";
  const body = String(c.question || "").slice(0, 110);
  if (c.target_account_id) {
    notifyProAccount(Number(c.target_account_id), { title, body, url: "/derm/confreres" }).catch(() => {});
    return;
  }
  const experts = await pickExperts([Number(c.requester_account_id), ...((c.offered_to || []) as number[])]);
  if (!experts.length) return;
  await db.execute(sql`
    UPDATE peer_reviews SET offered_to = COALESCE(offered_to, '{}') || ${sql.raw(`ARRAY[${experts.join(",")}]::int[]`)}, offered_at = NOW()
    WHERE id = ${reviewId}`);
  for (const id of experts) notifyProAccount(id, { title: `${title} (premier disponible)`, body, url: "/derm/confreres" }).catch(() => {});
}

async function threadFor(id: number, me: number) {
  const t = Rows(await db.execute(sql`
    SELECT t.*, pr.offered_to, pr.status AS case_status FROM peer_threads t LEFT JOIN peer_reviews pr ON pr.id = t.case_id WHERE t.id = ${id}`))[0];
  if (!t) return null;
  const offered = Array.isArray(t.offered_to) && t.offered_to.map(Number).includes(me) && t.to_pro == null;
  if (t.from_pro !== me && t.to_pro !== me && !offered) return null;
  return { ...t, offered };
}

async function postMessage(threadId: number, author: number, kind: "text" | "avis" | "system", body: string | null, structured?: any) {
  await db.execute(sql`
    INSERT INTO peer_messages (thread_id, author_pro, kind, body, structured)
    VALUES (${threadId}, ${author}, ${kind}, ${body}, ${structured ? JSON.stringify(structured) : null}::jsonb)`);
  // Non lus : on incrémente le compteur de l'autre côté.
  await db.execute(sql`
    UPDATE peer_threads SET last_message_at = NOW(),
      unread_to = CASE WHEN from_pro = ${author} THEN unread_to + 1 ELSE unread_to END,
      unread_from = CASE WHEN to_pro = ${author} THEN unread_from + 1 ELSE unread_from END
    WHERE id = ${threadId}`);
}

export function registerPeerRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const guard = [requireActivePro, dermOnly];

  // ── Conversations ────────────────────────────────────────────────────
  app.get("/api/peer/threads", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const rows = Rows(await db.execute(sql`
        SELECT t.id, t.kind, t.from_pro, t.to_pro, t.unread_from, t.unread_to, t.last_message_at,
               pr.id AS case_id, pr.status AS case_status, pr.tier, pr.payment_status, pr.offered_to, pr.due_at,
               o.id AS other_id, o.full_name AS other_name, o.city AS other_city, o.country AS other_country, o.specialties AS other_exp,
               (SELECT body FROM peer_messages m WHERE m.thread_id = t.id AND m.kind = 'text' ORDER BY m.created_at DESC LIMIT 1) AS last_text,
               (SELECT kind FROM peer_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_kind
        FROM peer_threads t
        LEFT JOIN peer_reviews pr ON pr.id = t.case_id
        LEFT JOIN pro_accounts o ON o.id = CASE WHEN t.from_pro = ${me} THEN t.to_pro ELSE t.from_pro END
        WHERE t.from_pro = ${me} OR t.to_pro = ${me}
           OR (t.to_pro IS NULL AND ${me} = ANY(COALESCE(pr.offered_to, '{}')) AND pr.status = 'open')
        ORDER BY t.last_message_at DESC LIMIT 100`));
      res.json({
        threads: rows.map((t: any) => ({
          id: t.id, kind: t.kind, mine: t.from_pro === me,
          offered: t.to_pro == null && t.from_pro !== me,
          other: t.other_id ? { id: t.other_id, name: t.other_name, city: t.other_city, country: t.other_country, expertise: t.other_exp || [] } : null,
          caseId: t.case_id, caseStatus: t.case_status, tier: t.tier, paymentStatus: t.payment_status, dueAt: t.due_at,
          unread: t.from_pro === me ? t.unread_from : t.unread_to,
          last: t.last_kind === "avis" ? "Avis structuré reçu" : t.last_text || "",
          at: t.last_message_at,
        })),
      });
    } catch (e) {
      console.error("[peer/threads]", e);
      res.json({ threads: [] });
    }
  });

  app.get("/api/peer/threads/:id", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const t = await threadFor(Number(req.params.id), me);
      if (!t) return res.status(404).json({ message: "Conversation introuvable" });
      let caseData: any = null;
      if (t.case_id) {
        const c = Rows(await db.execute(sql`SELECT * FROM peer_reviews WHERE id = ${t.case_id}`))[0];
        if (c) caseData = {
          id: c.id, ref: `GS-SA-${String(c.id).padStart(4, "0")}`, question: c.question, tier: c.tier, priceFcfa: c.price_fcfa,
          status: c.status, paymentStatus: c.payment_status, dueAt: c.due_at, answeredAt: c.answered_at, createdAt: c.created_at,
          integratedAt: c.integrated_at, snapshot: c.snapshot || null,
          // Le lien vers le dossier du patient n'est visible que du médecin traitant.
          patientId: c.requester_account_id === me ? c.patient_id : null,
        };
      }
      const others = Rows(await db.execute(sql`
        SELECT id, full_name, city, country, specialties, license_number FROM pro_accounts WHERE id = ${t.from_pro === me ? t.to_pro : t.from_pro}`))[0];
      const msgs = Rows(await db.execute(sql`SELECT id, author_pro, kind, body, structured, created_at FROM peer_messages WHERE thread_id = ${t.id} ORDER BY created_at ASC`));
      if (t.from_pro === me) await db.execute(sql`UPDATE peer_threads SET unread_from = 0 WHERE id = ${t.id}`);
      else if (t.to_pro === me) await db.execute(sql`UPDATE peer_threads SET unread_to = 0 WHERE id = ${t.id}`);
      res.json({
        thread: { id: t.id, kind: t.kind, mine: t.from_pro === me, offered: t.offered, canAnswer: t.kind === "case" && t.to_pro === me && caseData?.status === "open" },
        other: others ? { id: others.id, name: others.full_name, city: others.city, country: others.country, expertise: others.specialties || [], onmc: others.license_number || null } : null,
        case: caseData,
        messages: msgs.map((m: any) => ({ id: m.id, mine: m.author_pro === me, kind: m.kind, body: m.body, structured: m.structured, at: m.created_at })),
      });
    } catch (e) {
      console.error("[peer/thread]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/peer/threads/:id/messages", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const body = String(req.body?.body || "").trim().slice(0, 2000);
      if (!body) return res.status(400).json({ message: "Message vide." });
      const t = await threadFor(Number(req.params.id), me);
      if (!t || t.offered) return res.status(404).json({ message: "Conversation introuvable" });
      await postMessage(t.id, me, "text", body);
      const other = t.from_pro === me ? t.to_pro : t.from_pro;
      if (other) notifyProAccount(Number(other), { title: `Message de Dr ${clean(req.proAccount.fullName)}`, body: body.slice(0, 110), url: "/derm/confreres" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[peer/message]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // « Écrire » : discussion libre avec un confrère (une seule par paire).
  app.post("/api/peer/chat", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id, to = Number(req.body?.toPro);
      const body = String(req.body?.body || "").trim().slice(0, 2000);
      const ok = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE id = ${to} AND id <> ${me} AND COALESCE(profile, 'derm') = 'derm'`))[0];
      if (!ok) return res.status(404).json({ message: "Confrère introuvable" });
      let t = Rows(await db.execute(sql`
        SELECT id FROM peer_threads WHERE kind = 'chat' AND ((from_pro = ${me} AND to_pro = ${to}) OR (from_pro = ${to} AND to_pro = ${me})) LIMIT 1`))[0];
      if (!t) t = Rows(await db.execute(sql`INSERT INTO peer_threads (from_pro, to_pro, kind) VALUES (${me}, ${to}, 'chat') RETURNING id`))[0];
      if (body) {
        await postMessage(Number(t.id), me, "text", body);
        notifyProAccount(to, { title: `Message de Dr ${clean(req.proAccount.fullName)}`, body: body.slice(0, 110), url: "/derm/confreres" }).catch(() => {});
      }
      res.json({ threadId: t.id });
    } catch (e) {
      console.error("[peer/chat]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Envoyer un cas complexe (4 étapes) ──────────────────────────────
  app.post("/api/peer/cases", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount;
      const d = z.object({
        patientId: z.number().int(),
        photos: z.array(z.string()).min(1).max(6),           // photos floutées par le médecin (data URL)
        noVisibleFace: z.literal(true),                      // « Aucun visage visible sans flou »
        question: z.string().min(PEER_QUESTION_MIN).max(1000),
        tier: z.enum(["simple", "urgent"]),
        target: z.union([z.number().int(), z.literal("first")]),
        payWith: z.enum(["wallet", "momo"]),
        operatorTxnId: z.string().optional().nullable(),
      }).parse(req.body);

      const p = Rows(await db.execute(sql`SELECT * FROM patients WHERE id = ${d.patientId} AND dermatologist_id = ${me.id}`))[0];
      if (!p) return res.status(404).json({ message: "Dossier introuvable" });
      if (d.target !== "first") {
        const t = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE id = ${d.target} AND id <> ${me.id} AND COALESCE(profile, 'derm') = 'derm'`))[0];
        if (!t) return res.status(404).json({ message: "Confrère introuvable" });
      }
      if (d.payWith === "momo" && !isOperatorTxnId(d.operatorTxnId)) return res.status(400).json({ message: "ID de transaction Mobile Money requis." });

      // Instantané anonymisé : jamais nom, téléphone, email ni adresse.
      const scans = Rows(await db.execute(sql`
        SELECT condition, expert_corrected_condition, score, clinical_context, recommendations, dermato_note, created_at
        FROM scans WHERE patient_id = ${p.id} ORDER BY created_at DESC LIMIT 5`));
      const last = scans[0] || {};
      const exam = last.clinical_context?.examen || {};
      const cr = Rows(await db.execute(sql`SELECT clinical_record FROM patients WHERE id = ${p.id}`))[0]?.clinical_record || {};
      const reco = last.recommendations?._fullResult || last.recommendations || {};
      const treatments = [
        cr.previousProducts ? `Produits déjà utilisés : ${cr.previousProducts}` : null,
        ...scans.slice(0, 3).map((s: any) => `${new Date(s.created_at).toLocaleDateString("fr-FR")} : ${s.expert_corrected_condition || s.condition || "analyse"}${s.score ? ` (score ${s.score})` : ""}`),
      ].filter(Boolean);
      const urls: string[] = [];
      for (const ph of d.photos) { const u = await uploadScanImageToStorage(ph).catch(() => null); if (u) urls.push(u); }
      if (!urls.length) return res.status(400).json({ message: "Photos illisibles. Reprenez-les." });
      const snapshot = {
        sex: p.sex === "F" ? "Femme" : p.sex === "M" ? "Homme" : null,
        age: p.age ?? null,
        phototype: exam.phototype || null,
        photos: urls,
        treatments,
        aiSuggestion: last.condition || reco.condition || null,
        examNotes: [exam.lesions?.length ? `Lésions : ${exam.lesions.join(", ")}` : null, exam.zones?.length ? `Zones : ${exam.zones.join(", ")}` : null, last.dermato_note || null].filter(Boolean).join(" · ") || null,
      };
      const tier = PEER_TIERS[d.tier];
      const ageSex = [snapshot.sex, snapshot.age != null ? `${snapshot.age} ans` : null].filter(Boolean).join(", ");
      const [row] = Rows(await db.execute(sql`
        INSERT INTO peer_reviews (requester_account_id, target_account_id, image_url, condition, age_sex, question, urgency,
          tier, price_fcfa, snapshot, patient_id, payment_status, operator_txn_id, status)
        VALUES (${me.id}, ${d.target === "first" ? null : d.target}, ${urls[0]}, ${snapshot.aiSuggestion}, ${ageSex || null}, ${d.question.trim()},
          ${d.tier === "urgent" ? "urgent" : "normal"}, ${d.tier}, ${tier.priceFcfa}, ${JSON.stringify(snapshot)}::jsonb, ${p.id},
          ${d.payWith === "momo" ? "awaiting_momo" : "none"}, ${d.payWith === "momo" ? d.operatorTxnId!.trim() : null}, 'open')
        RETURNING id`));
      const reviewId = Number(row.id);
      if (d.payWith === "wallet") {
        try { await reservePeerReview(reviewId, me.id, tier.priceFcfa); }
        catch (e: any) {
          await db.execute(sql`DELETE FROM peer_reviews WHERE id = ${reviewId}`);
          if (e instanceof WalletError && e.code === "INSUFFICIENT") return res.status(402).json({ code: "INSUFFICIENT", message: "Solde insuffisant : payez par Mobile Money." });
          throw e;
        }
        await db.execute(sql`UPDATE peer_reviews SET payment_status = 'reserved' WHERE id = ${reviewId}`);
      }
      const [thread] = Rows(await db.execute(sql`
        INSERT INTO peer_threads (from_pro, to_pro, kind, case_id) VALUES (${me.id}, ${d.target === "first" ? null : d.target}, 'case', ${reviewId}) RETURNING id`));
      if (d.payWith === "wallet") await dispatchPeerCase(reviewId);
      res.json({ reviewId, threadId: thread.id, awaitingMomo: d.payWith === "momo" });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Cas incomplet : dossier, photos floutées, question (10 caractères) et confrère." });
      if (String(e?.message || "").includes("peer_reviews_txn_uidx")) return res.status(409).json({ message: "Cet ID de transaction a déjà servi." });
      console.error("[peer/cases]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // « Premier disponible » : le premier expert sollicité qui accepte prend le cas.
  app.post("/api/peer/cases/:id/accept", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id, id = Number(req.params.id);
      const r = Rows(await db.execute(sql`
        UPDATE peer_reviews SET accepted_by = ${me}, target_account_id = ${me}
        WHERE id = ${id} AND target_account_id IS NULL AND status = 'open' AND ${me} = ANY(COALESCE(offered_to, '{}'))
          AND payment_status IN ('reserved', 'paid')
        RETURNING requester_account_id`));
      if (!r.length) return res.status(409).json({ message: "Ce cas a déjà été pris par un confrère." });
      await db.execute(sql`UPDATE peer_threads SET to_pro = ${me} WHERE case_id = ${id}`);
      notifyProAccount(Number(r[0].requester_account_id), { title: "Votre cas a été pris en charge", body: `Dr ${clean(req.proAccount.fullName)} va vous répondre.`, url: "/derm/confreres" }).catch(() => {});
      res.json({ success: true });
    } catch (e) {
      console.error("[peer/accept]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Avis structuré : réponse, diagnostic retenu, à écarter, conduite à tenir.
  app.post("/api/peer/cases/:id/avis", ...guard, async (req: any, res) => {
    try {
      const me = req.proAccount.id, id = Number(req.params.id);
      const a = z.object({
        answer: z.string().min(2).max(600), dx: z.string().min(2).max(400),
        lesson: z.string().trim().max(600).optional().default(""),
      }).merge(teleFieldsSchema).parse(req.body);
      const c = Rows(await db.execute(sql`SELECT * FROM peer_reviews WHERE id = ${id}`))[0];
      if (!c || c.target_account_id !== me) return res.status(404).json({ message: "Cas introuvable" });
      if (c.status !== "open") return res.status(409).json({ message: "Cet avis a déjà été rendu ou le délai est dépassé." });
      const t = Rows(await db.execute(sql`SELECT id FROM peer_threads WHERE case_id = ${id}`))[0];
      const { peer } = await settlePeerReview(id, Number(c.requester_account_id), me);
      await db.execute(sql`UPDATE peer_reviews SET status = 'answered', answered_at = NOW(), accepted_by = ${me} WHERE id = ${id}`);
      if (t) await postMessage(Number(t.id), me, "avis", null, a);
      notifyProAccount(Number(c.requester_account_id), { title: "Avis structuré reçu", body: a.answer.slice(0, 110), url: "/derm/confreres" }).catch(() => {});
      res.json({ success: true, earned: peer });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Avis incomplet : réponse, diagnostic retenu et conduite à tenir." });
      if (e instanceof WalletError) return res.status(409).json({ message: e.message });
      console.error("[peer/avis]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // « Intégrer à mon compte rendu » : l'avis rejoint l'examen du brouillon de compte rendu du patient.
  app.post("/api/peer/cases/:id/integrate", ...guard, async (req: any, res) => {
    try {
      const id = Number(req.params.id), me = req.proAccount.id;
      const c = Rows(await db.execute(sql`
        SELECT pr.id, pr.patient_id, pr.integrated_at, a.full_name, a.license_number FROM peer_reviews pr
        LEFT JOIN pro_accounts a ON a.id = pr.accepted_by
        WHERE pr.id = ${id} AND pr.requester_account_id = ${me} AND pr.status = 'answered'`))[0];
      if (!c) return res.status(404).json({ message: "Avis introuvable" });
      const avis = Rows(await db.execute(sql`
        SELECT m.structured FROM peer_messages m JOIN peer_threads t ON t.id = m.thread_id
        WHERE t.case_id = ${id} AND m.kind = 'avis' ORDER BY m.created_at DESC LIMIT 1`))[0]?.structured || {};
      let reportId: number | null = null;
      if (c.patient_id && !c.integrated_at) {
        const { appendToVisitDraft } = await import("./reportRoutes");
        const who = `Dr ${clean(c.full_name)}${c.license_number ? ` (ONMC ${c.license_number})` : ""}`;
        const text = [
          `Avis de télé-expertise de ${who}, cas GS-SA-${String(id).padStart(4, "0")} : ${avis.answer || ""}`,
          avis.dx ? `Diagnostic retenu : ${avis.dx}.` : "",
          avis.ddx ? `À écarter : ${avis.ddx}.` : "",
          avis.plan ? `Conduite à tenir : ${String(avis.plan).replace(/\n+/g, " ; ")}.` : "",
          avis.orientation ? `Orientation : ${avis.orientation}.` : "",
          avis.reviewIn ? `Revoir : ${avis.reviewIn}.` : "",
        ].filter(Boolean).join(" ");
        reportId = await appendToVisitDraft(me, Number(c.patient_id), text);
      }
      await db.execute(sql`UPDATE peer_reviews SET integrated_at = COALESCE(integrated_at, NOW()) WHERE id = ${id}`);
      res.json({ success: true, reportId });
    } catch (e) {
      console.error("[peer/integrate]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Annuaire du réseau ───────────────────────────────────────────────
  app.get("/api/peer/directory", ...guard, async (req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT p.id, p.full_name, p.city, p.country, p.specialties, p.peer_available,
          (SELECT COUNT(*)::int FROM peer_reviews pr WHERE pr.accepted_by = p.id AND pr.answered_at IS NOT NULL) AS cases,
          (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.answered_at - pr.created_at)) / 3600))::int FROM peer_reviews pr WHERE pr.accepted_by = p.id AND pr.answered_at IS NOT NULL) AS resp_h
        FROM pro_accounts p
        WHERE p.id <> ${req.proAccount.id} AND COALESCE(p.profile, 'derm') = 'derm'
          AND (p.subscription_status = 'active' OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()))
        ORDER BY p.peer_available DESC, cases DESC, p.full_name LIMIT 300`));
      res.json({
        peers: rows.map((r: any) => ({
          id: r.id, name: r.full_name, city: r.city, country: r.country, expertise: r.specialties || [],
          available: r.peer_available !== false, cases: Number(r.cases) || 0, respHours: r.resp_h == null ? null : Number(r.resp_h),
        })),
      });
    } catch (e) {
      console.error("[peer/directory]", e);
      res.json({ peers: [] });
    }
  });

  // ── Admin : paiements Mobile Money des avis confrères ────────────────
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));
  app.get("/api/admin/peer-momo", admin, async (_req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT pr.id, pr.tier, pr.price_fcfa, pr.operator_txn_id, pr.payment_status, pr.created_at, a.full_name AS requester
        FROM peer_reviews pr JOIN pro_accounts a ON a.id = pr.requester_account_id
        WHERE pr.payment_status IN ('awaiting_momo', 'refund_due') ORDER BY pr.created_at DESC LIMIT 100`));
      res.json({ items: rows });
    } catch { res.json({ items: [] }); }
  });
  app.post("/api/admin/peer-momo/:id/confirm", admin, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const c = Rows(await db.execute(sql`SELECT payment_status FROM peer_reviews WHERE id = ${id}`))[0];
      if (c?.payment_status !== "awaiting_momo") return res.status(409).json({ message: "Cet avis n'attend pas de paiement." });
      try { await recordPeerMomoPayment(id, String(req.body?.operatorRef || "")); }
      catch (e: any) { if (e instanceof WalletError) return res.status(e.code === "TXN_ALREADY_USED" ? 409 : 400).json({ message: e.message }); throw e; }
      await db.execute(sql`UPDATE peer_reviews SET payment_status = 'paid', operator_txn_id = ${String(req.body.operatorRef).trim()} WHERE id = ${id}`);
      await dispatchPeerCase(id);
      res.json({ success: true });
    } catch (e) {
      console.error("[admin/peer-momo/confirm]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
  app.post("/api/admin/peer-momo/:id/refunded", admin, async (req: any, res) => {
    const ref = String(req.body?.operatorRef || "").trim();
    if (!isOperatorTxnId(ref)) return res.status(400).json({ message: "ID de transaction du remboursement requis" });
    const r = Rows(await db.execute(sql`
      UPDATE peer_reviews SET payment_status = 'refunded' WHERE id = ${Number(req.params.id)} AND payment_status = 'refund_due' RETURNING id`));
    if (!r.length) return res.status(409).json({ message: "Cet avis n'attend pas de remboursement." });
    res.json({ success: true });
  });
}

// ── Cron : délais et « premier disponible » ────────────────────────────
export async function runPeerDeadlines(): Promise<{ reoffered: number; expired: number }> {
  let reoffered = 0, expired = 0;
  // Premier disponible sans preneur depuis 60 min : experts suivants.
  const stale = Rows(await db.execute(sql`
    SELECT id FROM peer_reviews WHERE status = 'open' AND target_account_id IS NULL
      AND payment_status IN ('reserved', 'paid') AND offered_at < NOW() - INTERVAL '60 minutes'`));
  for (const s of stale) { await dispatchPeerCase(Number(s.id)); reoffered++; }
  // Rappel au confrère avant l'échéance (6 h avant, 3 h pour un urgent).
  const soon = Rows(await db.execute(sql`
    SELECT id, target_account_id, tier FROM peer_reviews
    WHERE status = 'open' AND target_account_id IS NOT NULL AND alert_sent_at IS NULL AND due_at IS NOT NULL
      AND NOW() > due_at - (CASE WHEN tier = 'urgent' THEN INTERVAL '3 hours' ELSE INTERVAL '6 hours' END) AND NOW() < due_at`));
  for (const s of soon) {
    notifyProAccount(Number(s.target_account_id), { title: "Avis confrère à rendre bientôt", body: "Le délai de réponse approche.", url: "/derm/confreres" }).catch(() => {});
    await db.execute(sql`UPDATE peer_reviews SET alert_sent_at = NOW() WHERE id = ${s.id}`);
  }
  // Délai dépassé : réservation rendue (ou Mobile Money à rembourser par GlowScan).
  const late = Rows(await db.execute(sql`
    SELECT id, requester_account_id, target_account_id, payment_status FROM peer_reviews
    WHERE status = 'open' AND due_at IS NOT NULL AND due_at < NOW() AND payment_status IN ('reserved', 'paid')`));
  for (const c of late) {
    const claimed = Rows(await db.execute(sql`UPDATE peer_reviews SET status = 'expired' WHERE id = ${c.id} AND status = 'open' RETURNING id`));
    if (!claimed.length) continue;
    await refundPeerReview(Number(c.id), Number(c.requester_account_id));
    await db.execute(sql`UPDATE peer_reviews SET payment_status = ${c.payment_status === "paid" ? "refund_due" : "refunded"} WHERE id = ${c.id}`);
    notifyProAccount(Number(c.requester_account_id), { title: "Avis confrère non rendu dans le délai", body: c.payment_status === "paid" ? "GlowScan vous rembourse sur Mobile Money." : "Le montant a été rendu à votre portefeuille.", url: "/derm/confreres" }).catch(() => {});
    if (c.target_account_id) notifyProAccount(Number(c.target_account_id), { title: "Délai dépassé sur un avis confrère", body: "Le cas a été annulé et le demandeur remboursé.", url: "/derm/confreres" }).catch(() => {});
    expired++;
  }
  return { reoffered, expired };
}
