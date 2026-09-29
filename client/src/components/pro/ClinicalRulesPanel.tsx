import type { FiredRule } from "@/lib/clinicalRules";

// Affiche les règles cliniques déclenchées (Brique 3) — vérifications visibles.
const META: Record<string, { color: string; bg: string; tag: string }> = {
  urgent: { color: "var(--color-accent-800)", bg: "rgba(248,113,113,0.1)", tag: "URGENT" },
  important: { color: "var(--color-accent-600)", bg: "rgba(251,191,36,0.1)", tag: "IMPORTANT" },
  info: { color: "var(--color-accent-400)", bg: "rgba(167,139,250,0.1)", tag: "INFO" },
};

export function ClinicalRulesPanel({ rules }: { rules: FiredRule[] }) {
  if (!rules || rules.length === 0) return null;
  // Les blocages de sécurité (ex. rétinoïde en grossesse) sont extraits et affichés
  // en bannière pleine, EN HAUT — jamais noyés dans la liste des règles.
  const blockers = rules.filter((r) => r.blocker);
  const rest = rules.filter((r) => !r.blocker);
  return (
    <div className="mb-4 space-y-3">
      {blockers.map((r) => (
        <div key={r.id} data-testid={`rule-blocker-${r.id}`} className="rounded-2xl p-4" style={{ background: "var(--color-accent-800)", color: "var(--color-neutral-100)", boxShadow: "0 4px 16px rgba(220,38,38,0.3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg"></span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.2)" }}>Blocage sécurité</span>
          </div>
          <p className="text-[13px] font-extrabold" style={{ lineHeight: 1.35 }}>{r.label}</p>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.92)", lineHeight: 1.5 }}>{r.action}</p>
        </div>
      ))}
      {rest.length > 0 && (
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-bg)", border: "1px solid #E2E8F0" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--color-accent-400)" }}>
          Protocoles cliniques appliqués <span style={{ color: "var(--color-neutral-600)" }}>· {rest.length}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-neutral-600)" }}>Règles déclenchées automatiquement selon la démarche clinique.</p>
      </div>
      <div className="p-3 space-y-2">
        {rest.map((r) => {
          const m = META[r.level] || META.info;
          return (
            <div key={r.id} className="rounded-xl p-2.5" style={{ background: m.bg, border: `1px solid ${m.color}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: `${m.color}22`, color: m.color }}>✓ {m.tag}</span>
                <span className="text-[11.5px] font-extrabold" style={{ color: "var(--color-text)" }}>{r.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-neutral-800)" }}>→ {r.action}</p>
            </div>
          );
        })}
      </div>
      </div>
      )}
    </div>
  );
}
