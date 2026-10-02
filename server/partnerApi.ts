import type { Express } from "express";
import crypto from "crypto";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount } from "./proRoutes";
import { uploadScanImageToStorage } from "./routes";
import { sendEmail } from "./email";
import { routeNewCase } from "./routing";
import { debitProgramForCase, BudgetError } from "./programBudget";
import { recordRelayCreditPayment } from "./wallet";
import { photoAsDataUrl } from "./referrals";
import { checkBaseUrl } from "./dhis2Net";
import { encryptSecret, decryptSecret, secretKeyReady } from "./secretBox";
import { RELAY_TIERS, RELAY_DISEASES } from "@shared/relay";
import { relayCaseRef, relayAnswer } from "@shared/teleexpertise";

// ════════════════════════════════════════════════════════════════════════
// Étape 16 · Bogou et API ouverte (ADDENDUM §7, écran O5).
//  · Bogou : pas d'API publique. Paquet du cas (PDF : dossier minimum, photos,
//    avis) téléchargé ou envoyé à l'adresse du cercle Bogou ; import manuel.
//  · API /api/v1/network pour tout partenaire : clé (hachée, montrée une fois),
//    journal d'accès, limite d'appels, cas débités du budget du programme
//    rattaché, webhooks signés HMAC (case.answered, referral.arrived).
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const dr = (n?: string | null) => `Dr ${String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim()}`;
const BACKOFF_MIN = [1, 5, 30, 120, 720];

// ── Webhooks ─────────────────────────────────────────────────────────────
export async function enqueueWebhook(partnerId: number | null | undefined, event: "case.answered" | "referral.arrived", payload: Record<string, unknown>) {
  if (!partnerId) return;
  const p = Rows(await db.execute(sql`SELECT webhook_url FROM api_partners WHERE id = ${partnerId} AND active`))[0];
  if (!p?.webhook_url) return;
  await db.execute(sql`INSERT INTO webhook_deliveries (partner_id, event, payload) VALUES (${partnerId}, ${event}, ${JSON.stringify({ event, ...payload, sentAt: new Date().toISOString() })}::jsonb)`);
}

/** Avis structuré (format 1b) d'un cas, pour l'API et le webhook case.answered. */
async function opinionOf(caseId: number) {
  const c = Rows(await db.execute(sql`
    SELECT c.*, d.full_name AS derm_name, d.license_number FROM relay_cases c LEFT JOIN pro_accounts d ON d.id = c.derm_id WHERE c.id = ${caseId}`))[0];
  if (!c || c.status !== "answered") return null;
  return {
    caseId: c.id, caseRef: relayCaseRef(c.id), externalRef: c.external_ref, answeredAt: c.answered_at,
    answer: relayAnswer(c.derm_verdict, c.relay_diagnosis, c.derm_diagnosis),
    submittedDiagnosis: c.relay_diagnosis, finalDiagnosis: c.derm_diagnosis || c.relay_diagnosis, diseaseCode: c.derm_disease_code,
    differentials: c.derm_ddx, plan: c.derm_plan, orientation: c.orientation, reviewIn: c.review_in,
    lesson: c.derm_note, photoQuality: c.photo_quality,
    dermatologist: { name: dr(c.derm_name), onmc: c.license_number || null },
  };
}
export async function notifyCaseAnswered(caseId: number) {
  const c = Rows(await db.execute(sql`SELECT partner_id FROM relay_cases WHERE id = ${caseId}`))[0];
  if (!c?.partner_id) return;
  const op = await opinionOf(caseId);
  if (op) await enqueueWebhook(Number(c.partner_id), "case.answered", { case: op });
}

export async function runWebhookDeliveries(): Promise<{ delivered: number; failed: number }> {
  let delivered = 0, failed = 0;
  const rows = Rows(await db.execute(sql`
    SELECT w.id, w.event, w.payload, w.attempts, p.webhook_url, p.webhook_secret_enc FROM webhook_deliveries w JOIN api_partners p ON p.id = w.partner_id
    WHERE w.status = 'pending' AND w.next_attempt_at <= NOW() AND p.active ORDER BY w.next_attempt_at ASC LIMIT 50`));
  for (const w of rows) {
    const body = JSON.stringify(w.payload);
    let error: string | null = null;
    try {
      const url = await checkBaseUrl(w.webhook_url);
      const sig = w.webhook_secret_enc ? crypto.createHmac("sha256", decryptSecret(w.webhook_secret_enc)).update(body).digest("hex") : "";
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, { method: "POST", signal: ctrl.signal, redirect: "error", headers: { "Content-Type": "application/json", "X-GlowScan-Event": w.event, "X-GlowScan-Delivery": String(w.id), "X-GlowScan-Signature": `sha256=${sig}` }, body }).finally(() => clearTimeout(t));
      if (!r.ok) error = `HTTP ${r.status}`;
    } catch (e: any) { error = e?.message || "injoignable"; }
    if (!error) { await db.execute(sql`UPDATE webhook_deliveries SET status = 'delivered', delivered_at = NOW(), attempts = attempts + 1, last_error = NULL WHERE id = ${w.id}`); delivered++; continue; }
    const attempts = Number(w.attempts) + 1;
    if (attempts > BACKOFF_MIN.length) { await db.execute(sql`UPDATE webhook_deliveries SET status = 'failed', attempts = ${attempts}, last_error = ${error} WHERE id = ${w.id}`); failed++; }
    else await db.execute(sql`UPDATE webhook_deliveries SET attempts = ${attempts}, last_error = ${error}, next_attempt_at = NOW() + make_interval(mins => ${BACKOFF_MIN[attempts - 1]}) WHERE id = ${w.id}`);
  }
  return { delivered, failed };
}

// ── Clés partenaires ─────────────────────────────────────────────────────
function newKey() {
  const prefix = `gsk_${crypto.randomBytes(4).toString("hex")}`;
  const key = `${prefix}_${crypto.randomBytes(24).toString("base64url")}`;
  return { prefix, key, hash: sha256(key) };
}
const windows = new Map<number, { start: number; n: number }>();

// ── Spécification OpenAPI (format unique pour tous les partenaires) ──────
const openapi = {
  openapi: "3.0.3",
  info: { title: "GlowScan · API réseau", version: "1.0.0", description: "Envoi de cas de dermatologie à un dermatologue du réseau GlowScan et récupération de l'avis structuré. Authentification : Authorization: Bearer <clé partenaire>." },
  servers: [{ url: `${BASE}/api/v1/network` }],
  components: {
    securitySchemes: { partnerKey: { type: "http", scheme: "bearer" } },
    schemas: {
      CaseIn: {
        type: "object", required: ["externalRef", "hypothesis", "tier", "photos"],
        properties: {
          externalRef: { type: "string", maxLength: 80, description: "Votre référence du cas (unique chez vous ; renvoyer la même ne crée pas de doublon)." },
          patient: { type: "object", properties: { age: { type: "integer" }, sex: { type: "string", enum: ["F", "M"] } } },
          zone: { type: "string" }, symptoms: { type: "string" },
          hypothesis: { type: "string", description: "Diagnostic proposé par le soignant ou question posée." },
          diseaseCode: { type: "string", enum: RELAY_DISEASES.map((d) => d.code) },
          tier: { type: "string", enum: ["simple", "urgent"], description: "simple : réponse sous 24 h ; urgent : sous 2 h." },
          photos: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", description: "Image en data URL base64 (JPEG ou PNG)." } },
          language: { type: "string", enum: ["fr", "en"] },
          crossBorderConsent: { type: "boolean", description: "Accord du patient pour un avis donné depuis un autre pays du réseau." },
        },
      },
      Opinion: { type: "object", properties: { caseRef: { type: "string" }, answer: { type: "string" }, finalDiagnosis: { type: "string" }, differentials: { type: "string" }, plan: { type: "string" }, orientation: { type: "string" }, reviewIn: { type: "string" }, dermatologist: { type: "object" } } },
    },
  },
  security: [{ partnerKey: [] }],
  paths: {
    "/cases": { post: { summary: "Envoyer un cas", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CaseIn" } } } }, responses: { "201": { description: "Cas reçu" }, "402": { description: "Budget du programme épuisé" }, "409": { description: "Aucun dermatologue disponible" }, "429": { description: "Trop d'appels" } } } },
    "/cases/{id}": { get: { summary: "Statut d'un cas", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Statut" } } } },
    "/cases/{id}/opinion": { get: { summary: "Avis du dermatologue", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Avis", content: { "application/json": { schema: { $ref: "#/components/schemas/Opinion" } } } }, "409": { description: "Avis pas encore rendu" } } } },
  },
  "x-webhooks": {
    "case.answered": "POST sur votre webhook avec { event, case: Opinion }. En-tête X-GlowScan-Signature: sha256=<HMAC-SHA256 du corps avec votre secret>.",
    "referral.arrived": "POST avec { event, caseId, externalRef, referralCode, arrivedAt } quand l'hôpital confirme l'arrivée du patient.",
  },
};

export function registerPartnerRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  app.get("/api/v1/network/openapi.json", (_req, res) => res.json(openapi));

  // Authentification partenaire, limite d'appels, journal d'accès.
  const partnerAuth = async (req: any, res: any, next: any) => {
    const m = /^Bearer\s+(gsk_[a-f0-9]{8}_[A-Za-z0-9_-]+)$/.exec(String(req.headers.authorization || ""));
    const p = m ? Rows(await db.execute(sql`SELECT * FROM api_partners WHERE key_prefix = ${m[1].slice(0, 12)} AND active`))[0] : null;
    const ok = p && crypto.timingSafeEqual(Buffer.from(sha256(m![1])), Buffer.from(String(p.key_hash)));
    res.on("finish", () => {
      db.execute(sql`INSERT INTO partner_access_log (partner_id, method, path, status, ip) VALUES (${ok ? p.id : null}, ${req.method}, ${String(req.originalUrl).slice(0, 200)}, ${res.statusCode}, ${String(req.ip || "").slice(0, 64)})`).catch(() => {});
    });
    if (!ok) return res.status(401).json({ error: "unauthorized", message: "Clé partenaire invalide ou révoquée." });
    const now = Date.now(), w = windows.get(p.id);
    if (!w || now - w.start > 60000) windows.set(p.id, { start: now, n: 1 });
    else if (++w.n > Number(p.rate_limit_per_min)) return res.status(429).json({ error: "rate_limited", message: "Trop d'appels : réessayez dans une minute." });
    db.execute(sql`UPDATE api_partners SET last_used_at = NOW() WHERE id = ${p.id}`).catch(() => {});
    req.partner = p;
    next();
  };

  app.post("/api/v1/network/cases", partnerAuth, async (req: any, res) => {
    const p = req.partner;
    const parsed = z.object({
      externalRef: z.string().trim().min(1).max(80),
      patient: z.object({ age: z.number().int().min(0).max(120).optional(), sex: z.enum(["F", "M"]).optional() }).optional().default({}),
      zone: z.string().max(80).optional(), symptoms: z.string().max(1500).optional(),
      hypothesis: z.string().trim().min(2).max(200),
      diseaseCode: z.string().max(40).optional(),
      tier: z.enum(["simple", "urgent"]),
      photos: z.array(z.string().regex(/^data:image\/(jpeg|jpg|png);base64,/)).min(1).max(3),
      language: z.enum(["fr", "en"]).optional().default("fr"),
      crossBorderConsent: z.boolean().optional().default(false),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid", message: "Cas incomplet ou invalide : voir /api/v1/network/openapi.json.", issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join(".")) });
    const d = parsed.data;
    try {
      const exists = Rows(await db.execute(sql`SELECT id, status FROM relay_cases WHERE partner_id = ${p.id} AND external_ref = ${d.externalRef}`))[0];
      if (exists) return res.status(200).json({ id: exists.id, caseRef: relayCaseRef(exists.id), status: exists.status, duplicate: true });
      const code = d.diseaseCode && RELAY_DISEASES.some((x) => x.code === d.diseaseCode) ? d.diseaseCode : "autre";
      const urls: string[] = [];
      for (const ph of d.photos) { const u = await uploadScanImageToStorage(ph).catch(() => null); if (u) urls.push(u); }
      if (!urls.length) return res.status(400).json({ error: "photos", message: "Photos illisibles." });
      const tier = RELAY_TIERS[d.tier];
      const row = Rows(await db.execute(sql`
        INSERT INTO relay_cases (relay_id, patient_age, patient_sex, zone, symptoms, photos, relay_diagnosis, relay_disease_code, tier, price_fcfa,
          payer, program_id, status, payment_status, language, cross_border_consent_at, source, external_ref, partner_id, fx_currency, fx_rate)
        VALUES (${p.owner_pro_id}, ${d.patient.age ?? null}, ${d.patient.sex ?? null}, ${d.zone || null}, ${d.symptoms || null}, ${JSON.stringify(urls)}::jsonb,
          ${d.hypothesis}, ${code}, ${d.tier}, ${tier.priceFcfa}, 'program', ${p.program_id}, 'awaiting_payment', 'pending', ${d.language},
          ${d.crossBorderConsent ? sql`NOW()` : null}, 'partner', ${d.externalRef}, ${p.id}, 'XAF', 1)
        RETURNING id`))[0];
      const caseId = Number(row.id);
      const routed = await routeNewCase(caseId);
      if (!routed) {
        await db.execute(sql`DELETE FROM relay_cases WHERE id = ${caseId}`);
        return res.status(409).json({ error: "no_dermatologist", message: "Aucun dermatologue disponible pour le moment." });
      }
      try { await debitProgramForCase(Number(p.program_id), caseId, tier.priceFcfa, code === "autre" ? null : code); }
      catch (e: any) {
        await db.execute(sql`DELETE FROM relay_cases WHERE id = ${caseId}`);
        if (e instanceof BudgetError) return res.status(402).json({ error: e.code.toLowerCase(), message: e.message });
        throw e;
      }
      await recordRelayCreditPayment(caseId);
      const due = Rows(await db.execute(sql`
        UPDATE relay_cases SET payment_status = 'program', paid_at = NOW(), status = 'awaiting_review', due_at = NOW() + make_interval(hours => ${tier.hours})
        WHERE id = ${caseId} RETURNING due_at, derm_id`))[0];
      if (due?.derm_id) notifyProAccount(Number(due.derm_id), { title: d.tier === "urgent" ? "Avis urgent demandé (2 h)" : "Nouvel avis du réseau", body: `${p.name} : ${d.hypothesis}`, url: "/derm/reseau" }).catch(() => {});
      res.status(201).json({ id: caseId, caseRef: relayCaseRef(caseId), status: "awaiting_review", dueAt: due?.due_at });
    } catch (e: any) {
      if (String(e?.message || "").includes("relay_cases_partner_ref_uidx")) return res.status(409).json({ error: "duplicate", message: "externalRef déjà utilisé." });
      console.error("[api/v1 cases]", e);
      res.status(500).json({ error: "server", message: "Erreur serveur" });
    }
  });

  app.get("/api/v1/network/cases/:id", partnerAuth, async (req: any, res) => {
    const c = Rows(await db.execute(sql`
      SELECT c.id, c.external_ref, c.status, c.due_at, c.answered_at, f.code AS referral_code, f.status AS referral_status
      FROM relay_cases c LEFT JOIN hospital_referrals f ON f.case_id = c.id WHERE c.id = ${Number(req.params.id)} AND c.partner_id = ${req.partner.id}`))[0];
    if (!c) return res.status(404).json({ error: "not_found", message: "Cas introuvable." });
    res.json({ id: c.id, caseRef: relayCaseRef(c.id), externalRef: c.external_ref, status: c.status, dueAt: c.due_at, answeredAt: c.answered_at,
      referral: c.referral_code ? { code: c.referral_code, status: c.referral_status } : null });
  });

  app.get("/api/v1/network/cases/:id/opinion", partnerAuth, async (req: any, res) => {
    const c = Rows(await db.execute(sql`SELECT id, status FROM relay_cases WHERE id = ${Number(req.params.id)} AND partner_id = ${req.partner.id}`))[0];
    if (!c) return res.status(404).json({ error: "not_found", message: "Cas introuvable." });
    const op = await opinionOf(Number(c.id));
    if (!op) return res.status(409).json({ error: "not_answered", message: "L'avis n'est pas encore rendu.", status: c.status });
    res.json(op);
  });

  // ── Bogou : paquet du cas (relais ou dermatologue du cas) ─────────────
  const caseForPro = async (caseId: number, proId: number) => Rows(await db.execute(sql`
    SELECT c.*, d.full_name AS derm_name, d.license_number, r.full_name AS relay_name, g.bogou_email
    FROM relay_cases c LEFT JOIN pro_accounts d ON d.id = c.derm_id LEFT JOIN pro_accounts r ON r.id = c.relay_id LEFT JOIN programs g ON g.id = c.program_id
    WHERE c.id = ${caseId} AND (c.relay_id = ${proId} OR c.derm_id = ${proId})`))[0];

  app.get("/api/relay/cases/:id/package", requireActivePro, async (req: any, res) => {
    const c = await caseForPro(Number(req.params.id), req.proAccount.id);
    if (!c) return res.status(404).send("Cas introuvable");
    const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
    const photos: string[] = [];
    for (const ph of (Array.isArray(c.photos) ? c.photos : []).slice(0, 3)) { const u = await photoAsDataUrl(String(ph)); if (u) photos.push(u); }
    const op = await opinionOf(Number(c.id));
    const ref = relayCaseRef(c.id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Dossier ${esc(ref)}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#f5ead8;font-family:'Figtree',sans-serif;color:#201e1d}.sheet{background:#fffaf2;max-width:760px;margin:24px auto;padding:36px;border-radius:18px}p{font-size:14px;line-height:1.6;margin:0 0 8px}h2{font-family:'Caprasimo',serif;font-weight:400;font-size:19px;margin:20px 0 8px}
@media(max-width:600px){.sheet{margin:0;border-radius:0;padding:22px 18px}}@media print{body{background:#fff}.no-print{display:none}}</style></head><body>
<div id="doc"><div class="sheet">
<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8c491a">GlowScan · dossier de télé-expertise</div>
<div style="font-family:'Caprasimo',serif;font-size:28px;margin:6px 0">${esc(ref)}</div>
<p>${esc([c.patient_sex === "F" ? "Femme" : c.patient_sex === "M" ? "Homme" : null, c.patient_age != null ? `${c.patient_age} ans` : null, c.zone].filter(Boolean).join(" · ") || "Patient anonymisé")} · Anonymisé (ni nom ni téléphone)</p>
${c.symptoms ? `<p><b>Observé par le soignant :</b> ${esc(c.symptoms)}</p>` : ""}
<p><b>Hypothèse du soignant :</b> ${esc(c.relay_diagnosis)}${c.ai_diagnosis ? ` · <b>Analyse IA (indicative) :</b> ${esc(c.ai_diagnosis)}` : ""}</p>
${photos.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">${photos.map((u) => `<img src="${u}" style="width:200px;height:200px;object-fit:cover;border-radius:12px"/>`).join("")}</div>` : ""}
${op ? `<h2>Avis du dermatologue</h2><p>${esc(op.dermatologist.name)}${op.dermatologist.onmc ? ` · ONMC ${esc(op.dermatologist.onmc)}` : ""}</p>
<p><b>Réponse :</b> ${esc(op.answer)}</p><p><b>Diagnostic retenu :</b> ${esc(op.finalDiagnosis)}</p>${op.differentials ? `<p><b>À écarter :</b> ${esc(op.differentials)}</p>` : ""}
${op.plan ? `<p style="white-space:pre-wrap"><b>Conduite à tenir :</b> ${esc(op.plan)}</p>` : ""}${op.orientation ? `<p><b>Orientation :</b> ${esc(op.orientation)}</p>` : ""}${op.reviewIn ? `<p><b>Revoir :</b> ${esc(op.reviewIn)}</p>` : ""}`
      : `<p><i>Avis du dermatologue pas encore rendu.</i></p>`}
<p style="font-size:12px;color:#645c50;margin-top:18px">Exporté de GlowScan le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" })}. Document de télé-expertise ; le soignant local reste responsable du patient.</p>
</div></div>
<div class="no-print" style="max-width:760px;margin:0 auto 32px;padding:0 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center">
  <button id="dl" style="background:#c67139;color:#fff;border:0;border-radius:999px;padding:12px 22px;font:700 14px 'Figtree',sans-serif;cursor:pointer">Télécharger le PDF</button>
  <input id="to" type="email" value="${esc(c.bogou_email || "")}" placeholder="Adresse du cercle Bogou" style="height:44px;border:1px solid #d8c8ae;border-radius:999px;padding:0 14px;font:14px 'Figtree',sans-serif;min-width:240px"/>
  <button id="send" style="background:#728157;color:#fff;border:0;border-radius:999px;padding:12px 22px;font:700 14px 'Figtree',sans-serif;cursor:pointer">Envoyer au cercle Bogou</button>
  <span id="msg" style="width:100%;text-align:center;font-size:13px"></span>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  var opts = { margin: 0, filename: ${JSON.stringify(`${ref}.pdf`)}, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } };
  document.getElementById("dl").onclick = function () { if (!window.html2pdf) return window.print(); window.html2pdf().set(opts).from(document.getElementById("doc")).save(); };
  document.getElementById("send").onclick = function () {
    var to = document.getElementById("to").value.trim(), msg = document.getElementById("msg");
    if (!/.+@.+\\..+/.test(to)) { msg.textContent = "Saisissez l'adresse email du cercle Bogou."; return; }
    if (!window.html2pdf) { msg.textContent = "Génération du PDF indisponible : téléchargez-le puis envoyez-le vous-même."; return; }
    msg.textContent = "Envoi…";
    window.html2pdf().set(opts).from(document.getElementById("doc")).outputPdf("datauristring").then(function (pdf) {
      return fetch(${JSON.stringify(`/api/relay/cases/${c.id}/package/email`)}, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: to, pdf: pdf }) });
    }).then(function (r) { return r.json().then(function (d) { msg.textContent = r.ok ? "Dossier envoyé au cercle Bogou." : (d.message || "Envoi impossible."); }); })
      .catch(function () { msg.textContent = "Envoi impossible : téléchargez le PDF."; });
  };
</script></body></html>`);
  });

  app.post("/api/relay/cases/:id/package/email", requireActivePro, async (req: any, res) => {
    const c = await caseForPro(Number(req.params.id), req.proAccount.id);
    if (!c) return res.status(404).json({ message: "Cas introuvable" });
    const to = String(req.body?.to || "").trim();
    const pdf = String(req.body?.pdf || "").replace(/^data:application\/pdf;[^,]*base64,/, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ message: "Adresse email invalide." });
    if (pdf.length < 100 || pdf.length > 14_000_000) return res.status(400).json({ message: "PDF invalide." });
    const ref = relayCaseRef(c.id);
    const out = await sendEmail(to, `Dossier GlowScan ${ref} (télé-expertise)`,
      `<p>Bonjour,</p><p>Veuillez trouver ci-joint le dossier de télé-expertise <b>${ref}</b> partagé depuis GlowScan par ${String(req.proAccount.fullName || "un soignant du réseau")} : dossier minimum anonymisé, photos et avis.</p><p>L'équipe GlowScan</p>`,
      `Dossier GlowScan ${ref} (PDF joint).`, [{ filename: `GlowScan-${ref}.pdf`, content: pdf }]);
    if (!out.ok) return res.status(502).json({ message: "L'email n'est pas parti. Téléchargez le PDF." });
    await db.execute(sql`UPDATE relay_cases SET bogou_shared_at = NOW() WHERE id = ${c.id}`);
    res.json({ success: true });
  });

  // ── O5 côté ONG : cartes Bogou et « Autres plateformes » ──────────────
  const manages = async (req: any, pid: number) => !!Rows(await db.execute(sql`
    SELECT 1 FROM program_managers m JOIN pro_accounts p ON p.id = m.pro_id WHERE m.program_id = ${pid} AND p.user_id = ${req.session?.userId || ""}`))[0];
  app.get("/api/program/:id/connectors", requireActivePro, async (req: any, res) => {
    const pid = Number(req.params.id);
    if (!(await manages(req, pid))) return res.status(404).json({ message: "Programme introuvable" });
    const g = Rows(await db.execute(sql`SELECT bogou_email FROM programs WHERE id = ${pid}`))[0];
    const shared = Number(Rows(await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM relay_cases WHERE program_id = ${pid} AND bogou_shared_at >= date_trunc('quarter', NOW())`))[0]?.n) || 0;
    const imported = Number(Rows(await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM relay_cases WHERE program_id = ${pid} AND source = 'bogou' AND created_at >= date_trunc('quarter', NOW())`))[0]?.n) || 0;
    const parts = Rows(await db.execute(sql`
      SELECT p.name, p.kind, p.active, (SELECT COUNT(*)::int FROM relay_cases c WHERE c.partner_id = p.id) AS cases FROM api_partners p WHERE p.program_id = ${pid} ORDER BY p.name`));
    res.json({ bogouEmail: g?.bogou_email || "", bogouShared: shared, bogouImported: imported, partners: parts });
  });
  app.post("/api/program/:id/bogou", requireActivePro, async (req: any, res) => {
    const pid = Number(req.params.id);
    if (!(await manages(req, pid))) return res.status(404).json({ message: "Programme introuvable" });
    const email = String(req.body?.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Adresse email invalide." });
    await db.execute(sql`UPDATE programs SET bogou_email = ${email || null} WHERE id = ${pid}`);
    res.json({ success: true });
  });

  // ── Admin : partenaires ───────────────────────────────────────────────
  app.get("/api/admin/api-partners", admin, async (_req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`
      SELECT p.id, p.name, p.kind, p.program_id, g.name AS program, p.key_prefix, p.webhook_url, p.rate_limit_per_min, p.active, p.last_used_at, p.created_at,
        (SELECT COUNT(*)::int FROM relay_cases c WHERE c.partner_id = p.id) AS cases,
        (SELECT COUNT(*)::int FROM webhook_deliveries w WHERE w.partner_id = p.id AND w.status = 'failed') AS failed_webhooks
      FROM api_partners p JOIN programs g ON g.id = p.program_id ORDER BY p.created_at DESC`)), keyReady: secretKeyReady() });
  });
  app.post("/api/admin/api-partners", admin, async (req: any, res) => {
    const d = z.object({
      name: z.string().trim().min(2).max(120), kind: z.enum(["bogou", "telemed", "hospital", "ministry", "other"]),
      programId: z.number().int(), webhookUrl: z.string().max(300).optional().nullable().or(z.literal("")),
      rateLimit: z.number().int().min(5).max(600).optional().default(60),
    }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Nom, type et programme requis." });
    try {
      const prog = Rows(await db.execute(sql`SELECT id, country FROM programs WHERE id = ${d.data.programId}`))[0];
      if (!prog) return res.status(404).json({ message: "Programme introuvable" });
      const webhook = d.data.webhookUrl ? await checkBaseUrl(d.data.webhookUrl) : null;
      const secret = webhook ? crypto.randomBytes(24).toString("base64url") : null;
      if (secret && !secretKeyReady()) return res.status(503).json({ message: "Clé de chiffrement absente (DHIS2_TOKEN_KEY)." });
      const k = newKey();
      // Compte technique qui porte les cas du partenaire (ne peut pas se connecter : pas de mot de passe).
      const u = Rows(await db.execute(sql`INSERT INTO users (email, first_name, role) VALUES (${`${k.prefix}@partners.glowscan.cm`}, ${d.data.name}, 'partner') RETURNING id`))[0];
      const acc = Rows(await db.execute(sql`
        INSERT INTO pro_accounts (user_id, full_name, cabinet_name, country, trial_ends_at, subscription_status, consent_signed_at, profile)
        VALUES (${u.id}, ${d.data.name}, ${d.data.name}, ${prog.country || "Cameroun"}, NOW() + INTERVAL '100 years', 'active', NOW(), 'relay') RETURNING id`))[0];
      const p = Rows(await db.execute(sql`
        INSERT INTO api_partners (name, kind, program_id, owner_pro_id, key_prefix, key_hash, webhook_url, webhook_secret_enc, rate_limit_per_min)
        VALUES (${d.data.name}, ${d.data.kind}, ${prog.id}, ${acc.id}, ${k.prefix}, ${k.hash}, ${webhook}, ${secret ? encryptSecret(secret) : null}, ${d.data.rateLimit})
        RETURNING id`))[0];
      // La clé et le secret ne sont montrés qu'ici, une seule fois.
      res.json({ id: p.id, apiKey: k.key, webhookSecret: secret });
    } catch (e: any) {
      if (e?.code === "BAD_URL") return res.status(400).json({ message: e.message });
      console.error("[admin/api-partners]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
  app.post("/api/admin/api-partners/:id/active", admin, async (req: any, res) => {
    await db.execute(sql`UPDATE api_partners SET active = ${req.body?.active === true} WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  });
  app.post("/api/admin/api-partners/:id/rotate", admin, async (req: any, res) => {
    const k = newKey();
    const r = Rows(await db.execute(sql`UPDATE api_partners SET key_prefix = ${k.prefix}, key_hash = ${k.hash} WHERE id = ${Number(req.params.id)} RETURNING id`))[0];
    if (!r) return res.status(404).json({ message: "Partenaire introuvable" });
    res.json({ apiKey: k.key });
  });
  app.get("/api/admin/api-partners/:id/log", admin, async (req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`SELECT method, path, status, ip, created_at FROM partner_access_log WHERE partner_id = ${Number(req.params.id)} ORDER BY created_at DESC LIMIT 100`)) });
  });
}

