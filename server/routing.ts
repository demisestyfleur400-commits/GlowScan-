import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount, notifyOwner } from "./proRoutes";
import { RELAY_TIERS } from "@shared/relay";
import { NETWORK_COUNTRIES } from "@shared/peer";

// ════════════════════════════════════════════════════════════════════════
// Envoi du cas au bon dermatologue (étape 13, ADDENDUM §4, écran D1).
//  0. le référent du relais (décision du fondateur), s'il est actif et parle la langue ;
//  1. un dermatologue du même pays, disponible, même langue, quota du jour non atteint ;
//  2. le réseau : délai estimé sous la limite (24 h / 2 h), seulement si le
//     patient a accepté l'envoi hors de son pays.
// Sans prise en charge après 25 % du délai : dermatologue suivant (la part en
// séquestre suit). Délai dépassé : remboursement (cron existant).
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
export type RouteStep = "program" | "referent" | "country" | "network";
export const LANGUAGES = [{ key: "fr", label: "Français" }, { key: "en", label: "Anglais" }] as const;
export const DAILY_CAPS = [5, 10, 20] as const;

const ACTIVE = sql`COALESCE(p.profile, 'derm') = 'derm'
  AND ((p.subscription_status = 'active' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > NOW()))
       OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()))`;

async function caseContext(caseId: number) {
  return Rows(await db.execute(sql`
    SELECT c.id, c.relay_id, c.derm_id, c.tier, c.language, c.cross_border_consent_at, c.routing_log, c.status, c.program_id,
           COALESCE(r.country, rp.country, 'Cameroun') AS relay_country, l.derm_id AS referent_id
    FROM relay_cases c JOIN pro_accounts rp ON rp.id = c.relay_id
    LEFT JOIN relays r ON r.pro_account_id = c.relay_id
    LEFT JOIN relay_links l ON l.relay_id = c.relay_id
    WHERE c.id = ${caseId}`))[0] || null;
}

/** Choisit le dermatologue d'un cas (sans l'attribuer). */
export async function pickDerm(caseId: number, exclude: number[] = []): Promise<{ dermId: number; step: RouteStep; country: string | null } | null> {
  const c = await caseContext(caseId);
  if (!c) return null;
  const ex = sql.raw(`ARRAY[${[0, ...exclude].map(Number).join(",")}]::int[]`);
  const lang = c.language || "fr";
  const hours = RELAY_TIERS[(c.tier as "simple" | "urgent") || "simple"].hours;

  // Programme avec des dermatologues choisis : eux d'abord (étape 14a).
  if (c.program_id) {
    const chosen = Rows(await db.execute(sql`
      SELECT p.id, p.country FROM program_derms pd JOIN programs g ON g.id = pd.program_id AND g.derm_mode = 'chosen'
      JOIN pro_accounts p ON p.id = pd.derm_id
      WHERE pd.program_id = ${c.program_id} AND ${ACTIVE} AND NOT (p.id = ANY(${ex})) AND ${lang} = ANY(p.languages)
      ORDER BY (SELECT COUNT(*) FROM relay_cases y WHERE y.derm_id = p.id AND y.status = 'awaiting_review') ASC, p.id ASC LIMIT 1`))[0];
    if (chosen) return { dermId: Number(chosen.id), step: "program", country: chosen.country || null };
  }

  // 0 · Référent du relais (pas de quota : ce sont ses propres relais).
  if (c.referent_id && !exclude.includes(Number(c.referent_id))) {
    const ok = Rows(await db.execute(sql`
      SELECT p.id, p.country FROM pro_accounts p WHERE p.id = ${c.referent_id} AND ${ACTIVE} AND ${lang} = ANY(p.languages)`))[0];
    if (ok) return { dermId: Number(ok.id), step: "referent", country: ok.country || null };
  }

  // Candidats : délai estimé (moyenne des 20 derniers avis) et charge réseau du jour.
  const candidates = async (sameCountry: boolean) => Rows(await db.execute(sql`
    SELECT p.id, p.country, p.network_daily_cap,
      (SELECT AVG(EXTRACT(EPOCH FROM (x.answered_at - COALESCE(x.routed_at, x.paid_at, x.created_at))) / 3600)
         FROM (SELECT * FROM relay_cases WHERE derm_id = p.id AND answered_at IS NOT NULL ORDER BY answered_at DESC LIMIT 20) x) AS est_h,
      (SELECT COUNT(*) FROM relay_cases y WHERE y.derm_id = p.id AND y.route_step IN ('country', 'network')
         AND y.routed_at > date_trunc('day', NOW() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala') AS today
    FROM pro_accounts p
    WHERE ${ACTIVE} AND NOT (p.id = ANY(${ex})) AND ${lang} = ANY(p.languages)
      AND ${sameCountry
        ? sql`(COALESCE(p.country, 'Cameroun') = ${c.relay_country} OR EXISTS (SELECT 1 FROM derm_licenses dl WHERE dl.derm_id = p.id AND dl.country = ${c.relay_country} AND dl.status = 'verified'))`
        : sql`TRUE`}
    ORDER BY est_h ASC NULLS LAST, today ASC, p.id ASC
    LIMIT 50`));

  // 1 · Même pays.
  for (const d of await candidates(true)) {
    if (Number(d.today) < Number(d.network_daily_cap)) return { dermId: Number(d.id), step: "country", country: d.country || null };
  }
  // 2 · Réseau entre pays : accord du patient obligatoire, délai estimé sous la limite.
  if (!c.cross_border_consent_at) return null;
  for (const d of await candidates(false)) {
    const est = d.est_h == null ? null : Number(d.est_h);
    if (Number(d.today) < Number(d.network_daily_cap) && (est == null || est < hours)) return { dermId: Number(d.id), step: "network", country: d.country || null };
  }
  return null;
}

/** Attribue le cas (et déplace la part du dermatologue encore en séquestre). */
export async function assignDerm(caseId: number, pick: { dermId: number; step: RouteStep; country: string | null }, reason: "initial" | "timeout") {
  const prev = Rows(await db.execute(sql`SELECT derm_id FROM relay_cases WHERE id = ${caseId}`))[0];
  const entry = JSON.stringify([{ derm: pick.dermId, step: pick.step, country: pick.country, reason, at: new Date().toISOString() }]);
  await db.execute(sql`
    UPDATE relay_cases SET derm_id = ${pick.dermId}, route_step = ${pick.step}, routed_at = NOW(), accepted_at = NULL,
      reassign_count = reassign_count + ${reason === "timeout" ? 1 : 0}, routing_log = routing_log || ${entry}::jsonb
    WHERE id = ${caseId}`);
  if (prev?.derm_id && Number(prev.derm_id) !== pick.dermId) {
    await db.execute(sql`
      UPDATE wallet_ledger SET pro_id = ${pick.dermId}, updated_at = NOW()
      WHERE type = 'relay_review' AND source_id = ${`relay_case:${caseId}`} AND pro_id = ${Number(prev.derm_id)} AND status = 'escrow'`);
  }
}

/** Au dépôt du cas : choix initial. null = aucun dermatologue disponible. */
export async function routeNewCase(caseId: number): Promise<{ dermId: number; step: RouteStep } | null> {
  const pick = await pickDerm(caseId);
  if (!pick) return null;
  await assignDerm(caseId, pick, "initial");
  return pick;
}

// ── Cron : sans prise en charge après 25 % du délai → dermatologue suivant ──
export async function runRoutingTimeouts(): Promise<number> {
  const rows = Rows(await db.execute(sql`
    SELECT c.id, c.derm_id, c.tier, c.routing_log FROM relay_cases c
    WHERE c.status = 'awaiting_review' AND c.accepted_at IS NULL AND c.paused_at IS NULL AND c.derm_id IS NOT NULL
      AND NOW() > GREATEST(COALESCE(c.routed_at, c.paid_at), COALESCE(c.paid_at, c.routed_at))
                  + make_interval(mins => (CASE WHEN c.tier = 'urgent' THEN ${RELAY_TIERS.urgent.hours} ELSE ${RELAY_TIERS.simple.hours} END) * 15)
    LIMIT 100`));
  let moved = 0;
  for (const c of rows) {
    const tried = [Number(c.derm_id), ...((c.routing_log || []) as any[]).map((e) => Number(e.derm))];
    const pick = await pickDerm(Number(c.id), tried);
    if (!pick) continue; // personne d'autre : le dermatologue actuel garde le cas
    await assignDerm(Number(c.id), pick, "timeout");
    notifyProAccount(pick.dermId, { title: c.tier === "urgent" ? "Avis urgent du réseau à prendre" : "Avis du réseau à prendre", body: "Un cas relais attend un dermatologue.", url: "/derm/reseau" }).catch(() => {});
    moved++;
  }
  return moved;
}

export function registerRoutingRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const dermOnly = [requireActivePro, (req: any, res: any, next: any) => (req.isSecretary || (req.proAccount?.profile || "derm") !== "derm" ? res.status(403).json({ message: "Réservé au dermatologue." }) : next())];
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  // « Je prends ce cas »
  app.post("/api/relay/cases/:id/accept", ...dermOnly, async (req: any, res) => {
    const r = Rows(await db.execute(sql`
      UPDATE relay_cases SET accepted_at = NOW() WHERE id = ${Number(req.params.id)} AND derm_id = ${req.proAccount.id} AND status = 'awaiting_review' AND accepted_at IS NULL
      RETURNING relay_id`))[0];
    if (!r) return res.status(409).json({ message: "Ce cas n'est plus à prendre." });
    res.json({ success: true });
  });

  // D1 · Réseau entre pays
  app.get("/api/pro/network-settings", ...dermOnly, async (req: any, res) => {
    const me = Rows(await db.execute(sql`SELECT languages, network_daily_cap, country FROM pro_accounts WHERE id = ${req.proAccount.id}`))[0];
    const lic = Rows(await db.execute(sql`SELECT id, country, kind, status, reject_reason, verified_at, (document_url IS NOT NULL) AS has_doc FROM derm_licenses WHERE derm_id = ${req.proAccount.id} ORDER BY kind DESC, country`));
    res.json({ languages: me?.languages || ["fr"], dailyCap: Number(me?.network_daily_cap) || 10, country: me?.country || "Cameroun", licenses: lic });
  });
  app.post("/api/pro/network-settings", ...dermOnly, async (req: any, res) => {
    const d = z.object({
      languages: z.array(z.enum(["fr", "en"])).min(1).max(2),
      dailyCap: z.number().int().refine((n) => (DAILY_CAPS as readonly number[]).includes(n)),
    }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Choisissez au moins une langue et un nombre d'avis par jour." });
    const langs = `{${d.data.languages.join(",")}}`;
    await db.execute(sql`UPDATE pro_accounts SET languages = ${langs}::text[], network_daily_cap = ${d.data.dailyCap} WHERE id = ${req.proAccount.id}`);
    res.json({ success: true });
  });
  // « + Ajouter un pays » : justificatif requis (image ou PDF), vérifié par GlowScan.
  app.post("/api/pro/licenses", ...dermOnly, async (req: any, res) => {
    const d = z.object({ country: z.string().refine((c) => NETWORK_COUNTRIES.includes(c)), document: z.string().min(100).max(8_000_000) }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Pays du réseau et justificatif (photo ou PDF) requis." });
    if (!/^data:(image\/[a-z+]+|application\/pdf);base64,/i.test(d.data.document)) return res.status(400).json({ message: "Justificatif : photo ou PDF." });
    const home = (req.proAccount.country || "Cameroun") === d.data.country;
    await db.execute(sql`
      INSERT INTO derm_licenses (derm_id, country, kind, document_url, status)
      VALUES (${req.proAccount.id}, ${d.data.country}, ${home ? "home" : "authorization"}, ${d.data.document}, 'pending')
      ON CONFLICT (derm_id, country) DO UPDATE SET document_url = EXCLUDED.document_url, status = 'pending', reject_reason = NULL, verified_at = NULL
      WHERE derm_licenses.status <> 'verified'`);
    notifyOwner(`Autorisation à vérifier : ${req.proAccount.fullName} (${d.data.country})`, `<p>Justificatif envoyé par ${req.proAccount.fullName} pour ${d.data.country}. Admin › Relais › Autorisations d'exercer.</p>`, `Autorisation à vérifier : ${req.proAccount.fullName} (${d.data.country})`).catch(() => {});
    res.json({ success: true });
  });

  // Admin : autorisations d'exercer
  app.get("/api/admin/licenses", admin, async (_req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`
      SELECT l.id, l.country, l.kind, l.status, l.reject_reason, l.created_at, (l.document_url IS NOT NULL) AS has_doc, p.full_name, p.license_number
      FROM derm_licenses l JOIN pro_accounts p ON p.id = l.derm_id
      WHERE l.status = 'pending' OR l.created_at > NOW() - INTERVAL '30 days' ORDER BY (l.status = 'pending') DESC, l.created_at DESC LIMIT 200`)) });
  });
  app.get("/api/admin/licenses/:id/document", admin, async (req: any, res) => {
    const r = Rows(await db.execute(sql`SELECT document_url FROM derm_licenses WHERE id = ${Number(req.params.id)}`))[0];
    const m = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(r?.document_url || "");
    if (!m) return res.status(404).send("Justificatif introuvable");
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(m[2], "base64"));
  });
  app.post("/api/admin/licenses/:id", admin, async (req: any, res) => {
    const verified = req.body?.decision === "verified";
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!verified && !reason) return res.status(400).json({ message: "Indiquez le motif du refus." });
    const r = Rows(await db.execute(sql`
      UPDATE derm_licenses SET status = ${verified ? "verified" : "rejected"}, reject_reason = ${verified ? null : reason}, verified_at = ${verified ? sql`NOW()` : sql`NULL`}
      WHERE id = ${Number(req.params.id)} RETURNING derm_id, country`))[0];
    if (!r) return res.status(404).json({ message: "Autorisation introuvable" });
    notifyProAccount(Number(r.derm_id), verified
      ? { title: `Autorisation vérifiée : ${r.country}`, body: "Les patients de ce pays peuvent vous consulter directement.", url: "/derm/cabinet" }
      : { title: `Autorisation à reprendre : ${r.country}`, body: reason, url: "/derm/cabinet" }).catch(() => {});
    res.json({ success: true });
  });
}
