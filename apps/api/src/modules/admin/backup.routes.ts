import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../config/prisma.js';
import { metrics } from '../observability/metrics.js';

/**
 * T443 — Backup lógico diário (JSON auditável) acionado pelo workflow
 * `backup.yml` via segredo compartilhado (`x-backup-secret`).
 *
 * Conteúdo (minimização 1.3): tabelas de conteúdo + users SEM passwordHash;
 * sessions excluídas (tokens). Restore: scripts/restore-json-backup.ts.
 */
export const backupRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post('/admin/backup', async (request, reply) => {
    const secret = process.env.BACKUP_SECRET;
    const provided = request.headers['x-backup-secret'];
    if (!secret || provided !== secret) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Segredo inválido' } });
    }

    const [clubs, players, competitions, seasons, rankings, rankingEntries, favorites, users] =
      await Promise.all([
        prisma.club.findMany(),
        prisma.player.findMany(),
        prisma.competition.findMany(),
        prisma.season.findMany(),
        prisma.ranking.findMany(),
        prisma.rankingEntry.findMany(),
        prisma.favorite.findMany(),
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

    metrics.set('backup_last_success_timestamp', undefined, Math.floor(Date.now() / 1000));

    return reply.send({
      generatedAt: new Date().toISOString(),
      tables: { clubs, players, competitions, seasons, rankings, rankingEntries, favorites, users },
    });
  });
};
