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
const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_KEY || process.env.DATASET_EXPORT_SALT || "glowscan-report-secret-v1";

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
    const c = Rows(await db.execute(sql`
      SELECT c.id, c.user_id, c.pro_account_id,
             u.first_name AS patient_first, p.full_name AS derm_name,
             COALESCE(p.whatsapp_number, p.phone) AS derm_phone
      FROM consultations c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN pro_accounts p ON p.id = c.pro_account_id
      WHERE c.id = ${consultationId}`))[0] as any;
    if (!c) return;

    const patientName = c.patient_first || "cher patient";
    const dermName = String(c.derm_name || "GlowScan").replace(/^dr\.?\s*/i, "");
    const url = reportUrl(consultationId);

    // Le numéro du patient n'est pas stocké (users n'a pas de phone) → WhatsApp
    // Twilio restera inactif tant qu'on ne capture pas le téléphone patient.
    const patientPhone: string | null = null;

    const wa = await sendConsultationReport({ consultationId, patientPhone, patientName, dermatologistName: dermName, pdfUrl: url });
    const pushed = await pushReport(c.user_id, dermName, url);

    const status = wa.ok || pushed > 0 ? "sent" : "failed";
    try {
      await db.execute(sql`UPDATE consultations SET whatsapp_send_status = ${status}, whatsapp_sent_at = ${status === "sent" ? sql`NOW()` : sql`NULL`} WHERE id = ${consultationId}`);
    } catch (e) { console.warn("[report] statut non enregistré (migration appliquée ?):", (e as any)?.message); }
    console.log(`[report] consultation #${consultationId} → ${status} (whatsapp:${wa.method}/${wa.ok}, push:${pushed})`);
  } catch (err) {
    console.error("[report] deliverConsultationReport error:", err);
  }
}

// ── Rendu HTML du rapport (imprimable / téléchargeable) ──────────────────────
export function buildReportHtml(c: any, messages: any[], doctorName: string, patientName: string): string {
  const esc = (s: string) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
  const date = c?.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("fr-FR");
  const rows = (messages || []).map((m) => {
    const who = m.sender_type === "doctor" || m.senderType === "doctor" ? "Dermatologue" : "Patient";
    const t = (m.created_at || m.createdAt) ? new Date(m.created_at || m.createdAt).toLocaleString("fr-FR") : "";
    const body = (m.body) ? esc(m.body) : ((m.image_url || m.imageUrl) ? "<em>[photo partagée]</em>" : "");
    const left = who === "Dermatologue";
    return `<div style="text-align:${left ? "left" : "right"};margin:8px 0"><div style="display:inline-block;max-width:80%;background:${left ? "#f3f0ff" : "#eafaf1"};border-radius:12px;padding:8px 12px;text-align:left"><div style="font-size:10px;color:#7c3aed;font-weight:700">${who} · ${t}</div><div style="font-size:12px;color:#1a1a2e;margin-top:2px;white-space:pre-wrap">${body}</div></div></div>`;
  }).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rapport consultation GlowScan</title></head>
<body style="font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a2e">
  <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #7c3aed;padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:22px">✨</div>
    <div><div style="font-size:18px;font-weight:900">GlowScan</div><div style="font-size:11px;color:#6b7280">Rapport de consultation dermatologique</div></div>
    <div style="margin-left:auto;font-size:11px;color:#6b7280">${date}</div>
  </div>
  <p style="font-size:13px"><strong>Patient :</strong> ${esc(patientName)}</p>
  <p style="font-size:13px"><strong>Dermatologue :</strong> Dr ${esc(doctorName)}</p>
  ${c?.condition ? `<p style="font-size:13px"><strong>Motif / diagnostic IA :</strong> ${esc(c.condition)}</p>` : ""}
  ${c?.image_url || c?.imageUrl ? `<img src="${esc(c.image_url || c.imageUrl)}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;margin:8px 0"/>` : ""}
  <h3 style="font-size:14px;margin:18px 0 6px;color:#7c3aed">Échange de la consultation</h3>
  ${rows || "<p style='font-size:12px;color:#6b7280'>Aucun message.</p>"}
  <p style="font-size:10px;color:#9ca3af;margin-top:24px;border-top:1px solid #eee;padding-top:10px">
    Ce rapport résume une consultation en ligne réalisée via GlowScan. Il ne remplace pas un examen clinique en présentiel. Document valable 3 mois.
  </p>
  <div style="text-align:center;margin-top:20px"><button onclick="window.print()" style="background:#7c3aed;color:#fff;border:none;border-radius:9999px;padding:10px 20px;font-size:13px;font-weight:800;cursor:pointer">Enregistrer en PDF</button></div>
</body></html>`;
}
