import { useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";

// ════════════════════════════════════════════════════════════════════════
// Argumentation lésions — le dermatologue ajoute ce que la photo ne montre pas.
// L'IA révise ses différentiels en tenant compte de ses observations.
// Le diagnostic final reste au médecin ; l'IA n'impose rien.
// ════════════════════════════════════════════════════════════════════════

interface Refined {
  diagnostics: { diagnostic: string; probabilite: string; causes: string[] }[];
  whatChanged: string | null;
  contradiction: { detectee: boolean; explication: string | null; suggestion: string | null };
}

export function LesionArgumentation({ scanId, condition, score, fitzpatrick, age, patientContext }: {
  scanId?: number | null; condition?: string; score?: number; fitzpatrick?: string; age?: string | number; patientContext?: string;
}) {
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Refined | null>(null);
  const [ignored, setIgnored] = useState(false);
  const [err, setErr] = useState("");

  const NAVY = "#7c3aed", INK = "#0F172A", MUTED = "#64748B", BORDER = "#E2E8F0";

  const refine = async () => {
    if (!obs.trim() || busy) return;
    setBusy(true); setErr(""); setIgnored(false);
    try {
      const res = await fetch("/api/pro/refine-diagnosis", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, condition, score, fitzpatrick, age, patientContext, observations: obs.trim() }),
      });
      const d = await res.json();
      if (res.ok) setResult(d);
      else setErr(d.message || "Erreur");
    } catch { setErr("Erreur réseau."); } finally { setBusy(false); }
  };

  const proba = (p: string) => /9\d%|8\d%|7\d%|élev/i.test(p) ? "#dc2626" : /[4-6]\d%|moy/i.test(p) ? "#d97706" : "#059669";

  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(124,58,237,0.22)`, background: "rgba(124,58,237,0.05)", padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 900, color: INK, margin: "0 0 4px" }}>🩺 Vos observations cliniques</p>
      <p style={{ fontSize: 12, color: MUTED, margin: "0 0 10px", lineHeight: 1.5 }}>
        L'IA a détecté : <strong style={{ color: INK }}>{condition || "—"}</strong>{fitzpatrick ? ` · Fitzpatrick ${fitzpatrick}` : ""}.
        Vous observez autre chose (que la photo ne montre pas) ?
      </p>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
          placeholder="Ex : Je palpe des papules profondes sur les joues, non visibles sur la photo, confluentes…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        <VoiceButton value={obs} onChange={setObs} dark={false} />
      </div>
      {err && <p style={{ fontSize: 11.5, color: "#dc2626", margin: "6px 0 0" }}>{err}</p>}
      <button onClick={refine} disabled={busy || !obs.trim()}
        style={{ width: "100%", marginTop: 10, background: NAVY, color: "#fff", border: "none", borderRadius: 9999, padding: "11px", fontSize: 13.5, fontWeight: 800, cursor: "pointer", opacity: busy || !obs.trim() ? 0.5 : 1 }}>
        {busy ? "Affinage en cours…" : "Affiner l'analyse IA →"}
      </button>

      {result && (
        <div style={{ marginTop: 14, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
          <p style={{ fontSize: 12.5, fontWeight: 900, color: NAVY, margin: "0 0 10px" }}>🤖 Analyse affinée avec vos observations</p>

          {/* ⚠️ Incohérence détectée */}
          {result.contradiction?.detectee && !ignored && (
            <div style={{ background: "#fef2f2", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", margin: "0 0 4px" }}>⚠️ Attention — incohérence détectée</p>
              {result.contradiction.explication && <p style={{ fontSize: 12, color: "#991b1b", margin: "0 0 6px", lineHeight: 1.5 }}>{result.contradiction.explication}</p>}
              {result.contradiction.suggestion && <p style={{ fontSize: 12, color: INK, margin: "0 0 8px", lineHeight: 1.5 }}>{result.contradiction.suggestion}</p>}
              <button onClick={() => setIgnored(true)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Maintenir mon choix</button>
            </div>
          )}

          {result.diagnostics?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>Diagnostics révisés</p>
              {result.diagnostics.map((d, i) => (
                <div key={i} style={{ marginBottom: 7 }}>
                  <p style={{ fontSize: 13, color: INK, margin: 0, fontWeight: i === 0 ? 800 : 600 }}>
                    {i + 1}. {d.diagnostic}
                    {d.probabilite && <span style={{ fontSize: 11, fontWeight: 800, color: proba(d.probabilite), marginLeft: 6 }}>— {d.probabilite}</span>}
                  </p>
                  {d.causes?.length > 0 && <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0", lineHeight: 1.5 }}>Causes : {d.causes.join(" · ")}</p>}
                </div>
              ))}
            </div>
          )}

          {result.whatChanged && (
            <div style={{ background: "rgba(124,58,237,0.06)", border: `1px solid rgba(124,58,237,0.18)`, borderRadius: 10, padding: "9px 11px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 3px" }}>Ce que vos observations ont changé</p>
              <p style={{ fontSize: 12, color: INK, margin: 0, lineHeight: 1.6 }}>{result.whatChanged}</p>
            </div>
          )}
          <p style={{ fontSize: 9.5, color: MUTED, margin: "10px 0 0" }}>Assistance indicative — le diagnostic final vous appartient (validez ou corrigez ci-dessous).</p>
        </div>
      )}
    </div>
  );
}
