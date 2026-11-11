// ════════════════════════════════════════════════════════════════════════
// Palette de l'espace médical GlowScan Derm (handoff « espace médical », §5).
// Distincte du thème Organic de l'appli patient.
// ════════════════════════════════════════════════════════════════════════

export const D = {
  page: "#f3f6f3",
  side: "#0d2929",
  sideText: "#dfe9e6",
  sideMuted: "#8fa7a2",
  sideLabel: "#6e8a85",
  text: "#17392c",
  textAlt: "#102c2c",
  muted: "#66766f",
  faint: "#8a9894",
  action: "#2a6b4f",
  actionDark: "#1f5c48",
  cta: "#0d746f",
  teal: "#138b83",
  teal2: "#11988f",
  teal3: "#53d1c6",
  teal4: "#57d8cf",
  tintActive: "#eef4e8",
  tintChip: "#eaf2e5",
  tint3: "#e5eedd",
  field: "#f8faf7",
  border: "#e4e8e3",
  sep: "#eef1ec",
  borderAlt: "#c9d8c0",
  warn: "#b0652a",
  warnBg: "#fbeee0",
  err: "#9b3a28",
  errBg: "#fbe9e4",
  info: "#1d5f8f",
  infoBg: "#e7f0fa",
  wait: "#cfe08a",
} as const;

export const FONT_UI = "'DM Sans', sans-serif";
export const FONT_HEAD = "Manrope, sans-serif";

/** Charge DM Sans et Manrope une seule fois (uniquement dans l'espace Derm). */
export function ensureDermFonts() {
  if (typeof document === "undefined" || document.getElementById("derm-fonts")) return;
  const l = document.createElement("link");
  l.id = "derm-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&family=Lora:ital,wght@0,500;0,600;1,500&display=swap";
  document.head.appendChild(l);
}

/** Code patient affiché (GS-0xx). */
export const patientCode = (id: number) => `GS-${String(id).padStart(3, "0")}`;
