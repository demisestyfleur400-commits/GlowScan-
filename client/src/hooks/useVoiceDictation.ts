import { useCallback, useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Dictée vocale (speech-to-text) via l'API navigateur Web Speech.
// Supporté sur Chrome / Edge / Chrome Android (webkitSpeechRecognition).
// Langue : FR par défaut, EN si la page est en anglais.
// ════════════════════════════════════════════════════════════════════════

function getSpeechRecognition(): any | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// iOS/iPadOS gère mal le mode continu + auto-relance de l'API vocale : on passe
// en reconnaissance « phrase par phrase » (plus fiable) sur ces appareils.
function isIOS(): boolean {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1); // iPadOS se déguise en Mac
}

export function detectDictationLang(): string {
  const l = (document.documentElement.lang || navigator.language || "fr").toLowerCase();
  return l.startsWith("en") ? "en-US" : "fr-FR";
}

export interface VoiceDictationOptions {
  lang?: string;
  onFinal?: (text: string) => void;   // segment reconnu (final)
  onInterim?: (text: string) => void; // texte provisoire (en cours)
  onError?: (message: string) => void; // message d'erreur lisible
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Micro bloqué. Cliquez sur l'icône 🔒 (ou 🎙️) à gauche de la barre d'adresse et autorisez le microphone pour ce site, puis réessayez.";
    case "audio-capture":
      return "Aucun microphone détecté. Branchez / activez un micro puis réessayez.";
    case "network":
      return "La dictée nécessite une connexion internet active.";
    case "no-speech":
      return "Aucune parole détectée. Réessayez en parlant plus près du micro.";
    default:
      return "La dictée vocale n'a pas pu démarrer (" + code + ").";
  }
}

export function useVoiceDictation(opts?: VoiceDictationOptions) {
  const [listening, setListening] = useState(false);
  const [supported] = useState<boolean>(() => !!getSpeechRecognition());
  const recRef = useRef<any>(null);
  const wantRef = useRef(false); // l'utilisateur veut-il écouter (pour auto-restart)
  const onFinalRef = useRef(opts?.onFinal);
  const onInterimRef = useRef(opts?.onInterim);
  const onErrorRef = useRef(opts?.onError);
  onFinalRef.current = opts?.onFinal;
  onInterimRef.current = opts?.onInterim;
  onErrorRef.current = opts?.onError;

  const stop = useCallback(() => {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const beginRecognition = useCallback((lang?: string) => {
    const SR = getSpeechRecognition();
    if (!SR) { onErrorRef.current?.("Dictée vocale non supportée par ce navigateur."); return; }
    try { recRef.current?.abort?.(); } catch {}
    const ios = isIOS();
    const rec = new SR();
    rec.lang = lang || opts?.lang || detectDictationLang();
    // iOS : phrase par phrase (pas de continu, l'utilisateur relance) ; ailleurs : continu.
    rec.continuous = !ios;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalText && onFinalRef.current) onFinalRef.current(finalText.trim());
      if (interim && onInterimRef.current) onInterimRef.current(interim);
    };
    rec.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "aborted") return; // arrêt volontaire, pas une vraie erreur
      // Toutes les autres erreurs : on informe l'utilisateur et on coupe.
      if (code !== "no-speech") { wantRef.current = false; setListening(false); }
      onErrorRef.current?.(errorMessage(code));
    };
    rec.onend = () => {
      // Auto-relance tant que l'utilisateur veut écouter (Chrome coupe après un silence).
      // Sur iOS on NE relance PAS (l'API le supporte mal) : une phrase par appui.
      if (wantRef.current && !ios) {
        try { rec.start(); return; } catch {}
      }
      wantRef.current = false;
      setListening(false);
    };

    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); setListening(true); }
    catch (err: any) {
      // "already started" : on ignore ; sinon on informe.
      if (!/already/i.test(err?.message || "")) {
        wantRef.current = false;
        setListening(false);
        onErrorRef.current?.(errorMessage(err?.name || "start-failed"));
      }
    }
  }, [opts?.lang]);

  // Démarre la dictée. On laisse l'API vocale déclencher la POPUP D'AUTORISATION
  // STANDARD du navigateur (« Autoriser le micro ? »). Clic sur « Autoriser » → ça
  // marche directement. Le message d'aide n'apparaît que si l'autorisation a
  // réellement été refusée/bloquée (onerror « not-allowed »).
  const start = useCallback((lang?: string) => {
    beginRecognition(lang);
  }, [beginRecognition]);

  const toggle = useCallback((lang?: string) => {
    if (listening) stop();
    else start(lang);
  }, [listening, start, stop]);

  useEffect(() => () => { wantRef.current = false; try { recRef.current?.abort?.(); } catch {} }, []);

  return { supported, listening, start, stop, toggle };
}
