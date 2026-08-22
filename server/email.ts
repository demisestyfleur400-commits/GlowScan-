// ── Envoi d'email — agnostique du fournisseur ───────────────────────────────
// Priorité : Resend (RESEND_API_KEY) → sinon fallback DEV (log console).
// Aucune dépendance npm : appel HTTP direct via fetch (Node 18+).
// Pour la prod : créer une clé sur resend.com, vérifier le domaine glow-scan.com,
// puis définir RESEND_API_KEY et EMAIL_FROM (ex: "GlowScan <securite@glow-scan.com>").

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "GlowScan <onboarding@resend.dev>";

export interface SendEmailResult { ok: boolean; provider: "resend" | "dev" | "none"; error?: string }

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<SendEmailResult> {
  if (!to) return { ok: false, provider: "none", error: "Destinataire manquant" };

  if (RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text: text || undefined }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        return { ok: false, provider: "resend", error: `Resend ${r.status}: ${body.slice(0, 200)}` };
      }
      return { ok: true, provider: "resend" };
    } catch (e: any) {
      return { ok: false, provider: "resend", error: e?.message || String(e) };
    }
  }

  // Fallback DEV : pas de fournisseur configuré → on log (utile en local/staging).
  console.log(`\n📧 [email:dev] (RESEND_API_KEY absent) — email NON envoyé\n   To: ${to}\n   Subject: ${subject}\n   ${text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}\n`);
  return { ok: false, provider: "dev", error: "RESEND_API_KEY non configurée (fallback dev)" };
}

// Gabarit du code 2FA — sobre, mobile-friendly, blanc/bleu GlowScan.
export function buildOtpEmail(code: string, name?: string): { subject: string; html: string; text: string } {
  const subject = `Votre code de connexion GlowScan : ${code}`;
  const text = `Bonjour ${name || ""},\n\nVotre code de connexion GlowScan DERM est : ${code}\nIl expire dans 10 minutes.\n\nSi vous n'avez pas tenté de vous connecter, ignorez cet email et changez votre mot de passe.\n\nGlowScan`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#0F172A">
    <p style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0369A1;margin:0 0 8px">GlowScan DERM</p>
    <h1 style="font-size:18px;margin:0 0 12px">Votre code de connexion</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 16px">Bonjour ${name || ""}, saisissez ce code pour terminer votre connexion :</p>
    <div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#0F172A;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">${code}</div>
    <p style="font-size:12px;color:#64748B;margin:0 0 4px">Ce code expire dans <strong>10 minutes</strong>.</p>
    <p style="font-size:12px;color:#64748B;margin:0">Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email et changez votre mot de passe.</p>
  </div>`;
  return { subject, html, text };
}
