import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WsMessage {
  event: string;
  data: any;
  timestamp: number;
}

export function useRealtimeScans(patientId?: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    // Connect to WebSocket
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✓ WebSocket connected");
      // Join patient room
      ws.send(
        JSON.stringify({
          type: "join",
          patientId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        console.log(`📨 Event: ${message.event}`, message.data);

        if (message.event === "scan:photo-captured") {
          // Invalidate scans query to refetch latest
          queryClient.invalidateQueries({ queryKey: [`/api/pro/patients/${patientId}`] });
        } else if (message.event === "scan:analysis-complete") {
          queryClient.invalidateQueries({ queryKey: [`/api/pro/patients/${patientId}`] });
        } else if (message.event === "scan:validated") {
          queryClient.invalidateQueries({ queryKey: [`/api/pro/patients/${patientId}`] });
        } else if (message.event === "scan:override-applied") {
          queryClient.invalidateQueries({ queryKey: [`/api/pro/patients/${patientId}`] });
        } else if (message.event === "patient:pending-added") {
          // Nouveau dossier arrive dans la queue : incrémenter le badge
          queryClient.invalidateQueries({ queryKey: ["/api/pro/pending-patients"] });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("✗ WebSocket disconnected");
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "leave",
            room: `patient-${patientId}`,
          })
        );
        wsRef.current.close();
      }
    };
  }, [patientId, queryClient]);

  return wsRef.current;
}

// Notifications temps réel du dermatologue (second avis, etc.) : rejoint la room
// utilisateur et affiche un toast + rafraîchit les listes à la réception.
export function useProNotifications(userId?: string | null) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl); } catch { return; }

    ws.onopen = () => { try { ws.send(JSON.stringify({ type: "join", userId })); } catch {} };
    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        if (message.event === "pro:notification") {
          const n = message.data || {};
          // toast léger (import dynamique pour éviter un cycle de dépendances)
          import("@/hooks/use-toast").then(({ toast }) => {
            toast({ title: n.title || "Nouvelle notification", description: n.body || "" });
          }).catch(() => {});
          queryClient.invalidateQueries({ queryKey: ["/api/pro/peer-reviews"] });
        }
      } catch {}
    };
    ws.onerror = () => {};
    wsRef.current = ws;

    return () => { try { if (ws.readyState === WebSocket.OPEN) ws.close(); } catch {} };
  }, [userId, queryClient]);

  return wsRef.current;
}

export function useRealtimePatient(patientId?: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId) return;

    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          patientId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        if (
          message.event === "patient:status-updated" ||
          message.event === "patient:updated"
        ) {
          // Invalidate patient query
          queryClient.invalidateQueries({ queryKey: [`/api/pro/patients/${patientId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/pro/patients"] });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [patientId, queryClient]);

  return wsRef.current;
}

export function useRealtimeAnalysis(scanId?: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef<((data: any) => void) | null>(null);

  const onAnalysisProgress = useCallback((callback: (data: any) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (!scanId) return;

    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          scanId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        if (
          message.event === "scan:analysis-started" ||
          message.event === "scan:analysis-progress" ||
          message.event === "scan:analysis-complete"
        ) {
          if (callbackRef.current) {
            callbackRef.current(message.data);
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [scanId]);

  return { ws: wsRef.current, onAnalysisProgress };
}
