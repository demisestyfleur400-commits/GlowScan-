import type { Express } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro } from "./proRoutes";
import { alertCoordinators } from "./programBudget";
import { checkBaseUrl, Dhis2Error } from "./dhis2Net";
import { encryptSecret, decryptSecret } from "./secretBox";
import { DHIS2_MASK_MIN, UID_RE, ageBandOf, dhis2Keys, dhis2KeyLabel, previousPeriod } from "@shared/dhis2";

// ════════════════════════════════════════════════════════════════════════
// Export DHIS2 (étape 15, ADDENDUM §6, écran O5). Méthode :
//  1. jeton d'accès personnel (PAT, DHIS2 ≥ 2.38.1), « Authorization: ApiToken … »,
//     chiffré AES-256-GCM (DHIS2_TOKEN_KEY), jamais réaffiché ;
//  2. correspondance clés GlowScan → data element + category option combo ;
//  3. dataValueSet JSON envoyé par POST {base}/api/dataValueSets ;
//  4. toujours un essai (dryRun=true) avant l'envoi réel ; résumé enregistré ;
//  5. envoi automatique le 5 du mois (mois précédent), bouton manuel ;
//  6. secours : fichier JSON ou CSV pour l'application Import/Export.
// Seuls des agrégats sortent ; toute valeur < 3 est masquée.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
export { Dhis2Error };

// ── Chiffrement du jeton (clé commune, server/secretBox.ts) ───────────────
function encryptToken(plain: string): string {
  try { return encryptSecret(plain); } catch { throw new Dhis2Error("NO_KEY", "Le serveur n'a pas de clé de chiffrement DHIS2 (DHIS2_TOKEN_KEY) : contactez GlowScan."); }
}
function decryptToken(enc: string): string {
  try { return decryptSecret(enc); } catch { throw new Dhis2Error("NO_KEY", "Jeton DHIS2 illisible : saisissez-le de nouveau."); }
}

// ── Agrégats du mois ──────────────────────────────────────────────────────
function monthBounds(period: string) {
  const y = Number(period.slice(0, 4)), m = Number(period.slice(4, 6)) - 1;
  // Mois calendaire à Douala (UTC+1).
  return { since: new Date(Date.UTC(y, m, 1) - 3600000).toISOString(), until: new Date(Date.UTC(y, m + 1, 1) - 3600000).toISOString() };
}

type Cell = { key: string; orgUnit: string | null; value: number };
/** Comptes du mois par clé GlowScan (et par centre si l'org unit est le centre). */
async function aggregates(programId: number, period: string, byCenter: boolean): Promise<Cell[]> {
  const { since, until } = monthBounds(period);
  const center = byCenter ? sql`hc.dhis2_org_unit_uid` : sql`NULL`;
  const cases = Rows(await db.execute(sql`
    SELECT c.derm_disease_code AS code, c.patient_sex AS sex, c.patient_age AS age, c.tier, ${center} AS ou
    FROM relay_cases c LEFT JOIN relays r ON r.pro_account_id = c.relay_id LEFT JOIN health_centers hc ON hc.id = r.health_center_id
    WHERE c.program_id = ${programId} AND c.status = 'answered' AND c.answered_at >= ${since} AND c.answered_at < ${until}`));
  const cells = new Map<string, Cell>();
  const add = (key: string, ou: string | null, n = 1) => { const k = `${key}|${ou}`; const c = cells.get(k) || { key, orgUnit: ou, value: 0 }; c.value += n; cells.set(k, c); };
  for (const c of cases) {
    const band = ageBandOf(c.age == null ? null : Number(c.age));
    const sex = c.sex === "F" || c.sex === "M" ? c.sex : null;
    if (!band || !sex) { add("_unknown", c.ou); continue; }
    if (c.code && c.code !== "autre") add(`disease:${c.code}:${sex}:${band}`, c.ou);
    if (c.tier === "urgent") add(`urgent:${sex}:${band}`, c.ou);
  }
  const refs = Rows(await db.execute(sql`
    SELECT ${center} AS ou,
      COUNT(*) FILTER (WHERE f.created_at >= ${since} AND f.created_at < ${until})::int AS referred,
      COUNT(*) FILTER (WHERE f.arrived_at >= ${since} AND f.arrived_at < ${until})::int AS arrived
    FROM hospital_referrals f JOIN relay_cases c ON c.id = f.case_id
    LEFT JOIN relays r ON r.pro_account_id = c.relay_id LEFT JOIN health_centers hc ON hc.id = r.health_center_id
    WHERE f.program_id = ${programId} GROUP BY 1`));
  for (const r of refs) { if (r.referred) add("referral:referred", r.ou, Number(r.referred)); if (r.arrived) add("referral:arrived", r.ou, Number(r.arrived)); }
  const trained = Rows(await db.execute(sql`
    SELECT ${center} AS ou, COUNT(*)::int AS n FROM program_members m JOIN relays r ON r.pro_account_id = m.relay_id
    LEFT JOIN health_centers hc ON hc.id = r.health_center_id
    WHERE m.program_id = ${programId} AND r.training_passed_at >= ${since} AND r.training_passed_at < ${until} GROUP BY 1`));
  for (const t of trained) if (t.n) add("agents:trained", t.ou, Number(t.n));
  return Array.from(cells.values());
}

/** dataValueSet du mois : correspondances appliquées, petites valeurs masquées. */
export async function buildDataValueSet(programId: number, period: string) {
  const conn = Rows(await db.execute(sql`SELECT * FROM dhis2_connections WHERE program_id = ${programId}`))[0];
  if (!conn?.data_set_uid) throw new Dhis2Error("NOT_CONFIGURED", "Renseignez d'abord le data set DHIS2.");
  const byCenter = conn.org_unit_mode === "center";
  if (!byCenter && !conn.org_unit_uid) throw new Dhis2Error("NOT_CONFIGURED", "Renseignez l'unité d'organisation (district).");
  const maps = new Map(Rows(await db.execute(sql`SELECT glowscan_key, data_element_uid, coc_uid FROM dhis2_mappings WHERE program_id = ${programId}`))
    .filter((m: any) => m.data_element_uid).map((m: any) => [m.glowscan_key, m]));
  const cells = await aggregates(programId, period, byCenter);
  // Plusieurs clés peuvent viser la même cellule DHIS2 : on additionne avant de masquer.
  const out = new Map<string, { dataElement: string; categoryOptionCombo?: string; orgUnit: string; value: number }>();
  let unmapped = 0;
  for (const c of cells) {
    const m: any = maps.get(c.key);
    const ou = byCenter ? c.orgUnit : conn.org_unit_uid;
    if (!m || !ou || c.key === "_unknown") { unmapped += c.value; continue; }
    const k = `${m.data_element_uid}|${m.coc_uid || ""}|${ou}`;
    const v = out.get(k) || { dataElement: m.data_element_uid, ...(m.coc_uid ? { categoryOptionCombo: m.coc_uid } : {}), orgUnit: ou, value: 0 };
    v.value += c.value;
    out.set(k, v);
  }
  let masked = 0;
  const dataValues = Array.from(out.values()).filter((v) => {
    if (v.value > 0 && v.value < DHIS2_MASK_MIN) { masked++; return false; }
    return v.value > 0;
  }).map((v) => ({ ...v, value: String(v.value) }));
  return { conn, payload: { dataSet: conn.data_set_uid, period, dataValues }, masked, unmapped };
}

function parseSummary(j: any) {
  const r = j?.response && (j.response.importCount || j.response.conflicts) ? j.response : j;
  const conflicts = Array.isArray(r?.conflicts) ? r.conflicts.slice(0, 50).map((c: any) => ({ object: c.object, value: c.value || c.errorCode || "" })) : [];
  return { importCount: r?.importCount || null, conflicts, status: String(r?.status || j?.status || "") };
}

/** Essai (dryRun) puis, si demandé et sans erreur, envoi réel. Chaque passage est journalisé. */
export async function exportToDhis2(programId: number, period: string, opts: { real: boolean; by: string }) {
  const { conn, payload, masked, unmapped } = await buildDataValueSet(programId, period);
  if (!conn.token_enc) throw new Dhis2Error("NOT_CONFIGURED", "Saisissez le jeton d'accès DHIS2.");
  const base = await checkBaseUrl(conn.base_url);
  const token = decryptToken(conn.token_enc);
  const call = async (dryRun: boolean) => {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(`${base}/api/dataValueSets?dryRun=${dryRun}&importStrategy=CREATE_AND_UPDATE`, {
        method: "POST", signal: ctrl.signal, redirect: "error",
        headers: { Authorization: `ApiToken ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) throw new Dhis2Error("AUTH", "Accès refusé par DHIS2 : vérifiez le jeton et ses droits.");
      if (!r.ok && r.status !== 409) throw new Dhis2Error("HTTP", `DHIS2 a répondu ${r.status}.`);
      return parseSummary(j);
    } catch (e: any) {
      if (e instanceof Dhis2Error) throw e;
      throw new Dhis2Error("UNREACHABLE", e?.name === "AbortError" ? "L'instance DHIS2 ne répond pas (30 s)." : "Instance DHIS2 injoignable.");
    } finally { clearTimeout(t); }
  };
  const log = async (mode: string, s: { importCount: any; conflicts: any[] } | null, error: string | null) => {
    const status = error ? "error" : s && s.conflicts.length ? "conflicts" : "ok";
    await db.execute(sql`
      INSERT INTO dhis2_exports (program_id, period, mode, status, values_count, masked_count, unmapped_count, import_count, conflicts, payload, error, created_by)
      VALUES (${programId}, ${period}, ${mode}, ${status}, ${payload.dataValues.length}, ${masked}, ${unmapped},
        ${s?.importCount ? JSON.stringify(s.importCount) : null}::jsonb, ${s ? JSON.stringify(s.conflicts) : null}::jsonb, ${JSON.stringify(payload)}::jsonb, ${error}, ${opts.by})`);
    await db.execute(sql`UPDATE dhis2_connections SET status = ${error ? "error" : "ok"}, last_test_at = NOW(), last_error = ${error} WHERE program_id = ${programId}`);
    return status;
  };
  let dry: any;
  try { dry = await call(true); }
  catch (e: any) { await log("dry_run", null, e.message); throw e; }
  const dryStatus = await log("dry_run", dry, null);
  if (!opts.real) return { mode: "dry_run", status: dryStatus, values: payload.dataValues.length, masked, unmapped, ...dry };
  if (dry.conflicts.length) throw new Dhis2Error("CONFLICTS", `L'essai signale ${dry.conflicts.length} conflit(s) : corrigez la correspondance avant l'envoi.`);
  let real: any;
  try { real = await call(false); }
  catch (e: any) { await log("import", null, e.message); throw e; }
  const status = await log("import", real, null);
  return { mode: "import", status, values: payload.dataValues.length, masked, unmapped, ...real };
}

// ── Fichier de secours (JSON ou CSV pour Import/Export) ─────────────────
function toCsv(p: { dataSet: string; period: string; dataValues: any[] }) {
  const head = "dataelement,period,orgunit,categoryoptioncombo,attributeoptioncombo,value";
  return [head, ...p.dataValues.map((v) => [v.dataElement, p.period, v.orgUnit, v.categoryOptionCombo || "", "", v.value].join(","))].join("\n");
}

export function registerDhis2Routes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  // ONG gestionnaire du programme, ou admin (clé) pour tout programme.
  const guard = async (req: any, res: any): Promise<number | null> => {
    const pid = Number(req.params.id);
    if (deps.checkAdmin(req)) return pid;
    if (!req.session?.userId) { res.status(401).json({ message: "Connexion requise" }); return null; }
    const ok = Rows(await db.execute(sql`
      SELECT 1 FROM program_managers m JOIN pro_accounts p ON p.id = m.pro_id WHERE m.program_id = ${pid} AND p.user_id = ${req.session.userId}`))[0];
    if (!ok) { res.status(404).json({ message: "Programme introuvable" }); return null; }
    return pid;
  };
  const fail = (res: any, e: any) => {
    if (e instanceof Dhis2Error) return res.status(e.code === "NO_KEY" ? 503 : 400).json({ code: e.code, message: e.message });
    console.error("[dhis2]", e);
    res.status(500).json({ message: "Erreur serveur" });
  };
  const periodOf = (v: any) => (/^\d{6}$/.test(String(v || "")) ? String(v) : previousPeriod());

  app.get("/api/program/:id/dhis2", async (req: any, res) => {
    try {
      const pid = await guard(req, res); if (!pid) return;
      const conn = Rows(await db.execute(sql`SELECT program_id, base_url, token_hint, data_set_uid, org_unit_uid, org_unit_mode, auto_send, status, last_test_at, last_error FROM dhis2_connections WHERE program_id = ${pid}`))[0] || null;
      const diseases = Rows(await db.execute(sql`SELECT disease_code FROM program_diseases WHERE program_id = ${pid}`)).map((r: any) => r.disease_code);
      const saved = new Map(Rows(await db.execute(sql`SELECT glowscan_key, data_element_uid, coc_uid FROM dhis2_mappings WHERE program_id = ${pid}`)).map((m: any) => [m.glowscan_key, m]));
      const mappings = dhis2Keys(diseases).map((k) => ({ key: k, label: dhis2KeyLabel(k), de: (saved.get(k) as any)?.data_element_uid || "", coc: (saved.get(k) as any)?.coc_uid || "" }));
      const centers = Rows(await db.execute(sql`
        SELECT DISTINCT hc.id, hc.name, hc.district, hc.dhis2_org_unit_uid AS uid FROM program_members m
        JOIN relays r ON r.pro_account_id = m.relay_id JOIN health_centers hc ON hc.id = r.health_center_id WHERE m.program_id = ${pid} ORDER BY hc.name`));
      const exports = Rows(await db.execute(sql`
        SELECT id, period, mode, status, values_count, masked_count, unmapped_count, import_count, conflicts, error, created_by, created_at
        FROM dhis2_exports WHERE program_id = ${pid} ORDER BY created_at DESC LIMIT 12`));
      res.json({ connection: conn, mappings, centers, exports, keyReady: (process.env.DHIS2_TOKEN_KEY || "").length >= 32, defaultPeriod: previousPeriod() });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/program/:id/dhis2", async (req: any, res) => {
    try {
      const pid = await guard(req, res); if (!pid) return;
      const d = z.object({
        baseUrl: z.string().min(8).max(200),
        token: z.string().trim().max(200).optional().nullable(),
        dataSetUid: z.string().regex(UID_RE).optional().nullable().or(z.literal("")),
        orgUnitUid: z.string().regex(UID_RE).optional().nullable().or(z.literal("")),
        orgUnitMode: z.enum(["district", "center"]).default("district"),
        autoSend: z.boolean().default(true),
      }).safeParse(req.body);
      if (!d.success) return res.status(400).json({ message: "Adresse, data set et unité d'organisation : les UID DHIS2 font 11 caractères." });
      const base = await checkBaseUrl(d.data.baseUrl);
      const tokenEnc = d.data.token ? encryptToken(d.data.token) : null;
      const hint = d.data.token ? `${d.data.token.slice(0, 6)}…${d.data.token.slice(-4)}` : null;
      await db.execute(sql`
        INSERT INTO dhis2_connections (program_id, base_url, token_enc, token_hint, data_set_uid, org_unit_uid, org_unit_mode, auto_send, updated_at)
        VALUES (${pid}, ${base}, ${tokenEnc}, ${hint}, ${d.data.dataSetUid || null}, ${d.data.orgUnitUid || null}, ${d.data.orgUnitMode}, ${d.data.autoSend}, NOW())
        ON CONFLICT (program_id) DO UPDATE SET base_url = EXCLUDED.base_url,
          token_enc = COALESCE(EXCLUDED.token_enc, dhis2_connections.token_enc), token_hint = COALESCE(EXCLUDED.token_hint, dhis2_connections.token_hint),
          data_set_uid = EXCLUDED.data_set_uid, org_unit_uid = EXCLUDED.org_unit_uid, org_unit_mode = EXCLUDED.org_unit_mode,
          auto_send = EXCLUDED.auto_send, updated_at = NOW()`);
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/program/:id/dhis2/mappings", async (req: any, res) => {
    const pid = await guard(req, res); if (!pid) return;
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 400) : [];
    const bad = rows.filter((r) => (r.de && !UID_RE.test(r.de)) || (r.coc && !UID_RE.test(r.coc)));
    if (bad.length) return res.status(400).json({ message: `UID invalide pour : ${bad.slice(0, 3).map((b) => dhis2KeyLabel(String(b.key))).join(", ")}.` });
    for (const r of rows) {
      await db.execute(sql`
        INSERT INTO dhis2_mappings (program_id, glowscan_key, data_element_uid, coc_uid) VALUES (${pid}, ${String(r.key).slice(0, 60)}, ${r.de || null}, ${r.coc || null})
        ON CONFLICT (program_id, glowscan_key) DO UPDATE SET data_element_uid = EXCLUDED.data_element_uid, coc_uid = EXCLUDED.coc_uid`);
    }
    res.json({ success: true });
  });

  app.post("/api/program/:id/dhis2/centers", async (req: any, res) => {
    const pid = await guard(req, res); if (!pid) return;
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 300) : [];
    for (const r of rows) {
      if (r.uid && !UID_RE.test(r.uid)) return res.status(400).json({ message: "UID d'unité d'organisation invalide (11 caractères)." });
      await db.execute(sql`
        UPDATE health_centers SET dhis2_org_unit_uid = ${r.uid || null} WHERE id = ${Number(r.id)}
          AND id IN (SELECT r2.health_center_id FROM program_members m JOIN relays r2 ON r2.pro_account_id = m.relay_id WHERE m.program_id = ${pid})`);
    }
    res.json({ success: true });
  });

  // « Tester » : essai à blanc (dryRun) ; « Envoyer » : essai puis envoi réel.
  for (const [path, real] of [["test", false], ["send", true]] as const) {
    app.post(`/api/program/:id/dhis2/${path}`, async (req: any, res) => {
      try {
        const pid = await guard(req, res); if (!pid) return;
        res.json(await exportToDhis2(pid, periodOf(req.body?.period), { real, by: deps.checkAdmin(req) ? "GlowScan" : "ONG" }));
      } catch (e) { fail(res, e); }
    });
  }

  app.get("/api/program/:id/dhis2/file", async (req: any, res) => {
    try {
      const pid = await guard(req, res); if (!pid) return;
      const period = periodOf(req.query.period);
      const { payload, masked, unmapped } = await buildDataValueSet(pid, period);
      await db.execute(sql`
        INSERT INTO dhis2_exports (program_id, period, mode, status, values_count, masked_count, unmapped_count, payload, created_by)
        VALUES (${pid}, ${period}, 'file', 'ok', ${payload.dataValues.length}, ${masked}, ${unmapped}, ${JSON.stringify(payload)}::jsonb, 'ONG')`);
      const csv = req.query.format === "csv";
      res.setHeader("Content-Type", csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="glowscan-dhis2-${pid}-${period}.${csv ? "csv" : "json"}"`);
      res.send(csv ? toCsv(payload) : JSON.stringify(payload, null, 2));
    } catch (e) { fail(res, e); }
  });
}

// ── Cron : le 5 de chaque mois, envoi du mois précédent ─────────────────
export async function runDhis2Monthly(): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  const conns = Rows(await db.execute(sql`
    SELECT c.program_id, g.name FROM dhis2_connections c JOIN programs g ON g.id = c.program_id
    WHERE c.auto_send AND c.token_enc IS NOT NULL AND g.status IN ('active', 'closed')`));
  const period = previousPeriod();
  for (const c of conns) {
    try {
      const r = await exportToDhis2(Number(c.program_id), period, { real: true, by: "cron" });
      if (r.status === "error" || r.status === "conflicts") throw new Error(`${r.conflicts?.length || 0} conflit(s)`);
      sent++;
    } catch (e: any) {
      failed++;
      await alertCoordinators(Number(c.program_id), `Envoi DHIS2 non abouti : ${c.name}`,
        `L'envoi automatique DHIS2 du mois ${period.slice(4)}/${period.slice(0, 4)} a échoué (${e?.message || "erreur"}). Ouvrez « Voir la correspondance » ou téléchargez le fichier pour l'importer à la main.`).catch(() => {});
    }
  }
  return { sent, failed };
}
