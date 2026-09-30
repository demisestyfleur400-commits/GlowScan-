// ════════════════════════════════════════════════════════════════════════
// Entrée des relais (étape 10, ADDENDUM_reseau_relais_ong.md §1, écrans R1 à R3).
// Libellés repris de la maquette « Relais Mobile ». Les bonnes réponses du
// module photo restent côté serveur (server/relayOnboarding.ts).
// ════════════════════════════════════════════════════════════════════════

export type Profession = "nurse" | "gp" | "midwife";
export const PROFESSIONS: { key: Profession; label: string }[] = [
  { key: "nurse", label: "Infirmier·e" },
  { key: "gp", label: "Médecin généraliste" },
  { key: "midwife", label: "Sage-femme" },
];
export const professionLabel = (k: string | null | undefined) => PROFESSIONS.find((p) => p.key === k)?.label || "Relais";

export type RelayStatus = "invited" | "pending_card" | "pending_sponsor" | "pending_training" | "active" | "suspended";

/** Invitation valable 14 jours ; relances automatiques à J+2 et J+7. */
export const INVITATION_DAYS = 14;

/** Module 1 « photo » : 5 questions, 4 bonnes réponses pour valider. */
export const PHOTO_MODULE = { code: "photo", title: "Bien photographier la peau", total: 5, passScore: 4, minutes: 6 } as const;
export const PHOTO_RULES = [
  "Lumière du jour, près d'une fenêtre, sans flash",
  "3 photos : de loin, de près (20 cm), de côté",
  "Une pièce ou une règle pour l'échelle",
  "Consentement et visage : cadrer la lésion",
];
export type QuizQuestion = { q: string; options: { label: string; image?: "blurry" | "sharp" }[] };
export const PHOTO_QUIZ: QuizQuestion[] = [
  { q: "Quelle photo est exploitable ?", options: [{ label: "Floue, sombre", image: "blurry" }, { label: "Nette", image: "sharp" }] },
  { q: "Où prendre la photo ?", options: [
    { label: "Sous la lampe de la salle, avec le flash" },
    { label: "Près d'une fenêtre, à la lumière du jour, sans flash" },
    { label: "Dehors, en plein soleil de midi" },
  ] },
  { q: "Combien de photos envoyer pour un cas ?", options: [
    { label: "Une seule, de très près" },
    { label: "3 photos : de loin, de près (20 cm), de côté" },
    { label: "Dix photos identiques, pour être sûr" },
  ] },
  { q: "Comment montrer la taille de la lésion ?", options: [
    { label: "Zoomer au maximum" },
    { label: "La décrire au dermatologue par message" },
    { label: "Poser une pièce ou une règle à côté de la lésion" },
  ] },
  { q: "La lésion est sur la jambe. Que cadrer ?", options: [
    { label: "La lésion seulement, sans le visage, après l'accord du patient" },
    { label: "Tout le patient, visage compris, pour l'identifier" },
    { label: "Le visage d'abord, puis la lésion" },
  ] },
];

/** Téléphone international en chiffres (237XXXXXXXXX). Un numéro à 9 chiffres commençant par 6 est camerounais. */
export function intlPhone(input: string | null | undefined): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("6")) d = `237${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
export const phoneAccountEmail = (digits: string) => `tel-${digits}@phone.glowscan.cm`;
export const maskPhone = (digits: string) => `•••${digits.slice(-3)}`;

/** Pays du réseau d'après l'indicatif (chiffres, ex. « 2376… »). */
const DIAL: [string, string][] = [["237", "Cameroun"], ["229", "Bénin"], ["243", "RDC"], ["257", "Burundi"], ["225", "Côte d'Ivoire"], ["221", "Sénégal"], ["235", "Tchad"], ["241", "Gabon"], ["242", "Congo"], ["228", "Togo"]];
export function countryOfPhone(digits: string | null | undefined): string | null {
  const d = String(digits || "").replace(/\D/g, "");
  return DIAL.find(([code]) => d.startsWith(code))?.[1] || null;
}
