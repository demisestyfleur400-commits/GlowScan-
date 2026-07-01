import { useCallback, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Dictée vocale FIABLE sur tous les navigateurs (Edge, Chrome, Safari, iPhone).
// On enregistre l'audio via MediaRecorder puis on le transcrit côté serveur
// (Whisper / Groq). Contrairement à l'API Web Speech, ça marche sur Edge & Safari.
// États : "idle" → "recording" → "transcribing" → "idle".
// ════════════════════════════════════════════════════════════════════════

export type TranscribeStatus = "idle" | "recording" | "transcribing";

function pickMimeType(): string {
  const MR: any = (window as any).MediaRecorder;
  if (!MR || !MR.isTypeSupported) return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) { try { if (MR.isTypeSupported(c)) return c; } catch {} }
  return "";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export interface AudioTranscriptionOptions {
  onResult?: (text: string) => void;
  onError?: (message: string) => void;
}

export function useAudioTranscription(opts?: AudioTranscriptionOptions) {
  const [status, setStatus] = useState<TranscribeStatus>("idle");
  const [supported] = useState<boolean>(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!(window as any).MediaRecorder,
  );
  const recorderRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>("");
  const onResultRef = useRef(opts?.onResult);
  const onErrorRef = useRef(opts?.onError);
  onResultRef.current = opts?.onResult;
  onErrorRef.current = opts?.onError;

  const cleanupStream = () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    if (!supported) { onErrorRef.current?.("L'enregistrement audio n'est pas supporté par ce navigateur."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 800) { setStatus("idle"); return; }
        setStatus("transcribing");
        try {
          const audioBase64 = await blobToBase64(blob);
          const resp = await fetch("/api/transcribe", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64, mimeType: mimeRef.current || "audio/webm" }),
          });
          if (!resp.ok) throw new Error("http " + resp.status);
          const data = await resp.json();
          const text = (data?.text || "").trim();
          if (text) onResultRef.current?.(text);
          else onErrorRef.current?.("Aucune parole détectée. Réessayez en parlant plus près du micro.");
        } catch {
          onErrorRef.current?.("Transcription impossible pour le moment. Réessayez.");
        } finally {
          setStatus("idle");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setStatus("recording");
    } catch (e: any) {
      cleanupStream();
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        onErrorRef.current?.("Micro non autorisé. Autorisez le microphone pour ce site puis réessayez.");
      } else if (name === "NotFoundError") {
        onErrorRef.current?.("Aucun microphone détecté sur cet appareil.");
      } else {
        onErrorRef.current?.("Impossible d'accéder au micro.");
      }
      setStatus("idle");
    }
  }, [supported]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") { try { rec.stop(); } catch {} }
    recorderRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (status === "recording") stop();
    else if (status === "idle") start();
  }, [status, start, stop]);

  return { supported, status, start, stop, toggle };
}
