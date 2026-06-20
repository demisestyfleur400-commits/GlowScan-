// ════════════════════════════════════════════════════════════════════════
// GlowScan DERM — Design tokens unifiés
// Source unique de vérité pour la palette / typographie du flux DERM (B2B).
// Objectif : remplacer progressivement les objets `DS` dupliqués page par page.
// NE PAS utiliser pour le flux B2C grand public (palette rose distincte).
// ════════════════════════════════════════════════════════════════════════

export const DERM = {
  // Fonds
  bg: "#0d0a0e",
  surface: "#13101f",

  // Accent violet
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",

  // Santé / positif (à utiliser pour les indicateurs favorables)
  green: "#10b981",
  greenSoft: "#6ee7b7",
  amber: "#fbbf24",
  red: "#f43f5e",
  pink: "#E91E8C",

  // Texte — opacités relevées pour l'accessibilité (≥ 60% sur fond sombre)
  text: "#f3f0ff",
  textBody: "rgba(200,185,255,0.75)",   // était 0.65
  textMuted: "rgba(255,255,255,0.6)",   // était 0.35 — contraste insuffisant avant

  // Bordures / surfaces
  border: "rgba(255,255,255,0.08)",
  borderViolet: "rgba(167,139,250,0.18)",
  inputBorder: "rgba(167,139,250,0.2)",

  // Typographie
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
} as const;

// Chemin du logo carré (servi depuis client/public)
export const DERM_LOGO = "/logo-glowscan-square.jpeg";

export type DermTokens = typeof DERM;
