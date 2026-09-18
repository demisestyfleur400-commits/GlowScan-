// ════════════════════════════════════════════════════════════════════════
// Livraison du rapport de consultation au patient.
//
// Option C (active aujourd'hui) : lien de téléchargement sécurisé (token HMAC)
// + notification push. Aucun numéro de téléphone requis.
// Option B (prête) : envoi WhatsApp via Twilio dès que TWILIO_WHATSAPP_FROM est
// configuré ET qu'un numéro patient est disponible.
//
// L'échec de livraison ne bloque JAMAIS la clôture (tout est best-effort).
// ════════════════════════════════════════════════════════════════════════
import crypto from "crypto";
import webpush from "web-push";
import { db } from "./db";
import { storage } from "./storage";
import { sql } from "drizzle-orm";

const BASE = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
// Signature HMAC des liens de rapports médicaux : AUCUN fallback en dur.
// SESSION_SECRET est garanti par le garde de démarrage (server/index.ts).
const SECRET = process.env.SESSION_SECRET || process.env.DATASET_EXPORT_SALT || "";

// VAPID (idempotent) — nécessaire pour web-push depuis ce module.
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || "contact@glow-scan.com"}`,
      process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY,
    );
  }
} catch {}

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];

// ── Token de téléchargement signé (par défaut 90 jours = « valable 3 mois ») ──
export function makeReportToken(consultationId: number, days = 90): string {
  const exp = Date.now() + days * 86400000;
  const sig = crypto.createHmac("sha256", SECRET).update(`${consultationId}.${exp}`).digest("hex").slice(0, 24);
  return Buffer.from(`${consultationId}.${exp}.${sig}`).toString("base64url");
}
export function verifyReportToken(token: string, consultationId: number): boolean {
  try {
    const [id, exp, sig] = Buffer.from(token, "base64url").toString().split(".");
    if (Number(id) !== consultationId) return false;
    if (Date.now() > Number(exp)) return false;
    const good = crypto.createHmac("sha256", SECRET).update(`${id}.${exp}`).digest("hex").slice(0, 24);
    return good === sig;
  } catch { return false; }
}
export function reportUrl(consultationId: number): string {
  return `${BASE}/api/consultations/${consultationId}/report/download?token=${makeReportToken(consultationId)}`;
}

// Normalise un numéro camerounais → E.164 (+237XXXXXXXXX).
function normalizePhone(p: string): string {
  const d = (p || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("237")) return "+" + d;
  if (d.length === 9) return "+237" + d;
  return "+" + d;
}

// ── ÉTAPE 3.1 — fonction demandée : envoi WhatsApp (Twilio) ──────────────────
export async function sendConsultationReport(opts: {
  consultationId: number;
  patientPhone?: string | null;
  patientName: string;
  dermatologistName: string;
  pdfUrl: string;
}): Promise<{ method: "twilio" | "none"; ok: boolean; error?: string }> {
  const { patientPhone, patientName, dermatologistName, pdfUrl } = opts;
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ex: "whatsapp:+14155238886"
  const body =
    `Bonjour ${patientName},\n\n` +
    `Votre rapport de consultation GlowScan avec Dr ${dermatologistName} est disponible.\n\n` +
    `Telecharger votre rapport : ${pdfUrl}\n\n` +
    `Ce rapport est valable 3 mois.\nglow-scan.com`;
  const to = normalizePhone(patientPhone || "");
  if (sid && tok && from && to) {
    try {
      const twilio = (await import("twilio")).default(sid, tok);
      await twilio.messages.create({ from, to: "whatsapp:" + to, body });
      return { method: "twilio", ok: true };
    } catch (e: any) {
      return { method: "twilio", ok: false, error: e?.message || String(e) };
    }
  }
  return { method: "none", ok: false, error: "WhatsApp API (Twilio) non configurée ou numéro patient absent" };
}

// ── Envoi WhatsApp générique (texte libre) — réutilisé pour les rappels de suivi ──
export async function sendWhatsAppText(phone: string | null | undefined, body: string): Promise<{ ok: boolean; method: "twilio" | "none"; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = normalizePhone(phone || "");
  if (!(sid && tok && from && to)) {
    return { ok: false, method: "none", error: "WhatsApp API (Twilio) non configurée ou numéro absent" };
  }
  try {
    const twilio = (await import("twilio")).default(sid, tok);
    await twilio.messages.create({ from, to: "whatsapp:" + to, body });
    return { ok: true, method: "twilio" };
  } catch (e: any) {
    return { ok: false, method: "twilio", error: e?.message || String(e) };
  }
}

// Construit un lien "cliquer pour ouvrir WhatsApp" (fallback manuel si Twilio absent).
export function whatsappDeepLink(phone: string, text: string): string {
  const d = (phone || "").replace(/[^0-9]/g, "");
  const num = d.startsWith("237") ? d : (d.length === 9 ? "237" + d : d);
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// Message de rappel de contrôle (suivi évolution).
export function buildFollowUpReminderMessage(patientName: string, dermatologistName: string, customMsg?: string | null): string {
  if (customMsg && customMsg.trim()) return customMsg.trim();
  return (
    `Bonjour ${patientName || ""},\n\n` +
    `Dr ${dermatologistName} vous invite a envoyer une nouvelle photo de la zone traitee ` +
    `pour suivre l'evolution de votre traitement.\n\n` +
    `Repondez simplement a ce message avec votre photo, ou prenez rendez-vous.\n\nGlowScan`
  ).trim();
}

// Notification push au patient avec le lien du rapport. Renvoie le nb de devices notifiés.
async function pushReport(userId: string, dermatologistName: string, url: string): Promise<number> {
  let ok = 0;
  try {
    const subs = await storage.getPushSubscriptionsByUser(userId);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Votre rapport de consultation est prêt 📋", body: `Dr ${dermatologistName} — appuyez pour télécharger.`, url }),
        );
        ok++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) await storage.deletePushSubscription(sub.endpoint);
      }
    }
  } catch {}
  return ok;
}

// ── Orchestration : appelée à la clôture. Ne throw jamais. ───────────────────
// Statut whatsapp_send_status : 'sent' (livré par WhatsApp OU push), 'failed'
// (rien livré), 'pending' (état initial). Met à jour la base.
export async function deliverConsultationReport(consultationId: number): Promise<void> {
  try {
    // patient_phone : colonne ajoutée (peut ne pas exister sur base non migrée).
    let c: any;
    try {
      c = Rows(await db.execute(sql`
        SELECT c.id, c.user_id, c.pro_account_id, c.patient_phone,
               u.first_name AS patient_first, u.email AS patient_email, p.full_name AS derm_name
        FROM consultations c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN pro_accounts p ON p.id = c.pro_account_id
        WHERE c.id = ${consultationId}`))[0];
    } catch {
      c = Rows(await db.execute(sql`
        SELECT c.id, c.user_id, c.pro_account_id, u.first_name AS patient_first, u.email AS patient_email, p.full_name AS derm_name
        FROM consultations c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN pro_accounts p ON p.id = c.pro_account_id
        WHERE c.id = ${consultationId}`))[0];
    }
    if (!c) return;

    const patientName = c.patient_first || "cher patient";
    const dermName = String(c.derm_name || "GlowScan").replace(/^dr\.?\s*/i, "");
    const url = reportUrl(consultationId);
    const patientPhone: string | null = c.patient_phone || null;

    const wa = await sendConsultationReport({ consultationId, patientPhone, patientName, dermatologistName: dermName, pdfUrl: url });
    const pushed = await pushReport(c.user_id, dermName, url);

    // 9 · Copie email du rapport (best-effort) pour les patients sans WhatsApp/push.
    let emailed = false;
    try {
      const patientEmail: string | null = c.patient_email || null;
      if (patientEmail && !patientEmail.endsWith("@phone.glowscan.cm")) {
        const { sendEmail, buildConsultationCopyEmail } = await import("./email");
        const m = buildConsultationCopyEmail(dermName, url);
        const r = await sendEmail(patientEmail, m.subject, m.html, m.text);
        emailed = r.ok;
      }
    } catch {}

    // 9b · Copie email AU DERMATOLOGUE (archivage de sa consultation clôturée).
    try {
      const derm = Rows(await db.execute(sql`SELECT u.email FROM pro_accounts p JOIN users u ON u.id = p.user_id WHERE p.id = ${c.pro_account_id}`))[0] as any;
      const dermEmail: string | null = derm?.email || null;
      if (dermEmail) {
        const { sendEmail } = await import("./email");
        await sendEmail(
          dermEmail,
          `Consultation clôturée — ${patientName}`,
          `<p>Bonjour Dr ${dermName},</p><p>Votre consultation avec <strong>${patientName}</strong> est clôturée. Voici une copie du rapport (diagnostic final + ordonnance) transmis au patient.</p><p><a href="${url}">Ouvrir le rapport →</a></p>`,
          `Consultation clôturée avec ${patientName}. Rapport : ${url}`,
        ).catch(() => {});
      }
    } catch {}

    const status = wa.ok || pushed > 0 || emailed ? "sent" : "failed";
    try {
      await db.execute(sql`UPDATE consultations SET whatsapp_send_status = ${status}, whatsapp_sent_at = ${status === "sent" ? sql`NOW()` : sql`NULL`} WHERE id = ${consultationId}`);
    } catch (e) { console.warn("[report] statut non enregistré (migration appliquée ?):", (e as any)?.message); }
    console.log(`[report] consultation #${consultationId} → ${status} (whatsapp:${wa.method}/${wa.ok}, push:${pushed})`);
  } catch (err) {
    console.error("[report] deliverConsultationReport error:", err);
  }
}

// ── Rendu HTML du COMPTE RENDU PATIENT — professionnel, mobile-first, fond clair.
// N'affiche QUE des données réelles/validées. Priorité absolue au diagnostic du
// médecin. Aucune donnée IA technique (score, redFlags, différentiels, confiance)
// n'est exposée. Les sections vides sont entièrement masquées. `d` est assemblé par
// l'endpoint /report/download à partir des colonnes existantes.
export function buildReportHtml(d: any): string {
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
  const dt = (v: any, withTime = false) => {
    if (!v) return "";
    const date = new Date(v);
    return withTime
      ? date.toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };
  const firstName = esc(d?.patient?.firstName || "cher patient");
  const docName = esc(String(d?.doctor?.name || "GlowScan").replace(/^dr\.?\s*/i, ""));
  const validated = d?.validatedAt || d?.createdAt || new Date().toISOString();
  const genDate = dt(new Date().toISOString());

  // ── Praticien (city/cabinet/photo seulement si présents) ──
  const docMeta = [d?.doctor?.cabinet, d?.doctor?.city].filter(Boolean).map(esc).join(" · ");
  const docPhoto = d?.doctor?.photoUrl
    ? `<img src="${esc(d.doctor.photoUrl)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0"/>`
    : "";

  // ── Section 3 : ce que le patient a signalé (données patient réelles) ──
  const sig = d?.signaled || {};
  const sigRows: string[] = [];
  if (sig.duration) sigRows.push(`<li><strong>Depuis :</strong> ${esc(sig.duration)}</li>`);
  if (sig.products) sigRows.push(`<li><strong>Produits déjà utilisés :</strong> ${esc(sig.products)}</li>`);
  if (sig.allergies) sigRows.push(`<li><strong>Allergies signalées :</strong> ${esc(sig.allergies)}</li>`);
  if (Array.isArray(sig.summaryNotes)) {
    const catLabel: Record<string, string> = { duree: "Depuis quand", symptomes: "Symptômes", zone: "Zone concernée", produits: "Produits essayés", evolution: "Évolution", allergies: "Allergies", antecedents: "Antécédents" };
    for (const n of sig.summaryNotes) {
      if (n?.value) sigRows.push(`<li><strong>${esc(catLabel[n.category] || n.category)} :</strong> ${esc(n.value)}</li>`);
    }
  }
  const section3 = sigRows.length
    ? `<h2 style="${H2}">Ce que vous avez signalé</h2><ul style="${UL}">${sigRows.join("")}</ul>`
    : "";

  // ── Section 4 : avis du dermatologue (PRIORITÉ ABSOLUE, jamais l'IA) ──
  const avis = d?.finalCondition
    ? `L'examen à distance est compatible avec <strong>${esc(d.finalCondition)}</strong>. Votre dermatologue vous recommande les mesures ci-dessous et un suivi de l'évolution.`
    : "Les informations disponibles nécessitent une surveillance et/ou un examen complémentaire. Votre dermatologue vous a indiqué les prochaines étapes à suivre.";
  const section4 = `<h2 style="${H2}">L'avis de votre dermatologue</h2>
    <p style="${P}">${avis}</p>
    <p style="font-size:11.5px;color:#6b7280;margin:6px 0 0;line-height:1.6">Une consultation à distance a certaines limites. Votre dermatologue peut recommander un examen en personne si nécessaire.</p>`;

  // ── Section 5 : conseils OU traitement prescrit (jamais « ordonnance » sans validation) ──
  const adviceTitle = d?.isPrescription ? "Traitement prescrit" : "Conseils de votre dermatologue";
  const section5 = d?.advice
    ? `<h2 style="${H2}">${adviceTitle}</h2><div style="${BOX}white-space:pre-wrap">${esc(d.advice)}</div>`
    : "";

  // ── Section 6 : suivi (seulement si programmé) ──
  const section6 = d?.followUpDate
    ? `<h2 style="${H2}">Votre suivi</h2><p style="${P}">Envoyez une nouvelle photo autour du <strong>${esc(dt(d.followUpDate))}</strong> pour suivre l'évolution. Recontactez votre dermatologue si la situation change.</p>`
    : "";

  // ── Section 7 : photos (déjà filtrées par consentement côté serveur) ──
  const photos: string[] = Array.isArray(d?.photos) ? d.photos : [];
  const section7 = photos.length
    ? `<h2 style="${H2}">Photos utilisées pour votre suivi</h2>
       <div style="display:flex;gap:8px;flex-wrap:wrap">${photos.map((u) => `<img src="${esc(u)}" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:10px;border:1px solid #eee"/>`).join("")}</div>
       <p style="font-size:11px;color:#6b7280;margin:6px 0 0">Le ${esc(dt(d?.createdAt))}. Comparaison disponible pour discussion avec votre dermatologue.</p>`
    : "";

  // ── Section 2 : message personnel du dermatologue (si saisi) ──
  const persoMsg = d?.doctorMessage
    ? `<div style="${BOX}"><div style="font-size:11px;font-weight:800;color:#7c3aed;margin-bottom:4px">Message de votre dermatologue</div><div style="white-space:pre-wrap">${esc(d.doctorMessage)}</div></div>`
    : "";

  // ── Section 8 : mention IA discrète UNIQUEMENT si l'IA a servi (jamais de détail technique) ──
  const aiLine = d?.usedAI
    ? `<p style="${P}">GlowScan a aidé à organiser les informations de votre consultation. Les conseils et conclusions de ce compte rendu ont été validés par votre dermatologue.</p>`
    : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Votre compte rendu dermatologique — GlowScan DERM</title>
<style>@media print{.no-print{display:none!important}}</style></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',sans-serif;background:#fff;max-width:680px;margin:0 auto;padding:22px 20px;color:#1f2937;line-height:1.55">

  <!-- SECTION 1 — EN-TÊTE -->
  <div style="border-bottom:2px solid #7c3aed;padding-bottom:14px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:20px">✨</span>
      <span style="font-size:17px;font-weight:900;color:#111827">GlowScan <span style="color:#7c3aed">DERM</span></span>
    </div>
    <h1 style="font-size:20px;font-weight:900;margin:6px 0 2px;color:#111827">Votre compte rendu dermatologique</h1>
    <p style="font-size:12.5px;color:#6b7280;margin:0 0 8px">Consultation à distance validée par un dermatologue</p>
    <span style="display:inline-block;font-size:11.5px;font-weight:800;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:9999px;padding:4px 10px">✓ Compte rendu validé par le dermatologue</span>
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:12px;font-size:11.5px;color:#6b7280">
      <span>Validé le ${esc(dt(validated, true))}</span>
      <span>Réf. consultation #${esc(d?.ref)}</span>
    </div>
  </div>

  <!-- Praticien + patient -->
  <div style="display:flex;gap:12px;align-items:center;background:#faf9ff;border:1px solid #ede9fe;border-radius:14px;padding:12px 14px;margin-bottom:8px">
    ${docPhoto}
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:800;color:#111827">Dr ${docName}${d?.doctor?.certified ? ` <span title="Certifié GlowScan" style="color:#7c3aed">✦</span>` : ""}</div>
      <div style="font-size:12px;color:#6b7280">Dermatologue${docMeta ? ` · ${docMeta}` : ""}</div>
    </div>
  </div>
  <p style="font-size:12.5px;color:#374151;margin:0 0 18px"><strong>Patient :</strong> ${firstName}${d?.patient?.age ? ` · ${esc(d.patient.age)} ans` : ""}</p>

  <!-- SECTION 2 — MESSAGE PERSONNEL -->
  <h2 style="${H2}">Bonjour ${firstName}, voici le résumé de votre consultation</h2>
  ${persoMsg}
  <p style="${P}">Votre dermatologue a examiné les informations et les photos partagées lors de votre consultation. Vous trouverez ci-dessous les points importants et les conseils pour la suite.</p>

  ${section3}
  ${section4}
  ${section5}
  ${section6}
  ${section7}

  <!-- SECTION 8 — À RETENIR -->
  <h2 style="${H2}">À retenir</h2>
  <p style="${P}">Ce document résume les conseils donnés par votre dermatologue à partir des informations disponibles lors de votre consultation. Il ne remplace pas une consultation en personne lorsque celle-ci est recommandée.</p>
  ${aiLine}

  <!-- SECTION 9 — PIED DE PAGE -->
  <div style="margin-top:26px;border-top:1px solid #eee;padding-top:12px;font-size:10.5px;color:#9ca3af">
    <div style="font-weight:700;color:#6b7280">GlowScan DERM · Réf. #${esc(d?.ref)} · Généré le ${esc(genDate)}</div>
    <div style="margin-top:3px">Document personnel et confidentiel. · <a href="https://glow-scan.com/derm" style="color:#7c3aed;text-decoration:none">glow-scan.com/derm</a></div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:22px">
    <button onclick="window.print()" style="background:#7c3aed;color:#fff;border:none;border-radius:9999px;padding:11px 22px;font-size:13px;font-weight:800;cursor:pointer">Enregistrer en PDF</button>
  </div>
</body></html>`;
}

// Styles inline partagés (fond clair, bon contraste, lisible mobile + impression A4).
const H2 = "font-size:14.5px;font-weight:800;color:#111827;margin:20px 0 8px";
const P = "font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6";
const UL = "font-size:13px;color:#374151;margin:0 0 8px;padding-left:18px;line-height:1.7";
const BOX = "font-size:13px;color:#1f2937;line-height:1.6;background:#faf9ff;border:1px solid #ede9fe;border-radius:12px;padding:12px;margin:0 0 8px;";
