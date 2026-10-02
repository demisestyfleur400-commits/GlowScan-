import type { Express } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount, notifyOwner } from "./proRoutes";
import { sendSmsText } from "./whatsapp";
import { alertCoordinators } from "./programBudget";
import { RELAY_TIERS } from "@shared/relay";
import { NETWORK_COUNTRIES } from "@shared/peer";
import { SPLITS, splitQuality } from "@shared/splits";

// ════════════════════════════════════════════════════════════════════════
// Étape 14b · Orientations vers l'hôpital (O4, R7) et relecture qualité.
//  · Le dermatologue oriente : fiche REF-XXXX, hôpital proposé (même district,
//    sinon le plus proche), code à 6 chiffres remis au patient (SMS sans
//    donnée de santé). L'hôpital confirme l'arrivée sur /ref/REF-XXXX avec ce
//    code, sans compte, et peut déposer son compte rendu en PDF.
//    J+7 sans arrivée : SMS patient et relais ; J+10 : alerte à l'ONG.
//  · Relecture qualité : 1 avis de programme sur 10, 2e dermatologue, payée
//    par le budget du programme comme un avis simple (SPLITS.quality 80/20).
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const dr = (n?: string | null) => `Dr ${String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim()}`;
export const QUALITY_RATE = 0.1;
const QUALITY_HOURS = 48;
const QUALITY_PRICE = RELAY_TIERS.simple.priceFcfa;

// ── Hôpitaux proposés : même district d'abord, puis distance GPS ────────
export async function proposeHospitals(caseId: number) {
  const c = Rows(await db.execute(sql`
    SELECT COALESCE(r.country, p.country, 'Cameroun') AS country, hc.district, hc.lat, hc.lng
    FROM relay_cases rc JOIN pro_accounts p ON p.id = rc.relay_id
    LEFT JOIN relays r ON r.pro_account_id = rc.relay_id LEFT JOIN health_centers hc ON hc.id = r.health_center_id
    WHERE rc.id = ${caseId}`))[0];
  if (!c) return [];
  const rows = Rows(await db.execute(sql`
    SELECT id, name, service, city, district, phone,
      CASE WHEN lat IS NOT NULL AND ${c.lat}::float8 IS NOT NULL
        THEN 6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS(lat - ${c.lat}::float8) / 2), 2) + COS(RADIANS(${c.lat}::float8)) * COS(RADIANS(lat)) * POWER(SIN(RADIANS(lng - ${c.lng}::float8) / 2), 2)))
        ELSE NULL END AS km
    FROM hospitals WHERE active AND country = ${c.country}
    ORDER BY (lower(COALESCE(district, '')) = lower(COALESCE(${c.district}, '~'))) DESC, km ASC NULLS LAST, name ASC LIMIT 8`));
  return rows.map((h: any) => ({ id: h.id, name: h.name, service: h.service, city: h.city, district: h.district, km: h.km == null ? null : Math.round(Number(h.km)) }));
}

async function uniqueCode(letterSource: string | null): Promise<string> {
  const letter = (String(letterSource || "X").normalize("NFD").replace(/[^A-Za-z]/g, "")[0] || "X").toUpperCase();
  for (let i = 0; i < 20; i++) {
    const code = `REF-${letter}${crypto.randomInt(100, 1000)}`;
    if (!Rows(await db.execute(sql`SELECT 1 FROM hospital_referrals WHERE code = ${code}`))[0]) return code;
  }
  return `REF-${letter}${crypto.randomInt(1000, 10000)}`;
}

function ficheSms(code: string, hospital: string | null, arrival: string) {
  return `GlowScan : fiche de référence ${code}. Présentez-vous ${hospital ? `à ${hospital}` : "à l'hôpital indiqué par votre soignant"} avec ce code : ${arrival}. Gardez ce message.`;
}

/** Orientation décidée par le dermatologue dans son avis : crée la fiche (une par cas). */
export async function createReferral(caseId: number, urgent: boolean, hospitalId: number | null) {
  const exists = Rows(await db.execute(sql`SELECT id FROM hospital_referrals WHERE case_id = ${caseId}`))[0];
  if (exists) return Number(exists.id);
  const c = Rows(await db.execute(sql`SELECT relay_id, program_id, patient_phone FROM relay_cases WHERE id = ${caseId}`))[0];
  if (!c) return null;
  const proposals = hospitalId ? [] : await proposeHospitals(caseId);
  const hid = hospitalId || proposals[0]?.id || null;
  const h = hid ? Rows(await db.execute(sql`SELECT name, city, district FROM hospitals WHERE id = ${hid}`))[0] : null;
  const code = await uniqueCode(h?.city || h?.district || null);
  const arrival = String(crypto.randomInt(100000, 1000000));
  const r = Rows(await db.execute(sql`
    INSERT INTO hospital_referrals (code, case_id, hospital_id, program_id, urgency, arrival_code)
    VALUES (${code}, ${caseId}, ${hid}, ${c.program_id ?? null}, ${urgent ? "urgent" : "consultation"}, ${arrival})
    ON CONFLICT (case_id) DO NOTHING RETURNING id`))[0];
  if (!r) return null;
  if (c.patient_phone) {
    const ok = (await sendSmsText(`+${c.patient_phone}`, ficheSms(code, h?.name || null, arrival)).catch(() => ({ ok: false }))).ok;
    if (ok) await db.execute(sql`UPDATE hospital_referrals SET patient_sms_at = NOW() WHERE id = ${r.id}`);
  }
  notifyProAccount(Number(c.relay_id), { title: `Orientation vers l'hôpital · ${code}`, body: urgent ? "Orientation urgente : remettez la fiche au patient." : "Remettez la fiche au patient.", url: "/derm/relais" }).catch(() => {});
  return Number(r.id);
}

// ── Relecture qualité ─────────────────────────────────────────────────────
/** Après un avis de programme : 1 sur 10 part en relecture chez un 2e dermatologue (budget du programme). */
export async function maybeCreateQualityReview(caseId: number, force = false) {
  if (!force && Math.random() >= QUALITY_RATE) return null;
  const c = Rows(await db.execute(sql`SELECT id, program_id, derm_id, language FROM relay_cases WHERE id = ${caseId} AND payment_status = 'program' AND status = 'answered'`))[0];
  if (!c?.program_id) return null;
  const reviewer = Rows(await db.execute(sql`
    SELECT p.id FROM pro_accounts p
    WHERE COALESCE(p.profile, 'derm') = 'derm' AND p.id <> ${c.derm_id} AND ${c.language || "fr"} = ANY(p.languages)
      AND ((p.subscription_status = 'active' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > NOW())) OR (p.subscription_status = 'trial' AND p.trial_ends_at > NOW()))
    ORDER BY (SELECT COUNT(*) FROM quality_reviews q WHERE q.reviewer_id = p.id AND q.status = 'pending') ASC, random() LIMIT 1`))[0];
  if (!reviewer) return null;
  try {
    // Réservé sur le budget du programme ; rendu si la relecture n'est pas faite à temps.
    const debit = Rows(await db.execute(sql`
      INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, case_id, status, confirmed_at)
      SELECT ${c.program_id}, 'quality', ${-QUALITY_PRICE}, ${caseId}, 'confirmed', NOW()
      WHERE (SELECT COALESCE(SUM(amount_fcfa), 0) FROM program_budget_ledger WHERE program_id = ${c.program_id} AND status = 'confirmed') >= ${QUALITY_PRICE}
      ON CONFLICT (case_id, kind) WHERE case_id IS NOT NULL DO NOTHING RETURNING id`))[0];
    if (!debit) return null;
    const q = Rows(await db.execute(sql`
      INSERT INTO quality_reviews (case_id, program_id, reviewer_id, price_fcfa, due_at)
      VALUES (${caseId}, ${c.program_id}, ${reviewer.id}, ${QUALITY_PRICE}, NOW() + make_interval(hours => ${QUALITY_HOURS}))
      ON CONFLICT (case_id) DO NOTHING RETURNING id`))[0];
    if (q) notifyProAccount(Number(reviewer.id), { title: "Relecture qualité demandée", body: `Un avis de programme à relire sous ${QUALITY_HOURS} h (${splitQuality(QUALITY_PRICE).reviewer.toLocaleString("fr-FR")} F pour vous).`, url: "/derm/reseau" }).catch(() => {});
    return q ? Number(q.id) : null;
  } catch (e) {
    console.error("[quality review create]", e);
    return null;
  }
}

// Photos du cas pour l'hôpital : lues côté serveur (le stockage exige une session).
export async function photoAsDataUrl(src: string): Promise<string | null> {
  if (/^data:image\//i.test(src)) return src;
  if (!src.startsWith("/objects/")) return null;
  try {
    const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
    const file: any = await new ObjectStorageService().getObjectEntityFile(src);
    const [buf] = await file.download();
    const [meta] = await file.getMetadata().catch(() => [{}]);
    return `data:${(meta as any)?.contentType || "image/jpeg"};base64,${Buffer.from(buf).toString("base64")}`;
  } catch { return null; }
}

// Tentatives du code à 6 chiffres : 5 essais, puis 15 minutes de blocage (par fiche).
const attempts = new Map<string, { n: number; until: number }>();
function checkLock(code: string) { const a = attempts.get(code); return a && a.until > Date.now(); }
function fail(code: string) { const a = attempts.get(code) || { n: 0, until: 0 }; a.n++; if (a.n >= 5) { a.until = Date.now() + 15 * 60000; a.n = 0; } attempts.set(code, a); }

export function registerReferralRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const dermOnly = [requireActivePro, (req: any, res: any, next: any) => (req.isSecretary || (req.proAccount?.profile || "derm") !== "derm" ? res.status(403).json({ message: "Réservé au dermatologue." }) : next())];
  const relayOnly = [requireActivePro, (req: any, res: any, next: any) => (req.proAccount?.profile === "relay" ? next() : res.status(403).json({ message: "Réservé aux relais." }))];
  const ngoOnly = [requireActivePro, (req: any, res: any, next: any) => (req.isSecretary || req.proAccount?.profile !== "ngo" ? res.status(403).json({ message: "Réservé aux programmes." }) : next())];
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  // Dermatologue : hôpitaux proposés pour un cas qu'il traite.
  app.get("/api/relay/cases/:id/hospitals", ...dermOnly, async (req: any, res) => {
    const ok = Rows(await db.execute(sql`SELECT 1 FROM relay_cases WHERE id = ${Number(req.params.id)} AND derm_id = ${req.proAccount.id}`))[0];
    if (!ok) return res.status(404).json({ message: "Cas introuvable" });
    res.json({ hospitals: await proposeHospitals(Number(req.params.id)) });
  });

  // ── R7 · côté relais ─────────────────────────────────────────────────
  const relayRef = async (id: number, proId: number) => Rows(await db.execute(sql`
    SELECT f.*, rc.relay_id, rc.patient_phone, rc.patient_age, rc.patient_sex, rc.derm_diagnosis, rc.relay_diagnosis, rc.answered_at,
           d.full_name AS derm_name, h.name AS hospital, h.service, h.city AS hospital_city
    FROM hospital_referrals f JOIN relay_cases rc ON rc.id = f.case_id LEFT JOIN pro_accounts d ON d.id = rc.derm_id LEFT JOIN hospitals h ON h.id = f.hospital_id
    WHERE f.id = ${id} AND rc.relay_id = ${proId}`))[0];

  app.get("/api/relay/referrals", ...relayOnly, async (req: any, res) => {
    const rows = Rows(await db.execute(sql`
      SELECT f.id, f.code, f.case_id, f.urgency, f.arrival_code, f.appointment_at, f.status, f.created_at, f.arrived_at, f.report_at, f.patient_sms_at,
             rc.patient_age, rc.patient_sex, rc.derm_diagnosis, rc.relay_diagnosis, d.full_name AS derm_name, h.name AS hospital, h.service, h.city AS hospital_city
      FROM hospital_referrals f JOIN relay_cases rc ON rc.id = f.case_id LEFT JOIN pro_accounts d ON d.id = rc.derm_id LEFT JOIN hospitals h ON h.id = f.hospital_id
      WHERE rc.relay_id = ${req.proAccount.id} ORDER BY f.created_at DESC LIMIT 50`));
    res.json({ referrals: rows });
  });
  app.post("/api/relay/referrals/:id/appointment", ...relayOnly, async (req: any, res) => {
    const at = new Date(String(req.body?.at || ""));
    if (isNaN(+at)) return res.status(400).json({ message: "Date de rendez-vous invalide." });
    const r = await relayRef(Number(req.params.id), req.proAccount.id);
    if (!r) return res.status(404).json({ message: "Fiche introuvable" });
    await db.execute(sql`UPDATE hospital_referrals SET appointment_at = ${at.toISOString()} WHERE id = ${r.id}`);
    res.json({ success: true });
  });
  // « Renvoyer la fiche par SMS » (numéro du patient, facultatif si déjà connu).
  app.post("/api/relay/referrals/:id/sms", ...relayOnly, async (req: any, res) => {
    const r = await relayRef(Number(req.params.id), req.proAccount.id);
    if (!r) return res.status(404).json({ message: "Fiche introuvable" });
    const digits = String(req.body?.phone || r.patient_phone || "").replace(/\D/g, "");
    const phone = digits.length === 9 && digits.startsWith("6") ? `237${digits}` : digits;
    if (phone.length < 11) return res.status(400).json({ message: "Numéro du patient requis (avec l'indicatif)." });
    const ok = (await sendSmsText(`+${phone}`, ficheSms(r.code, r.hospital, r.arrival_code))).ok;
    if (ok) await db.execute(sql`UPDATE hospital_referrals SET patient_sms_at = NOW() WHERE id = ${r.id}`);
    res.json({ sent: ok });
  });
  // Fiche imprimable (QR vers /ref/REF-XXXX ; le code à 6 chiffres n'est pas dans le QR).
  app.get("/api/relay/referrals/:id/fiche", ...relayOnly, async (req: any, res) => {
    const r = await relayRef(Number(req.params.id), req.proAccount.id);
    if (!r) return res.status(404).send("Fiche introuvable");
    const url = `${BASE}/ref/${r.code}`;
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 200 });
    const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(r.code)}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#f5ead8;font-family:'Figtree',sans-serif;color:#201e1d}.sheet{background:#fffaf2;max-width:560px;margin:24px auto;padding:32px;border-radius:18px;text-align:center}@media print{body{background:#fff}.no-print{display:none}}</style></head><body>
<div class="sheet">
<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8c491a">Fiche de référence</div>
<div style="font-family:'Caprasimo',serif;font-size:36px;margin:8px 0">${esc(r.code)}</div>
<div style="font-size:16px;font-weight:700">${esc(r.hospital || "Hôpital à confirmer")}</div>
<div style="font-size:13px;color:#645c50">${esc([r.service, r.hospital_city].filter(Boolean).join(" · "))}</div>
${r.appointment_at ? `<p style="font-size:14px">RDV ${esc(new Date(r.appointment_at).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }))}</p>` : ""}
<img src="${qr}" alt="QR code de la fiche" width="160" height="160" style="margin:12px auto;display:block"/>
<p style="font-size:13px;margin:0">Code à montrer à l'accueil de l'hôpital :</p>
<div style="font-family:'Caprasimo',serif;font-size:32px;letter-spacing:.2em;margin:6px 0 12px">${esc(r.arrival_code)}</div>
<p style="font-size:12px;color:#645c50;margin:0">L'hôpital scanne le QR code ou ouvre ${esc(url.replace(/^https?:\/\//, ""))}, puis saisit ce code.</p>
</div>
<div class="no-print" style="text-align:center;margin-bottom:24px"><button onclick="window.print()" style="background:#c67139;color:#fff;border:0;border-radius:999px;padding:12px 24px;font:700 15px 'Figtree',sans-serif;cursor:pointer">Imprimer la fiche</button></div>
</body></html>`);
  });

  // ── Page publique de l'hôpital (/ref/REF-XXXX), sans compte ───────────
  app.get("/api/ref/:code", async (req: any, res) => {
    const f = Rows(await db.execute(sql`
      SELECT f.code, f.status, f.appointment_at, f.urgency, h.name AS hospital, h.service, h.city FROM hospital_referrals f LEFT JOIN hospitals h ON h.id = f.hospital_id
      WHERE f.code = ${String(req.params.code).toUpperCase()}`))[0];
    if (!f) return res.status(404).json({ message: "Fiche inconnue" });
    res.json({ code: f.code, status: f.status, urgency: f.urgency, appointmentAt: f.appointment_at, hospital: f.hospital ? { name: f.hospital, service: f.service, city: f.city } : null });
  });
  // Code à 6 chiffres : ouvre le dossier et confirme l'arrivée.
  app.post("/api/ref/:code/open", async (req: any, res) => {
    const code = String(req.params.code).toUpperCase();
    if (checkLock(code)) return res.status(429).json({ message: "Trop d'essais. Réessayez dans 15 minutes." });
    const f = Rows(await db.execute(sql`
      SELECT f.*, rc.patient_age, rc.patient_sex, rc.zone, rc.symptoms, rc.photos, rc.relay_diagnosis, rc.derm_diagnosis, rc.derm_ddx, rc.derm_plan, rc.orientation, rc.answered_at,
             d.full_name AS derm_name, d.license_number, r.full_name AS relay_name, hc.name AS center
      FROM hospital_referrals f JOIN relay_cases rc ON rc.id = f.case_id LEFT JOIN pro_accounts d ON d.id = rc.derm_id LEFT JOIN pro_accounts r ON r.id = rc.relay_id
      LEFT JOIN relays rl ON rl.pro_account_id = rc.relay_id LEFT JOIN health_centers hc ON hc.id = rl.health_center_id
      WHERE f.code = ${code}`))[0];
    const pin = String(req.body?.pin || "").replace(/\D/g, "");
    if (!f || pin.length !== 6 || !crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(String(f.arrival_code)))) { fail(code); return res.status(401).json({ message: "Code incorrect." }); }
    if (f.status === "referred" || f.status === "no_show") {
      await db.execute(sql`UPDATE hospital_referrals SET status = 'arrived', arrived_at = NOW() WHERE id = ${f.id}`);
      const rc = Rows(await db.execute(sql`SELECT relay_id FROM relay_cases WHERE id = ${f.case_id}`))[0];
      if (rc) notifyProAccount(Number(rc.relay_id), { title: `Arrivée à l'hôpital · ${f.code}`, body: "L'hôpital a confirmé l'arrivée du patient.", url: "/derm/relais" }).catch(() => {});
      const pc = Rows(await db.execute(sql`SELECT partner_id, external_ref FROM relay_cases WHERE id = ${f.case_id}`))[0];
      if (pc?.partner_id) import("./partnerApi").then((m) => m.enqueueWebhook(Number(pc.partner_id), "referral.arrived", { caseId: f.case_id, externalRef: pc.external_ref, referralCode: f.code, arrivedAt: new Date().toISOString() })).catch(() => {});
    }
    const photos: string[] = [];
    for (const p of (Array.isArray(f.photos) ? f.photos : []).slice(0, 3)) { const d = await photoAsDataUrl(String(p)); if (d) photos.push(d); }
    res.json({
      code: f.code, status: f.status === "report_received" ? "report_received" : "arrived", urgency: f.urgency,
      patient: { age: f.patient_age, sex: f.patient_sex }, zone: f.zone, symptoms: f.symptoms, photos,
      relay: { name: f.relay_name, center: f.center }, relayDiagnosis: f.relay_diagnosis,
      derm: { name: dr(f.derm_name), onmc: f.license_number }, diagnosis: f.derm_diagnosis, ddx: f.derm_ddx, plan: f.derm_plan, orientation: f.orientation,
    });
  });
  // Compte rendu de l'hôpital (PDF).
  app.post("/api/ref/:code/report", async (req: any, res) => {
    const code = String(req.params.code).toUpperCase();
    if (checkLock(code)) return res.status(429).json({ message: "Trop d'essais. Réessayez dans 15 minutes." });
    const pin = String(req.body?.pin || "").replace(/\D/g, "");
    const pdf = String(req.body?.pdf || "");
    if (!/^data:application\/pdf;base64,/.test(pdf) || pdf.length > 8_000_000) return res.status(400).json({ message: "Compte rendu : fichier PDF de 6 Mo au maximum." });
    const f = Rows(await db.execute(sql`SELECT id, case_id, program_id, arrival_code FROM hospital_referrals WHERE code = ${code}`))[0];
    if (!f || pin.length !== 6 || !crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(String(f.arrival_code)))) { fail(code); return res.status(401).json({ message: "Code incorrect." }); }
    await db.execute(sql`UPDATE hospital_referrals SET report_pdf = ${pdf}, report_at = NOW(), status = 'report_received', arrived_at = COALESCE(arrived_at, NOW()) WHERE id = ${f.id}`);
    const rc = Rows(await db.execute(sql`SELECT relay_id, derm_id FROM relay_cases WHERE id = ${f.case_id}`))[0];
    for (const id of [rc?.relay_id, rc?.derm_id].filter(Boolean)) notifyProAccount(Number(id), { title: `Compte rendu de l'hôpital reçu · ${code}`, body: "Le compte rendu est disponible dans GlowScan.", url: "/derm/relais" }).catch(() => {});
    res.json({ success: true });
  });
  // Compte rendu de l'hôpital : lu par le relais ou le dermatologue du cas.
  app.get("/api/referrals/:id/report", requireActivePro, async (req: any, res) => {
    const f = Rows(await db.execute(sql`
      SELECT f.report_pdf FROM hospital_referrals f JOIN relay_cases rc ON rc.id = f.case_id
      WHERE f.id = ${Number(req.params.id)} AND (rc.relay_id = ${req.proAccount.id} OR rc.derm_id = ${req.proAccount.id})`))[0];
    const m = /^data:application\/pdf;base64,(.+)$/.exec(f?.report_pdf || "");
    if (!m) return res.status(404).send("Compte rendu introuvable");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(m[1], "base64"));
  });

  // ── O4 · côté ONG : orientations et qualité (anonymes) ────────────────
  app.get("/api/program/:id/referrals", ...ngoOnly, async (req: any, res) => {
    const pid = Number(req.params.id);
    if (!Rows(await db.execute(sql`SELECT 1 FROM program_managers WHERE program_id = ${pid} AND pro_id = ${req.proAccount.id}`))[0]) return res.status(404).json({ message: "Programme introuvable" });
    const rows = Rows(await db.execute(sql`
      SELECT f.code, f.status, f.created_at, f.arrived_at, h.city, h.name AS hospital FROM hospital_referrals f LEFT JOIN hospitals h ON h.id = f.hospital_id
      WHERE f.program_id = ${pid} ORDER BY f.created_at DESC LIMIT 100`));
    const q = Rows(await db.execute(sql`
      SELECT COUNT(*) FILTER (WHERE status = 'done')::int AS done, COUNT(*) FILTER (WHERE status = 'done' AND agree)::int AS agree FROM quality_reviews WHERE program_id = ${pid}`))[0] || {};
    const day = (d: string) => Math.floor((Date.now() - +new Date(d)) / 86400000);
    const items = rows.map((r: any) => ({
      code: r.code, city: r.city || r.hospital || null, status: r.status, day: day(r.created_at),
      toRelaunch: r.status === "no_show" || (r.status === "referred" && day(r.created_at) >= 7),
    }));
    res.json({
      referred: items.length, arrived: items.filter((i) => i.status === "arrived" || i.status === "report_received").length,
      toRelaunch: items.filter((i) => i.toRelaunch).length, items,
      quality: { done: Number(q.done) || 0, agree: Number(q.agree) || 0 },
    });
  });

  // ── Relecture qualité : côté dermatologue relecteur ───────────────────
  app.get("/api/quality-reviews", ...dermOnly, async (req: any, res) => {
    const rows = Rows(await db.execute(sql`
      SELECT q.id, q.due_at, q.price_fcfa, rc.patient_age, rc.patient_sex, rc.zone, rc.symptoms, rc.photos, rc.relay_diagnosis, rc.ai_diagnosis,
             rc.derm_verdict, rc.derm_diagnosis, rc.derm_ddx, rc.derm_plan, rc.orientation, rc.derm_note
      FROM quality_reviews q JOIN relay_cases rc ON rc.id = q.case_id
      WHERE q.reviewer_id = ${req.proAccount.id} AND q.status = 'pending' ORDER BY q.due_at ASC LIMIT 50`));
    res.json({ reviews: rows.map((r: any) => ({ ...r, share: splitQuality(Number(r.price_fcfa)).reviewer })) });
  });
  app.post("/api/quality-reviews/:id", ...dermOnly, async (req: any, res) => {
    const d = z.object({ agree: z.boolean(), comment: z.string().trim().max(1500).optional().default("") }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Indiquez si vous êtes d'accord." });
    if (!d.data.agree && d.data.comment.length < 5) return res.status(400).json({ message: "Expliquez votre désaccord en une phrase." });
    const q = Rows(await db.execute(sql`
      UPDATE quality_reviews SET status = 'done', agree = ${d.data.agree}, comment = ${d.data.comment || null}, answered_at = NOW()
      WHERE id = ${Number(req.params.id)} AND reviewer_id = ${req.proAccount.id} AND status = 'pending' RETURNING id, case_id, price_fcfa`))[0];
    if (!q) return res.status(409).json({ message: "Relecture introuvable ou déjà faite." });
    // Paiement : l'argent est déjà chez GlowScan (budget du programme) → disponible tout de suite.
    const s = splitQuality(Number(q.price_fcfa));
    const source = `quality:${q.id}`;
    await db.execute(sql`
      INSERT INTO platform_ledger (type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
      VALUES ('quality_review', ${Number(q.price_fcfa)}, ${SPLITS.quality.platform}, ${s.platform}, ${source}, NULL, 'available') ON CONFLICT (type, source_id) DO NOTHING`);
    await db.execute(sql`
      INSERT INTO wallet_ledger (pro_id, type, gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status)
      VALUES (${req.proAccount.id}, 'quality_review', ${Number(q.price_fcfa)}, ${SPLITS.quality.reviewer}, ${s.reviewer}, ${source}, NULL, 'available') ON CONFLICT (pro_id, type, source_id) DO NOTHING`);
    if (!d.data.agree) {
      notifyOwner(`Relecture qualité : désaccord sur le cas #B-${q.case_id}`, `<p>${d.data.comment}</p>`, `Désaccord sur le cas #B-${q.case_id} : ${d.data.comment}`).catch(() => {});
    }
    res.json({ success: true, earned: s.reviewer });
  });

  // ── Admin : hôpitaux ──────────────────────────────────────────────────
  app.get("/api/admin/hospitals", admin, async (_req: any, res) => {
    res.json({ items: Rows(await db.execute(sql`SELECT * FROM hospitals ORDER BY country, district NULLS LAST, name`)) });
  });
  app.post("/api/admin/hospitals", admin, async (req: any, res) => {
    const d = z.object({
      name: z.string().trim().min(3).max(160), service: z.string().trim().max(80).optional().nullable(),
      country: z.string().refine((c) => NETWORK_COUNTRIES.includes(c)), district: z.string().trim().max(80).optional().nullable(),
      city: z.string().trim().max(80).optional().nullable(), phone: z.string().trim().max(30).optional().nullable(),
      lat: z.number().min(-90).max(90).optional().nullable(), lng: z.number().min(-180).max(180).optional().nullable(),
    }).safeParse(req.body);
    if (!d.success) return res.status(400).json({ message: "Nom, pays du réseau requis ; coordonnées GPS facultatives." });
    const h = d.data;
    await db.execute(sql`INSERT INTO hospitals (name, service, country, district, city, phone, lat, lng) VALUES (${h.name}, ${h.service || null}, ${h.country}, ${h.district || null}, ${h.city || null}, ${h.phone || null}, ${h.lat ?? null}, ${h.lng ?? null})`);
    res.json({ success: true });
  });
  app.post("/api/admin/hospitals/:id/active", admin, async (req: any, res) => {
    await db.execute(sql`UPDATE hospitals SET active = ${req.body?.active === true} WHERE id = ${Number(req.params.id)}`);
    res.json({ success: true });
  });
}

// ── Cron quotidien : relances des orientations, relectures expirées ─────
export async function runReferralFollowups(): Promise<{ j7: number; j10: number; expired: number }> {
  let j7 = 0, j10 = 0, expired = 0;
  const late7 = Rows(await db.execute(sql`
    SELECT f.id, f.code, f.arrival_code, rc.patient_phone, rc.relay_id, h.name AS hospital
    FROM hospital_referrals f JOIN relay_cases rc ON rc.id = f.case_id LEFT JOIN hospitals h ON h.id = f.hospital_id
    WHERE f.status = 'referred' AND f.reminded_j7_at IS NULL AND f.created_at < NOW() - INTERVAL '7 days' LIMIT 200`));
  for (const f of late7) {
    if (f.patient_phone) await sendSmsText(`+${f.patient_phone}`, `Rappel : ${ficheSms(f.code, f.hospital, f.arrival_code)}`).catch(() => null);
    notifyProAccount(Number(f.relay_id), { title: `Patient pas encore arrivé · ${f.code}`, body: "Pas de nouvelle de l'hôpital après 7 jours : relancez le patient.", url: "/derm/relais" }).catch(() => {});
    await db.execute(sql`UPDATE hospital_referrals SET reminded_j7_at = NOW() WHERE id = ${f.id}`);
    j7++;
  }
  const late10 = Rows(await db.execute(sql`
    SELECT f.id, f.code, f.program_id FROM hospital_referrals f
    WHERE f.status = 'referred' AND f.alerted_j10_at IS NULL AND f.created_at < NOW() - INTERVAL '10 days' LIMIT 200`));
  for (const f of late10) {
    await db.execute(sql`UPDATE hospital_referrals SET status = 'no_show', alerted_j10_at = NOW() WHERE id = ${f.id}`);
    if (f.program_id) await alertCoordinators(Number(f.program_id), `Orientation sans nouvelle · ${f.code}`, `La fiche ${f.code} n'a pas de confirmation d'arrivée à l'hôpital après 10 jours.`).catch(() => {});
    j10++;
  }
  // Relecture non faite à temps : le budget du programme est rendu.
  const exp = Rows(await db.execute(sql`
    UPDATE quality_reviews SET status = 'expired' WHERE status = 'pending' AND due_at < NOW() RETURNING case_id, program_id, price_fcfa`));
  for (const q of exp) {
    await db.execute(sql`
      INSERT INTO program_budget_ledger (program_id, kind, amount_fcfa, case_id, status, confirmed_at)
      VALUES (${q.program_id}, 'quality_refund', ${Number(q.price_fcfa)}, ${q.case_id}, 'confirmed', NOW())
      ON CONFLICT (case_id, kind) WHERE case_id IS NOT NULL DO NOTHING`).catch(() => {});
    expired++;
  }
  return { j7, j10, expired };
}

