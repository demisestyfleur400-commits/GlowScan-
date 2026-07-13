// ════════════════════════════════════════════════════════════════════════
// Brique 4 — Confiance + escalade (façon Norm Ai : l'IA reste humble et
// escalade vers l'humain quand elle n'est pas sûre). Affiche le niveau de
// confiance, et une bannière d'escalade explicite si confiance faible /
// photo insuffisante / orientation nécessaire.
// ════════════════════════════════════════════════════════════════════════

const lower = (s?: string) => (s || "").toLowerCase();

function normConfidence(text?: string): "high" | "medium" | "low" | null {
  const t = lower(text);
  if (!t) return null;
  if (/(faible|low|basse|limit|incertain|uncertain|doute|non conclu)/.test(t)) return "low";
  if (/(élev|elev|high|forte|bonne|good|solide)/.test(t)) return "high";
  if (/(moyen|medium|modér|moderate)/.test(t)) return "medium";
  return null;
}

export function ConfidenceEscalation({ result }: { result: any }) {
  if (!result) return null;
  const level = normConfidence(result.confidence);
  const photoLimited = /(limit|insuffis|reprendre|mauvaise)/.test(lower(result.photo_quality));
  const referral = !!result?.clinicalProtocol?.referralNeeded;
  const escalate = level === "low" || photoLimited || referral;

  const META: Record<string, { label: string; color: string }> = {
    high: { label: "Confiance élevée", color: "#6ee7b7" },
    medium: { label: "Confiance moyenne", color: "#fbbf24" },
    low: { label: "Confiance faible", color: "#f87171" },
  };
  const badge = level ? META[level] : null;

  if (!badge && !escalate) return null;

  return (
    <div className="mb-4">
      {badge && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2" style={{ background: `${badge.color}1a`, border: `1px solid ${badge.color}44` }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: badge.color, display: "inline-block" }} />
          <span className="text-[11px] font-extrabold" style={{ color: badge.color }}>{badge.label}</span>
        </div>
      )}

      {escalate && (
        <div className="rounded-2xl p-3.5" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <p className="text-[12.5px] font-extrabold mb-1" style={{ color: "#fbbf24" }}>⚠️ Escalade recommandée — ne pas conclure seul sur l'IA</p>
          <ul className="text-[11.5px] leading-relaxed" style={{ color: "rgba(200,185,255,0.75)", margin: 0, paddingLeft: 16 }}>
            {level === "low" && <li>Confiance de l'IA <strong>faible</strong> sur ce cas → confirmez cliniquement ou demandez un second avis.</li>}
            {photoLimited && <li>Qualité de photo <strong>limitée</strong> → reprenez une image nette et bien éclairée si possible.</li>}
            {referral && <li>Le protocole indique une <strong>orientation spécialisée</strong> → adressez le patient.</li>}
            {!level && !photoLimited && !referral && <li>Prudence recommandée avant de conclure.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
