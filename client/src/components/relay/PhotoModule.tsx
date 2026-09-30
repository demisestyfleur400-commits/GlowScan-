import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PHOTO_MODULE, PHOTO_QUIZ, PHOTO_RULES } from "@shared/relayOnboarding";

// ════════════════════════════════════════════════════════════════════════
// R3 · Module photo (maquette « Relais Mobile ») : obligatoire avant le 1er cas.
// 4 règles, puis 5 questions ; 4 bonnes réponses pour valider. La note est
// calculée par le serveur. Les illustrations sont neutres (aucun vrai patient).
// ════════════════════════════════════════════════════════════════════════

function Illustration({ kind }: { kind: "blurry" | "sharp" }) {
  const blurry = kind === "blurry";
  return (
    <svg viewBox="0 0 160 120" className="h-24 w-full rounded-xl" role="img" aria-label={blurry ? "Photo floue et sombre" : "Photo nette"}>
      <defs><filter id={`b-${kind}`}><feGaussianBlur stdDeviation={blurry ? 5 : 0} /></filter></defs>
      <rect width="160" height="120" fill={blurry ? "#3b2a22" : "#a8765a"} />
      <g filter={`url(#b-${kind})`}>
        <ellipse cx="80" cy="60" rx="34" ry="24" fill={blurry ? "#2a1c16" : "#6b3b2a"} />
        <circle cx="70" cy="55" r="5" fill={blurry ? "#231712" : "#4d281c"} />
        <circle cx="92" cy="66" r="4" fill={blurry ? "#231712" : "#4d281c"} />
        {!blurry && <circle cx="130" cy="98" r="10" fill="#c9c2b4" stroke="#8a8272" strokeWidth="2" />}
      </g>
    </svg>
  );
}

export function PhotoModule({ onPassed }: { onPassed: () => void }) {
  const [phase, setPhase] = useState<"rules" | "quiz" | "result">("rules");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(PHOTO_QUIZ.map(() => null));
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; wrong: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/relay/training/photo", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Erreur. Réessayez.");
      setResult(d); setPhase("result");
      if (d.passed) onPassed();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const q = PHOTO_QUIZ[i];
  return (
    <div className="flex flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-4 sm:p-organic-6" data-testid="photo-module">
      <span className="text-[11px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Module 1 · obligatoire avant le 1er cas</span>
      <span className="font-heading text-[24px] leading-tight">{PHOTO_MODULE.title}</span>

      {phase === "rules" && (
        <>
          <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-normal">{PHOTO_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
          <span className="text-[13px] text-organic-neutral-700">{PHOTO_MODULE.total} questions · {PHOTO_MODULE.passScore} bonnes réponses pour valider. Attestation reconnue pour la formation continue.</span>
          <Button onClick={() => setPhase("quiz")} className="self-start" data-testid="photo-start">Commencer le quiz</Button>
        </>
      )}

      {phase === "quiz" && (
        <>
          <span className="text-[15px] font-bold">Quiz · {q.q}</span>
          <div className={`grid gap-organic-2 ${q.options.some((o) => o.image) ? "grid-cols-2" : "grid-cols-1"}`}>
            {q.options.map((o, k) => {
              const on = answers[i] === k;
              return (
                <button key={k} type="button" onClick={() => setAnswers(answers.map((a, j) => (j === i ? k : a)))} data-testid={`photo-q${i}-o${k}`}
                  className={`flex cursor-pointer flex-col gap-2 rounded-card border-2 bg-organic-bg p-organic-3 text-left font-body text-[14px] ${on ? "border-organic-accent" : "border-transparent"}`}>
                  {o.image && <Illustration kind={o.image} />}
                  <span className={o.image ? "text-center font-semibold" : ""}>{o.label}</span>
                </button>
              );
            })}
          </div>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => (i > 0 ? setI(i - 1) : setPhase("rules"))}>← Retour</Button>
            {i < PHOTO_QUIZ.length - 1
              ? <Button onClick={() => setI(i + 1)} disabled={answers[i] == null} data-testid="photo-next">Question suivante · {i + 2} / {PHOTO_QUIZ.length}</Button>
              : <Button onClick={submit} disabled={busy || answers.some((a) => a == null)} data-testid="photo-submit">Valider mes réponses</Button>}
          </div>
        </>
      )}

      {phase === "result" && result && (
        <>
          <span className={`self-start rounded-pill px-3.5 py-1.5 text-[14px] font-bold ${result.passed ? "bg-organic-accent-2-100 text-organic-accent-2-800" : "bg-organic-accent-100 text-organic-accent-900"}`}>
            {result.score}/{result.total} · {result.passed ? "Module validé" : "Pas encore validé"}
          </span>
          {result.passed ? (
            <a href="/api/relay/training/photo/attestation" target="_blank" rel="noopener noreferrer" className="self-start text-[14px] font-bold text-organic-accent-700">Voir mon attestation</a>
          ) : (
            <>
              <span className="text-[14px]">Relisez les règles, surtout pour {result.wrong.length > 1 ? "les questions" : "la question"} {result.wrong.map((w) => w + 1).join(", ")}, puis recommencez.</span>
              <Button onClick={() => { setAnswers(PHOTO_QUIZ.map(() => null)); setI(0); setResult(null); setPhase("rules"); }} className="self-start">Recommencer</Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
