import type { FiredRule } from "@/lib/clinicalRules";

// Affiche les règles cliniques déclenchées (Brique 3) — vérifications visibles.
const META: Record<string, { color: string; bg: string; tag: string }> = {
  urgent: { color: "#f87171", bg: "rgba(248,113,113,0.1)", tag: "URGENT" },
  important: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", tag: "IMPORTANT" },
  info: { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", tag: "INFO" },
};

export function ClinicalRulesPanel({ rules }: { rules: FiredRule[] }) {
  if (!rules || rules.length === 0) return null;
  return (
    <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#a78bfa" }}>
          📐 Protocoles cliniques appliqués <span style={{ color: "rgba(255,255,255,0.4)" }}>· {rules.length}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Règles déclenchées automatiquement selon la démarche clinique.</p>
      </div>
      <div className="p-3 space-y-2">
        {rules.map((r) => {
          const m = META[r.level] || META.info;
          return (
            <div key={r.id} className="rounded-xl p-2.5" style={{ background: m.bg, border: `1px solid ${m.color}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: `${m.color}22`, color: m.color }}>✓ {m.tag}</span>
                <span className="text-[11.5px] font-extrabold" style={{ color: "#f3f0ff" }}>{r.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(200,185,255,0.7)" }}>→ {r.action}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
