import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../modules/auth/authenticate.middleware.js';
import { issueWsTicket } from '../services/websocket.js';

/**
 * T439 — POST /api/v1/ws/ticket → ticket WS curto (60s, single-use).
 * O cookie httpOnly autentica; o ticket é a única credencial do upgrade do
 * WebSocket (nada de token/token longo em query string ou log).
 */
export const wsTicketRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/ws/ticket', { preHandler: [authenticate] }, async (request, reply) => {
    const ticket = issueWsTicket(request.user!.id);
    return reply.send({ data: { ticket } });
  });
};
