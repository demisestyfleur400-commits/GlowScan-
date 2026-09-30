import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro } from "./proRoutes";
import { sendEmail } from "./email";
import { relayLevelOf, diseaseLabel } from "@shared/relay";

// ════════════════════════════════════════════════════════════════════════
// Pilotage des programmes (étape 6, README §4 point 10) + vue fondateur (§4.11).
//
//  • Compte ONG (profile = ngo) : tableau de bord ANONYMISÉ de son programme.
//    Aucun nom, téléphone ni photo de patient ; tout effectif < 5 est masqué.
//    Seuls les agents qui l'acceptent apparaissent avec leur progression.
//  • GlowScan (admin) : crée les programmes, rattache relais et comptes ONG,
//    active les cas (cf. relayRoutes), relit puis envoie le rapport mensuel.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
export const MASK_MIN = 5;
const mask = (n: number) => (n > 0 && n < MASK_MIN ? null : n); // null → affiché « < 5 »

function sinceOf(range: string): Date | null {
  if (range === "1m") return new Date(Date.now() - 30 * 86400000);
  if (range === "3m") return new Date(Date.now() - 91 * 86400000);
  return null; // depuis le début
}

/** Tableau de bord d'un programme sur une période (valeurs réelles, anonymisées). */
export async function programDashboard(programId: number, range: string) {
  const since = sinceOf(range);
  const p = Rows(await db.execute(sql`SELECT id, name, funder, district, budget_fcfa, status FROM programs WHERE id = ${programId}`))[0];
  if (!p) return null;
  const inRange = since ? sql`AND c.created_at >= ${since.toISOString()}` : sql``;
  const members = sql`SELECT relay_id FROM program_members WHERE program_id = ${programId}`;

  const k = Rows(await db.execute(sql`
    SELECT COUNT(*) FILTER (WHERE c.status = 'answered')::int AS validated,
           ROUND(AVG(EXTRACT(EPOCH FROM (c.answered_at - c.paid_at)) / 3600) FILTER (WHERE c.status = 'answered' AND c.paid_at IS NOT NULL))::int AS delay_h,
           COUNT(*) FILTER (WHERE c.lesson_tip = 'Orienter en urgence')::int AS urgent
    FROM relay_cases c WHERE c.relay_id IN (${members}) ${inRange}`))[0] || {};

  const districts = Rows(await db.execute(sql`
    SELECT COALESCE(NULLIF(r.city, ''), 'Non précisé') AS name, COUNT(*)::int AS cases,
           ROUND(AVG(EXTRACT(EPOCH FROM (c.answered_at - c.paid_at)) / 3600) FILTER (WHERE c.paid_at IS NOT NULL))::int AS delay_h,
           MODE() WITHIN GROUP (ORDER BY c.derm_disease_code) AS top
    FROM relay_cases c JOIN pro_accounts r ON r.id = c.relay_id
    WHERE c.relay_id IN (${members}) AND c.status = 'answered' ${inRange}
    GROUP BY 1 ORDER BY 2 DESC`));

  const diseases = Rows(await db.execute(sql`
    SELECT c.derm_disease_code AS code, COUNT(*)::int AS n FROM relay_cases c
    WHERE c.relay_id IN (${members}) AND c.status = 'answered' AND c.derm_disease_code IS NOT NULL ${inRange}
    GROUP BY 1 ORDER BY 2 DESC`));

  // Courbe mensuelle de l'accord relais ↔ dermatologue (12 derniers mois).
  const agreement = Rows(await db.execute(sql`
    SELECT to_char(date_trunc('month', c.answered_at), 'YYYY-MM') AS month, COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE c.derm_verdict = 'confirm')::int AS ok
    FROM relay_cases c WHERE c.relay_id IN (${members}) AND c.status = 'answered'
      AND c.answered_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
    GROUP BY 1 ORDER BY 1`));

  // Agents : progression visible seulement si le relais l'accepte.
  const agentRows = Rows(await db.execute(sql`
    SELECT m.relay_id, m.share_progress, r.full_name, r.city, r.relay_level,
           COALESCE(SUM(g.cases), 0)::int AS cases, COALESCE(SUM(g.agreements), 0)::int AS agreements,
           COUNT(g.autonomous_at)::int AS autonomous
    FROM program_members m JOIN pro_accounts r ON r.id = m.relay_id
    LEFT JOIN relay_progress g ON g.relay_id = m.relay_id
    WHERE m.program_id = ${programId}
    GROUP BY m.relay_id, m.share_progress, r.full_name, r.city, r.relay_level ORDER BY r.full_name`));
  const agents = agentRows.map((a: any) => {
    const level = relayLevelOf({ promoted: Number(a.relay_level) || 0, validatedCases: Number(a.cases), autonomousDiseases: Number(a.autonomous) });
    return a.share_progress
      ? { shared: true, name: a.full_name, city: a.city, level, accuracy: a.cases ? Math.round((a.agreements / a.cases) * 100) : null, cases: Number(a.cases) }
      : { shared: false, name: null, city: a.city, level: null, accuracy: null, cases: null };
  });
  const autonomousAgents = agentRows.filter((a: any) => Number(a.autonomous) > 0).length;

  const used = Number(Rows(await db.execute(sql`
    SELECT COALESCE(SUM(price_fcfa), 0)::int AS used FROM relay_cases
    WHERE program_id = ${programId} AND payment_status = 'program'`))[0]?.used) || 0;

  // Hausse inhabituelle : ≥ 5 cas sur 3 semaines et au moins le double des 3 semaines d'avant.
  const spikes = Rows(await db.execute(sql`
    SELECT c.derm_disease_code AS code,
           COUNT(*) FILTER (WHERE c.answered_at >= NOW() - INTERVAL '21 days')::int AS recent,
           COUNT(*) FILTER (WHERE c.answered_at < NOW() - INTERVAL '21 days' AND c.answered_at >= NOW() - INTERVAL '42 days')::int AS before,
           MODE() WITHIN GROUP (ORDER BY r.city) AS city
    FROM relay_cases c JOIN pro_accounts r ON r.id = c.relay_id
    WHERE c.relay_id IN (${members}) AND c.status = 'answered' AND c.answered_at >= NOW() - INTERVAL '42 days' AND c.derm_disease_code IS NOT NULL
    GROUP BY 1`));
  const alerts = spikes
    .filter((x: any) => Number(x.recent) >= MASK_MIN && Number(x.before) > 0 && Number(x.recent) >= 2 * Number(x.before))
    .map((x: any) => ({ disease: diseaseLabel(x.code), pct: Math.round(((Number(x.recent) - Number(x.before)) / Number(x.before)) * 100), district: x.city || null }));

  return {
    program: { id: p.id, name: p.name, funder: p.funder, district: p.district, status: p.status },
    kpis: {
      validated: Number(k.validated) || 0,
      delayHours: k.delay_h == null ? null : Number(k.delay_h),
      agentsAutonomous: autonomousAgents,
      agentsTotal: agentRows.length,
      urgent: mask(Number(k.urgent) || 0),
    },
    districts: districts.map((d: any) => ({ name: d.name, cases: mask(Number(d.cases)), delayHours: Number(d.cases) < MASK_MIN ? null : d.delay_h, top: Number(d.cases) < MASK_MIN ? null : diseaseLabel(d.top) })),
    diseases: diseases.map((d: any) => ({ name: diseaseLabel(d.code), n: mask(Number(d.n)) })),
    agreement: agreement.map((a: any) => ({ month: a.month, n: Number(a.n), pct: Number(a.n) ? Math.round((Number(a.ok) / Number(a.n)) * 100) : null })),
    agents,
    budget: { total: Number(p.budget_fcfa) || 0, used },
    alerts,
  };
}

async function managedPrograms(proId: number) {
  return Rows(await db.execute(sql`
    SELECT g.id, g.name FROM program_managers m JOIN programs g ON g.id = m.program_id WHERE m.pro_id = ${proId} ORDER BY g.name`));
}

export function registerProgramRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const ngoOnly = (req: any, res: any, next: any) => {
    if (req.isSecretary || (req.proAccount?.profile || "derm") !== "ngo") return res.status(403).json({ message: "Réservé aux programmes." });
    next();
  };

  // ── Compte ONG ────────────────────────────────────────────────────────
  app.get("/api/program/me", requireActivePro, ngoOnly, async (req: any, res) => {
    try { res.json({ programs: await managedPrograms(req.proAccount.id) }); }
    catch { res.json({ programs: [] }); }
  });

  app.get("/api/program/dashboard", requireActivePro, ngoOnly, async (req: any, res) => {
    try {
      const mine = await managedPrograms(req.proAccount.id);
      const pid = Number(req.query.programId) || Number(mine[0]?.id);
      if (!mine.some((m: any) => Number(m.id) === pid)) return res.status(404).json({ message: "Aucun programme rattaché à ce compte." });
      res.json(await programDashboard(pid, String(req.query.range || "1m")));
    } catch (e) {
      console.error("[program/dashboard]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Relais : partage de sa progression avec son programme ────────────
  app.post("/api/relay/programs/:id/share", requireActivePro, async (req: any, res) => {
    try {
      const r = Rows(await db.execute(sql`
        UPDATE program_members SET share_progress = ${req.body?.share === true}
        WHERE program_id = ${Number(req.params.id)} AND relay_id = ${req.proAccount.id} RETURNING program_id`));
      if (!r.length) return res.status(404).json({ message: "Programme introuvable" });
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Erreur serveur" }); }
  });

  // ── Admin (GlowScan) : programmes ────────────────────────────────────
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  app.get("/api/admin/programs", admin, async (_req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT g.*,
          (SELECT COALESCE(SUM(price_fcfa), 0)::int FROM relay_cases c WHERE c.program_id = g.id AND c.payment_status = 'program') AS used,
          (SELECT json_agg(json_build_object('id', r.id, 'name', r.full_name, 'city', r.city, 'share', m.share_progress) ORDER BY r.full_name)
             FROM program_members m JOIN pro_accounts r ON r.id = m.relay_id WHERE m.program_id = g.id) AS relays,
          (SELECT json_agg(json_build_object('id', a.id, 'name', a.full_name))
             FROM program_managers pm JOIN pro_accounts a ON a.id = pm.pro_id WHERE pm.program_id = g.id) AS managers,
          (SELECT json_agg(json_build_object('month', pr.month, 'sentAt', pr.sent_at, 'sentTo', pr.sent_to) ORDER BY pr.created_at DESC)
             FROM program_reports pr WHERE pr.program_id = g.id) AS reports
        FROM programs g ORDER BY g.created_at DESC`));
      res.json({ programs: rows });
    } catch (e) {
      console.error("[admin/programs]", e);
      res.json({ programs: [] });
    }
  });

  const progSchema = z.object({
    name: z.string().min(2).max(120),
    funder: z.string().max(120).optional().nullable(),
    district: z.string().max(120).optional().nullable(),
    budgetFcfa: z.number().int().min(0).max(1_000_000_000).optional().default(0),
    funderEmail: z.string().email().optional().nullable().or(z.literal("")),
    status: z.enum(["active", "paused"]).optional().default("active"),
  });

  app.post("/api/admin/programs", admin, async (req: any, res) => {
    try {
      const d = progSchema.parse(req.body);
      const [row] = Rows(await db.execute(sql`
        INSERT INTO programs (name, funder, district, budget_fcfa, funder_email, status)
        VALUES (${d.name}, ${d.funder || null}, ${d.district || null}, ${d.budgetFcfa}, ${d.funderEmail || null}, ${d.status}) RETURNING id`));
      res.json({ id: row.id });
    } catch (e: any) {
      res.status(400).json({ message: e?.name === "ZodError" ? "Programme incomplet (nom, email du bailleur valide)." : "Erreur serveur" });
    }
  });

  app.patch("/api/admin/programs/:id", admin, async (req: any, res) => {
    try {
      const d = progSchema.parse(req.body);
      await db.execute(sql`
        UPDATE programs SET name = ${d.name}, funder = ${d.funder || null}, district = ${d.district || null},
          budget_fcfa = ${d.budgetFcfa}, funder_email = ${d.funderEmail || null}, status = ${d.status}
        WHERE id = ${Number(req.params.id)}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e?.name === "ZodError" ? "Programme incomplet." : "Erreur serveur" });
    }
  });

  // Rattacher un relais (profil relay) ou un gestionnaire (profil ngo) par son email.
  for (const kind of ["members", "managers"] as const) {
  app.post(`/api/admin/programs/:id/${kind}`, admin, async (req: any, res) => {
    try {
      const pid = Number(req.params.id);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const acc = Rows(await db.execute(sql`
        SELECT p.id, p.profile FROM pro_accounts p JOIN users u ON u.id = p.user_id WHERE LOWER(u.email) = ${email}`))[0];
      const want = kind === "members" ? "relay" : "ngo";
      if (!acc) return res.status(404).json({ message: "Aucun compte GlowScan Derm avec cet email." });
      if ((acc.profile || "derm") !== want) return res.status(409).json({ message: kind === "members" ? "Ce compte n'est pas un relais." : "Ce compte n'est pas un compte ONG / programme." });
      if (kind === "members") await db.execute(sql`INSERT INTO program_members (program_id, relay_id) VALUES (${pid}, ${acc.id}) ON CONFLICT DO NOTHING`);
      else await db.execute(sql`INSERT INTO program_managers (program_id, pro_id) VALUES (${pid}, ${acc.id}) ON CONFLICT DO NOTHING`);
      res.json({ success: true });
    } catch (e) {
      console.error("[admin/programs/link]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.delete(`/api/admin/programs/:id/${kind}/:proId`, admin, async (req: any, res) => {
    const pid = Number(req.params.id), proId = Number(req.params.proId);
    if (kind === "members") await db.execute(sql`DELETE FROM program_members WHERE program_id = ${pid} AND relay_id = ${proId}`);
    else await db.execute(sql`DELETE FROM program_managers WHERE program_id = ${pid} AND pro_id = ${proId}`);
    res.json({ success: true });
  });
  }

  app.get("/api/admin/programs/:id/dashboard", admin, async (req: any, res) => {
    try {
      const d = await programDashboard(Number(req.params.id), String(req.query.range || "1m"));
      if (!d) return res.status(404).json({ message: "Programme introuvable" });
      res.json(d);
    } catch (e) {
      console.error("[admin/programs/dashboard]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Rapport mensuel relu par GlowScan puis envoyé au bailleur (PDF joint).
  app.post("/api/admin/programs/:id/report", admin, async (req: any, res) => {
    try {
      const pid = Number(req.params.id);
      const month = String(req.body?.month || "");
      const pdf = String(req.body?.pdfBase64 || "").replace(/^data:application\/pdf;base64,/, "");
      if (!/^\d{4}-\d{2}$/.test(month) || pdf.length < 100) return res.status(400).json({ message: "Rapport incomplet." });
      if (pdf.length > 14_000_000) return res.status(413).json({ message: "Rapport trop volumineux." });
      const p = Rows(await db.execute(sql`SELECT name, funder, funder_email FROM programs WHERE id = ${pid}`))[0];
      if (!p) return res.status(404).json({ message: "Programme introuvable" });
      const to = String(req.body?.to || p.funder_email || "").trim();
      if (!/.+@.+\..+/.test(to)) return res.status(400).json({ message: "Email du bailleur manquant : renseignez-le dans le programme." });
      const monthLabel = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const out = await sendEmail(to, `Rapport mensuel ${p.name} — ${monthLabel}`,
        `<p>Bonjour,</p><p>Veuillez trouver ci-joint le rapport mensuel du programme <strong>${p.name}</strong> pour ${monthLabel}.</p><p>Les données sont anonymisées : aucun nom, téléphone ni photo de patient ; les effectifs inférieurs à 5 sont masqués.</p><p>L'équipe GlowScan</p>`,
        `Rapport mensuel ${p.name} — ${monthLabel} (PDF joint).`,
        [{ filename: `GlowScan-${p.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${month}.pdf`, content: pdf }]);
      if (!out.ok) return res.status(502).json({ message: "L'email n'est pas parti. Réessayez." });
      await db.execute(sql`INSERT INTO program_reports (program_id, month, sent_to, sent_at) VALUES (${pid}, ${month}, ${to}, NOW())`);
      res.json({ success: true, sentTo: to });
    } catch (e) {
      console.error("[admin/programs/report]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── Vue fondateur : argent et plateforme (références seulement) ──────
  app.get("/api/admin/founder", admin, async (_req: any, res) => {
    try {
      const m = Rows(await db.execute(sql`
        SELECT
          COALESCE(SUM(gross_fcfa) FILTER (WHERE type <> 'withdrawal' AND status IN ('escrow', 'available')), 0)::int AS collected,
          COALESCE(SUM(amount_fcfa) FILTER (WHERE type <> 'withdrawal' AND status IN ('escrow', 'available')), 0)::int AS platform_share,
          COALESCE(SUM(gross_fcfa) FILTER (WHERE status = 'refunded'), 0)::int AS refunded
        FROM platform_ledger`))[0] || {};
      const paid = Rows(await db.execute(sql`
        SELECT COALESCE(p.profile, 'derm') AS profile, COALESCE(-SUM(w.amount_fcfa), 0)::int AS paid
        FROM wallet_ledger w JOIN pro_accounts p ON p.id = w.pro_id
        WHERE w.type = 'withdrawal' AND w.status = 'paid_out' GROUP BY 1`));
      const tx = Rows(await db.execute(sql`
        SELECT source_id, type, operator_txn_id, gross_fcfa, amount_fcfa, status, created_at
        FROM platform_ledger WHERE type <> 'withdrawal' ORDER BY created_at DESC LIMIT 30`));
      const programs = Rows(await db.execute(sql`
        SELECT g.id, g.name, g.budget_fcfa,
          (SELECT COALESCE(SUM(price_fcfa), 0)::int FROM relay_cases c WHERE c.program_id = g.id AND c.payment_status = 'program') AS used
        FROM programs g ORDER BY g.name`));
      res.json({
        collected: Number(m.collected) || 0,
        platformShare: Number(m.platform_share) || 0,
        refunded: Number(m.refunded) || 0,
        paidToDerms: Number(paid.find((x: any) => x.profile === "derm")?.paid) || 0,
        paidToRelays: Number(paid.find((x: any) => x.profile === "relay")?.paid) || 0,
        programs: programs.map((g: any) => ({ id: g.id, name: g.name, total: Number(g.budget_fcfa) || 0, used: Number(g.used) || 0 })),
        transactions: tx,
      });
    } catch (e) {
      console.error("[admin/founder]", e);
      res.status(500).json({ message: "Registre indisponible" });
    }
  });
}
