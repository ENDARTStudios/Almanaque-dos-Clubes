import { WebSocketServer } from 'ws';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

const connections = new Map<string, Set<import('ws').WebSocket>>();

export function setupWebSocket(app: FastifyInstance): void {
  const wss = new WebSocketServer({ server: app.server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const userId = new URL(req.url || '/', 'http://localhost').searchParams.get('userId') || randomUUID();
    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(ws);

    ws.on('close', () => {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
    });
  });
}

export function notifyUser(userId: string, event: string, data: unknown): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  connections.get(userId)?.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.send(message);
  });
}
