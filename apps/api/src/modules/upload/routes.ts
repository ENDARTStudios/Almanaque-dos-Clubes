import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { uploadFile } from './service.js';

export const uploadRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/upload',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_WRITE)] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply
          .status(400)
          .send({ error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado' } });
      }
      const buffer = await data.toBuffer();
      const result = await uploadFile(buffer, data.mimetype, data.filename);
      return reply.status(201).send({ data: result });
    },
  );

  app.post(
    '/upload/csv',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_MANAGE)] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply
          .status(400)
          .send({ error: { code: 'NO_FILE', message: 'Nenhum arquivo CSV enviado' } });
      }
      if (data.mimetype !== 'text/csv' && !data.filename.endsWith('.csv')) {
        return reply
          .status(422)
          .send({ error: { code: 'INVALID_FORMAT', message: 'Apenas arquivos CSV são aceitos' } });
      }
      const buffer = await data.toBuffer();
      const result = await uploadFile(buffer, 'text/csv', data.filename, 'imports');
      return reply.status(201).send({ data: result });
    },
  );
};
