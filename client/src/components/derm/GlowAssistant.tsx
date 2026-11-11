import { useEffect, useRef, useState, Fragment } from "react";
import { Sparkles, Send, Mic, Square, RefreshCw, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";
import { D, FONT_UI } from "./tokens";

// ════════════════════════════════════════════════════════════════════════
// Assistant clinique Glow (D3). Panneau de la Nouvelle consultation :
//  · « Pistes du cas » : 3 diagnostics différentiels, incohérences, question
//    de clarification (Gemini, à la demande) ;
//  · discussion libre et suivie avec Gemini, qui connaît tout le dossier et
//    voit les photos ; réponse affichée au fil de l'écriture ; dictée possible.
// Le fil est enregistré dans le dossier du patient. Indicatif : le médecin décide.
// ════════════════════════════════════════════════════════════════════════

export type GlowCase = {
  age?: string; sex?: string; motif?: string; duration?: string; anamnese?: string; antecedents?: string; products?: string;
  allergies?: string; phototype?: string; examen?: string; questionnaire?: string; analysis?: string; hypothesis?: string; prescription?: string; notes?: string;
};
type Msg = { role: "doctor" | "ai"; text: string; source?: { url: string; title: string } | null; error?: boolean };
type Diff = { diagnostic: string; probabilite: string; causes: string[] };
type Pistes = { diagnosticsDifferentiels: Diff[]; questionClarification: string | null; contradiction: { detectee: boolean; explication: string | null; suggestion: string | null }; sourceWeb: { url: string; titre: string } | null };

const QUICK = [
  "Quels diagnostics différentiels envisager ?",
  "Que dois-je encore examiner ou demander au patient ?",
  "Quels examens complémentaires seraient utiles ?",
  "Quelles options de traitement, adaptées à ce phototype ?",
];

/** Texte de Glow : listes « - », **gras**, paragraphes. */
function Rich({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const lines = text.replace(/\r/g, "").split("\n");
  return (
    <>
      {lines.map((l, i) => {
        const t = l.trim();
        if (!t) return <span key={i} style={{ display: "block", height: 6 }} />;
        const li = /^[-*•]\s+(.*)$/.exec(t) || /^\d+[.)]\s+(.*)$/.exec(t);
        return li
          ? <span key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}><span style={{ color: D.teal }}>•</span><span>{bold(li[1])}</span></span>
          : <span key={i} style={{ display: "block", margin: "2px 0" }}>{bold(t.replace(/^#+\s*/, ""))}</span>;
      })}
    </>
  );
}

const probaTone = (p: string) => (/élev|haut|forte|high|[6-9]\d\s*%/i.test(p) ? D.err : /moy|medium|[3-5]\d\s*%/i.test(p) ? D.warn : D.action);

export function GlowAssistant({ patientId, caseData, images, analyzeKey }: { patientId: number | null; caseData: GlowCase; images: string[]; analyzeKey?: string | number | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pistes, setPistes] = useState<Pistes | null>(null);
  const [pBusy, setPBusy] = useState(false);
  const [pErr, setPErr] = useState("");
  const [openDiff, setOpenDiff] = useState<number | null>(0);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [micMsg, setMicMsg] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef(caseData);
  caseRef.current = caseData;

  // Fil déjà échangé sur ce dossier.
  useEffect(() => {
    if (!patientId) { setMsgs([]); return; }
    fetch(`/api/pro/ai-assistant/thread?patientId=${patientId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { thread: [] }))
      .then((d) => setMsgs((d.thread || []).map((m: any) => ({ role: m.role, text: m.text }))))
      .catch(() => {});
  }, [patientId]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs]);

  const signes = () => [caseRef.current.examen, caseRef.current.motif && `Motif : ${caseRef.current.motif}`, caseRef.current.questionnaire && `Questionnaire : ${caseRef.current.questionnaire}`].filter(Boolean).join(" · ");
  const runPistes = async () => {
    const c = caseRef.current;
    if (!signes() && !c.hypothesis && !c.analysis) { setPErr("Renseignez d'abord le motif ou l'examen."); return; }
    setPBusy(true); setPErr("");
    try {
      const r = await fetch("/api/pro/ai-assistant/analyze", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signesCliniques: signes(), diagnostic: c.hypothesis || c.analysis || "", prescription: c.prescription || "", fitzpatrick: c.phototype || "", age: c.age || "", historiquePatient: [c.antecedents, c.allergies && `Allergies : ${c.allergies}`, c.products && `Produits : ${c.products}`].filter(Boolean).join(" · ") }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Glow ne répond pas pour le moment.");
      setPistes(d); setOpenDiff(0);
    } catch (e: any) { setPErr(e.message); }
    setPBusy(false);
  };
  // Après l'analyse photo, Glow met ses pistes à jour une fois.
  useEffect(() => { if (analyzeKey) runPistes(); }, [analyzeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-12).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((cur) => [...cur, { role: "doctor", text: question }, { role: "ai", text: "" }]);
    setInput(""); setBusy(true);
    const patchLast = (f: (m: Msg) => Msg) => setMsgs((cur) => { const n = cur.slice(); n[n.length - 1] = f(n[n.length - 1]); return n; });
    try {
      const r = await fetch("/api/pro/glow/chat", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, question, history, case: caseRef.current, images: images.slice(0, 3) }),
      });
      if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || "Glow ne répond pas pour le moment."); }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.replace(/^data:\s?/, "");
          let o: any; try { o = JSON.parse(line); } catch { continue; }
          if (o.t) patchLast((m) => ({ ...m, text: m.text + o.t }));
          if (o.done) patchLast((m) => ({ ...m, source: o.source || null }));
          if (o.error) patchLast((m) => ({ ...m, text: o.error, error: true }));
        }
      }
    } catch (e: any) {
      patchLast((m) => ({ ...m, text: e.message || "Glow ne répond pas pour le moment.", error: true }));
    }
    setBusy(false);
  };

  const toggleMic = async () => {
    setMicMsg("");
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 800) { setMicMsg("Enregistrement trop court."); return; }
        setMicMsg("Transcription…");
        const data: string = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
        try {
          const r = await fetch("/api/pro/glow/transcribe", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio: data }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d?.message || "Transcription indisponible.");
          setInput((cur) => (cur ? `${cur} ${d.text}` : d.text)); setMicMsg("Relisez puis envoyez.");
        } catch (e: any) { setMicMsg(e.message); }
      };
      mr.start(); setRec(mr); setMicMsg("Parlez… touchez à nouveau pour arrêter.");
    } catch { setMicMsg("Micro indisponible sur cet appareil."); }
  };

  const card: React.CSSProperties = { background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, fontFamily: FONT_UI, color: D.text };
  return (
    <div className="flex flex-col" style={{ ...card, overflow: "hidden" }} data-testid="glow-assistant">
      <div style={{ padding: "16px 18px 12px", background: "linear-gradient(115deg,#102d2e,#133b3a)", color: "#fff" }}>
        <span className="flex items-center" style={{ gap: 8 }}>
          <span className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(30,172,162,.25)", color: "#70ded5" }}><Sparkles size={14} /></span>
          <span className="flex flex-col"><b style={{ fontSize: 13, fontWeight: 700 }}>Glow · assistant clinique</b><span style={{ fontSize: 9.5, color: "#97afaa" }}>Gemini · connaît le dossier et voit les photos</span></span>
        </span>
      </div>

      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${D.sep}` }}>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .8, color: D.action }}>PISTES DU CAS</span>
          <button type="button" onClick={runPistes} disabled={pBusy} className="flex cursor-pointer items-center" data-testid="glow-pistes"
            style={{ gap: 5, border: 0, background: "none", padding: 0, color: D.action, fontSize: 10.5, fontWeight: 600, fontFamily: FONT_UI, opacity: pBusy ? .5 : 1 }}>
            <RefreshCw size={12} className={pBusy ? "animate-spin" : ""} />{pistes ? "Actualiser" : "Analyser le cas"}
          </button>
        </div>
        {pErr && <p style={{ margin: "8px 0 0", fontSize: 10.5, color: D.err }}>{pErr}</p>}
        {!pistes && !pErr && <p style={{ margin: "6px 0 0", fontSize: 10.5, color: D.muted }}>Glow propose 3 diagnostics différentiels à partir du dossier et signale les incohérences.</p>}
        {pistes && (
          <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
            {pistes.contradiction?.detectee && (
              <div className="flex" style={{ gap: 7, padding: "8px 10px", borderRadius: 8, background: D.warnBg, color: D.warn, fontSize: 10.5 }}>
                <AlertTriangle size={13} className="mt-0.5 flex-none" />
                <span><b>Incohérence possible.</b> {pistes.contradiction.explication}{pistes.contradiction.suggestion ? ` ${pistes.contradiction.suggestion}` : ""}</span>
              </div>
            )}
            {pistes.diagnosticsDifferentiels.map((d, i) => (
              <div key={i} style={{ border: `1px solid ${D.sep}`, borderRadius: 8 }}>
                <button type="button" onClick={() => setOpenDiff(openDiff === i ? null : i)} className="flex w-full cursor-pointer items-center justify-between text-left"
                  style={{ gap: 8, padding: "8px 10px", border: 0, background: "none", fontFamily: FONT_UI }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: D.text }}>{d.diagnostic}</span>
                  <span className="flex items-center" style={{ gap: 6 }}><span style={{ fontSize: 10, fontWeight: 700, color: probaTone(d.probabilite) }}>{d.probabilite}</span><ChevronDown size={12} color={D.faint} /></span>
                </button>
                {openDiff === i && d.causes.length > 0 && (
                  <div style={{ padding: "0 10px 9px", fontSize: 10.5, color: D.muted }}>{d.causes.map((c, j) => <span key={j} style={{ display: "block", margin: "2px 0" }}>• {c}</span>)}</div>
                )}
              </div>
            ))}
            {pistes.questionClarification && (
              <button type="button" onClick={() => ask(pistes.questionClarification!)} className="cursor-pointer text-left"
                style={{ padding: "8px 10px", borderRadius: 8, border: 0, background: D.infoBg, color: D.info, fontSize: 10.5, fontFamily: FONT_UI }}>
                <b>À clarifier :</b> {pistes.questionClarification} <span style={{ fontWeight: 600 }}>Demander à Glow →</span>
              </button>
            )}
            {pistes.sourceWeb && <a href={pistes.sourceWeb.url} target="_blank" rel="noopener noreferrer" className="flex items-center no-underline" style={{ gap: 4, fontSize: 9.5, color: D.muted }}><ExternalLink size={10} />{pistes.sourceWeb.titre}</a>}
          </div>
        )}
      </div>

      <div ref={listRef} className="flex flex-col" style={{ gap: 10, padding: "14px 16px", maxHeight: 460, minHeight: 140, overflowY: "auto", background: "#fbfcfa" }} data-testid="glow-thread">
        {msgs.length === 0 && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <span style={{ fontSize: 10.5, color: D.muted }}>Posez votre question comme à un confrère. Par exemple :</span>
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="cursor-pointer text-left hover:bg-[#eaf2e5]"
                style={{ padding: "7px 10px", borderRadius: 999, border: `1px solid ${D.border}`, background: "#fff", color: D.text, fontSize: 10.5, fontFamily: FONT_UI }}>{q}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "doctor" ? "justify-end" : "justify-start"}`}>
            <div style={{
              maxWidth: "92%", padding: "9px 12px", fontSize: 11.5, lineHeight: 1.55, borderRadius: m.role === "doctor" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              background: m.role === "doctor" ? D.actionDark : m.error ? D.errBg : "#fff", color: m.role === "doctor" ? "#fff" : m.error ? D.err : D.text,
              border: m.role === "doctor" ? 0 : `1px solid ${D.border}`, whiteSpace: m.role === "doctor" ? "pre-wrap" : undefined,
            }}>
              {m.role === "ai" ? (m.text ? <Rich text={m.text} /> : <span style={{ color: D.faint }}>Glow réfléchit…</span>) : m.text}
              {m.source && <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="flex items-center no-underline" style={{ gap: 4, marginTop: 6, fontSize: 9.5, color: D.muted }}><ExternalLink size={10} />{m.source.title}</a>}
            </div>
          </div>
        ))}
      </div>

      {msgs.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 5, padding: "8px 14px 0" }}>
          {QUICK.slice(1).map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => ask(q)} className="cursor-pointer"
              style={{ padding: "4px 9px", borderRadius: 999, border: `1px solid ${D.border}`, background: "#fff", color: D.muted, fontSize: 9.5, fontFamily: FONT_UI }}>{q}</button>
          ))}
        </div>
      )}
      <div className="flex items-end" style={{ gap: 8, padding: "10px 14px 12px" }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder="Votre question sur ce cas…" data-testid="glow-input"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          style={{ flex: 1, minWidth: 0, resize: "none", padding: "9px 10px", border: `1px solid ${D.border}`, borderRadius: 8, background: D.field, fontSize: 11.5, fontFamily: FONT_UI, color: D.text, outline: "none" }} />
        <button type="button" onClick={toggleMic} aria-label={rec ? "Arrêter l'enregistrement" : "Dicter la question"} className="grid flex-none cursor-pointer place-items-center"
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${rec ? D.err : D.border}`, background: rec ? D.errBg : "#fff", color: rec ? D.err : D.action }}>
          {rec ? <Square size={13} /> : <Mic size={15} />}
        </button>
        <button type="button" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Envoyer" className="grid flex-none cursor-pointer place-items-center" data-testid="glow-send"
          style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: busy || !input.trim() ? "#d5ddd9" : D.cta, color: "#fff" }}>
          <Send size={14} />
        </button>
      </div>
      {micMsg && <span style={{ padding: "0 16px 8px", fontSize: 9.5, color: D.muted }}>{micMsg}</span>}
      <span style={{ padding: "0 16px 12px", fontSize: 9.5, color: D.faint }}>Analyse indicative : seul votre examen fait foi. Glow ne pose pas de diagnostic.</span>
    </div>
  );
}
