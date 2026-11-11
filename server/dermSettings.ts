import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { sendWhatsAppText } from "./whatsapp";
import { renderDermA4 } from "./dermA4";
import { reportPayloadSchema } from "@shared/report";

// ════════════════════════════════════════════════════════════════════════
// Espace médical D7 : Paramètres du cabinet (handoff §3.11). Profil (dans
// pro_accounts), réglages du cabinet (derm_clinic_settings : agenda, rappels,
// tarifs affichés, confidentialité), équipe (rôle, téléphone, invitation
// WhatsApp sans mot de passe), appareils connectés (table « sessions »).
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const doctorOnly = (req: any, res: any, next: any) => (req.isSecretary ? res.status(403).json({ message: "Réservé au médecin." }) : next());
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export type ClinicSettings = {
  signatureText: string | null; cabinetEmail: string | null; openTime: string; closeTime: string; slotMinutes: number; pauseStart: string | null; pauseEnd: string | null; openDays: number[];
  remindJ1: boolean; remindH2: boolean; remindReport: boolean; remindPhoto: boolean; remindMissed: boolean; priceCabinetFcfa: number | null; priceControlFcfa: number | null;
  photoConsentRequired: boolean; dhis2Aggregate: boolean; glowPreanalysis: boolean; retention20y: boolean;
};
export const DEFAULT_SETTINGS: ClinicSettings = {
  signatureText: null, cabinetEmail: null, openTime: "08:00", closeTime: "18:00", slotMinutes: 30, pauseStart: "12:00", pauseEnd: "13:00", openDays: [1, 2, 3, 4, 5],
  remindJ1: true, remindH2: true, remindReport: true, remindPhoto: true, remindMissed: false, priceCabinetFcfa: null, priceControlFcfa: null,
  photoConsentRequired: true, dhis2Aggregate: false, glowPreanalysis: true, retention20y: true,
};

/** Réglages du cabinet (valeurs par défaut si jamais enregistrés). */
export async function getClinicSettings(proId: number): Promise<ClinicSettings> {
  const r = Rows(await db.execute(sql`SELECT * FROM derm_clinic_settings WHERE pro_account_id = ${proId}`))[0];
  if (!r) return { ...DEFAULT_SETTINGS };
  return {
    signatureText: r.signature_text || null, cabinetEmail: r.cabinet_email || null, openTime: r.open_time, closeTime: r.close_time, slotMinutes: Number(r.slot_minutes) || 30,
    pauseStart: r.pause_start || null, pauseEnd: r.pause_end || null, openDays: (r.open_days || []).map(Number),
    remindJ1: !!r.remind_j1, remindH2: !!r.remind_h2, remindReport: !!r.remind_report, remindPhoto: !!r.remind_photo, remindMissed: !!r.remind_missed,
    priceCabinetFcfa: r.price_cabinet_fcfa ?? null, priceControlFcfa: r.price_control_fcfa ?? null,
    photoConsentRequired: !!r.photo_consent_required, dhis2Aggregate: !!r.dhis2_aggregate, glowPreanalysis: !!r.glow_preanalysis, retention20y: !!r.retention_20y,
  };
}

/** Appareils connectés : type d'appareil et première activité, notés dans la session (à monter juste après la session). */
export function trackSessionDevice(app: Express) {
  app.use((req: any, _res, next) => {
    try {
      if (req.session?.userId && !req.session.ua) {
        req.session.ua = String(req.headers["user-agent"] || "").slice(0, 200);
        req.session.seenAt = new Date().toISOString();
      }
    } catch {}
    next();
  });
}

export function registerDermSettingsRoutes(app: Express) {
  // Réglages complets (la secrétaire lit l'agenda et les interrupteurs utiles).
  app.get("/api/derm/settings", requireProAccess, async (req: any, res) => {
    try {
      const a = req.proAccount;
      const s = await getClinicSettings(a.id);
      // La transmission DHIS2 passe par les programmes ONG (étape 15) : pas de connexion propre au cabinet.
      const dhis2Connected = false;
      const extra = Rows(await db.execute(sql`SELECT b2c_available, consult_price_fcfa, country FROM pro_accounts WHERE id = ${a.id}`))[0] || {};
      res.json({
        settings: s, dhis2Connected,
        profile: { fullName: a.fullName || "", licenseNumber: a.licenseNumber || "", cabinetName: a.cabinetName || "", cabinetAddress: a.cabinetAddress || "", city: a.city || "", country: extra.country || "",
          cabinetPhone: a.cabinetPhone || "", phone: a.phone || "", specialtyTitle: a.specialtyTitle || "", consultPriceFcfa: extra.consult_price_fcfa ?? null, b2cAvailable: extra.b2c_available === true },
      });
    } catch (e) {
      console.error("[derm settings]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.put("/api/derm/settings", requireProAccess, doctorOnly, async (req: any, res) => {
    try {
      const me = req.proAccount.id;
      const b = req.body?.settings || {};
      const cur = await getClinicSettings(me);
      const t = (v: any, d: string | null) => (typeof v === "string" && HHMM.test(v) ? v : d);
      const bool = (v: any, d: boolean) => (typeof v === "boolean" ? v : d);
      const int = (v: any, d: number | null) => { if (v === null || v === "") return null; const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : d; };
      const s: ClinicSettings = {
        signatureText: typeof b.signatureText === "string" ? b.signatureText.trim().slice(0, 120) || null : cur.signatureText,
        cabinetEmail: typeof b.cabinetEmail === "string" ? (/.+@.+\..+/.test(b.cabinetEmail.trim()) ? b.cabinetEmail.trim().slice(0, 120) : null) : cur.cabinetEmail,
        openTime: t(b.openTime, cur.openTime)!, closeTime: t(b.closeTime, cur.closeTime)!,
        slotMinutes: [15, 20, 30, 45, 60].includes(Number(b.slotMinutes)) ? Number(b.slotMinutes) : cur.slotMinutes,
        pauseStart: b.pauseStart === null ? null : t(b.pauseStart, cur.pauseStart), pauseEnd: b.pauseEnd === null ? null : t(b.pauseEnd, cur.pauseEnd),
        openDays: Array.isArray(b.openDays) ? Array.from(new Set(b.openDays.map(Number).filter((d: number) => d >= 1 && d <= 7))).sort() as number[] : cur.openDays,
        remindJ1: bool(b.remindJ1, cur.remindJ1), remindH2: bool(b.remindH2, cur.remindH2), remindReport: bool(b.remindReport, cur.remindReport), remindPhoto: bool(b.remindPhoto, cur.remindPhoto), remindMissed: bool(b.remindMissed, cur.remindMissed),
        priceCabinetFcfa: "priceCabinetFcfa" in b ? int(b.priceCabinetFcfa, cur.priceCabinetFcfa) : cur.priceCabinetFcfa,
        priceControlFcfa: "priceControlFcfa" in b ? int(b.priceControlFcfa, cur.priceControlFcfa) : cur.priceControlFcfa,
        photoConsentRequired: bool(b.photoConsentRequired, cur.photoConsentRequired), dhis2Aggregate: bool(b.dhis2Aggregate, cur.dhis2Aggregate), glowPreanalysis: bool(b.glowPreanalysis, cur.glowPreanalysis), retention20y: bool(b.retention20y, cur.retention20y),
      };
      if (s.openTime >= s.closeTime) return res.status(400).json({ message: "L'heure de fermeture doit suivre l'heure d'ouverture." });
      if (!s.openDays.length) return res.status(400).json({ message: "Choisissez au moins un jour d'ouverture." });
      await db.execute(sql`
        INSERT INTO derm_clinic_settings (pro_account_id, signature_text, cabinet_email, open_time, close_time, slot_minutes, pause_start, pause_end, open_days,
          remind_j1, remind_h2, remind_report, remind_photo, remind_missed, price_cabinet_fcfa, price_control_fcfa, photo_consent_required, dhis2_aggregate, glow_preanalysis, retention_20y, updated_at)
        VALUES (${me}, ${s.signatureText}, ${s.cabinetEmail}, ${s.openTime}, ${s.closeTime}, ${s.slotMinutes}, ${s.pauseStart}, ${s.pauseEnd}, ${sql.raw(`ARRAY[${s.openDays.join(",")}]::smallint[]`)},
          ${s.remindJ1}, ${s.remindH2}, ${s.remindReport}, ${s.remindPhoto}, ${s.remindMissed}, ${s.priceCabinetFcfa}, ${s.priceControlFcfa}, ${s.photoConsentRequired}, ${s.dhis2Aggregate}, ${s.glowPreanalysis}, ${s.retention20y}, NOW())
        ON CONFLICT (pro_account_id) DO UPDATE SET signature_text = EXCLUDED.signature_text, cabinet_email = EXCLUDED.cabinet_email, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time,
          slot_minutes = EXCLUDED.slot_minutes, pause_start = EXCLUDED.pause_start, pause_end = EXCLUDED.pause_end, open_days = EXCLUDED.open_days, remind_j1 = EXCLUDED.remind_j1, remind_h2 = EXCLUDED.remind_h2,
          remind_report = EXCLUDED.remind_report, remind_photo = EXCLUDED.remind_photo, remind_missed = EXCLUDED.remind_missed, price_cabinet_fcfa = EXCLUDED.price_cabinet_fcfa, price_control_fcfa = EXCLUDED.price_control_fcfa,
          photo_consent_required = EXCLUDED.photo_consent_required, dhis2_aggregate = EXCLUDED.dhis2_aggregate, glow_preanalysis = EXCLUDED.glow_preanalysis, retention_20y = EXCLUDED.retention_20y, updated_at = NOW()`);
      res.json({ ok: true, settings: s });
    } catch (e) {
      console.error("[derm settings save]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Aperçu d'un compte rendu A4 avec les informations du cabinet (données fictives de patient).
  app.get("/api/derm/settings/preview-a4", requireProAccess, doctorOnly, async (req: any, res) => {
    const a = req.proAccount, s = await getClinicSettings(a.id);
    let email = s.cabinetEmail;
    if (!email) { try { email = Rows(await db.execute(sql`SELECT email FROM users WHERE id = ${a.userId}`))[0]?.email || null; } catch {} }
    const payload = reportPayloadSchema.parse({ format: "a4", motif: "Exemple de motif de consultation.", exam: "Exemple d'observations cliniques.", conclusion: "Exemple de conclusion du dermatologue.", conduite: "Exemple de conduite à tenir.", suiviChoice: "J+28" });
    const now = new Date().toISOString();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderDermA4(
      { name: a.fullName || "", cabinetName: a.cabinetName || null, city: a.city || null, licenseNumber: a.licenseNumber || null, cabinetAddress: a.cabinetAddress || null, cabinetPhone: a.cabinetPhone || null, email, signatureText: s.signatureText },
      { firstName: "Exemple", lastName: "PATIENT", sex: "F", age: 30, birthDate: null },
      { id: 0, payload, signedAt: now, createdAt: now },
    ).replace("<body>", '<body><div style="max-width:794px;margin:12px auto 0;padding:8px 12px;border-radius:6px;background:#fbeee0;color:#b0652a;font:600 12px Inter,Arial,sans-serif">Aperçu avec un patient fictif · en-tête et signature de votre cabinet</div>'));
  });

  // ── Équipe ─────────────────────────────────────────────────────────────
  app.get("/api/derm/team", requireProAccess, doctorOnly, async (req: any, res) => {
    const rows = Rows(await db.execute(sql`SELECT id, full_name, email, role_label, phone, created_at FROM secretary_accounts WHERE pro_account_id = ${req.proAccount.id} ORDER BY created_at`));
    res.json({ items: rows.map((r) => ({ id: Number(r.id), fullName: r.full_name, email: r.email, role: r.role_label || "Secrétaire", phone: r.phone || null, createdAt: r.created_at })) });
  });
  app.patch("/api/derm/team/:id", requireProAccess, doctorOnly, async (req: any, res) => {
    const role = ["Secrétaire", "Infirmier·e"].includes(req.body?.role) ? req.body.role : null;
    const phone = typeof req.body?.phone === "string" ? req.body.phone.replace(/[^0-9+]/g, "").slice(0, 20) || null : undefined;
    const sets: any[] = [];
    if (role) sets.push(sql`role_label = ${role}`);
    if (phone !== undefined) sets.push(sql`phone = ${phone}`);
    if (sets.length) await db.execute(sql`UPDATE secretary_accounts SET ${sql.join(sets, sql`, `)} WHERE id = ${Number(req.params.id)} AND pro_account_id = ${req.proAccount.id}`);
    res.json({ ok: true });
  });
  // Invitation WhatsApp : lien de connexion et email, jamais le mot de passe.
  app.post("/api/derm/team/:id/invite", requireProAccess, doctorOnly, async (req: any, res) => {
    const m = Rows(await db.execute(sql`SELECT full_name, email, phone, role_label FROM secretary_accounts WHERE id = ${Number(req.params.id)} AND pro_account_id = ${req.proAccount.id}`))[0];
    if (!m) return res.status(404).json({ message: "Membre introuvable" });
    if (!m.phone) return res.status(400).json({ message: "Ajoutez d'abord son numéro WhatsApp." });
    const dr = `Dr ${String(req.proAccount.fullName || "").replace(/^(dr|pr)\.?\s*/i, "")}`;
    const msg = `Bonjour ${String(m.full_name || "").split(" ")[0]},\n\n${dr} vous a ouvert un accès ${String(m.role_label || "Secrétaire").toLowerCase()} à l'espace GlowScan Derm du cabinet.\n\nConnexion : ${BASE}/derm/connexion\nIdentifiant : ${m.email}\nLe mot de passe vous est remis par le cabinet.\n\nGlowScan`;
    const r = await sendWhatsAppText(m.phone, msg);
    res.json({ sent: r.ok });
  });

  // ── Appareils connectés ─────────────────────────────────────────────────
  app.get("/api/derm/sessions", requireProAccess, async (req: any, res) => {
    try {
      const uid = req.session.userId;
      const rows = Rows(await db.execute(sql`SELECT sid, sess, expire FROM sessions WHERE sess->>'userId' = ${uid} AND expire > NOW() ORDER BY expire DESC LIMIT 20`));
      res.json({ items: rows.map((r) => { const s = typeof r.sess === "string" ? JSON.parse(r.sess) : r.sess || {}; return { id: String(r.sid).slice(0, 8), current: r.sid === req.sessionID, ua: s.ua || null, seenAt: s.seenAt || null, expire: r.expire }; }) });
    } catch (e) {
      console.error("[derm sessions]", e);
      res.json({ items: [] });
    }
  });
  app.delete("/api/derm/sessions/:id", requireProAccess, async (req: any, res) => {
    const uid = req.session.userId, prefix = String(req.params.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 8);
    if (prefix.length < 6) return res.status(400).json({ message: "Session invalide" });
    await db.execute(sql`DELETE FROM sessions WHERE sess->>'userId' = ${uid} AND sid LIKE ${prefix + "%"} AND sid <> ${req.sessionID}`);
    res.json({ ok: true });
  });
}
