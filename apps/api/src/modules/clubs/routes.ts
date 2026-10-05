/**
 * Rotas de Clubes — camada HTTP.
 * Responsável por: parse, validação de schema, tradução de erros de domínio
 * para status HTTP, e serialização da resposta.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { clubsService, CreateClubSchema } from './service.js';
import { DomainError, NotFoundError } from '@almanaque/domain';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
} from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { geoAttributionForMetadata } from '../../lib/geocoding/geo-attribution.js';
import { getClubProfile } from './profile.service.js';
import { getClubRelated, getClubTimeline } from './insights.service.js';
import { getClubComparison } from './compare.service.js';
import {
  isActiveOwner,
  listOwners,
  ownClub,
  unownClub,
  updateDescription,
  USER_DESCRIPTION_MAX,
} from './club-ownership.service.js';
import { extractMetadata } from '../auth/auth.service.js';
import {
  latestProposalStatus,
  listPendingForReview,
  pendingCount,
  propose,
  review,
} from './proposals.service.js';
import { z } from 'zod';

/** WS-D M1a-3 — adiciona `attribution` (ODbL) de forma aditiva quando a coord vier de OSM/Nominatim. */
function withGeoAttribution<T extends Record<string, unknown>>(entity: T) {
  return { ...entity, attribution: geoAttributionForMetadata(entity.metadata) };
}

export const clubsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /clubs
   * Cria um novo clube. Escrita autenticada (J-16/C-01): o nome persistido
   * alimenta JSON-LD público — criação anônima é vetor de XSS armazenado.
   */
  app.post(
    '/clubs',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CLUBS_WRITE)] },
    async (request, reply) => {
      try {
        const input = CreateClubSchema.parse(request.body);
        const club = await clubsService.create(input);
        return reply.status(201).send({
          data: club,
        });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

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
      hasCoordinates: query.hasCoordinates === 'true',
      continent: query.continent,
      countryId: query.countryId,
      stateId: query.stateId,
      cityId: query.cityId,
      limit,
      offset,
    });

    return reply.send({
      ...result,
      data: result.data.map((club) =>
        withGeoAttribution(club as unknown as Record<string, unknown>),
      ),
    });
  });

  /**
   * GET /clubs/geo-stats — T467, agregação por região (COUNT real derivado do
   * banco) para o choropleth. Declarada ANTES de /clubs/:id (rota estática).
   */
  app.get('/clubs/geo-stats', async (_request, reply) => {
    return reply.send({ data: await clubsService.geoStats() });
  });

  /**
   * GET /clubs/compare?a=<uuid>&b=<uuid> — WS-C-7, comparação lado a lado
   * (read-only). a == b → 400; clube inexistente/inativo → 404. Declarada
   * ANTES de /clubs/:id (rota estática).
   */
  app.get('/clubs/compare', async (request, reply) => {
    try {
      const query = z
        .object({ a: z.string().uuid(), b: z.string().uuid() })
        .safeParse((request.query as Record<string, string | undefined>) ?? {});
      if (!query.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parâmetros a e b são obrigatórios (uuid)',
            details: query.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
        });
      }
      const { a, b } = query.data;
      if (a === b) {
        return reply.status(400).send({
          error: { code: 'SAME_CLUB', message: 'Os dois clubes da comparação são iguais' },
        });
      }
      const data = await getClubComparison(a, b);
      if (!data) {
        throw new NotFoundError('Clube', 'compare');
      }
      return reply.send({ data });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs/:id
   * Busca um clube por ID. WS-C-9: auth OPCIONAL — com sessão, adiciona
   * isOwner (se o usuário é editor do clube); userDescription comunitária
   * (aditiva aos dados oficiais) sempre que existir.
   */
  app.get<{ Params: { id: string } }>(
    '/clubs/:id',
    { preHandler: [optionalAuthenticate] },
    async (request, reply) => {
      try {
        const club = await clubsService.getById(request.params.id);
        if (!club) {
          throw new NotFoundError('Clube', request.params.id);
        }
        const userId = (request.user as { id?: string } | undefined)?.id;
        const isOwner = userId ? await isActiveOwner(userId, request.params.id) : false;
        // WS-C-10: status da última proposta do usuário; pendentes só contam
        // para editors (dados de moderação não vazam para anônimos).
        const proposalStatus = userId
          ? await latestProposalStatus(userId, request.params.id)
          : null;
        const pendingProposalsCount = isOwner ? await pendingCount(request.params.id) : undefined;
        const raw = club as unknown as Record<string, unknown>;
        return reply.send({
          data: {
            ...withGeoAttribution(raw),
            userDescription: raw.userDescription ?? null,
            userDescriptionUpdatedAt: raw.userDescriptionUpdatedAt ?? null,
            isOwner,
            proposalStatus: proposalStatus ?? (userId ? 'none' : undefined),
            pendingProposalsCount,
          },
        });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /clubs/:id/geo — T466, geografia resolvida (país/estado/cidade + coordenadas).
   * Contrato consumido pelo mapa-múndi (T467). Nulos = dado ausente (honesto).
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/geo', async (request, reply) => {
    try {
      const geo = await clubsService.geo(request.params.id);
      if (!geo) {
        throw new NotFoundError('Clube', request.params.id);
      }
      return reply.send({ data: geo });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs/:id/profile — WS-C-1, perfil consolidado read-only (geo+attribution,
   * proveniência, títulos, rankings, competições relacionadas). Vazio-honesto: o que
   * não existe vira null/false e é declarado em `gaps`.
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/profile', async (request, reply) => {
    try {
      const profile = await getClubProfile(request.params.id);
      if (!profile) {
        throw new NotFoundError('Clube', request.params.id);
      }
      return reply.send({ data: profile });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs/:id/titles — T448, galeria de honra (arestas WON do KG).
   * Vazio-honesto: sem conquista auditável → data: [].
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/titles', async (request, reply) => {
    try {
      const club = await clubsService.getById(request.params.id);
      if (!club) {
        throw new NotFoundError('Clube', request.params.id);
      }
      const data = await clubsService.titles(request.params.id);
      return reply.send({ data, total: data.length });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs/:id/timeline — WS-C-5, conquistas ordenadas por ano (ARESTAS WON do
   * KG, proveniência por aresta). Vazio-honesto: sem conquista auditável →
   * timeline: [], totalTitles: 0, byHierarchy zerado.
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/timeline', async (request, reply) => {
    try {
      const data = await getClubTimeline(request.params.id);
      if (!data) {
        throw new NotFoundError('Clube', request.params.id);
      }
      return reply.send({ data });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * GET /clubs/:id/related — WS-C-5, clubes relacionados (same_city/same_state/
   * same_competition; rival SOMENTE com aresta RIVAL explícita no KG — nunca
   * inferido). Teto de 12; exclui o próprio clube e soft-deletados.
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/related', async (request, reply) => {
    try {
      const data = await getClubRelated(request.params.id);
      if (!data) {
        throw new NotFoundError('Clube', request.params.id);
      }
      return reply.send({ data });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // -----------------------------------------------------------------
  // WS-C-9 Modo Clube — ownerships + descrição comunitária.
  // -----------------------------------------------------------------

  /**
   * POST /clubs/:id/own — "sou editor deste clube". Auto-aprovado nesta fase
   * (status 'active' direto). Idempotente: 201 se criou, 200 se já existia.
   */
  app.post<{ Params: { id: string } }>(
    '/clubs/:id/own',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 20, timeWindow: '1 hour', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const result = await ownClub(userId, request.params.id, extractMetadata(request));
        return reply.status(result.created ? 201 : 200).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * DELETE /clubs/:id/own — deixar de ser editor. Idempotente (204 sempre).
   */
  app.delete<{ Params: { id: string } }>(
    '/clubs/:id/own',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        await unownClub(userId, request.params.id, extractMetadata(request));
        return reply.status(204).send();
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /clubs/:id/owners — editores ativos do clube (público; userId nunca
   * exposto — só nome público se disponível, role e desde quando).
   */
  app.get<{ Params: { id: string } }>('/clubs/:id/owners', async (request, reply) => {
    try {
      const owners = await listOwners(request.params.id);
      return reply.send({ data: { owners } });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  /**
   * PATCH /clubs/:id/description — edita a userDescription (comunitária,
   * aditiva aos dados oficiais). Exige ownership ATIVA → 403 sem ela.
   * Texto sanitizado (sem HTML) e limitado a 2000 chars (422 pelo Zod).
   */
  app.patch<{ Params: { id: string } }>(
    '/clubs/:id/description',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const body = z
          .object({ userDescription: z.string().max(USER_DESCRIPTION_MAX) })
          .parse(request.body);
        const result = await updateDescription(
          userId,
          request.params.id,
          body.userDescription,
          extractMetadata(request),
        );
        return reply.status(200).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * POST /clubs/:id/description/proposals — propor edição (WS-C-10).
   * Editor → auto-aprovado (200); não-editor → pending (201); já tem pending → 409.
   */
  app.post<{ Params: { id: string } }>(
    '/clubs/:id/description/proposals',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const body = z
          .object({ userDescription: z.string().min(10).max(USER_DESCRIPTION_MAX) })
          .parse(request.body);
        const result = await propose(
          userId,
          request.params.id,
          body.userDescription,
          extractMetadata(request),
        );
        return reply
          .status(result.status === 'pending' ? 201 : 200)
          .send({ data: { status: result.status } });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * GET /clubs/:id/description/proposals — pendentes do clube (só editors).
   */
  app.get<{ Params: { id: string } }>(
    '/clubs/:id/description/proposals',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const proposals = await listPendingForReview(userId, request.params.id);
        return reply.send({ data: { proposals } });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  /**
   * PATCH /clubs/:id/description/proposals/:propId — aprovar/rejeitar.
   * Editor ativo; auto-revisão bloqueada; aprovar aplica o texto + notifica.
   */
  app.patch<{ Params: { id: string; propId: string } }>(
    '/clubs/:id/description/proposals/:propId',
    {
      preHandler: [authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user!.id;
        const body = z
          .object({
            action: z.enum(['approve', 'reject']),
            reviewNote: z.string().max(500).optional(),
          })
          .parse(request.body);
        const result = await review(
          userId,
          request.params.id,
          request.params.propId,
          body.action,
          body.reviewNote ?? null,
          extractMetadata(request),
        );
        return reply.status(200).send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
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
