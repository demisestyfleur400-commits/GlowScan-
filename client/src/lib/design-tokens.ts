// ════════════════════════════════════════════════════════════════════════
// GlowScan DERM — Design tokens unifiés
// Source unique de vérité pour la palette / typographie du flux DERM (B2B).
// Objectif : remplacer progressivement les objets `DS` dupliqués page par page.
// NE PAS utiliser pour le flux B2C grand public (palette rose distincte).
// ════════════════════════════════════════════════════════════════════════

export const DERM = {
  // Thème CLAIR médical (blanc + bleu). Violet réservé aux CTA.
  // Fonds
  bg: "#F6FAFD",       // page (très clair)
  surface: "#FFFFFF",  // cartes

  // Accent principal = BLEU (violet* repointés en bleu pour le thème clair ;
  // les CTA utilisent explicitement le violet ci-dessous).
  violet: "#7c3aed",     // CTA / accent violet (boutons principaux)
  violetMid: "#0369A1",  // accent principal BLEU (labels, icônes, titres)
  violetLight: "#0891B2",// bleu vif secondaire

  // Santé / statuts
  green: "#059669",
  greenSoft: "#10b981",
  amber: "#d97706",
  red: "#dc2626",
  pink: "#E91E8C",

  // Texte (sur fond clair)
  text: "#0F172A",
  textBody: "#475569",
  textMuted: "#64748B",

  // Bordures / surfaces
  border: "#E2E8F0",
  borderViolet: "rgba(3,105,161,0.22)",
  inputBorder: "#CBD5E1",

  // Typographie
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
} as const;

// Chemin du logo carré (servi depuis client/public)
export const DERM_LOGO = "/logo-glowscan-square.jpeg";

export type DermTokens = typeof DERM;
