import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { triggerFullIngest, triggerSourceIngest, ETL_SOURCES } from './service.js';

export const etlRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/admin/etl/ingest',
    {
      preHandler: [authenticate, requireRole('admin')],
      schema: {
        description: 'Trigger full ETL ingestion from all configured sources',
        tags: ['admin', 'etl'],
        response: {
          202: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              sources: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      await triggerFullIngest();
      return reply
        .status(202)
        .send({ message: 'Full ingestion triggered', sources: [...ETL_SOURCES] });
    },
  );

  app.post(
    '/admin/etl/ingest/:source',
    {
      preHandler: [authenticate, requireRole('admin')],
      schema: {
        description: 'Trigger ETL ingestion from a specific source',
        tags: ['admin', 'etl'],
        params: {
          type: 'object',
          properties: { source: { type: 'string' } },
          required: ['source'],
        },
        response: {
          202: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              source: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { source } = req.params as { source: string };
      if (!ETL_SOURCES.includes(source as never)) {
        return reply
          .code(400)
          .send({ error: `Unknown source: ${source}. Valid: ${ETL_SOURCES.join(', ')}` });
      }
      await triggerSourceIngest(source as (typeof ETL_SOURCES)[number]);
      return reply.status(202).send({ message: `Ingestion triggered for ${source}`, source });
    },
  );

  app.get(
    '/admin/etl/status',
    {
      preHandler: [authenticate, requireRole('admin')],
      schema: {
        description: 'List available ETL sources',
        tags: ['admin', 'etl'],
        response: {
          200: {
            type: 'object',
            properties: {
              sources: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async () => {
      return { sources: [...ETL_SOURCES] };
    },
  );
};
