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

export function detectDictationLang(): string {
  const l = (document.documentElement.lang || navigator.language || "fr").toLowerCase();
  return l.startsWith("en") ? "en-US" : "fr-FR";
}

export interface VoiceDictationOptions {
  lang?: string;
  onFinal?: (text: string) => void;   // segment reconnu (final)
  onInterim?: (text: string) => void; // texte provisoire (en cours)
}

export function useVoiceDictation(opts?: VoiceDictationOptions) {
  const [listening, setListening] = useState(false);
  const [supported] = useState<boolean>(() => !!getSpeechRecognition());
  const recRef = useRef<any>(null);
  const wantRef = useRef(false); // l'utilisateur veut-il écouter (pour auto-restart)
  const onFinalRef = useRef(opts?.onFinal);
  const onInterimRef = useRef(opts?.onInterim);
  onFinalRef.current = opts?.onFinal;
  onInterimRef.current = opts?.onInterim;

  const stop = useCallback(() => {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = useCallback((lang?: string) => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    try { recRef.current?.abort?.(); } catch {}
    const rec = new SR();
    rec.lang = lang || opts?.lang || detectDictationLang();
    rec.continuous = true;
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
      // "no-speech" / "aborted" : on ne coupe pas brutalement, l'onend gère.
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      // Auto-relance tant que l'utilisateur veut écouter (Chrome coupe après un silence).
      if (wantRef.current) {
        try { rec.start(); return; } catch {}
      }
      setListening(false);
    };

    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); setListening(true); } catch {}
  }, [opts?.lang]);

  const toggle = useCallback((lang?: string) => {
    if (listening) stop();
    else start(lang);
  }, [listening, start, stop]);

  useEffect(() => () => { wantRef.current = false; try { recRef.current?.abort?.(); } catch {} }, []);

  return { supported, listening, start, stop, toggle };
}
