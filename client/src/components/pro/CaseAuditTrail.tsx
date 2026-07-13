// ════════════════════════════════════════════════════════════════════════
// Brique 2 — Journal d'audit d'un cas (traçabilité médico-légale).
// Reconstitue la chronologie figée : observé → proposé par l'IA → validé/corrigé
// par le médecin. Chaque étape horodatée. Preuve de sérieux, façon Norm Ai.
// ════════════════════════════════════════════════════════════════════════

interface ScanLike {
  condition?: string | null;
  expertCorrectedCondition?: string | null;
  expertReviewer?: string | null;
  expertReviewedAt?: string | Date | null;
  isVerified?: boolean;
  createdAt?: string | Date | null;
  clinicalContext?: any;
  dermatoNote?: string | null;
}

const fmt = (d: any) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

function shortModel(v?: string): string {
  if (!v) return "IA GlowScan";
  // "meta-llama/llama-4-scout-17b-16e-instruct" → "IA GlowScan · Llama 4 Scout"
  const s = v.toLowerCase();
  if (s.includes("maverick")) return "IA GlowScan · Llama 4 Maverick";
  if (s.includes("scout")) return "IA GlowScan · Llama 4 Scout";
  if (s.includes("gemini")) return "IA GlowScan · Gemini";
  if (s.includes("gpt")) return "IA GlowScan · GPT-4o";
  return "IA GlowScan";
}

export function CaseAuditTrail({ scan, modelLabel }: { scan: ScanLike; modelLabel?: string }) {
  const hasExam = !!(scan.clinicalContext && (scan.clinicalContext.examen || scan.clinicalContext.antecedents));
  const resolvedModel = modelLabel || shortModel(scan.clinicalContext?.modelVersion);
  const corrected = (scan.expertCorrectedCondition || "").trim();
  const isCorrection = !!corrected && corrected.toLowerCase() !== (scan.condition || "").trim().toLowerCase();

  const steps: { icon: string; color: string; title: string; detail?: string; date?: any }[] = [];

  if (hasExam) {
    steps.push({ icon: "📋", color: "#a78bfa", title: "Examen & dossier documentés", detail: "par le praticien / la secrétaire", date: scan.createdAt });
  }
  steps.push({
    icon: "🤖", color: "#fbbf24",
    title: `Diagnostic proposé par l'${resolvedModel}`,
    detail: scan.condition || "—",
    date: scan.createdAt,
  });
  if (scan.expertReviewer) {
    steps.push({
      icon: isCorrection ? "✍️" : "✅",
      color: isCorrection ? "#f87171" : "#6ee7b7",
      title: isCorrection ? `Diagnostic corrigé par ${scan.expertReviewer}` : `Diagnostic validé par ${scan.expertReviewer}`,
      detail: isCorrection ? `IA : ${scan.condition} → Médecin : ${corrected}` : (corrected || scan.condition || undefined),
      date: scan.expertReviewedAt || scan.createdAt,
    });
  } else {
    steps.push({ icon: "⏳", color: "rgba(255,255,255,0.4)", title: "En attente de validation médecin", detail: "le diagnostic IA reste indicatif" });
  }

  return (
    <details className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <summary className="cursor-pointer text-[11px] font-extrabold px-3 py-2.5" style={{ color: "rgba(255,255,255,0.6)" }}>
        🔒 Journal d'audit du cas
      </summary>
      <div className="px-3 pb-3">
        <div style={{ position: "relative", paddingLeft: 4 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < steps.length - 1 ? 12 : 0, position: "relative" }}>
              {/* Ligne verticale */}
              {i < steps.length - 1 && (
                <span style={{ position: "absolute", left: 9, top: 22, bottom: 0, width: 1, background: "rgba(255,255,255,0.1)" }} />
              )}
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: `${s.color}22`, border: `1px solid ${s.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, zIndex: 1 }}>
                {s.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "#f3f0ff", margin: 0 }}>{s.title}</p>
                {s.detail && <p style={{ fontSize: 10.5, color: "rgba(200,185,255,0.6)", margin: "1px 0 0", lineHeight: 1.5 }}>{s.detail}</p>}
                {s.date && <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", margin: "1px 0 0" }}>{fmt(s.date)}</p>}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 10, lineHeight: 1.5 }}>
          Chronologie horodatée à valeur de traçabilité — le diagnostic validé par le médecin fait foi.
        </p>
      </div>
    </details>
  );
}
