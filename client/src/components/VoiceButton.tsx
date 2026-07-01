import { useRef } from "react";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";

// ════════════════════════════════════════════════════════════════════════
// Bouton micro de dictée — À CÔTÉ du champ, le clavier reste (comme un téléphone).
// Fiable sur TOUS les navigateurs (Edge, Chrome, Safari, iPhone) : enregistrement
// audio + transcription serveur (Whisper/Groq). Pas d'API Web Speech (KO sur Edge).
//
//  • Clic 1 → enregistre (le bouton pulse rouge).
//  • Clic 2 → transcrit (petit spinner) puis insère le texte dans le champ.
//
// Deux modes : `value` + `onChange` (ajoute au contenu du champ) ou `onText`.
// ════════════════════════════════════════════════════════════════════════

export function VoiceButton({
  onText,
  value,
  onChange,
  size = 30,
  title = "Dicter à la voix",
  dark = true,
}: {
  onText?: (text: string) => void;
  value?: string;
  onChange?: (text: string) => void;
  size?: number;
  title?: string;
  dark?: boolean;
}) {
  const live = typeof onChange === "function";
  const baseRef = useRef<string>("");

  const append = (base: string, t: string) => (base ? `${base} ${t}` : t);

  const { supported, status, toggle } = useAudioTranscription({
    onResult: (t) => {
      if (!t) return;
      if (live) { onChange!(append((value || "").trim(), t)); }
      else onText?.(t);
    },
    onError: (msg) => { try { window.alert(msg); } catch {} },
  });

  if (!supported) return null;

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  const activeBg = "#ef4444";
  const idleBg = dark ? "rgba(167,139,250,0.15)" : "#ede9fe";
  const idleColor = dark ? "#c4b5fd" : "#7c3aed";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (transcribing) return;
    if (live && status === "idle") baseRef.current = (value || "").trim();
    toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={transcribing}
      title={recording ? "Terminer la dictée" : transcribing ? "Transcription…" : title}
      aria-label={title}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        border: "none",
        cursor: transcribing ? "wait" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: recording ? activeBg : idleBg,
        color: recording ? "#fff" : idleColor,
        boxShadow: recording ? "0 0 0 4px rgba(239,68,68,0.25)" : "none",
        animation: recording ? "gsMicPulse 1.2s ease-in-out infinite" : "none",
        transition: "background .15s",
        flexShrink: 0,
      }}
    >
      {transcribing ? (
        <span
          style={{
            width: size * 0.42,
            height: size * 0.42,
            border: `2px solid ${dark ? "rgba(196,181,253,0.35)" : "rgba(124,58,237,0.3)"}`,
            borderTopColor: idleColor,
            borderRadius: "50%",
            display: "inline-block",
            animation: "gsMicSpin 0.7s linear infinite",
          }}
        />
      ) : (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
      <style>{`@keyframes gsMicPulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.25)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0.10)}}@keyframes gsMicSpin{to{transform:rotate(360deg)}}`}</style>
    </button>
  );
}
