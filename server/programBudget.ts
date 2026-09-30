import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount, notifyOwner } from "./proRoutes";
import { sendEmail } from "./email";
import { sendWhatsAppText } from "./whatsapp";
import { RELAY_TIERS, RELAY_DISEASES, relayLevelOf, diseaseLabel } from "@shared/relay";
import { NETWORK_COUNTRIES } from "@shared/peer";
import { professionLabel } from "@shared/relayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// Programmes ONG (étape 14a) : O1 création par l'ONG, O2 agents, O3 budget
// d'avis prépayé. Le programme démarre quand GlowScan valide la première
// recharge (décision du fondateur). Chaque cas « programme » est débité du
// budget (même 60/20/20), rendu si le délai est dépassé. Alerte sous le seuil.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
export const REVIEW_PRICE = RELAY_TIERS.simple.priceFcfa;           // 1 avis prépayé = 1 avis simple
export const PREPAID_PACKS = [100, 200, 500];
export const ALERT_PCTS = [20, 30, 50];
export class BudgetError extends Error { constructor(public code: string, message: string) { super(message); } }
const receiptNo = (id: number) => `GS-REC-${String(id).padStart(5, "0")}`;

export async function programBalance(programId: number): Promise<{ balance: number; recharged: number; spent: number }> {
  const r = Rows(await db.execute(sql`
    SELECT COALESCE(SUM(amount_fcfa), 0)::int AS balance,
           COALESCE(SUM(amount_fcfa) FILTER (WHERE kind = 'recharge'), 0)::int AS recharged,
           COALESCE(-SUM(amount_fcfa) FILTER (WHERE kind IN ('debit', 'quality', 'refund')), 0)::int AS spent
    FROM program_budget_ledger WHERE program_id = ${programId} AND status = 'confirmed'`))[0] || {};
  return { balance: Number(r.balance) || 0, recharged: Number(r.recharged) || 0, spent: Number(r.spent) || 0 };
}

/** Débite un cas « programme ». Refus si programme inactif, maladie non couverte ou budget insuffisant. */
export async function debitProgramForCase(programId: number, caseId: number, price: number, diseaseCode: string | null) {
  const p = Rows(await db.execute(sql`SELECT status FROM programs WHERE id = ${programId}`))[0];
  if (p?.status !== "active") throw new BudgetError("PROGRAM_INACTIVE", "Ce programme n'est pas actif : faites payer la patiente ou utilisez votre crédit.");
  const covered = Rows(await db.execute(sql`SELECT disease_code FROM program_diseases WHERE program_id = ${programId}`)).map((r: any) => r.disease_code);
  if (covered.length && (!diseaseCode || !covered.includes(diseaseCode))) throw new BudgetError("PROGRAM_DISEASE", "Cette maladie n'est pas suivie par le programme : faites payer la patiente ou utilisez votre crédit.");
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${9_200_000 + programId})`);
    const b = Number(Rows(await tx.execute(sql`SELECT COALESCE(SUM(amount_fcfa), 0)::int AS b FROM program_budget_ledger WHERE program_id = ${programId} AND status = 'confirmed'`))[0]?.b) || 0;
    if (b < price) throw new BudgetError("PROGRAM_BUDGET", "Budget du programme épuisé : faites payer la patiente ou utilisez votre crédit. Le programme est prévenu.");
    await tx.execute(sql`
      INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, case_id, status, confirmed_at)
      VALUES (${programId}, 'debit', ${-price}, ${caseId}, 'confirmed', NOW())`);
  });
  checkBudgetAlert(programId).catch(() => {});
}
/** Délai dépassé : l'avis revient sur le budget (une seule fois par cas). */
export async function refundProgramForCase(caseId: number): Promise<boolean> {
  const d = Rows(await db.execute(sql`SELECT program_id, amount_fcfa FROM program_budget_ledger WHERE case_id = ${caseId} AND kind = 'debit' AND status = 'confirmed'`))[0];
  if (!d) return false;
  const r = Rows(await db.execute(sql`
    INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, case_id, status, confirmed_at)
    VALUES (${d.program_id}, 'refund', ${-Number(d.amount_fcfa)}, ${caseId}, 'confirmed', NOW())
    ON CONFLICT (case_id, kind) WHERE case_id IS NOT NULL DO NOTHING RETURNING id`));
  return r.length > 0;
}

/** Coordinatrices du programme (comptes ONG rattachés) : email et WhatsApp. */
async function coordinators(programId: number) {
  return Rows(await db.execute(sql`
    SELECT a.id, a.full_name, a.phone, u.email FROM program_managers m JOIN pro_accounts a ON a.id = m.pro_id JOIN users u ON u.id = a.user_id
    WHERE m.program_id = ${programId}`));
}
export async function alertCoordinators(programId: number, subject: string, text: string) {
  for (const c of await coordinators(programId)) {
    notifyProAccount(Number(c.id), { title: subject, body: text.slice(0, 140), url: "/derm/pilotage" }).catch(() => {});
    if (c.email && !String(c.email).endsWith("@phone.glowscan.cm")) sendEmail(c.email, subject, `<p>${text}</p>`, text).catch(() => {});
    if (c.phone) sendWhatsAppText(c.phone, `GlowScan : ${text}`).catch(() => {});
  }
}
/** Solde sous le seuil choisi (20, 30 ou 50 % des recharges) : une alerte, jusqu'à la recharge suivante. */
async function checkBudgetAlert(programId: number) {
  const p = Rows(await db.execute(sql`SELECT name, alert_pct, alert_sent_at FROM programs WHERE id = ${programId}`))[0];
  if (!p || p.alert_sent_at) return;
  const b = await programBalance(programId);
  if (!b.recharged || b.balance * 100 >= b.recharged * Number(p.alert_pct)) return;
  await db.execute(sql`UPDATE programs SET alert_sent_at = NOW() WHERE id = ${programId}`);
  await alertCoordinators(programId, `Budget bas : ${p.name}`,
    `Il reste ${Math.floor(b.balance / REVIEW_PRICE)} avis sur le budget du programme ${p.name} (sous ${p.alert_pct} %). Rechargez depuis votre espace GlowScan.`);
}

async function managesProgram(proId: number, programId: number) {
  return !!Rows(await db.execute(sql`SELECT 1 FROM program_managers WHERE program_id = ${programId} AND pro_id = ${proId}`))[0];
}

/** Budget O3 : solde, consommation du mois, rythme, historique des recharges. */
export async function budgetView(programId: number) {
  const b = await programBalance(programId);
  const p = Rows(await db.execute(sql`SELECT alert_pct, status FROM programs WHERE id = ${programId}`))[0] || {};
  const month = Rows(await db.execute(sql`
    SELECT COUNT(*) FILTER (WHERE c.tier = 'simple')::int AS simple, COUNT(*) FILTER (WHERE c.tier = 'urgent')::int AS urgent
    FROM program_budget_ledger l JOIN relay_cases c ON c.id = l.case_id
    WHERE l.program_id = ${programId} AND l.kind = 'debit' AND l.status = 'confirmed'
      AND l.created_at >= date_trunc('month', NOW() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
      AND NOT EXISTS (SELECT 1 FROM program_budget_ledger r WHERE r.case_id = l.case_id AND r.kind = 'refund')`))[0] || {};
  const last28 = Number(Rows(await db.execute(sql`
    SELECT COALESCE(-SUM(amount_fcfa), 0)::int AS s FROM program_budget_ledger
    WHERE program_id = ${programId} AND status = 'confirmed' AND kind IN ('debit', 'refund', 'quality') AND created_at > NOW() - INTERVAL '28 days'`))[0]?.s) || 0;
  const weeksLeft = last28 > 0 ? Math.floor(b.balance / (last28 / 4)) : null;
  const recharges = Rows(await db.execute(sql`
    SELECT id, amount_fcfa, reviews, method, operator_ref, status, reject_reason, receipt_no, created_at, confirmed_at
    FROM program_budget_ledger WHERE program_id = ${programId} AND kind IN ('recharge', 'close_refund') ORDER BY created_at DESC LIMIT 30`));
  return {
    status: p.status, alertPct: Number(p.alert_pct) || 20,
    balance: b.balance, recharged: b.recharged, spent: b.spent,
    reviewsLeft: Math.floor(b.balance / REVIEW_PRICE), reviewsTotal: Math.floor(b.recharged / REVIEW_PRICE),
    month: { simple: Number(month.simple) || 0, urgent: Number(month.urgent) || 0 },
    weeksLeft, low: b.recharged > 0 && b.balance * 100 < b.recharged * (Number(p.alert_pct) || 20),
    recharges,
  };
}

const programInput = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().refine((c) => NETWORK_COUNTRIES.includes(c)),
  districts: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
  dermMode: z.enum(["auto", "chosen"]).default("auto"),
  derms: z.array(z.number().int()).max(30).default([]),
  diseases: z.array(z.string().max(40)).max(20).default([]),          // vide = toutes
  funder: z.string().trim().max(120).optional().nullable(),
  funderEmail: z.string().email().optional().nullable().or(z.literal("")),
});

async function saveProgramDetails(pid: number, d: z.infer<typeof programInput>) {
  await db.execute(sql`DELETE FROM program_districts WHERE program_id = ${pid}`);
  for (const dist of Array.from(new Set(d.districts))) {
    await db.execute(sql`INSERT INTO program_districts (program_id, country, district) VALUES (${pid}, ${d.country}, ${dist}) ON CONFLICT DO NOTHING`);
  }
  await db.execute(sql`DELETE FROM program_derms WHERE program_id = ${pid}`);
  if (d.dermMode === "chosen") for (const id of d.derms) {
    await db.execute(sql`INSERT INTO program_derms (program_id, derm_id) SELECT ${pid}, id FROM pro_accounts WHERE id = ${id} AND COALESCE(profile, 'derm') = 'derm' ON CONFLICT DO NOTHING`);
  }
  await db.execute(sql`DELETE FROM program_diseases WHERE program_id = ${pid}`);
  const codes = new Set(RELAY_DISEASES.map((x) => x.code));
  for (const code of d.diseases) if (codes.has(code)) await db.execute(sql`INSERT INTO program_diseases (program_id, disease_code) VALUES (${pid}, ${code}) ON CONFLICT DO NOTHING`);
}

export function registerProgramBudgetRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const ngoOnly = [requireActivePro, (req: any, res: any, next: any) => (req.isSecretary || (req.proAccount?.profile || "derm") !== "ngo" ? res.status(403).json({ message: "Réservé aux programmes." }) : next())];
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));
  const own = async (req: any, res: any) => {
    const pid = Number(req.params.id);
    if (!(await managesProgram(req.proAccount.id, pid))) { res.status(404).json({ message: "Programme introuvable" }); return null; }
    return pid;
  };

  // Dermatologues proposables (O1 « Dermatologues du réseau »).
  app.get("/api/program/derms", ...ngoOnly, async (_req: any, res) => {
    const rows = Rows(await db.execute(sql`
      SELECT p.id, p.full_name, p.city, COALESCE(p.country, 'Cameroun') AS country, p.languages FROM pro_accounts p
      WHERE COALESCE(p.profile, 'derm') = 'derm'
        AND ((p.subscription_status = 'active' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > NOW())) OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()))
      ORDER BY p.full_name LIMIT 300`));
    res.json({ derms: rows.map((r: any) => ({ id: r.id, name: r.full_name, city: r.city, country: r.country, languages: r.languages || ["fr"] })) });
  });

  // O1 · détail d'un programme (pour reprendre le brouillon).
  app.get("/api/program/:id/setup", ...ngoOnly, async (req: any, res) => {
    const pid = await own(req, res); if (!pid) return;
    const p = Rows(await db.execute(sql`SELECT id, name, country, derm_mode, funder, funder_email, status FROM programs WHERE id = ${pid}`))[0];
    const districts = Rows(await db.execute(sql`SELECT district FROM program_districts WHERE program_id = ${pid} ORDER BY id`)).map((r: any) => r.district);
    const derms = Rows(await db.execute(sql`SELECT derm_id FROM program_derms WHERE program_id = ${pid}`)).map((r: any) => Number(r.derm_id));
    const diseases = Rows(await db.execute(sql`SELECT disease_code FROM program_diseases WHERE program_id = ${pid}`)).map((r: any) => r.disease_code);
    res.json({ ...p, dermMode: p.derm_mode, funderEmail: p.funder_email, districts, derms, diseases });
  });

  // O1 · « Enregistrer le brouillon » (création ou mise à jour tant que le programme n'est pas lancé).
  app.post("/api/program", ...ngoOnly, async (req: any, res) => {
    try {
      const d = programInput.parse(req.body);
      const pid = Number(req.body?.id) || null;
      if (pid) {
        const p = Rows(await db.execute(sql`SELECT status FROM programs WHERE id = ${pid}`))[0];
        if (!p || !(await managesProgram(req.proAccount.id, pid))) return res.status(404).json({ message: "Programme introuvable" });
        await db.execute(sql`
          UPDATE programs SET name = ${d.name}, country = ${d.country}, district = ${d.districts[0] || null}, derm_mode = ${d.dermMode},
            funder = ${d.funder || null}, funder_email = ${d.funderEmail || null} WHERE id = ${pid}`);
        await saveProgramDetails(pid, d);
        return res.json({ id: pid });
      }
      const row = Rows(await db.execute(sql`
        INSERT INTO programs (name, country, district, derm_mode, funder, funder_email, status, created_by, budget_fcfa)
        VALUES (${d.name}, ${d.country}, ${d.districts[0] || null}, ${d.dermMode}, ${d.funder || null}, ${d.funderEmail || null}, 'draft', ${req.proAccount.id}, 0)
        RETURNING id`))[0];
      await db.execute(sql`INSERT INTO program_managers (program_id, pro_id) VALUES (${row.id}, ${req.proAccount.id}) ON CONFLICT DO NOTHING`);
      await saveProgramDetails(Number(row.id), d);
      res.json({ id: row.id });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Programme incomplet : nom, pays, email du bailleur valide." });
      console.error("[program save]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // O1 « Lancer le programme » et O3 « Recharger » : demande de recharge, validée par GlowScan.
  app.post("/api/program/:id/recharge", ...ngoOnly, async (req: any, res) => {
    try {
      const pid = await own(req, res); if (!pid) return;
      const d = z.object({
        reviews: z.number().int().min(10).max(100_000).optional(),
        amountFcfa: z.number().int().min(REVIEW_PRICE * 10).max(1_000_000_000).optional(),
        method: z.enum(["virement", "momo"]),
        operatorRef: z.string().trim().min(4).max(80).optional().nullable(),
      }).parse(req.body);
      const amount = d.amountFcfa ?? (d.reviews ? d.reviews * REVIEW_PRICE : 0);
      if (!amount) return res.status(400).json({ message: "Choisissez un nombre d'avis ou un montant." });
      if (d.method === "momo" && !d.operatorRef) return res.status(400).json({ message: "ID de transaction Mobile Money requis." });
      const p = Rows(await db.execute(sql`SELECT name, status FROM programs WHERE id = ${pid}`))[0];
      if (p.status === "closed") return res.status(409).json({ message: "Programme clôturé." });
      const row = Rows(await db.execute(sql`
        INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, reviews, method, operator_ref, status, requested_by)
        VALUES (${pid}, 'recharge', ${amount}, ${Math.floor(amount / REVIEW_PRICE)}, ${d.method}, ${d.operatorRef || null}, 'pending', ${req.proAccount.id})
        RETURNING id`))[0];
      notifyOwner(`Recharge de programme à valider : ${p.name}`,
        `<p>${p.name} demande une recharge de ${amount.toLocaleString("fr-FR")} F CFA (${d.method === "momo" ? `Mobile Money, ID ${d.operatorRef}` : "virement"}). Admin › Programmes.</p>`,
        `Recharge de programme à valider : ${p.name}, ${amount} F CFA`).catch(() => {});
      res.json({ id: row.id, invoiceUrl: `/api/program/recharges/${row.id}/receipt` });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Recharge invalide (10 avis au minimum)." });
      if (String(e?.message || "").includes("program_budget_ref_uidx")) return res.status(409).json({ message: "Cette référence a déjà servi." });
      console.error("[program recharge]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/program/:id/budget", ...ngoOnly, async (req: any, res) => {
    const pid = await own(req, res); if (!pid) return;
    res.json(await budgetView(pid));
  });
  app.post("/api/program/:id/alert", ...ngoOnly, async (req: any, res) => {
    const pid = await own(req, res); if (!pid) return;
    const pct = Number(req.body?.pct);
    if (!ALERT_PCTS.includes(pct)) return res.status(400).json({ message: "Seuil : 20, 30 ou 50 %." });
    await db.execute(sql`UPDATE programs SET alert_pct = ${pct}, alert_sent_at = NULL WHERE id = ${pid}`);
    checkBudgetAlert(pid).catch(() => {});
    res.json({ success: true });
  });

  // O2 · agents du programme : statut d'inscription, module photo, cas, accord ; invitations en cours.
  app.get("/api/program/:id/agents", ...ngoOnly, async (req: any, res) => {
    const pid = await own(req, res); if (!pid) return;
    const rows = Rows(await db.execute(sql`
      SELECT a.id, a.full_name, r.profession, hc.name AS center, r.status, r.card_status, r.training_passed_at, m.share_progress, a.relay_level,
        COALESCE((SELECT SUM(cases) FROM relay_progress g WHERE g.relay_id = a.id), 0)::int AS cases,
        COALESCE((SELECT SUM(agreements) FROM relay_progress g WHERE g.relay_id = a.id), 0)::int AS agreements,
        (SELECT string_agg(g.disease_code, ',') FROM relay_progress g WHERE g.relay_id = a.id AND g.autonomous_at IS NOT NULL) AS autonomous
      FROM program_members m JOIN pro_accounts a ON a.id = m.relay_id
      LEFT JOIN relays r ON r.pro_account_id = a.id LEFT JOIN health_centers hc ON hc.id = r.health_center_id
      WHERE m.program_id = ${pid} ORDER BY a.full_name`));
    const invites = Rows(await db.execute(sql`
      SELECT id, phone, name, center, created_at, reminded_j2_at, reminded_j7_at FROM invitations
      WHERE program_id = ${pid} AND status = 'sent' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 100`));
    const shortName = (n: string) => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || ""; };
    res.json({
      agents: rows.map((a: any) => ({
        id: a.id, name: shortName(a.full_name), profession: professionLabel(a.profession), center: a.center,
        status: a.status === "active" ? "Vérifié" : a.card_status === "pending" ? "Carte à vérifier" : a.card_status === "rejected" ? "Carte refusée" : "En cours",
        module: a.training_passed_at ? "Validé" : "En cours",
        // Progression détaillée seulement si l'agent l'accepte (étape 6).
        cases: a.share_progress ? Number(a.cases) : null,
        accuracy: a.share_progress && Number(a.cases) ? Math.round((Number(a.agreements) / Number(a.cases)) * 100) : null,
        autonomous: a.share_progress && a.autonomous ? String(a.autonomous).split(",").map(diseaseLabel).join(", ") : null,
        level: a.share_progress ? relayLevelOf({ promoted: Number(a.relay_level) || 0, validatedCases: Number(a.cases), autonomousDiseases: a.autonomous ? String(a.autonomous).split(",").length : 0 }) : null,
      })),
      invitations: invites.map((i: any) => ({
        id: i.id, phone: `+${String(i.phone).slice(0, 4)} •• •• ${String(i.phone).slice(-4, -2)} ${String(i.phone).slice(-2)}`, name: i.name, center: i.center,
        day: Math.floor((Date.now() - +new Date(i.created_at)) / 86400000),
      })),
    });
  });

  // Facture (recharge en attente) ou reçu (recharge vérifiée) : page imprimable, PDF via html2pdf.
  app.get("/api/program/recharges/:id/receipt", async (req: any, res) => {
    const l = Rows(await db.execute(sql`
      SELECT l.*, g.name, g.funder, g.country FROM program_budget_ledger l JOIN programs g ON g.id = l.program_id WHERE l.id = ${Number(req.params.id)} AND l.kind = 'recharge'`))[0];
    if (!l) return res.status(404).send("Document introuvable");
    let ok = deps.checkAdmin(req);
    if (!ok && req.session?.userId) {
      const pro = Rows(await db.execute(sql`SELECT id FROM pro_accounts WHERE user_id = ${req.session.userId}`))[0];
      ok = !!pro && (await managesProgram(Number(pro.id), Number(l.program_id)));
    }
    if (!ok) return res.status(403).send("Accès refusé");
    const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const confirmed = l.status === "confirmed";
    const no = confirmed ? l.receipt_no : `GS-FAC-${String(l.id).padStart(5, "0")}`;
    const dt = (v: any) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(no)}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#f5ead8;font-family:'Figtree',sans-serif;color:#201e1d}.sheet{background:#fffaf2;max-width:760px;margin:24px auto;padding:40px;border-radius:18px}
td{padding:10px 0;border-bottom:1px solid #e0d3bd;font-size:14px}@media(max-width:600px){.sheet{margin:0;border-radius:0;padding:24px 18px}}@media print{body{background:#fff}.no-print{display:none}}</style></head><body>
<div id="doc"><div class="sheet">
<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
  <div><div style="font-family:'Caprasimo',serif;font-size:24px">GlowScan</div><div style="font-size:13px;color:#645c50">Réseau de télé-dermatologie · ${esc(BASE.replace(/^https?:\/\//, ""))}</div></div>
  <div style="text-align:right"><div style="font-family:'Caprasimo',serif;font-size:22px">${confirmed ? "Reçu" : "Facture"}</div><div style="font-size:13px">${esc(no)}</div><div style="font-size:13px;color:#645c50">${esc(dt(confirmed ? l.confirmed_at : l.created_at))}</div></div>
</div>
<p style="margin:24px 0 8px;font-size:14px"><b>Programme :</b> ${esc(l.name)}${l.country ? ` (${esc(l.country)})` : ""}${l.funder ? `<br/><b>Bailleur :</b> ${esc(l.funder)}` : ""}</p>
<table style="width:100%;border-collapse:collapse;margin-top:12px">
<tr><td>Avis de télé-dermatologie prépayés (${Number(l.reviews)} avis simples à ${REVIEW_PRICE.toLocaleString("fr-FR")} F CFA)</td><td style="text-align:right;font-weight:700">${Number(l.amount_fcfa).toLocaleString("fr-FR")} F CFA</td></tr>
<tr><td>Mode de paiement</td><td style="text-align:right">${l.method === "momo" ? `Mobile Money · ID ${esc(l.operator_ref)}` : `Virement${l.operator_ref ? ` · réf. ${esc(l.operator_ref)}` : ""}`}</td></tr>
</table>
<p style="font-size:13px;color:#645c50;margin-top:18px">${confirmed ? "Paiement reçu et vérifié par GlowScan." : "À régler par virement ou Mobile Money. Le budget est crédité dès que GlowScan a vérifié le paiement."} Un avis urgent compte pour ${RELAY_TIERS.urgent.priceFcfa.toLocaleString("fr-FR")} F CFA. Les avis non consommés sont remboursables à la clôture du programme.</p>
</div></div>
<div class="no-print" style="text-align:center;margin:0 0 32px"><button id="dl" style="background:#c67139;color:#fff;border:0;border-radius:999px;padding:13px 26px;font:700 15px 'Figtree',sans-serif;cursor:pointer">Télécharger le PDF</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>document.getElementById("dl").addEventListener("click",function(){if(!window.html2pdf){window.print();return;}window.html2pdf().set({margin:0,filename:${JSON.stringify(`${no}.pdf`)},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4"}}).from(document.getElementById("doc")).save();});</script>
</body></html>`);
  });

  // ── Admin : recharges à valider, clôture ──────────────────────────────
  app.get("/api/admin/program-recharges", admin, async (_req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`
      SELECT l.id, l.program_id, l.amount_fcfa, l.reviews, l.method, l.operator_ref, l.kind, l.created_at, g.name, g.status AS program_status
      FROM program_budget_ledger l JOIN programs g ON g.id = l.program_id
      WHERE l.status = 'pending' AND l.kind IN ('recharge', 'close_refund') ORDER BY l.created_at ASC LIMIT 200`)) });
  });
  app.post("/api/admin/program-recharges/:id/confirm", admin, async (req: any, res) => {
    const ref = String(req.body?.operatorRef || "").trim();
    if (ref.length < 4) return res.status(400).json({ message: "Référence du virement ou ID Mobile Money vérifié requis." });
    const l = Rows(await db.execute(sql`
      UPDATE program_budget_ledger SET status = 'confirmed', confirmed_at = NOW(), operator_ref = ${ref}, receipt_no = 'GS-REC-' || lpad(id::text, 5, '0')
      WHERE id = ${Number(req.params.id)} AND status = 'pending' AND kind IN ('recharge', 'close_refund')
      RETURNING program_id, kind, amount_fcfa`))[0];
    if (!l) return res.status(409).json({ message: "Recharge introuvable ou déjà traitée." });
    if (l.kind === "recharge") {
      // Première recharge validée : le programme démarre. Toute recharge réarme l'alerte.
      const p = Rows(await db.execute(sql`
        UPDATE programs SET status = CASE WHEN status = 'draft' THEN 'active' ELSE status END,
          launched_at = COALESCE(launched_at, NOW()), alert_sent_at = NULL WHERE id = ${l.program_id} RETURNING name, status`))[0];
      alertCoordinators(Number(l.program_id), `Recharge validée : ${p?.name || "programme"}`,
        `Votre recharge de ${Number(l.amount_fcfa).toLocaleString("fr-FR")} F CFA est validée${p?.status === "active" ? " : le programme est actif" : ""}.`).catch(() => {});
    }
    res.json({ success: true });
  });
  app.post("/api/admin/program-recharges/:id/reject", admin, async (req: any, res) => {
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Indiquez le motif." });
    const l = Rows(await db.execute(sql`
      UPDATE program_budget_ledger SET status = 'rejected', reject_reason = ${reason} WHERE id = ${Number(req.params.id)} AND status = 'pending' AND kind = 'recharge' RETURNING program_id`))[0];
    if (!l) return res.status(409).json({ message: "Recharge introuvable ou déjà traitée." });
    alertCoordinators(Number(l.program_id), "Recharge non validée", reason).catch(() => {});
    res.json({ success: true });
  });
  // Clôture : plus de nouveaux cas ; le solde non consommé est à rembourser au bailleur.
  app.post("/api/admin/programs/:id/close", admin, async (req: any, res) => {
    const pid = Number(req.params.id);
    const p = Rows(await db.execute(sql`UPDATE programs SET status = 'closed', closed_at = NOW() WHERE id = ${pid} AND status <> 'closed' RETURNING name`))[0];
    if (!p) return res.status(409).json({ message: "Programme introuvable ou déjà clôturé." });
    const b = await programBalance(pid);
    if (b.balance > 0) {
      await db.execute(sql`INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, status) VALUES (${pid}, 'close_refund', ${-b.balance}, 'pending')`);
    }
    res.json({ success: true, toRefund: Math.max(0, b.balance) });
  });
}
