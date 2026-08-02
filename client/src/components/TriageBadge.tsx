import type { TriageResult } from "@/lib/clinicalRules";

// Bandeau de triage — Urgence / À orienter / Suivi standard (Triage Engineering).
const ICON: Record<string, string> = { urgence: "🚨", orientation: "🩺", routine: "✅" };

export function TriageBadge({ triage, dark = true }: { triage: TriageResult; dark?: boolean }) {
  if (!triage) return null;
  const c = triage.color;
  const ink = dark ? "#f3f0ff" : "#1a1a2e";
  const muted = dark ? "rgba(255,255,255,0.6)" : "#6b7280";
  return (
    <div style={{ borderRadius: 16, padding: "12px 14px", marginBottom: 16, background: `${c}14`, border: `1px solid ${c}55`, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{ICON[triage.level] || "•"}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".6px", textTransform: "uppercase", color: c, margin: 0 }}>Niveau de triage</p>
        <p style={{ fontSize: 14, fontWeight: 900, color: ink, margin: "1px 0 0" }}>{triage.label}</p>
        <p style={{ fontSize: 11, color: muted, margin: "2px 0 0", lineHeight: 1.5 }}>{triage.reason}</p>
      </div>
    </div>
  );
}
