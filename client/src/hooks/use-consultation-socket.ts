import { useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════════════
// Temps réel des consultations : rejoint la room de l'utilisateur et appelle
// onMessage à chaque nouveau message ("consultation:message").
// ════════════════════════════════════════════════════════════════════════

export function useConsultationSocket(userId: string | null | undefined, onMessage: (data: any) => void) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!userId) return;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    let ws: WebSocket | null = null;
    let closed = false;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { try { ws?.send(JSON.stringify({ type: "join", userId })); } catch {} };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m?.event === "consultation:message" && m.data) cbRef.current(m.data);
        } catch {}
      };
    } catch {}
    return () => { closed = true; try { ws?.close(); } catch {} void closed; };
  }, [userId]);
}
