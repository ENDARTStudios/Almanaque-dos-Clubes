/**
 * Rotas de Clubes — camada HTTP.
 * Responsável por: parse, validação de schema, tradução de erros de domínio
 * para status HTTP, e serialização da resposta.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { clubsService, CreateClubSchema } from './service.js';
import { DomainError, NotFoundError } from '@almanaque/domain';

export const clubsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /clubs
   * Cria um novo clube.
   */
  app.post('/clubs', async (request, reply) => {
    try {
      const input = CreateClubSchema.parse(request.body);
      const club = await clubsService.create(input);
      return reply.status(201).send({
        data: club,
      });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs
   * Lista clubes com filtros opcionais e paginação.
   */
  app.get('/clubs', async (request, reply) => {
    const query = (request.query as Record<string, string | undefined>) ?? {};
    const limit = Math.min(Math.max(parseInt(query.limit ?? '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(query.offset ?? '0', 10) || 0, 0);

    const result = await clubsService.list({
      country: query.country,
      city: query.city,
      status: query.status,
      search: query.search,
      limit,
      offset,
    });

    return reply.send(result);
  });

  /**
   * GET /clubs/:id
   * Busca um clube por ID.
   */
  app.get<{ Params: { id: string } }>('/clubs/:id', async (request, reply) => {
    try {
      const club = await clubsService.getById(request.params.id);
      if (!club) {
        throw new NotFoundError('Clube', request.params.id);
      }
      return reply.send({ data: club });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });
};

/**
 * Traduz erros de domínio/zod em respostas HTTP coerentes.
 */
function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof DomainError) {
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err instanceof ZodError) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  }

  // Erro inesperado — não vazar stack trace em produção
  request_log_error(err);
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
    },
  });
}

function request_log_error(err: unknown) {
  // Evita acoplamento direto; usa console apenas como fallback de log.
  // Em produção, trocar por pino injetado.

  console.error('[unhandled]', err);
}
