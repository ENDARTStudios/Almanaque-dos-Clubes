import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { exportData } from './service.js';

export const exportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/export/:entityType', { preHandler: [authenticate, requirePermission(PERMISSIONS.EXPORT_CSV)] }, async (request, reply) => {
    const { entityType } = request.params as { entityType: string };
    const format = ((request.query as Record<string, string>)?.format ?? 'csv') as 'csv' | 'json';
    const result = await exportData(request.user!.id, { format, entityType: entityType as 'clubs' | 'players' | 'competitions' | 'rankings' });
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
      return reply.send(result.data as string);
    }
    return reply.send(result.data);
  });
};
