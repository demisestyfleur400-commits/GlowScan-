import { useEffect, useRef, useState } from "react";
import { useConsultationSocket } from "@/hooks/use-consultation-socket";

// ════════════════════════════════════════════════════════════════════════
// Fil de discussion d'une consultation (temps réel). Utilisé côté patient (clair)
// et côté dermatologue (sombre) via le prop `dark`.
// ════════════════════════════════════════════════════════════════════════

interface Msg { id: number; senderType: "patient" | "doctor"; body?: string | null; imageUrl?: string | null; createdAt?: string; readAt?: string | null; }

// Compresse une image en base64 JPEG (max ~1000px) pour l'envoi dans le chat.
async function compressToBase64(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const s = maxDim / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ConsultationChat({ consultationId, myUserId, dark, onBack }: {
  consultationId: number; myUserId: string | null; dark?: boolean; onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [side, setSide] = useState<"patient" | "doctor" | null>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
        setSide(d.side);
        setCtx(d.consultation);
        setOtherUserId(d.otherUserId || null);
        setOtherOnline(!!d.otherOnline);
      }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [consultationId]);

  useConsultationSocket(myUserId, (evt, data) => {
    if (evt === "consultation:message") {
      if (data.consultationId === consultationId && data.message) {
        setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
      }
    } else if (evt === "presence:changed") {
      if (otherUserId && data.userId === otherUserId) setOtherOnline(!!data.online);
    } else if (evt === "consultation:read") {
      // L'autre partie a lu mes messages → on marque les miens comme « Vu ».
      if (data.consultationId === consultationId && data.readerSide !== side) {
        setMessages((prev) => prev.map((m) => m.senderType === side ? { ...m, readAt: m.readAt || new Date().toISOString() } : m));
      }
    }
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
      } else { setText(body); }
    } catch { setText(body); } finally { setSending(false); }
  };

  const sendImage = async (file: File | undefined | null) => {
    if (!file || sending) return;
    if (!file.type.startsWith("image/")) return;
    setSending(true);
    try {
      const imageUrl = await compressToBase64(file);
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
      }
    } catch {} finally { setSending(false); }
  };

  const BG = dark ? "#0d0a0e" : "#f6f7fb";
  const CARD = dark ? "rgba(255,255,255,0.04)" : "#fff";
  const INK = dark ? "#f3f0ff" : "#1a1a2e";
  const MUTED = dark ? "rgba(255,255,255,0.45)" : "#9ca3af";
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const MINE = "#7c3aed";
  const THEIRS = dark ? "rgba(255,255,255,0.08)" : "#eef0f6";

  const mineMsgs = messages.filter((m) => m.senderType === side);
  const lastMineId = mineMsgs.length ? mineMsgs[mineMsgs.length - 1].id : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: INK, fontSize: 18, cursor: "pointer" }}>←</button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: 0 }}>Consultation</p>
          <p style={{ fontSize: 11, margin: 0, display: "flex", alignItems: "center", gap: 5, color: otherOnline ? "#10b981" : MUTED }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: otherOnline ? "#10b981" : "#9ca3af", display: "inline-block", flexShrink: 0 }} />
            {otherOnline ? "En ligne" : "Hors ligne"}
          </p>
        </div>
        {/* Dermatologue : convertir en dossier patient DERM */}
        {side === "doctor" && (
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/pro/consultations/${consultationId}/to-patient`, { method: "POST", credentials: "include" });
                const d = await res.json();
                if (res.ok && d.patientId) window.location.href = `/derm/patient/${d.patientId}`;
              } catch {}
            }}
            style={{ flexShrink: 0, background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
          >
            + Dossier patient
          </button>
        )}
        {side === "doctor" && ctx?.status !== "closed" && (
          <button
            onClick={async () => {
              if (!confirm("Terminer cette consultation ? Le patient pourra la noter.")) return;
              try {
                const res = await fetch(`/api/pro/consultations/${consultationId}/close`, { method: "POST", credentials: "include" });
                if (res.ok) load();
              } catch {}
            }}
            style={{ flexShrink: 0, background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
          >
            ✓ Terminer
          </button>
        )}
      </div>

      {/* Contexte : photo + diagnostic */}
      {ctx?.imageUrl && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
          <img src={ctx.imageUrl} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Photo & diagnostic partagés avec le dermatologue.</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>Chargement…</p>}
        {!loading && messages.length === 0 && (
          <p style={{ fontSize: 12.5, color: MUTED, textAlign: "center", marginTop: 20 }}>
            Écris ton premier message au dermatologue 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderType === side;
          const showSeen = mine && m.id === lastMineId && !!m.readAt;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{
                background: mine ? MINE : THEIRS, color: mine ? "#fff" : INK,
                padding: "9px 12px", borderRadius: 14,
                borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
                fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.imageUrl && <img src={m.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: m.body ? 6 : 0 }} />}
                {m.body}
              </div>
              {showSeen && (
                <p style={{ fontSize: 10, color: MUTED, textAlign: "right", margin: "2px 4px 0" }}>Vu ✓✓</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Saisie */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderTop: `1px solid ${BORDER}`, background: CARD }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { sendImage(e.target.files?.[0]); e.currentTarget.value = ""; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          title="Envoyer une photo"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, flexShrink: 0, opacity: sending ? 0.5 : 1, color: MUTED }}
        >
          📎
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écris un message…"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 9999, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, outline: "none" }}
        />
        <button onClick={send} disabled={sending || !text.trim()}
          style={{ background: MINE, color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontSize: 18, opacity: sending || !text.trim() ? 0.5 : 1, flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}
