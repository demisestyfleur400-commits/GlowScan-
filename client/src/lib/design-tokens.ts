// ════════════════════════════════════════════════════════════════════════
// GlowScan DERM — Design tokens unifiés
// Source unique de vérité pour la palette / typographie du flux DERM (B2B).
// Objectif : remplacer progressivement les objets `DS` dupliqués page par page.
// NE PAS utiliser pour le flux B2C grand public (palette rose distincte).
// ════════════════════════════════════════════════════════════════════════

export const DERM = {
  // Thème CLAIR médical (blanc + dégradé teal→bleu, identité du logo).
  // Fonds
  bg: "#F6FAFD",       // page (très clair)
  surface: "#FFFFFF",  // cartes

  // Accent principal = dégradé teal→bleu (identité du logo GlowScan).
  violet: "#00937A",      // accent / texte / icônes (ex-violet)
  violetMid: "#2E9FD6",   // accent bleu secondaire (labels, icônes, titres)
  violetLight: "#00E6B8", // teal mint (variante claire)
  gradient: "linear-gradient(135deg, #00E6B8, #2E9FD6)", // fonds de boutons/CTA
  accentFrom: "#00E6B8",
  accentTo: "#2E9FD6",

  // Santé / statuts
  green: "#059669",
  greenSoft: "#10b981",
  amber: "#d97706",
  red: "#dc2626",
  pink: "#2E9FD6",

  // Texte (sur fond clair)
  text: "#0B1220",
  textBody: "#475569",
  textMuted: "#64748B",

  // Bordures / surfaces
  border: "#E2E8F0",
  borderViolet: "rgba(0,147,122,0.22)",
  inputBorder: "#CBD5E1",

  // Typographie
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
} as const;

// Chemin du logo (servi depuis client/public)
export const DERM_LOGO = "/glowscan-mark.png";

export type DermTokens = typeof DERM;
