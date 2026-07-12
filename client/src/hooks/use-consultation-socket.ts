import { useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════════════
// Temps réel des consultations : rejoint la room de l'utilisateur et appelle
// onMessage à chaque nouveau message ("consultation:message").
// ════════════════════════════════════════════════════════════════════════

const CONSULT_EVENTS = ["consultation:message", "presence:changed", "consultation:read"];

export function useConsultationSocket(userId: string | null | undefined, onEvent: (event: string, data: any) => void) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    if (!userId) return;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { try { ws?.send(JSON.stringify({ type: "join", userId })); } catch {} };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m?.event && CONSULT_EVENTS.includes(m.event)) cbRef.current(m.event, m.data);
        } catch {}
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, [userId]);
}
