import { useEffect, type ReactNode, type CSSProperties } from "react";

// ════════════════════════════════════════════════════════════════════════
// FONDATION VISUELLE — Refonte B2C GlowScan (« Parcours Patient »).
// Langage du design : blanc + turquoise extrait du logo, encre #0B1719, angles
// CARRÉS, filets 1px, repères de calage « + », instruments de mesure plutôt que
// décor, IBM Plex Sans/Mono. Aucune ombre portée ; le dégradé ne sert qu'aux
// mesures. Rouge #B4341F réservé aux drapeaux médicaux.
// Ces primitives sont réutilisées par tous les écrans du parcours patient.
// ════════════════════════════════════════════════════════════════════════

// ── Jetons ──────────────────────────────────────────────────────────────
export const GS = {
  // Encre / texte
  ink: "#0B1719",
  inkSoft: "#05363C",
  muted: "#5D6E71",
  faint: "#8C9C9E",
  hint: "#A9BCBE",
  disabled: "#C3D2D4",
  // Turquoise (remplit / signale — jamais du texte courant)
  accent: "#12D8BE",
  accentMint: "#9FE8DC",
  teal: "#0A6E72",       // texte turquoise lisible
  tealHover: "#05494C",
  // Surfaces claires
  line: "#DCE4E5",
  line2: "#D3DDDE",
  hair: "#EEF2F2",
  panel: "#EEF4F4",
  mintBg: "#F4FEFC",
  mintTint: "#E6FBF7",
  // Capture (fond sombre)
  deep: "#05262B",
  deep2: "#0B3238",
  // Drapeau médical
  red: "#B4341F",
  redLine: "#E8C3BC",
  // Alerte capture
  amber: "#FFC454",
  amberText: "#FFD68C",
  // Dégradé de mesure
  grad: "linear-gradient(90deg,#0AF5C2,#28B0D4)",
  gradBtn: "linear-gradient(135deg,#0AF5C2,#28B0D4)",
  // Typo
  sans: "'IBM Plex Sans',system-ui,-apple-system,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
} as const;

// Charge IBM Plex (Sans + Mono) une seule fois — n'affecte que ce qui l'utilise.
export function useGsFonts() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("gs-plex-fonts")) return;
    const l = document.createElement("link");
    l.id = "gs-plex-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);
}

// ── Étiquette mono (label technique, majuscules espacées) ────────────────
export function GsMono({ children, size = 9, color = GS.faint, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: GS.mono, fontSize: size, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".16em", color, ...style }}>
      {children}
    </span>
  );
}

// ── Repères de calage « + » aux quatre coins d'une figure ────────────────
export function GsMarks() {
  const base: CSSProperties = { position: "absolute", font: `400 12px ${GS.mono}`, color: GS.hint, lineHeight: 1 };
  return (
    <>
      <span style={{ ...base, top: -7, left: -5 }}>+</span>
      <span style={{ ...base, top: -7, right: -5 }}>+</span>
      <span style={{ ...base, bottom: -7, left: -5 }}>+</span>
      <span style={{ ...base, bottom: -7, right: -5 }}>+</span>
    </>
  );
}

// ── Boutons ──────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "gradient";
export function GsButton({ children, onClick, variant = "primary", icon, disabled, style, type }: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; icon?: ReactNode; disabled?: boolean; style?: CSSProperties; type?: "button" | "submit";
}) {
  const base: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: 17, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: GS.sans, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    opacity: disabled ? 0.55 : 1,
  };
  const by: Record<BtnVariant, CSSProperties> = {
    primary: { background: GS.ink, color: "#fff" },
    secondary: { background: "#fff", color: GS.ink, border: `1px solid ${GS.ink}`, padding: 16 },
    danger: { background: GS.red, color: "#fff" },
    gradient: { background: GS.gradBtn, color: GS.deep, fontSize: 16, fontWeight: 700, padding: 19 },
  };
  return (
    <button type={type || "button"} onClick={onClick} disabled={disabled} style={{ ...base, ...by[variant], ...style }}>
      {children}{icon}
    </button>
  );
}

// ── Petite pastille de statut (filet mono) ───────────────────────────────
export function GsChip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "red" | "ink" }) {
  const map: Record<string, CSSProperties> = {
    default: { color: GS.muted, border: `1px solid ${GS.line}` },
    accent: { color: GS.teal, border: `1px solid ${GS.accentMint}` },
    red: { color: GS.red, border: `1px solid ${GS.redLine}` },
    ink: { color: "#fff", background: GS.ink, border: "none" },
  };
  return (
    <span style={{ fontFamily: GS.mono, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", padding: "2px 6px", ...map[tone] }}>
      {children}
    </span>
  );
}

// ── Instrument de mesure (barre graduée 0→max, marqueur) ─────────────────
export function GsMeter({ value, max = 100, label, unit, threshold }: { value: number; max?: number; label?: string; unit?: string; threshold?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <GsMono>{label}</GsMono>
          <span style={{ fontFamily: GS.mono, fontSize: 17, fontWeight: 600, color: GS.ink, fontVariantNumeric: "tabular-nums" }}>
            {value}<span style={{ fontSize: 11, color: GS.faint }}>{unit || `/${max}`}</span>
          </span>
        </div>
      )}
      <div style={{ position: "relative", height: 22 }}>
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 6, background: GS.panel, border: `1px solid ${GS.line}` }} />
        <div style={{ position: "absolute", top: 7, left: 0, width: `${pct}%`, height: 6, background: GS.grad }} />
        <div style={{ position: "absolute", top: 1, left: `${pct}%`, width: 1, height: 19, background: GS.ink }} />
        {threshold != null && (
          <div style={{ position: "absolute", top: 1, left: `${(threshold / max) * 100}%`, width: 1, height: 19, background: GS.red }} />
        )}
      </div>
    </div>
  );
}

// ── Progression segmentée (haut d'inscription / questionnaire) ───────────
export function GsSteps({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ flex: 1, display: "flex", gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ flex: 1, height: 3, background: i < current ? GS.accent : GS.panel }} />
      ))}
    </div>
  );
}

// ── Case carrée (cochée = encre + accent) ────────────────────────────────
export function GsCheck({ checked, size = 18 }: { checked?: boolean; size?: number }) {
  if (checked) {
    return (
      <span style={{ width: size, height: size, background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <span style={{ color: GS.accent, fontFamily: GS.mono, fontSize: size * 0.66, lineHeight: 1 }}>✓</span>
      </span>
    );
  }
  return <span style={{ width: size, height: size, border: `1px solid ${GS.disabled}`, flex: "none", display: "inline-block" }} />;
}

// ── Rangée d'option pleine largeur (cible tactile 56px) ──────────────────
export function GsOption({ label, sub, selected, onClick, muted, dashed }: { label: ReactNode; sub?: ReactNode; selected?: boolean; onClick?: () => void; muted?: boolean; dashed?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        width: "100%", boxSizing: "border-box", textAlign: "left", cursor: "pointer",
        border: selected ? `1px solid ${GS.ink}` : `1px ${dashed ? "dashed" : "solid"} ${dashed ? GS.disabled : GS.line}`,
        background: selected ? GS.mintBg : "#fff", padding: 16, minHeight: 56,
        display: "flex", alignItems: "center", gap: 13,
      }}>
      <GsCheck checked={selected} />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: muted ? GS.muted : GS.ink, fontFamily: GS.sans }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>{sub}</span>}
      </span>
    </button>
  );
}

// ── Cadre d'écran (mobile plein écran, clair par défaut ou sombre capture) ─
export function GsScreen({ children, dark, noPad }: { children: ReactNode; dark?: boolean; noPad?: boolean }) {
  useGsFonts();
  return (
    <div style={{ minHeight: "100dvh", background: dark ? GS.deep : "#fff", fontFamily: GS.sans, WebkitFontSmoothing: "antialiased", color: dark ? "#fff" : GS.ink, display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", padding: noPad ? 0 : "14px 24px 0", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ── Cellule métrique (grille 1px, valeur mono) ───────────────────────────
export function GsMetric({ label, value, note, noteColor }: { label: ReactNode; value: ReactNode; note?: ReactNode; noteColor?: string }) {
  return (
    <div style={{ background: "#fff", padding: 12 }}>
      <GsMono size={9} style={{ letterSpacing: ".12em" }}>{label}</GsMono>
      <div style={{ fontFamily: GS.mono, fontSize: 17, fontWeight: 600, color: GS.ink, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {note && <div style={{ fontSize: 10, color: noteColor || GS.muted, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

// Conteneur de grille métrique (fond ligne = filets 1px entre cellules).
export function GsMetricGrid({ cols = 2, children }: { cols?: number; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 1, background: GS.line, border: `1px solid ${GS.line}` }}>
      {children}
    </div>
  );
}
