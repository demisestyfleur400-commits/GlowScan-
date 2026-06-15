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
