/**
 * T603 — rotas admin do SISTEMA DE BOTS.
 *
 *   GET  /admin/bots           — cada bot, domínio, cadência, última rodada (status,
 *                                delta, duração) e quando vence.
 *   POST /admin/bots/:key/run  — dispara um bot AGORA (admin + operador).
 *
 * A leitura mostra "rodou" e "rendeu" separados: `delta` é a prova de que o acervo
 * mudou. Bot que roda sem delta aparece como "sem ganho", não como sucesso pleno.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { prisma } from '../../config/prisma.js';
import { BOTS, getBot } from '../bots/registry.js';
import { dueAt, lastRuns } from '../bots/scheduler.js';
import { runBot } from '../bots/runner.js';

export const botsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guard = { preHandler: [authenticate, requireRole('admin'), requireOperator] };

  app.get(
    '/admin/bots',
    {
      ...guard,
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (_request, reply) => {
      const runs = await lastRuns(prisma);
      const byKey = new Map(runs.map((r) => [r.botKey, r]));
      const agora = new Date();
      const data = BOTS.map((bot) => {
        const last = byKey.get(bot.key);
        const due = dueAt(bot, last);
        return {
          key: bot.key,
          domain: bot.domain,
          label: bot.label,
          cadenceHours: bot.cadenceHours,
          writes: bot.writes,
          sources: bot.sources,
          note: bot.note ?? null,
          lastRunAt: last?.finishedAt ? last.finishedAt.toISOString() : null,
          dueAt: due ? due.toISOString() : null,
          isDue: due === null || due.getTime() <= agora.getTime(),
        };
      });
      const ultimas = await prisma.botRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 40,
        select: {
          botKey: true,
          status: true,
          startedAt: true,
          durationMs: true,
          delta: true,
          error: true,
        },
      });
      return reply.send({ data, recentRuns: ultimas });
    },
  );

  app.post<{ Params: { key: string } }>(
    '/admin/bots/:key/run',
    {
      ...guard,
      config: {
        rateLimit: { max: 6, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      const bot = getBot(request.params.key);
      if (!bot) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bot inexistente' } });
      }
      // Disparo manual roda em segundo plano: o script pode levar minutos e a
      // resposta HTTP não deve pendurar. O resultado aparece em `recentRuns`.
      setImmediate(() => {
        void runBot(prisma, bot, { apply: true, triggeredBy: request.user!.id }).catch(() => {
          /* falha já registrada em bot_runs pelo runner */
        });
      });
      return reply
        .status(202)
        .send({ accepted: true, botKey: bot.key, message: 'Rodada em execução' });
    },
  );
};
