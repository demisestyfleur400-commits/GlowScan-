// ════════════════════════════════════════════════════════════════════════
// Messages WhatsApp envoyés aux patients. Règles : vouvoiement, aucun émoji,
// et chaque relance se termine par la ligne STOP (traitée par le webhook
// Twilio ou, pour les envois manuels, par le bouton « A répondu STOP »).
// ════════════════════════════════════════════════════════════════════════

/** « ARRÊT SUIVI » : coupe uniquement les rappels de suivi demandés par un médecin. */
export function isFollowupStopMessage(body: string | null | undefined): boolean {
  const t = String(body || "").trim().toUpperCase().normalize("NFD").replace(/\p{M}/gu, ""); // sans accents
  return /^ARRET\s+(DU\s+|DES\s+)?SUIVI\b/.test(t);
}

/** Pied de chaque rappel de suivi (pas de STOP commercial sur ces messages). */
export const FOLLOWUP_FOOTER = "Pour ne plus recevoir ces rappels, répondez ARRÊT SUIVI";
export const withFollowupFooter = (msg: string) => `${msg.trim()}

${FOLLOWUP_FOOTER}`;

export const STOP_FOOTER = "Répondez STOP pour ne plus recevoir de messages.";

/** Demande de désinscription : le premier mot du message est STOP (ou une variante),
 *  ex. « STOP », « Stop. », « stop merci ». */
export function isStopMessage(body: string | null | undefined): boolean {
  if (isFollowupStopMessage(body)) return false; // « ARRÊT SUIVI » ne coupe que les rappels de suivi
  const first = String(body || "").trim().toUpperCase().split(/[\s.,!;:]+/)[0] || "";
  return ["STOP", "ARRET", "ARRÊT", "ARRETER", "ARRÊTER", "DESABONNER", "DÉSABONNER", "UNSUBSCRIBE"].includes(first);
}

/** Relance du mercredi (prospects ayant coché le consentement WhatsApp). */
export function buildRelanceMessage(name?: string | null): string {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return (
    `Bonjour${first ? ` ${first}` : ""},\n` +
    `C'est GlowScan. Vous avez fait une analyse de peau chez nous récemment.\n` +
    `Un dermatologue peut examiner votre situation et répondre à vos questions. Souhaitez-vous être accompagné(e) ?\n\n` +
    STOP_FOOTER
  );
}

/** Résultat d'analyse envoyé sur demande du patient (message transactionnel, sans STOP). */
export function buildResultWhatsApp(opts: { ref: string; score: number | null; level: string; condition?: string | null; url?: string | null; disclaimer: string }): string {
  return [
    `Bonjour, voici le résultat de votre analyse GlowScan (réf. ${opts.ref}).`,
    opts.score !== null ? `Glow Score : ${opts.score}/100 · ${opts.level}` : opts.level,
    opts.condition ? `Constat principal : ${opts.condition}` : "",
    opts.url ? `Voir le compte rendu complet : ${opts.url}` : "",
    "",
    opts.disclaimer,
  ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== "")).join("\n");
}

/** Message pré-rempli quand le patient écrit lui-même au numéro GlowScan (ouvre la fenêtre de 24 h). */
export const resultRequestText = (ref: string) => `Bonjour, je souhaite recevoir le résultat de mon analyse ${ref}.`;
export const RESULT_REF_RE = /\bGS-(\d{1,10})\b/i;

/** Note affichée au médecin dans la fiche du patient : « … désactivés par le patient le JJ/MM ». */
export function followupsStoppedNote(at: string | Date): string {
  const jjmm = new Date(at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Douala" });
  return `Rappels de suivi désactivés par le patient le ${jjmm}`;
}

// ── Agenda du cabinet (étape 4c) — messages patients, sans emoji, vouvoiement ──

const drName = (n?: string | null) => `Dr ${String(n || "").replace(/^dr\.?\s*/i, "").trim() || "votre dermatologue"}`;

/** « 1 » (seul, ou « 1. », « 1 ! ») confirme le prochain rendez-vous. */
export function isApptConfirmMessage(body: string | null | undefined): boolean {
  return /^\s*1\s*[.!]?\s*$/.test(String(body || ""));
}

/** Veille du rendez-vous, par WhatsApp. */
export function buildApptJ1Message(o: { name?: string | null; derm?: string | null; day: string; time: string; online?: boolean }): string {
  return [
    `Bonjour${o.name ? ` ${o.name}` : ""},`,
    `Rappel : vous avez rendez-vous avec ${drName(o.derm)} demain, ${o.day} à ${o.time}${o.online ? " (consultation en ligne)" : " au cabinet"}.`,
    "Répondez 1 pour confirmer.",
    "GlowScan",
  ].join("\n");
}

/** Deux heures avant, par SMS (court). */
export function buildApptH2Sms(o: { derm?: string | null; time: string; online?: boolean }): string {
  return `GlowScan : rappel, rendez-vous avec ${drName(o.derm)} aujourd'hui à ${o.time}${o.online ? " (en ligne)" : " au cabinet"}.`;
}

/** Réponse au « 1 ». */
export function buildApptConfirmedReply(o: { derm?: string | null; day: string; time: string }): string {
  return `Merci, votre rendez-vous avec ${drName(o.derm)} le ${o.day} à ${o.time} est confirmé.`;
}
