import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Pause, Play, SendHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ════════════════════════════════════════════════════════════════════════
// R5 · Discussion du cas (maquette « Relais Mobile »). Un fil par cas entre le
// dermatologue et le relais : texte, photo, vocal (maintenir ●, 60 s max,
// transcription automatique), demandes structurées du dermatologue (délai en
// pause). Sans internet, les messages passent par SMS avec le code du cas.
// ════════════════════════════════════════════════════════════════════════

type Msg = {
  id: number; mine: boolean; role: "derm" | "relay"; kind: "text" | "photo" | "voice" | "system" | "request"; body: string | null;
  media: string | null; durationS: number | null; transcript: string | null; viaSms: boolean; smsSent: boolean; resolved: boolean; at: string;
};
type Thread = {
  case: { id: number; code: string; role: "derm" | "relay"; open: boolean; paused: boolean; closesAt: string | null; other: { name: string | null; country: string | null } };
  requests: string[];
  messages: Msg[];
};

const VOICE_MAX_S = 60;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const ini = (n?: string | null) => String(n || "").replace(/^(dr|pr|inf)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const blobToDataUrl = (b: Blob) => new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(b); });
async function compress(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  const data = await blobToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = data; });
  const s = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

function Voice({ m }: { m: Msg }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button type="button" aria-label={playing ? "Pause" : "Écouter"} onClick={() => { const a = ref.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); }}
          className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-organic-accent text-organic-bg">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="text-[13px] font-semibold">Message vocal{m.durationS ? ` · ${mmss(m.durationS)}` : ""}</span>
        {m.media && <audio ref={ref} src={m.media} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
      </div>
      {m.transcript
        ? <span className="text-[12px] leading-normal opacity-90">Transcription automatique : « {m.transcript} »</span>
        : <span className="text-[11px] opacity-70">Transcription en cours…</span>}
    </div>
  );
}

export function CaseThread({ caseId, onClose }: { caseId: number; onClose?: () => void }) {
  const qc = useQueryClient();
  const key = `/api/relay/cases/${caseId}/messages`;
  const { data, isLoading } = useQuery<Thread>({ queryKey: [key], refetchInterval: 10_000 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rec, setRec] = useState<{ start: number; secs: number } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);
  useEffect(() => () => { clearInterval(timer.current); try { recorder.current?.stop(); } catch {} }, []);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(key, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Envoi impossible. Réessayez.");
      qc.invalidateQueries({ queryKey: [key] });
      qc.invalidateQueries({ queryKey: ["/api/case-threads/unread"] });
      return true;
    } catch (e: any) { setErr(e.message); return false; } finally { setBusy(false); }
  };

  // Vocal : maintenir le bouton ●, relâcher pour envoyer (60 s max).
  const startRec = async () => {
    if (rec || busy) return;
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      const start = Date.now();
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        const secs = Math.max(1, Math.round((Date.now() - start) / 1000));
        setRec(null);
        if (secs < 1 || !chunks.current.length) return;
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        await send({ kind: "voice", media: await blobToDataUrl(blob), durationS: Math.min(VOICE_MAX_S, secs) });
      };
      recorder.current = mr;
      mr.start();
      setRec({ start, secs: 0 });
      timer.current = setInterval(() => {
        const s = Math.round((Date.now() - start) / 1000);
        setRec({ start, secs: s });
        if (s >= VOICE_MAX_S) { try { mr.stop(); } catch {} }
      }, 250);
    } catch { setErr("Micro indisponible. Autorisez le micro, ou écrivez votre message."); }
  };
  const stopRec = () => { try { if (recorder.current?.state === "recording") recorder.current.stop(); } catch {} };

  if (isLoading || !data) return <div className="p-organic-4 text-[14px] text-organic-neutral-700">Chargement de la discussion…</div>;
  const c = data.case;
  const isDerm = c.role === "derm";

  return (
    <div className="flex min-w-0 flex-col gap-organic-3 rounded-card bg-organic-surface p-organic-4" data-testid="case-thread">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-organic-accent-2-200 text-[14px] font-bold text-organic-accent-2-800">{ini(c.other.name)}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{c.other.name || (isDerm ? "Relais" : "Dermatologue")} · cas {c.code}</span>
          <span className="truncate text-[12px] text-organic-neutral-700">{[c.other.country, "répond en français"].filter(Boolean).join(" · ")}</span>
        </span>
        {onClose && <button type="button" aria-label="Fermer la discussion" onClick={onClose} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"><X size={18} /></button>}
      </div>
      {c.paused && <span className="self-start rounded-pill bg-organic-accent-100 px-3 py-1 text-[12px] font-semibold text-organic-accent-900">Demande en cours · délai en pause</span>}

      <div className="flex max-h-[55vh] min-h-[160px] flex-col gap-2 overflow-y-auto">
        {data.messages.length === 0 && <span className="m-auto text-[13px] text-organic-neutral-700">Aucun message pour ce cas.</span>}
        {data.messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[85%] flex-col gap-1.5 rounded-card px-3.5 py-2.5 text-[14px] ${m.mine ? "bg-organic-accent text-organic-bg" : "bg-organic-bg"}`}>
              {m.kind === "request" ? (
                <span className={`self-start rounded-pill px-2.5 py-1 text-[12px] font-bold ${m.mine ? "bg-organic-bg text-organic-accent-800" : "bg-organic-accent-100 text-organic-accent-900"}`}>
                  Demande : {m.body}{m.resolved ? " · reçue" : ""}
                </span>
              ) : m.kind === "voice" ? <Voice m={m} />
                : m.kind === "photo" ? (m.media && <a href={m.media} target="_blank" rel="noreferrer"><img src={m.media} alt="Photo du cas" className="max-h-56 w-full rounded-xl object-cover" /></a>)
                : <span className="whitespace-pre-wrap">{m.body}</span>}
              <span className="text-[11px] opacity-70">
                {new Date(m.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{m.viaSms ? " · reçu par SMS" : ""}{m.smsSent ? " · envoyé par SMS" : ""}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {c.open ? (
        <>
          {isDerm && (
            <div className="flex flex-wrap gap-1.5">
              {data.requests.map((r) => (
                <button key={r} type="button" disabled={busy} onClick={() => send({ kind: "request", body: r })}
                  className="cursor-pointer rounded-pill border border-organic-divider bg-transparent px-3 py-1.5 font-body text-[12px] font-semibold" data-testid="case-request">Demander : {r}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Photo" onClick={() => fileRef.current?.click()} disabled={busy || !!rec}
              className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border border-organic-divider bg-organic-bg"><Camera size={18} /></button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await send({ kind: "photo", media: await compress(f) }); }} />
            {rec ? (
              <span className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill bg-organic-accent-100 px-4 text-[14px] font-semibold text-organic-accent-900">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-organic-accent" /> Enregistrement {mmss(rec.secs)} / {mmss(VOICE_MAX_S)} · relâchez pour envoyer
              </span>
            ) : (
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" data-testid="case-text"
                onKeyDown={async (e) => { if (e.key === "Enter" && text.trim() && !busy) { if (await send({ kind: "text", body: text.trim() })) setText(""); } }}
                className="box-border h-11 min-w-0 flex-1 rounded-pill border border-organic-divider bg-organic-bg px-4 font-body text-[15px] outline-none focus:border-organic-accent" />
            )}
            {text.trim() && !rec ? (
              <Button onClick={async () => { if (await send({ kind: "text", body: text.trim() })) setText(""); }} disabled={busy} aria-label="Envoyer" className="h-11 w-11 flex-none rounded-full p-0" data-testid="case-send"><SendHorizontal size={18} /></Button>
            ) : (
              <button type="button" aria-label="Maintenir pour un message vocal" disabled={busy} data-testid="case-record"
                onPointerDown={(e) => { e.preventDefault(); startRec(); }} onPointerUp={stopRec} onPointerLeave={stopRec} onContextMenu={(e) => e.preventDefault()}
                className={`flex h-11 w-11 flex-none cursor-pointer touch-none select-none items-center justify-center rounded-full border-0 text-[20px] ${rec ? "bg-organic-accent-700 text-organic-bg" : "bg-organic-accent text-organic-bg"}`}>●</button>
            )}
          </div>
          {err && <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2 text-[13px] font-semibold text-organic-accent-900">{err}</div>}
          <span className="text-[11px] text-organic-neutral-700">
            {!isDerm && "Sans internet : messages reçus et envoyés par SMS · "}Maintenir ● pour un vocal · discussion ouverte 7 jours après l'avis
          </span>
        </>
      ) : (
        <span className="text-[12px] text-organic-neutral-700">Discussion fermée (lecture seule) : elle reste ouverte 7 jours après l'avis.</span>
      )}
    </div>
  );
}

/** Fil en surimpression : plein écran sur mobile, fenêtre centrée sur ordinateur. */
export function CaseThreadSheet({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-organic-6" onClick={onClose} role="dialog" aria-modal="true">
      <div className="box-border max-h-full w-full overflow-y-auto sm:max-w-[640px]" onClick={(e) => e.stopPropagation()}>
        <CaseThread caseId={caseId} onClose={onClose} />
      </div>
    </div>
  );
}
