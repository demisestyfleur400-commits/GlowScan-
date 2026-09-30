import type { Express } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePro, notifyProAccount, notifyOwner } from "./proRoutes";
import { sendSmsText } from "./whatsapp";
import {
  PHOTO_QUIZ, PHOTO_MODULE, INVITATION_DAYS, intlPhone, phoneAccountEmail, maskPhone, professionLabel, type RelayStatus,
} from "@shared/relayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// Entrée des relais (étape 10, ADDENDUM_reseau_relais_ong.md §1, R1 à R3).
// Inscription par téléphone (code SMS), carte professionnelle + selfie vérifiés
// par GlowScan, parrain (dermatologue, programme ONG ou appel GlowScan), puis
// module photo (4/5). Aucun cas avant le statut « active ». Les photos de carte
// ne quittent jamais le serveur, sauf vers l'admin.
// ════════════════════════════════════════════════════════════════════════

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];
const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
const dr = (n?: string | null) => `Dr ${String(n || "").replace(/^(dr|pr)\.?\s+/i, "").trim()}`;
/** Bonnes réponses du module photo (index dans PHOTO_QUIZ[i].options). */
const PHOTO_ANSWERS = [1, 1, 1, 2, 0];

// ── Code SMS de l'inscription (avant la création du compte) ─────────────
const signupCodes = new Map<string, { hash: string; exp: number; attempts: number; sentAt: number }>();
async function sendSignupCode(phone: string): Promise<{ ok: boolean; dev: boolean; throttled?: boolean }> {
  const prev = signupCodes.get(phone);
  if (prev && Date.now() - prev.sentAt < 45_000) return { ok: true, dev: false, throttled: true };
  const code = String(crypto.randomInt(100000, 1000000));
  signupCodes.set(phone, { hash: await bcrypt.hash(code, 10), exp: Date.now() + 10 * 60_000, attempts: 0, sentAt: Date.now() });
  const r = await sendSmsText(`+${phone}`, `GlowScan : votre code d'inscription est ${code}. Il expire dans 10 minutes.`);
  const dev = !r.ok && process.env.NODE_ENV !== "production";
  if (dev) console.log(`[rejoindre] (dev) code pour ${phone} : ${code}`);
  return { ok: r.ok, dev };
}
async function checkSignupCode(phone: string, code: string): Promise<boolean> {
  const e = signupCodes.get(phone);
  if (!e || Date.now() > e.exp || e.attempts >= 5) return false;
  if (!(await bcrypt.compare(String(code || ""), e.hash))) { e.attempts++; return false; }
  signupCodes.delete(phone);
  return true;
}

// Photo de carte : ré-encodée (métadonnées EXIF/GPS retirées), 1600 px max.
async function cleanImage(dataUrl: string): Promise<string | null> {
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return null;
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(Buffer.from(m[1], "base64")).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch { return null; }
}

/** Recalcule le statut : carte vérifiée → parrain → module photo → actif. */
export async function refreshRelayStatus(relayId: number): Promise<RelayStatus> {
  const r = Rows(await db.execute(sql`SELECT status, card_status, sponsor_type, training_passed_at FROM relays WHERE id = ${relayId}`))[0];
  if (!r) return "pending_card";
  if (r.status === "suspended") return "suspended";
  const next: RelayStatus = r.card_status !== "verified" ? "pending_card" : !r.sponsor_type ? "pending_sponsor" : !r.training_passed_at ? "pending_training" : "active";
  if (next !== r.status) await db.execute(sql`UPDATE relays SET status = ${next} WHERE id = ${relayId}`);
  return next;
}
/** Le relais peut-il envoyer des cas ? (utilisé par POST /api/relay/cases) */
export async function relayIsActive(proId: number): Promise<boolean> {
  const r = Rows(await db.execute(sql`SELECT status FROM relays WHERE pro_account_id = ${proId}`))[0];
  return r?.status === "active";
}

async function invitationByToken(token: string) {
  return Rows(await db.execute(sql`
    SELECT i.*, g.name AS program_name, p.full_name AS inviter_name, p.country AS inviter_country
    FROM invitations i LEFT JOIN programs g ON g.id = i.program_id LEFT JOIN pro_accounts p ON p.id = i.inviter_id
    WHERE i.token = ${token}`))[0] || null;
}
async function dermById(id: number) {
  return Rows(await db.execute(sql`SELECT id, full_name, country, city FROM pro_accounts WHERE id = ${id} AND COALESCE(profile, 'derm') = 'derm'`))[0] || null;
}
const inviteSms = (who: string, token: string) =>
  `${who} vous invite à rejoindre le réseau GlowScan des soignants. Inscription : ${BASE}/rejoindre?invitation=${token} (valable ${INVITATION_DAYS} jours).`;

async function createInvitation(o: { inviterType: "derm" | "program"; inviterId: number; programId: number | null; phone: string; name?: string | null; center?: string | null; via: "sms" | "csv"; who: string }) {
  const token = crypto.randomBytes(12).toString("base64url");
  await db.execute(sql`
    INSERT INTO invitations (inviter_type, inviter_id, program_id, phone, name, center, token, sent_via, expires_at)
    VALUES (${o.inviterType}, ${o.inviterId}, ${o.programId}, ${o.phone}, ${o.name || null}, ${o.center || null}, ${token}, ${o.via},
      NOW() + make_interval(days => ${INVITATION_DAYS}))`);
  const r = await sendSmsText(`+${o.phone}`, inviteSms(o.who, token));
  return { token, sent: r.ok };
}

export function registerRelayOnboardingRoutes(app: Express, deps: { checkAdmin: (req: any) => boolean }) {
  const relayOnly = [requireActivePro, (req: any, res: any, next: any) => (req.proAccount?.profile === "relay" ? next() : res.status(403).json({ message: "Réservé aux relais." }))];
  const admin = (req: any, res: any, next: any) => (deps.checkAdmin(req) ? next() : res.status(403).json({ message: "Accès refusé" }));

  // ── R1 · Contexte de l'invitation (page publique /rejoindre) ─────────
  app.get("/api/rejoindre/context", async (req: any, res) => {
    try {
      const token = String(req.query.invitation || "");
      if (token) {
        const i = await invitationByToken(token);
        if (!i || i.status !== "sent" || new Date(i.expires_at) < new Date()) return res.json({ kind: "free", expired: !!i });
        return res.json({
          kind: i.inviter_type, invitation: token,
          inviter: i.inviter_type === "derm" ? dr(i.inviter_name) : i.program_name || "Programme ONG",
          country: i.inviter_country || null,
          prefill: { phone: i.phone, name: i.name || "", center: i.center || "" },
        });
      }
      const parrain = Number(req.query.parrain);
      if (parrain) {
        const d = await dermById(parrain);
        if (d) return res.json({ kind: "derm", parrain: d.id, inviter: dr(d.full_name), country: d.country || null, prefill: {} });
      }
      res.json({ kind: "free" });
    } catch { res.json({ kind: "free" }); }
  });

  // Code SMS pour confirmer le téléphone.
  app.post("/api/rejoindre/code", async (req: any, res) => {
    const phone = intlPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ message: "Numéro invalide. Indiquez l'indicatif du pays (ex. 237 6XX XX XX XX)." });
    const exists = Rows(await db.execute(sql`SELECT id FROM users WHERE email = ${phoneAccountEmail(phone)}`))[0];
    if (exists) return res.status(409).json({ message: "Ce numéro a déjà un compte. Connectez-vous." });
    const r = await sendSignupCode(phone);
    res.json({ sent: r.ok, devFallback: r.dev, hint: maskPhone(phone) });
  });

  // « Envoyer ma demande » : compte + relais + carte + parrain.
  app.post("/api/rejoindre", async (req: any, res) => {
    try {
      const d = z.object({
        phone: z.string(), code: z.string().min(6).max(6),
        fullName: z.string().trim().min(3).max(120),
        password: z.string().min(8).max(200),
        profession: z.enum(["nurse", "gp", "midwife"]),
        center: z.string().trim().min(2).max(160),
        district: z.string().trim().max(120).optional().default(""),
        country: z.string().trim().min(2).max(40),
        cardFront: z.string().min(100), cardSelfie: z.string().min(100),
        orderNumber: z.string().trim().max(60).optional().default(""),
        parrain: z.number().int().optional().nullable(),
        invitation: z.string().max(40).optional().nullable(),
        consent: z.literal(true),
      }).parse(req.body);
      const phone = intlPhone(d.phone);
      if (!phone) return res.status(400).json({ message: "Numéro invalide." });
      if (!(await checkSignupCode(phone, d.code))) return res.status(401).json({ message: "Code SMS incorrect ou expiré. Demandez un nouveau code." });
      const email = phoneAccountEmail(phone);
      if (Rows(await db.execute(sql`SELECT id FROM users WHERE email = ${email}`))[0]) return res.status(409).json({ message: "Ce numéro a déjà un compte. Connectez-vous." });
      const [front, selfie] = [await cleanImage(d.cardFront), await cleanImage(d.cardSelfie)];
      if (!front || !selfie) return res.status(400).json({ message: "Photos illisibles. Reprenez la carte et le selfie." });

      // Parrain : invitation (dermatologue ou programme) ou lien personnel d'un dermatologue.
      let sponsor: { type: "derm" | "program"; id: number; name: string } | null = null;
      let inv: any = null;
      if (d.invitation) {
        inv = await invitationByToken(d.invitation);
        if (inv && inv.status === "sent" && new Date(inv.expires_at) > new Date()) {
          sponsor = inv.inviter_type === "program" && inv.program_id
            ? { type: "program", id: Number(inv.program_id), name: inv.program_name || "Programme" }
            : { type: "derm", id: Number(inv.inviter_id), name: dr(inv.inviter_name) };
        } else inv = null;
      }
      if (!sponsor && d.parrain) {
        const dm = await dermById(d.parrain);
        if (dm) sponsor = { type: "derm", id: dm.id, name: dr(dm.full_name) };
      }

      const hash = await bcrypt.hash(d.password, 10);
      const u = Rows(await db.execute(sql`
        INSERT INTO users (email, first_name, password_hash, role) VALUES (${email}, ${d.fullName}, ${hash}, 'relay') RETURNING id`))[0];
      const acc = Rows(await db.execute(sql`
        INSERT INTO pro_accounts (user_id, full_name, cabinet_name, phone, city, country, trial_ends_at, subscription_status, consent_signed_at, profile)
        VALUES (${u.id}, ${d.fullName}, ${d.center}, ${phone}, ${d.district || null}, ${d.country}, NOW() + INTERVAL '14 days', 'trial', NOW(), 'relay')
        RETURNING id`))[0];
      const hc = Rows(await db.execute(sql`
        INSERT INTO health_centers (name, country, district) VALUES (${d.center}, ${d.country}, ${d.district || null})
        ON CONFLICT (lower(name), COALESCE(country, ''), COALESCE(district, '')) DO UPDATE SET name = health_centers.name
        RETURNING id`))[0];
      const relay = Rows(await db.execute(sql`
        INSERT INTO relays (pro_account_id, user_id, profession, health_center_id, country, status, card_front_url, card_selfie_url, order_number,
          sponsor_type, sponsor_id, phone_verified_at)
        VALUES (${acc.id}, ${u.id}, ${d.profession}, ${hc?.id ?? null}, ${d.country}, 'pending_card', ${front}, ${selfie}, ${d.orderNumber || null},
          ${sponsor?.type ?? null}, ${sponsor?.id ?? null}, NOW())
        RETURNING id`))[0];
      if (sponsor?.type === "derm") {
        await db.execute(sql`INSERT INTO relay_links (relay_id, derm_id) VALUES (${acc.id}, ${sponsor.id}) ON CONFLICT (relay_id) DO UPDATE SET derm_id = EXCLUDED.derm_id`);
        notifyProAccount(sponsor.id, { title: "Un relais a rejoint le réseau grâce à vous", body: `${d.fullName} (${professionLabel(d.profession)}, ${d.center}). GlowScan vérifie sa carte.`, url: "/derm/reseau" }).catch(() => {});
      }
      if (sponsor?.type === "program") {
        await db.execute(sql`INSERT INTO program_members (program_id, relay_id) VALUES (${sponsor.id}, ${acc.id}) ON CONFLICT DO NOTHING`);
      }
      if (inv) await db.execute(sql`UPDATE invitations SET status = 'accepted', accepted_by = ${acc.id} WHERE id = ${inv.id}`);
      notifyOwner(
        `Relais à vérifier : ${d.fullName}`,
        `<p>${d.fullName}, ${professionLabel(d.profession)} au ${d.center} (${d.country}). Parrain : ${sponsor ? sponsor.name : "aucun (appel du centre à faire)"}.</p><p>Vérifiez la carte dans l'admin, onglet Relais.</p>`,
        `Relais à vérifier : ${d.fullName}, ${d.center}. Parrain : ${sponsor ? sponsor.name : "aucun"}.`,
      ).catch(() => {});

      // Téléphone confirmé par le code : la session s'ouvre.
      req.session.userId = u.id;
      req.session.save((err: any) => {
        if (err) return res.status(500).json({ message: "Erreur session" });
        res.json({ success: true, relayId: relay.id });
      });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Formulaire incomplet : téléphone, code, nom, mot de passe (8 caractères), métier, centre, pays, carte et selfie." });
      console.error("[rejoindre]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ── R2 · Où en est mon compte ─────────────────────────────────────────
  app.get("/api/relay/onboarding", ...relayOnly, async (req: any, res) => {
    try {
      const r = Rows(await db.execute(sql`
        SELECT r.*, hc.name AS center_name, hc.district FROM relays r LEFT JOIN health_centers hc ON hc.id = r.health_center_id
        WHERE r.pro_account_id = ${req.proAccount.id}`))[0];
      if (!r) return res.json({ status: "missing" });
      const status = await refreshRelayStatus(r.id);
      let sponsor: any = null;
      if (r.sponsor_type === "derm") { const dm = await dermById(Number(r.sponsor_id)); if (dm) sponsor = { type: "derm", name: dr(dm.full_name), country: dm.country || null }; }
      else if (r.sponsor_type === "program") { const g = Rows(await db.execute(sql`SELECT name, district FROM programs WHERE id = ${r.sponsor_id}`))[0]; sponsor = { type: "program", name: g?.name || "Programme", country: g?.district || null }; }
      else if (r.sponsor_type === "glowscan") sponsor = { type: "glowscan", name: "GlowScan", country: null };
      const last = Rows(await db.execute(sql`SELECT score, total, passed, created_at FROM training_attempts WHERE relay_id = ${r.id} ORDER BY created_at DESC LIMIT 1`))[0];
      res.json({
        status, profession: r.profession, center: r.center_name, district: r.district, country: r.country,
        phoneVerified: !!r.phone_verified_at,
        card: { status: r.card_status, reason: r.card_reject_reason || null },
        sponsor,
        training: { passedAt: r.training_passed_at, last: last ? { score: last.score, total: last.total, passed: last.passed } : null },
      });
    } catch (e) {
      console.error("[relay/onboarding]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Nouvelle carte après un refus.
  app.post("/api/relay/onboarding/card", ...relayOnly, async (req: any, res) => {
    const [front, selfie] = [await cleanImage(String(req.body?.cardFront || "")), await cleanImage(String(req.body?.cardSelfie || ""))];
    if (!front || !selfie) return res.status(400).json({ message: "Photos illisibles. Reprenez la carte et le selfie." });
    const r = Rows(await db.execute(sql`
      UPDATE relays SET card_front_url = ${front}, card_selfie_url = ${selfie}, card_status = 'pending', card_reject_reason = NULL,
        order_number = COALESCE(${String(req.body?.orderNumber || "").trim() || null}, order_number)
      WHERE pro_account_id = ${req.proAccount.id} AND card_status <> 'verified' RETURNING id`))[0];
    if (!r) return res.status(409).json({ message: "Votre carte est déjà vérifiée." });
    notifyOwner(`Relais à vérifier (nouvelle carte) : ${req.proAccount.fullName}`, `<p>Nouvelle carte envoyée par ${req.proAccount.fullName}.</p>`, `Nouvelle carte : ${req.proAccount.fullName}`).catch(() => {});
    res.json({ success: true });
  });

  // ── R3 · Module photo ─────────────────────────────────────────────────
  app.post("/api/relay/training/photo", ...relayOnly, async (req: any, res) => {
    try {
      const answers = z.array(z.number().int().min(0).max(5)).length(PHOTO_QUIZ.length).parse(req.body?.answers);
      const r = Rows(await db.execute(sql`SELECT id, training_passed_at FROM relays WHERE pro_account_id = ${req.proAccount.id}`))[0];
      if (!r) return res.status(404).json({ message: "Inscription introuvable" });
      const score = answers.reduce((s, a, i) => s + (a === PHOTO_ANSWERS[i] ? 1 : 0), 0);
      const passed = score >= PHOTO_MODULE.passScore;
      const mod = Rows(await db.execute(sql`SELECT id FROM training_modules WHERE code = 'photo'`))[0];
      await db.execute(sql`
        INSERT INTO training_attempts (relay_id, module_id, score, total, answers, passed)
        VALUES (${r.id}, ${mod.id}, ${score}, ${PHOTO_QUIZ.length}, ${JSON.stringify(answers)}::jsonb, ${passed})`);
      if (passed && !r.training_passed_at) await db.execute(sql`UPDATE relays SET training_passed_at = NOW() WHERE id = ${r.id}`);
      const status = await refreshRelayStatus(r.id);
      // Correction : quelles questions étaient fausses (sans révéler la bonne réponse si échec).
      res.json({ score, total: PHOTO_QUIZ.length, passed, status, wrong: answers.map((a, i) => (a === PHOTO_ANSWERS[i] ? null : i)).filter((x) => x !== null) });
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: "Répondez aux 5 questions." });
      console.error("[relay/training]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Attestation (page imprimable, PDF via html2pdf).
  app.get("/api/relay/training/photo/attestation", ...relayOnly, async (req: any, res) => {
    const r = Rows(await db.execute(sql`
      SELECT r.id, r.profession, r.training_passed_at, hc.name AS center, a.score, a.total
      FROM relays r LEFT JOIN health_centers hc ON hc.id = r.health_center_id
      LEFT JOIN LATERAL (SELECT score, total FROM training_attempts t WHERE t.relay_id = r.id AND t.passed ORDER BY created_at ASC LIMIT 1) a ON TRUE
      WHERE r.pro_account_id = ${req.proAccount.id}`))[0];
    if (!r?.training_passed_at) return res.status(404).send("Module non validé");
    const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const date = new Date(r.training_passed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
    const ref = `GS-FOR-${String(r.id).padStart(4, "0")}-1`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Attestation ${ref}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#f5ead8;font-family:'Figtree',sans-serif;color:#201e1d}.sheet{background:#fffaf2;max-width:760px;margin:24px auto;padding:48px;border-radius:18px;text-align:center}
@media(max-width:600px){.sheet{margin:0;border-radius:0;padding:28px 18px}}@media print{body{background:#fff}.no-print{display:none}}</style></head><body>
<div id="doc"><div class="sheet">
<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8c491a">GlowScan · Réseau des soignants</div>
<div style="font-family:'Caprasimo',serif;font-size:34px;margin:14px 0 6px">Attestation de formation</div>
<p style="font-size:15px;margin:0 0 24px">Module 1 · ${esc(PHOTO_MODULE.title)}</p>
<p style="font-size:15px;line-height:1.7;margin:0">Nous attestons que</p>
<div style="font-family:'Caprasimo',serif;font-size:26px;margin:8px 0">${esc(req.proAccount.fullName)}</div>
<p style="font-size:15px;line-height:1.7;margin:0">${esc(professionLabel(r.profession))}${r.center ? `, ${esc(r.center)}` : ""},<br/>a validé le module le ${esc(date)}${r.score != null ? ` avec ${r.score}/${r.total} bonnes réponses` : ""}.</p>
<p style="font-size:12px;color:#645c50;margin:28px 0 0">Réf. ${esc(ref)}</p>
</div></div>
<div class="no-print" style="text-align:center;margin:0 0 32px"><button id="dl" style="background:#c67139;color:#fff;border:0;border-radius:999px;padding:13px 26px;font:700 15px 'Figtree',sans-serif;cursor:pointer">Télécharger le PDF</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>document.getElementById("dl").addEventListener("click",function(){if(!window.html2pdf){window.print();return;}window.html2pdf().set({margin:0,filename:${JSON.stringify(`${ref}.pdf`)},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4"}}).from(document.getElementById("doc")).save();});</script>
</body></html>`);
  });

  // ── Invitations : dermatologue (lien, QR, SMS) et ONG (SMS, CSV) ──────
  app.get("/api/relay-invitations", requireActivePro, async (req: any, res) => {
    try {
      const me = req.proAccount;
      const programId = Number(req.query.programId) || null;
      if (programId && !(await managesProgram(me.id, programId))) return res.status(403).json({ message: "Programme non autorisé" });
      const rows = Rows(await db.execute(sql`
        SELECT id, phone, name, center, sent_via, status, expires_at, created_at FROM invitations
        WHERE ${programId ? sql`program_id = ${programId}` : sql`inviter_type = 'derm' AND inviter_id = ${me.id}`}
        ORDER BY created_at DESC LIMIT 200`));
      const link = `${BASE}/rejoindre?parrain=${me.id}`;
      res.json({
        items: rows.map((r: any) => ({ ...r, phone: maskPhone(String(r.phone)), expired: r.status === "sent" && new Date(r.expires_at) < new Date() })),
        link: programId ? null : link,
        qr: programId ? null : await QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#201e1d", light: "#fffaf2" } }),
      });
    } catch (e) {
      console.error("[relay-invitations]", e);
      res.json({ items: [] });
    }
  });

  async function managesProgram(proId: number, programId: number) {
    return !!Rows(await db.execute(sql`SELECT 1 FROM program_managers WHERE program_id = ${programId} AND pro_id = ${proId}`))[0];
  }

  app.post("/api/relay-invitations", requireActivePro, async (req: any, res) => {
    try {
      const me = req.proAccount;
      const programId = Number(req.body?.programId) || null;
      const isDerm = (me.profile || "derm") === "derm" && !req.isSecretary;
      if (programId ? !(await managesProgram(me.id, programId)) : !isDerm) return res.status(403).json({ message: "Invitation non autorisée" });
      const rows: { phone: string; name?: string; center?: string }[] = Array.isArray(req.body?.rows) ? req.body.rows : [req.body];
      if (rows.length > 300) return res.status(400).json({ message: "300 personnes au maximum par envoi." });
      const program = programId ? Rows(await db.execute(sql`SELECT name FROM programs WHERE id = ${programId}`))[0] : null;
      const who = programId ? `Le programme ${program?.name || ""}`.trim() : dr(me.fullName);
      let sent = 0, created = 0;
      const invalid: string[] = [];
      for (const r of rows) {
        const phone = intlPhone(r.phone);
        if (!phone) { invalid.push(String(r.phone || "").slice(0, 20)); continue; }
        if (Rows(await db.execute(sql`SELECT 1 FROM users WHERE email = ${phoneAccountEmail(phone)}`))[0]) { invalid.push(`${maskPhone(phone)} (déjà inscrit)`); continue; }
        const x = await createInvitation({
          inviterType: programId ? "program" : "derm", inviterId: me.id, programId, phone,
          name: String(r.name || "").trim().slice(0, 120) || null, center: String(r.center || "").trim().slice(0, 160) || null,
          via: rows.length > 1 ? "csv" : "sms", who,
        });
        created++; if (x.sent) sent++;
      }
      res.json({ created, sent, invalid });
    } catch (e) {
      console.error("[relay-invitations post]", e);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // « Relancer » une invitation (O2) : nouveau SMS, même lien.
  app.post("/api/relay-invitations/:id/resend", requireActivePro, async (req: any, res) => {
    const i = Rows(await db.execute(sql`
      SELECT i.*, g.name AS program_name FROM invitations i LEFT JOIN programs g ON g.id = i.program_id
      WHERE i.id = ${Number(req.params.id)} AND i.status = 'sent' AND i.expires_at > NOW()`))[0];
    if (!i) return res.status(404).json({ message: "Invitation introuvable ou expirée." });
    const allowed = i.program_id ? await managesProgram(req.proAccount.id, Number(i.program_id)) : Number(i.inviter_id) === req.proAccount.id;
    if (!allowed) return res.status(403).json({ message: "Invitation non autorisée" });
    const who = i.program_id ? `Le programme ${i.program_name || ""}`.trim() : dr(req.proAccount.fullName);
    const r = await sendSmsText(`+${i.phone}`, `Rappel : ${inviteSms(who, i.token)}`);
    res.json({ sent: r.ok });
  });

  // ── Admin : vérification des relais ───────────────────────────────────
  app.get("/api/admin/relays", admin, async (_req: any, res) => {
    try {
      const rows = Rows(await db.execute(sql`
        SELECT r.id, r.profession, r.country, r.status, r.card_status, r.card_reject_reason, r.order_number, r.sponsor_type, r.sponsor_id, r.created_at,
               p.full_name, p.phone, hc.name AS center, hc.district,
               CASE r.sponsor_type WHEN 'derm' THEN (SELECT full_name FROM pro_accounts WHERE id = r.sponsor_id)
                                   WHEN 'program' THEN (SELECT name FROM programs WHERE id = r.sponsor_id) ELSE NULL END AS sponsor_name
        FROM relays r JOIN pro_accounts p ON p.id = r.pro_account_id LEFT JOIN health_centers hc ON hc.id = r.health_center_id
        WHERE r.status <> 'active' OR r.created_at > NOW() - INTERVAL '30 days'
        ORDER BY (r.card_status = 'pending') DESC, r.created_at DESC LIMIT 200`));
      res.json({ items: rows });
    } catch { res.json({ items: [] }); }
  });
  app.get("/api/admin/relays/:id/card/:side", admin, async (req: any, res) => {
    const col = req.params.side === "selfie" ? sql`card_selfie_url` : sql`card_front_url`;
    const r = Rows(await db.execute(sql`SELECT ${col} AS url FROM relays WHERE id = ${Number(req.params.id)}`))[0];
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(r?.url || "");
    if (!m) return res.status(404).send("Photo introuvable");
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(m[2], "base64"));
  });
  app.post("/api/admin/relays/:id/card", admin, async (req: any, res) => {
    const id = Number(req.params.id);
    const decision = req.body?.decision === "verified" ? "verified" : "rejected";
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (decision === "rejected" && !reason) return res.status(400).json({ message: "Indiquez le motif du refus." });
    const r = Rows(await db.execute(sql`
      UPDATE relays SET card_status = ${decision}, card_reject_reason = ${decision === "rejected" ? reason : null},
        verified_by = ${decision === "verified" ? "GlowScan" : null}, verified_at = ${decision === "verified" ? sql`NOW()` : sql`NULL`}
      WHERE id = ${id} RETURNING pro_account_id`))[0];
    if (!r) return res.status(404).json({ message: "Relais introuvable" });
    await refreshRelayStatus(id);
    notifyProAccount(Number(r.pro_account_id), decision === "verified"
      ? { title: "Carte professionnelle vérifiée", body: "Votre carte a été vérifiée par GlowScan.", url: "/derm/relais" }
      : { title: "Carte professionnelle à reprendre", body: reason, url: "/derm/relais" }).catch(() => {});
    res.json({ success: true });
  });
  // Inscription libre : GlowScan a appelé le centre de santé et se porte parrain.
  app.post("/api/admin/relays/:id/sponsor-glowscan", admin, async (req: any, res) => {
    const id = Number(req.params.id);
    const r = Rows(await db.execute(sql`UPDATE relays SET sponsor_type = 'glowscan', sponsor_id = NULL WHERE id = ${id} AND sponsor_type IS NULL RETURNING pro_account_id`))[0];
    if (!r) return res.status(409).json({ message: "Ce relais a déjà un parrain." });
    await refreshRelayStatus(id);
    notifyProAccount(Number(r.pro_account_id), { title: "Parrainage confirmé", body: "GlowScan a vérifié votre centre de santé.", url: "/derm/relais" }).catch(() => {});
    res.json({ success: true });
  });
}

// ── Cron : relances J+2 et J+7, expiration à 14 jours ───────────────────
export async function runInvitationReminders(): Promise<{ reminded: number; expired: number }> {
  let reminded = 0;
  const rows = Rows(await db.execute(sql`
    SELECT i.id, i.phone, i.token, i.inviter_type, i.created_at, i.reminded_j2_at, i.reminded_j7_at, p.full_name, g.name AS program_name
    FROM invitations i LEFT JOIN pro_accounts p ON p.id = i.inviter_id LEFT JOIN programs g ON g.id = i.program_id
    WHERE i.status = 'sent' AND i.expires_at > NOW()
      AND ((i.reminded_j2_at IS NULL AND i.created_at < NOW() - INTERVAL '2 days') OR (i.reminded_j7_at IS NULL AND i.created_at < NOW() - INTERVAL '7 days'))`));
  for (const r of rows) {
    const j7 = new Date(r.created_at) < new Date(Date.now() - 7 * 86400000);
    const who = r.inviter_type === "program" ? `Le programme ${r.program_name || ""}`.trim() : dr(r.full_name);
    await sendSmsText(`+${r.phone}`, `Rappel : ${inviteSms(who, r.token)}`).catch(() => null);
    if (j7) await db.execute(sql`UPDATE invitations SET reminded_j7_at = NOW(), reminded_j2_at = COALESCE(reminded_j2_at, NOW()) WHERE id = ${r.id}`);
    else await db.execute(sql`UPDATE invitations SET reminded_j2_at = NOW() WHERE id = ${r.id}`);
    reminded++;
  }
  const ex = Rows(await db.execute(sql`UPDATE invitations SET status = 'expired' WHERE status = 'sent' AND expires_at < NOW() RETURNING id`));
  return { reminded, expired: ex.length };
}
