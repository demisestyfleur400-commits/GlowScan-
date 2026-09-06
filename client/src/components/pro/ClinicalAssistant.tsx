import { useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Assistant IA clinique DERM — raisonne (3 diagnostics différentiels), recherche
// (Gemini + Google Search grounding) et recadre (détecte les incohérences).
// Se déclenche seul, 1,5 s après que le médecin arrête de taper. Non bloquant :
// le diagnostic final reste au médecin.
// ════════════════════════════════════════════════════════════════════════

interface Diff { diagnostic: string; probabilite: string; causes: string[]; }
interface Result {
  diagnosticsDifferentiels: Diff[];
  sourceWeb: { url: string; titre: string; date: string } | null;
  groundingUsed: boolean;
  questionClarification: string | null;
  contradiction: { detectee: boolean; explication: string | null; suggestion: string | null };
}

export function ClinicalAssistant({ signesCliniques, diagnostic, prescription, fitzpatrick, age, historiquePatient, dark }: {
  signesCliniques?: string; diagnostic?: string; prescription?: string;
  fitzpatrick?: string; age?: string | number; historiquePatient?: string; dark?: boolean;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [ignored, setIgnored] = useState(false);
  const [open, setOpen] = useState(true);
  const timerRef = useRef<any>(null);
  const lastKeyRef = useRef("");

  const INK = dark ? "#f3f0ff" : "#1a1a2e";
  const MUTED = dark ? "rgba(255,255,255,0.5)" : "#6b7280";
  const CARD = dark ? "rgba(255,255,255,0.04)" : "#faf9ff";
  const BORDER = dark ? "rgba(255,255,255,0.1)" : "rgba(124,58,237,0.18)";

  useEffect(() => {
    const key = JSON.stringify({ signesCliniques, diagnostic, prescription, fitzpatrick, age });
    // Rien à analyser
    if (!signesCliniques && !diagnostic && !prescription) return;
    if (key === lastKeyRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      lastKeyRef.current = key;
      setLoading(true); setIgnored(false);
      try {
        const res = await fetch("/api/pro/ai-assistant/analyze", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signesCliniques, diagnostic, prescription, fitzpatrick, age, historiquePatient }),
        });
        if (res.ok) setResult(await res.json());
      } catch {} finally { setLoading(false); }
    }, 3000); // debounce 3 s — l'IA n'analyse qu'après l'arrêt de la frappe
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line
  }, [signesCliniques, diagnostic, prescription, fitzpatrick, age]);

  if (!loading && !result) return null;

  const probaColor = (p: string) => /élev|high|forte/i.test(p) ? "#dc2626" : /moy|medium/i.test(p) ? "#d97706" : "#059669";

  return (
    <div style={{ marginTop: 12, border: `1px solid ${BORDER}`, borderRadius: 14, background: CARD, overflow: "hidden" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", display: "flex", alignItems: "center", gap: 6 }}>
          🤖 Assistant IA clinique
          {result?.groundingUsed && <span style={{ fontSize: 9.5, fontWeight: 700, color: "#059669" }}>· Recherche web ✓</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <span style={{ fontSize: 10.5, color: MUTED }}>analyse…</span>}
          <button onClick={() => setOpen((v) => !v)} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {open && result && (
        <div style={{ padding: "12px" }}>
          {/* ⚠️ Recadrage — incohérence détectée */}
          {result.contradiction?.detectee && !ignored && (
            <div style={{ marginBottom: 12, background: dark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: dark ? "#fca5a5" : "#b91c1c", margin: "0 0 4px" }}>⚠️ Incohérence détectée</p>
              {result.contradiction.explication && <p style={{ fontSize: 12, color: dark ? "#fecaca" : "#991b1b", margin: "0 0 6px", lineHeight: 1.5 }}>{result.contradiction.explication}</p>}
              {result.contradiction.suggestion && <p style={{ fontSize: 12, color: INK, margin: "0 0 8px", lineHeight: 1.5 }}><strong>Suggestion :</strong> {result.contradiction.suggestion}</p>}
              <button onClick={() => setIgnored(true)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ignorer</button>
            </div>
          )}

          {/* Diagnostics différentiels */}
          {result.diagnosticsDifferentiels?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>Diagnostics différentiels</p>
              {result.diagnosticsDifferentiels.map((d, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 12.5, color: INK, margin: 0, fontWeight: i === 0 ? 800 : 600 }}>
                    {i + 1}. {d.diagnostic}
                    {d.probabilite && <span style={{ fontSize: 10.5, fontWeight: 800, color: probaColor(d.probabilite), marginLeft: 6 }}>— {d.probabilite}</span>}
                  </p>
                  {d.causes?.length > 0 && (
                    <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0", lineHeight: 1.5 }}>Causes : {d.causes.join(" · ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Source web */}
          {result.sourceWeb?.url && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>Source web consultée</p>
              <a href={result.sourceWeb.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "#7c3aed", textDecoration: "none", wordBreak: "break-word" }}>
                🔗 {result.sourceWeb.titre} <span style={{ color: MUTED }}>· {result.sourceWeb.date}</span>
              </a>
            </div>
          )}

          {/* Question de clarification */}
          {result.questionClarification && (
            <div style={{ background: dark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 3px" }}>Question de clarification</p>
              <p style={{ fontSize: 12, color: INK, margin: 0, lineHeight: 1.5 }}>{result.questionClarification}</p>
            </div>
          )}

          <p style={{ fontSize: 9.5, color: MUTED, margin: "10px 0 0", lineHeight: 1.4 }}>
            Assistance indicative — le diagnostic final appartient au médecin.
          </p>
        </div>
      )}
    </div>
  );
}
