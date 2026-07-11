import { useEffect, useRef, useState } from "react";
import { useConsultationSocket } from "@/hooks/use-consultation-socket";

// ════════════════════════════════════════════════════════════════════════
// Fil de discussion d'une consultation (temps réel). Utilisé côté patient (clair)
// et côté dermatologue (sombre) via le prop `dark`.
// ════════════════════════════════════════════════════════════════════════

interface Msg { id: number; senderType: "patient" | "doctor"; body?: string | null; imageUrl?: string | null; createdAt?: string; }

export function ConsultationChat({ consultationId, myUserId, dark, onBack }: {
  consultationId: number; myUserId: string | null; dark?: boolean; onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [side, setSide] = useState<"patient" | "doctor" | null>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
        setSide(d.side);
        setCtx(d.consultation);
      }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [consultationId]);

  useConsultationSocket(myUserId, (payload) => {
    if (payload.consultationId === consultationId && payload.message) {
      setMessages((prev) => prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]);
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

  const BG = dark ? "#0d0a0e" : "#f6f7fb";
  const CARD = dark ? "rgba(255,255,255,0.04)" : "#fff";
  const INK = dark ? "#f3f0ff" : "#1a1a2e";
  const MUTED = dark ? "rgba(255,255,255,0.45)" : "#9ca3af";
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const MINE = "#7c3aed";
  const THEIRS = dark ? "rgba(255,255,255,0.08)" : "#eef0f6";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: INK, fontSize: 18, cursor: "pointer" }}>←</button>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: 0 }}>Consultation</p>
          <p style={{ fontSize: 11, color: MUTED, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ctx?.condition || "Dermatologie"}
          </p>
        </div>
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
            </div>
          );
        })}
      </div>

      {/* Saisie */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${BORDER}`, background: CARD }}>
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
