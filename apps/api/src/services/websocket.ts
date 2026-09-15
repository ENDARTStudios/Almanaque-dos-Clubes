import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { metrics } from '../modules/observability/metrics.js';

const connections = new Map<string, Set<WebSocket>>();

// T439 — ticket curto single-use para o /ws (60s). Substitui o userId por
// query (aceitava conexão como qualquer usuário — vazamento de canal).
const TICKET_TTL_MS = 60_000;
const tickets = new Map<string, { userId: string; expiresAt: number }>();

export function issueWsTicket(userId: string): string {
  // limpeza oportunista de tickets expirados
  const now = Date.now();
  for (const [t, v] of tickets) if (v.expiresAt < now) tickets.delete(t);
  const ticket = randomBytes(32).toString('hex');
  tickets.set(ticket, { userId, expiresAt: now + TICKET_TTL_MS });
  return ticket;
}

/** Consome o ticket (single-use). Devolve o userId ou null (inválido/expirado). */
export function consumeWsTicket(ticket: string | null): string | null {
  if (!ticket) return null;
  const entry = tickets.get(ticket);
  if (!entry) return null;
  tickets.delete(ticket); // single-use
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}

export function setupWebSocket(app: FastifyInstance): void {
  const wss = new WebSocketServer({ server: app.server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ticket = new URL(req.url || '/', 'http://localhost').searchParams.get('ticket');
    const userId = consumeWsTicket(ticket);
    if (!userId) {
      ws.close(4001, 'ticket inválido ou expirado');
      return;
    }
    metrics.set('ws_connections', undefined, countConnections() + 1);

    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(ws);

    // Heartbeat aplicativo: cliente envia {"type":"ping"} → server ecoa pong.
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string };
        if (msg.type === 'ping' && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        /* mensagens não-JSON são ignoradas */
      }
    });

    ws.on('close', () => {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
      metrics.set('ws_connections', undefined, countConnections());
    });
  });
}

function countConnections(): number {
  let total = 0;
  for (const set of connections.values()) total += set.size;
  return total;
}

export function notifyUser(userId: string, event: string, data: unknown): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  connections.get(userId)?.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.send(message);
  });
}
