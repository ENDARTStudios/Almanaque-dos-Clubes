import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { uploadFile } from './service.js';
import { UPLOAD_BODY_LIMIT_BYTES } from '../../config/http-hardening.js';

export const uploadRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/upload',
    {
      // 7.7 — override por rota: uploads aceitam até 50 MiB (padrão global: 1 MiB).
      bodyLimit: UPLOAD_BODY_LIMIT_BYTES,
      preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_WRITE)],
    },
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
    {
      // 7.7 — importação CSV também usa o limite de upload (50 MiB por rota).
      bodyLimit: UPLOAD_BODY_LIMIT_BYTES,
      preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_MANAGE)],
    },
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
