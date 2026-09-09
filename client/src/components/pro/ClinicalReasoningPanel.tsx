import { useEffect, useRef, useState } from "react";
import { DERM } from "@/lib/design-tokens";

// ════════════════════════════════════════════════════════════════════════
// Raisonnement clinique IA (DERM) — panneau UNIQUE, utilisé sur /derm/analyse
// (thème clair) et dans la consultation in-app côté médecin (thème sombre).
// Fusionne diagnostics différentiels live + recherche web + détection
// d'incohérence + trace de raisonnement (reasoningSteps) + fil interactif de
// questions STRICTEMENT scopé au cas. Le fil est persisté et rechargé au montage.
//
// Hiérarchie : hypothèse la plus probable en avant → détail en accordéon → fil.
// Non bloquant : le médecin peut toujours valider/corriger sans attendre l'IA.
// ════════════════════════════════════════════════════════════════════════

// DERM n'expose pas de tokens de « teinte » ni de palette sombre ; on dérive les
// translucides et les neutres sombres des tokens de couleur existants (DERM.violet,
// DERM.surface, …) plutôt que d'inventer des hex au hasard.
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ReasoningStep { observation?: string; rule?: string; conclusion?: string }
interface Diff { diagnostic: string; probabilite: string; causes: string[] }
interface AnalyzeResult {
  diagnosticsDifferentiels: Diff[];
  sourceWeb: { url: string; titre: string; date: string } | null;
  groundingUsed: boolean;
  questionClarification: string | null;
  contradiction: { detectee: boolean; explication: string | null; suggestion: string | null };
}
interface ThreadMsg { role: "doctor" | "ai"; text: string }

export interface ClinicalReasoningPanelProps {
  signesCliniques?: string;
  diagnostic?: string;
  prescription?: string;
  fitzpatrick?: string;
  age?: string | number;
  historiquePatient?: string;
  // Trace d'audit issue de l'analyse (step 4). Affichée en second niveau.
  reasoningSteps?: ReasoningStep[];
  // Analyse live débounce à partir des signes saisis. false au step 4 (déjà analysé).
  autoAnalyze?: boolean;
  // Contexte de rattachement du fil persistant (au plus une des deux clés).
  patientId?: number | null;
  consultationId?: number | null;
  // Thème sombre (consultation côté médecin). Défaut : clair (/derm/analyse).
  dark?: boolean;
}

const probaColor = (p: string) =>
  /élev|high|forte/i.test(p) ? DERM.red : /moy|medium/i.test(p) ? DERM.amber : DERM.green;

export function ClinicalReasoningPanel({
  signesCliniques, diagnostic, prescription, fitzpatrick, age, historiquePatient,
  reasoningSteps, autoAnalyze = true, patientId, consultationId, dark = false,
}: ClinicalReasoningPanelProps) {
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ignored, setIgnored] = useState(false);
  const [open, setOpen] = useState(true);
  const timerRef = useRef<any>(null);
  const lastKeyRef = useRef("");

  // Fil interactif — scopé au cas ; rechargé depuis le serveur au montage.
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [threadErr, setThreadErr] = useState("");

  const caseContext = { signesCliniques, diagnostic, prescription, fitzpatrick, age, historiquePatient, patientId, consultationId };

  // ── Thème : neutres/translucides dérivés des tokens DERM (pas de hex inventé) ──
  const T = dark ? {
    ink: DERM.surface,                       // blanc (token surface)
    body: withAlpha(DERM.surface, 0.72),
    muted: withAlpha(DERM.surface, 0.5),
    border: withAlpha(DERM.surface, 0.12),
    card: withAlpha(DERM.surface, 0.05),
    panelBg: withAlpha(DERM.violet, 0.14),
    accent: DERM.violet,                     // meilleur contraste sur fond sombre
    inputBg: withAlpha(DERM.surface, 0.05),
    inputBorder: withAlpha(DERM.surface, 0.15),
  } : {
    ink: DERM.text,
    body: DERM.textBody,
    muted: DERM.textMuted,
    border: DERM.border,
    card: DERM.surface,
    panelBg: withAlpha(DERM.violet, 0.05),
    accent: DERM.violetMid,
    inputBg: DERM.surface,
    inputBorder: DERM.inputBorder,
  };

  // ── Historique du fil : rechargé au montage / changement de contexte ──
  useEffect(() => {
    if (!patientId && !consultationId) return;
    const params = new URLSearchParams();
    if (patientId) params.set("patientId", String(patientId));
    if (consultationId) params.set("consultationId", String(consultationId));
    let cancelled = false;
    fetch(`/api/pro/ai-assistant/thread?${params.toString()}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { thread: [] }))
      .then((d) => { if (!cancelled && Array.isArray(d?.thread)) setThread(d.thread); })
      .catch(() => { /* non bloquant : fil vide */ });
    return () => { cancelled = true; };
  }, [patientId, consultationId]);

  // ── Analyse live (différentiels) — débounce 3 s après l'arrêt de la frappe ──
  useEffect(() => {
    if (!autoAnalyze) return;
    const key = JSON.stringify({ signesCliniques, diagnostic, prescription, fitzpatrick, age });
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
      } catch { /* non bloquant : le médecin garde la main */ } finally { setLoading(false); }
    }, 3000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signesCliniques, diagnostic, prescription, fitzpatrick, age, autoAnalyze]);

  const hasReasoning = Array.isArray(reasoningSteps) && reasoningSteps.length > 0;
  const diffs = result?.diagnosticsDifferentiels || [];
  const hasContent = loading || !!result || hasReasoning || thread.length > 0
    || !!signesCliniques || !!diagnostic || !!prescription;

  // Rien à montrer et rien à demander (ex. examen vide) → on n'affiche pas le panneau.
  if (!hasContent) return null;

  const askFollowUp = async () => {
    const q = question.trim();
    if (!q || sending) return;
    setThreadErr("");
    setThread((t) => [...t, { role: "doctor", text: q }]);
    setQuestion("");
    setSending(true);
    try {
      const res = await fetch("/api/pro/ai-assistant/followup", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...caseContext, question: q, history: thread.slice(-6) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.answer) throw new Error(data?.message || "Réponse indisponible");
      setThread((t) => [...t, { role: "ai", text: String(data.answer) }]);
    } catch (e: any) {
      setThreadErr(e?.message || "Réponse momentanément indisponible. Réessayez.");
      setQuestion(q); // on restaure la question pour permettre un renvoi
    } finally {
      setSending(false);
    }
  };

  const S = {
    label: { fontSize: 10, fontWeight: 800, color: T.muted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    body: { fontSize: 12, color: T.body, lineHeight: 1.5 },
  };

  const primary = diffs[0];
  const secondary = diffs.slice(1);

  return (
    <div style={{ marginTop: 12, marginBottom: 16, border: `1px solid ${T.border}`, borderRadius: 14, background: T.panelBg, overflow: "hidden", fontFamily: DERM.font }}>
      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.accent, display: "flex", alignItems: "center", gap: 6 }}>
          🧠 Raisonnement clinique IA
          {result?.groundingUsed && <span style={{ fontSize: 9.5, fontWeight: 700, color: DERM.green }}>· Recherche web ✓</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <span style={{ fontSize: 10.5, color: T.muted }}>analyse…</span>}
          <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Réduire" : "Déplier"}
            style={{ background: "transparent", border: "none", color: T.muted, fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ padding: 12 }}>
          {/* ⚠️ Incohérence détectée — priorité visuelle */}
          {result?.contradiction?.detectee && !ignored && (
            <div style={{ marginBottom: 12, background: withAlpha(DERM.red, dark ? 0.16 : 0.08), border: `1px solid ${withAlpha(DERM.red, 0.35)}`, borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: DERM.red, margin: "0 0 4px" }}>⚠️ Incohérence détectée</p>
              {result.contradiction.explication && <p style={{ fontSize: 12, color: T.body, margin: "0 0 6px", lineHeight: 1.5 }}>{result.contradiction.explication}</p>}
              {result.contradiction.suggestion && <p style={{ fontSize: 12, color: T.ink, margin: "0 0 8px", lineHeight: 1.5 }}><strong>Suggestion :</strong> {result.contradiction.suggestion}</p>}
              <button onClick={() => setIgnored(true)}
                style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ignorer</button>
            </div>
          )}

          {/* ── Diagnostic le plus probable — en avant ── */}
          {primary && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <p style={{ ...S.label, margin: "0 0 6px" }}>Hypothèse la plus probable</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: T.ink, margin: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                {primary.diagnostic}
                {primary.probabilite && <span style={{ fontSize: 11, fontWeight: 800, color: probaColor(primary.probabilite) }}>{primary.probabilite}</span>}
              </p>
              {primary.causes?.length > 0 && (
                <p style={{ ...S.body, margin: "6px 0 0", color: T.muted }}>Causes possibles : {primary.causes.join(" · ")}</p>
              )}
            </div>
          )}

          {/* ── Détail du raisonnement — second niveau (accordéon) ── */}
          {(secondary.length > 0 || hasReasoning) && (
            <details style={{ marginBottom: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "10px 14px", fontSize: 11.5, fontWeight: 800, color: T.accent }}>
                Voir le détail du raisonnement
              </summary>
              <div style={{ padding: "0 14px 12px" }}>
                {/* Autres diagnostics différentiels */}
                {secondary.length > 0 && (
                  <div style={{ marginBottom: hasReasoning ? 12 : 0 }}>
                    <p style={{ ...S.label, margin: "0 0 6px" }}>Autres diagnostics différentiels</p>
                    {secondary.map((d, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <p style={{ fontSize: 12.5, color: T.ink, margin: 0, fontWeight: 600 }}>
                          {i + 2}. {d.diagnostic}
                          {d.probabilite && <span style={{ fontSize: 10.5, fontWeight: 800, color: probaColor(d.probabilite), marginLeft: 6 }}>— {d.probabilite}</span>}
                        </p>
                        {d.causes?.length > 0 && <p style={{ ...S.body, margin: "2px 0 0", color: T.muted }}>Causes : {d.causes.join(" · ")}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Trace de raisonnement auditable (reasoningSteps) */}
                {hasReasoning && (
                  <div>
                    <p style={{ ...S.label, margin: "0 0 6px" }}>Trace de raisonnement</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {reasoningSteps!.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 10 }}>
                          <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: withAlpha(DERM.violet, dark ? 0.28 : 0.15), color: T.accent, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                          <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                            {s.observation && <p style={{ margin: 0, color: T.ink }}><span style={{ color: DERM.green, fontWeight: 700 }}>Observation :</span> {s.observation}</p>}
                            {s.rule && <p style={{ margin: 0, color: T.body }}><span style={{ color: DERM.amber, fontWeight: 700 }}>Règle :</span> {s.rule}</p>}
                            {s.conclusion && <p style={{ margin: 0, color: T.ink }}><span style={{ color: T.accent, fontWeight: 700 }}>→ Conclusion :</span> {s.conclusion}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* ── Source web + question de clarification ── */}
          {result?.sourceWeb?.url && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ ...S.label, margin: "0 0 4px" }}>Source web consultée</p>
              <a href={result.sourceWeb.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.accent, textDecoration: "none", wordBreak: "break-word" }}>
                🔗 {result.sourceWeb.titre} <span style={{ color: T.muted }}>· {result.sourceWeb.date}</span>
              </a>
            </div>
          )}
          {result?.questionClarification && (
            <div style={{ marginBottom: 10, background: withAlpha(DERM.violet, dark ? 0.14 : 0.06), border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 10px" }}>
              <p style={{ ...S.label, margin: "0 0 3px" }}>Question de clarification</p>
              <p style={{ fontSize: 12, color: T.ink, margin: 0, lineHeight: 1.5 }}>{result.questionClarification}</p>
            </div>
          )}

          {/* ── Fil interactif — questions du médecin sur CE cas ── */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            <p style={{ ...S.label, margin: "0 0 6px" }}>Poser une question sur ce cas</p>
            {thread.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {thread.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: m.role === "doctor" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    background: m.role === "doctor" ? withAlpha(T.accent, dark ? 0.22 : 0.10) : T.card,
                    border: `1px solid ${m.role === "doctor" ? withAlpha(T.accent, 0.30) : T.border}`,
                    borderRadius: 12, padding: "8px 10px",
                  }}>
                    <p style={{ fontSize: 9.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 2px" }}>
                      {m.role === "doctor" ? "Vous" : "Assistant"}
                    </p>
                    <p style={{ fontSize: 12, color: T.ink, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</p>
                  </div>
                ))}
                {sending && <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>L'assistant réfléchit…</p>}
              </div>
            )}
            {threadErr && <p style={{ fontSize: 11, color: DERM.red, margin: "0 0 6px" }}>{threadErr}</p>}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askFollowUp(); } }}
                placeholder="Ex : pourquoi éliminer un eczéma ici ? et si le patient a aussi du prurit nocturne ?"
                rows={2}
                disabled={sending}
                style={{ flex: 1, resize: "none", outline: "none", fontFamily: DERM.font, fontSize: 12.5, color: T.ink, background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "8px 10px" }}
              />
              <button onClick={askFollowUp} disabled={sending || !question.trim()}
                /* DERM n'a pas de token « texte sur accent » ; DERM.surface (blanc) sert de blanc sourcé */
                style={{ flexShrink: 0, background: DERM.violet, color: DERM.surface, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 800, cursor: sending || !question.trim() ? "default" : "pointer", opacity: sending || !question.trim() ? 0.6 : 1 }}>
                {sending ? "…" : "Envoyer"}
              </button>
            </div>
          </div>

          {/* Mention légale — toujours visible */}
          <p style={{ fontSize: 9.5, color: T.muted, margin: "10px 0 0", lineHeight: 1.4 }}>
            Assistance indicative — suggestions non contractuelles. Le diagnostic final appartient au médecin ; votre jugement prime.
          </p>
        </div>
      )}
    </div>
  );
}
