import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  patientId?: number;
  scanId?: number;
  rooms: Set<string>;
}

const clients = new Map<string, ClientConnection>();

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const pathname = request.url || "/";

    if (pathname === "/api/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        onConnection(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  return wss;
}

function onConnection(ws: WebSocket, request: IncomingMessage) {
  const clientId = generateClientId();
  const connection: ClientConnection = {
    ws,
    rooms: new Set(),
  };

  clients.set(clientId, connection);
  console.log(`✓ WebSocket connected: ${clientId}`);

  ws.on("message", (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message, connection);
    } catch (err) {
      console.error(`❌ Invalid message from ${clientId}:`, err);
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
    console.log(`✗ WebSocket disconnected: ${clientId}`);
  });

  ws.on("error", (err) => {
    console.error(`❌ WebSocket error (${clientId}):`, err);
  });
}

interface WsMessage {
  type: "join" | "leave" | "message";
  userId?: string;
  patientId?: number;
  scanId?: number;
  room?: string;
  event?: string;
  data?: any;
}

function handleMessage(
  clientId: string,
  message: WsMessage,
  connection: ClientConnection
) {
  const { type, userId, patientId, scanId, room, event, data } = message;

  if (type === "join") {
    // Client joins specific rooms
    if (userId) connection.userId = userId;
    if (patientId) connection.patientId = patientId;
    if (scanId) connection.scanId = scanId;

    const rooms = [
      userId && `pro-account-${userId}`,
      patientId && `patient-${patientId}`,
      scanId && `scan-analysis-${scanId}`,
    ].filter(Boolean) as string[];

    rooms.forEach((r) => connection.rooms.add(r));
    console.log(`✓ Client ${clientId} joined rooms:`, rooms);
  } else if (type === "leave" && room) {
    connection.rooms.delete(room);
    console.log(`✓ Client ${clientId} left room: ${room}`);
  } else if (type === "message" && event) {
    // Broadcast event to connected clients in same rooms
    broadcastToRooms(connection.rooms, event, data, clientId);
  }
}

function broadcastToRooms(
  rooms: Set<string>,
  event: string,
  data: any,
  excludeClientId?: string
) {
  const message = JSON.stringify({ event, data, timestamp: Date.now() });

  clients.forEach((client, clientId) => {
    // Only send to clients in shared rooms
    const sharedRooms = Array.from(rooms).some((room) =>
      client.rooms.has(room)
    );

    if (sharedRooms && clientId !== excludeClientId) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  });
}

// Server-side: emit events to connected clients
export function emitEvent(
  roomOrUserId: string,
  event: string,
  data: any,
  excludeClientId?: string
) {
  const message = JSON.stringify({ event, data, timestamp: Date.now() });

  clients.forEach((client, clientId) => {
    if (client.rooms.has(roomOrUserId)) {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  });
}

// Emit to specific user (pro-account-{userId})
export function emitToUser(userId: string, event: string, data: any) {
  emitEvent(`pro-account-${userId}`, event, data);
}

// Emit to specific patient room
export function emitToPatient(patientId: number, event: string, data: any) {
  emitEvent(`patient-${patientId}`, event, data);
}

// Emit to specific scan room
export function emitToScan(scanId: number, event: string, data: any) {
  emitEvent(`scan-analysis-${scanId}`, event, data);
}

function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const ws = {
  emitToUser,
  emitToPatient,
  emitToScan,
  emitEvent,
};
