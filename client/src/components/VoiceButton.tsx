import { useVoiceDictation } from "@/hooks/useVoiceDictation";

// ════════════════════════════════════════════════════════════════════════
// Bouton micro de dictée vocale — à placer à côté d'un champ.
// Au clic : démarre l'écoute ; le texte reconnu est envoyé via onText().
// Ne s'affiche que si le navigateur supporte la dictée.
// ════════════════════════════════════════════════════════════════════════

export function VoiceButton({
  onText,
  lang,
  size = 30,
  title = "Dicter à la voix",
  dark = true,
}: {
  onText: (text: string) => void;
  lang?: string;
  size?: number;
  title?: string;
  dark?: boolean;
}) {
  const { supported, listening, toggle } = useVoiceDictation({
    lang,
    onFinal: (t) => { if (t) onText(t); },
    onError: (msg) => { try { window.alert(msg); } catch {} },
  });

  if (!supported) return null;

  const activeBg = "#ef4444";
  const idleBg = dark ? "rgba(167,139,250,0.15)" : "#ede9fe";
  const idleColor = dark ? "#c4b5fd" : "#7c3aed";

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(lang); }}
      title={listening ? "Arrêter la dictée" : title}
      aria-label={title}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: listening ? activeBg : idleBg,
        color: listening ? "#fff" : idleColor,
        boxShadow: listening ? "0 0 0 4px rgba(239,68,68,0.25)" : "none",
        animation: listening ? "gsMicPulse 1.2s ease-in-out infinite" : "none",
        transition: "background .15s",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
      <style>{`@keyframes gsMicPulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.25)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0.10)}}`}</style>
    </button>
  );
}
