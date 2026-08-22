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

// Layout partagé — en-tête GlowScan + corps + éventuel bouton CTA.
const APP_URL = (process.env.PUBLIC_BASE_URL || "https://glow-scan.com").replace(/\/$/, "");
function wrap(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const btn = cta ? `<a href="${cta.url}" style="display:inline-block;margin:8px 0 4px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 22px;border-radius:9999px">${cta.label}</a>` : "";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#0F172A">
    <p style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0369A1;margin:0 0 10px">GlowScan DERM</p>
    <h1 style="font-size:19px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    ${btn}
    <p style="font-size:11px;color:#94A3B8;margin:20px 0 0;border-top:1px solid #E2E8F0;padding-top:12px">GlowScan DERM · glow-scan.com — l'outil des dermatologues africains.</p>
  </div>`;
}
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// 3 · Email de bienvenue (à l'inscription).
export function buildWelcomeEmail(name: string, publicProfileUrl?: string) {
  const subject = `Bienvenue sur GlowScan DERM, Dr ${name} 👋`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Votre compte est créé — 14 jours d'essai gratuit, sans carte bancaire.</p>
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Pour recevoir vos premiers patients : complétez votre <strong>profil public</strong> (photo, spécialités), il vous rend visible sur Google et vous amène des patients GlowScan.</p>`;
  const html = wrap(`Bienvenue, Dr ${name}`, body, publicProfileUrl ? { label: "Compléter mon profil public", url: publicProfileUrl } : undefined);
  return { subject, html, text: strip(body) };
}

// 4 · Rappel de fin d'essai.
export function buildTrialReminderEmail(name: string, daysLeft: number) {
  const subject = daysLeft <= 1 ? `Votre essai GlowScan se termine demain` : `Il vous reste ${daysLeft} jours d'essai GlowScan`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Bonjour Dr ${name}, votre essai gratuit se termine ${daysLeft <= 1 ? "<strong>demain</strong>" : `dans <strong>${daysLeft} jours</strong>`}.</p>
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Continuez pour <strong>10 000 FCFA/mois</strong> (Mobile Money, sans engagement). Une seule consultation en ligne rentabilise le mois.</p>`;
  const html = wrap(subject, body, { label: "Gérer mon abonnement", url: `${APP_URL}/derm/cabinet` });
  return { subject, html, text: strip(body) };
}

// 5 · Reçu d'abonnement.
export function buildReceiptEmail(name: string, amountFcfa: number, reference: string, expiresAt: Date) {
  const subject = `Reçu GlowScan — abonnement activé ✅`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Merci Dr ${name}, votre abonnement GlowScan DERM est actif.</p>
    <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin:0 0 12px;font-size:13px;color:#0F172A">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748B">Montant</span><strong>${amountFcfa.toLocaleString("fr-FR")} FCFA</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748B">Référence</span><strong>${reference}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#64748B">Valable jusqu'au</span><strong>${expiresAt.toLocaleDateString("fr-FR")}</strong></div>
    </div>`;
  const html = wrap("Abonnement activé", body);
  return { subject, html, text: strip(body) };
}

// 6 · Digest mensuel.
export function buildDigestEmail(name: string, stats: { patients: number; analyses: number; onlineConsults?: number; revenue?: number }, monthLabel: string) {
  const subject = `Votre activité GlowScan — ${monthLabel}`;
  const row = (label: string, val: string) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E2E8F0;font-size:14px"><span style="color:#64748B">${label}</span><strong style="color:#0F172A">${val}</strong></div>`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Bonjour Dr ${name}, voici votre activité de ${monthLabel} :</p>
    <div style="margin:0 0 12px">
      ${row("Patients suivis", String(stats.patients))}
      ${row("Analyses réalisées", String(stats.analyses))}
      ${stats.onlineConsults != null ? row("Consultations en ligne", String(stats.onlineConsults)) : ""}
      ${stats.revenue != null ? row("Revenus en ligne", `${stats.revenue.toLocaleString("fr-FR")} FCFA`) : ""}
    </div>`;
  const html = wrap(`Votre mois en un coup d'œil`, body, { label: "Voir mes statistiques", url: `${APP_URL}/derm/statistiques` });
  return { subject, html, text: strip(body) };
}

// 7 · Notification confrère (fallback email pour ceux sans push).
export function buildPeerNotifEmail(name: string, title: string, message: string) {
  const subject = `GlowScan — ${title}`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Bonjour Dr ${name},</p>
    <p style="font-size:14px;color:#0F172A;margin:0 0 12px">${message}</p>`;
  const html = wrap(title, body, { label: "Ouvrir dans GlowScan", url: `${APP_URL}/derm/confreres` });
  return { subject, html, text: strip(body) };
}

// 8 · Ré-engagement (inactivité).
export function buildReengageEmail(name: string, daysInactive: number) {
  const subject = `On ne vous a pas vu depuis ${daysInactive} jours, Dr ${name}`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Vos patients continuent de faire leurs analyses sur GlowScan. Reconnectez-vous pour ne rien manquer — nouveaux patients, avis de confrères, suivis à relancer.</p>`;
  const html = wrap("Vos patients vous attendent", body, { label: "Revenir sur GlowScan", url: `${APP_URL}/derm/dashboard` });
  return { subject, html, text: strip(body) };
}

// 9 · Copie email du rapport de consultation.
export function buildConsultationCopyEmail(dermatologistName: string, reportUrl: string) {
  const subject = `Votre rapport de consultation GlowScan`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Votre consultation avec Dr ${dermatologistName} est documentée. Téléchargez votre rapport ci-dessous (valable 3 mois).</p>`;
  const html = wrap("Votre rapport est prêt", body, { label: "Télécharger le rapport", url: reportUrl });
  return { subject, html, text: `Rapport : ${reportUrl}` };
}

// 2 · Lien magique (connexion sans mot de passe).
export function buildMagicLinkEmail(name: string, url: string) {
  const subject = `Votre lien de connexion GlowScan`;
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 12px">Bonjour ${name || ""}, cliquez pour vous connecter à GlowScan DERM. Ce lien expire dans 15 minutes et ne fonctionne qu'une fois.</p>`;
  const html = wrap("Connexion en un clic", body, { label: "Me connecter", url });
  return { subject, html, text: `Lien de connexion (15 min) : ${url}` };
}

// Gabarit du code de réinitialisation de mot de passe.
export function buildResetEmail(code: string, name?: string): { subject: string; html: string; text: string } {
  const subject = `Réinitialisation de votre mot de passe GlowScan : ${code}`;
  const text = `Bonjour ${name || ""},\n\nVotre code pour réinitialiser votre mot de passe GlowScan DERM est : ${code}\nIl expire dans 15 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.\n\nGlowScan`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#0F172A">
    <p style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0369A1;margin:0 0 8px">GlowScan DERM</p>
    <h1 style="font-size:18px;margin:0 0 12px">Réinitialisation du mot de passe</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 16px">Bonjour ${name || ""}, voici votre code pour définir un nouveau mot de passe :</p>
    <div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#0F172A;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">${code}</div>
    <p style="font-size:12px;color:#64748B;margin:0 0 4px">Ce code expire dans <strong>15 minutes</strong>.</p>
    <p style="font-size:12px;color:#64748B;margin:0">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
  </div>`;
  return { subject, html, text };
}

// Alerte de sécurité (nouvelle connexion, mot de passe changé, 2FA modifiée).
export function buildSecurityAlertEmail(kind: "login" | "password_changed" | "twofa_changed", name?: string, detail?: string): { subject: string; html: string; text: string } {
  const map = {
    login: { t: "Nouvelle connexion à votre compte", d: "Une connexion vient d'avoir lieu sur votre compte GlowScan DERM." },
    password_changed: { t: "Votre mot de passe a été modifié", d: "Le mot de passe de votre compte GlowScan DERM vient d'être changé." },
    twofa_changed: { t: "Vos paramètres de sécurité ont changé", d: "La vérification en 2 étapes de votre compte a été modifiée." },
  }[kind];
  const subject = `GlowScan — ${map.t}`;
  const text = `Bonjour ${name || ""},\n\n${map.d}${detail ? `\n${detail}` : ""}\n\nSi ce n'est pas vous, changez immédiatement votre mot de passe et contactez le support.\n\nGlowScan`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#0F172A">
    <p style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0369A1;margin:0 0 8px">GlowScan DERM · Sécurité</p>
    <h1 style="font-size:17px;margin:0 0 12px">${map.t}</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 8px">Bonjour ${name || ""}, ${map.d}</p>
    ${detail ? `<p style="font-size:13px;color:#64748B;margin:0 0 12px">${detail}</p>` : ""}
    <p style="font-size:12px;color:#64748B;margin:0">Si ce n'est pas vous, changez immédiatement votre mot de passe et contactez le support.</p>
  </div>`;
  return { subject, html, text };
}
