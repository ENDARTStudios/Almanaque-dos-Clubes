import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';

/**
 * T-ADMIN — /admin/catalogo: CRUD de MÍDIA do acervo.
 *
 * INTERPRETAÇÃO DECLARADA (não há tabela de mídia no schema): a mídia do acervo
 * vive nos CAMPOS DO CLUBE (`Club`), não numa entidade própria. Inspecionado
 * `apps/api/prisma/schema.prisma` — nenhuma relation "media"/"asset". Então o
 * CRUD opera sobre estes campos de `clubs`:
 *   logoUrl, stadiumImage, teamColors, kitHistory, anthem, pennants, editorialText
 * Não se cria tabela nova sem necessidade (regra da rodada).
 *
 * SEMÂNTICA
 *   - LIST   → clubes do acervo (deletedAt IS NULL) com busca por nome/QID e
 *              paginação; cada item traz `hasMedia`.
 *   - CREATE → grava mídia num clube que AINDA NÃO tem nenhuma; se já tiver,
 *              409 (use PATCH). É "criar o registro de mídia do clube".
 *   - UPDATE → PATCH PARCIAL: só os campos enviados são tocados.
 *   - DELETE → SOFT DELETE do conteúdo de mídia: os campos vão a NULL (somem do
 *              perfil público) e um SNAPSHOT reversível + timestamp fica em
 *              `clubs.metadata.mediaSoftDeletion`. O CLUBE (acervo) NUNCA é
 *              apagado — nem nada é hard-deleted.
 *
 * Toda mutação registra auditoria; o trio de guardas é o mesmo das demais rotas.
 */

const MEDIA_FIELDS = [
  'logoUrl',
  'stadiumImage',
  'teamColors',
  'kitHistory',
  'anthem',
  'pennants',
  'editorialText',
] as const;

type MediaField = (typeof MEDIA_FIELDS)[number];

/** Campos de texto simples vs. campos JSONB (limpeza difere: null vs. DbNull). */
const STRING_FIELDS = new Set<MediaField>(['logoUrl', 'stadiumImage']);

const imageRef = z.string().trim().min(1).max(1000);

const MediaFieldsSchema = {
  logoUrl: imageRef.nullable().optional(),
  stadiumImage: imageRef.nullable().optional(),
  teamColors: z.array(z.string().trim().min(1).max(64)).max(24).nullable().optional(),
  kitHistory: z.array(z.record(z.string(), z.unknown())).max(200).nullable().optional(),
  anthem: z.record(z.string(), z.unknown()).nullable().optional(),
  pennants: z.array(z.record(z.string(), z.unknown())).max(200).nullable().optional(),
  editorialText: z.record(z.string(), z.unknown()).nullable().optional(),
};

const PatchSchema = z.object(MediaFieldsSchema);
const CreateSchema = z
  .object({ clubId: z.string().trim().min(1).max(64), ...MediaFieldsSchema })
  .refine((v) => MEDIA_FIELDS.some((f) => f in v && v[f] !== undefined), {
    message: 'Informe ao menos um campo de mídia.',
  });

function mediaKeysIn(body: Record<string, unknown>): MediaField[] {
  return MEDIA_FIELDS.filter((f) => f in body && body[f] !== undefined);
}

function hasMedia(club: Record<string, unknown>): boolean {
  return MEDIA_FIELDS.some((f) => club[f] !== null && club[f] !== undefined);
}

/** null → limpa o campo (DbNull para JSONB; null para texto). Valor → grava. */
function toStorage(field: MediaField, value: unknown): unknown {
  if (value === null) return STRING_FIELDS.has(field) ? null : Prisma.DbNull;
  return value;
}

function projectMedia(club: Record<string, unknown>) {
  const media: Record<string, unknown> = {};
  for (const f of MEDIA_FIELDS) media[f] = club[f] ?? null;
  return media;
}

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof ZodError)
    return reply.status(422).send({
      error: { code: 'VALIDATION_ERROR', message: 'Payload inválido', details: err.issues },
    });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}

export const catalogRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guard: import('fastify').RouteShorthandOptions = {
    preHandler: [authenticate, requireRole('admin'), requireOperator],
  };

  const MEDIA_SELECT = {
    id: true,
    name: true,
    qid: true,
    updatedAt: true,
    logoUrl: true,
    stadiumImage: true,
    teamColors: true,
    kitHistory: true,
    anthem: true,
    pennants: true,
    editorialText: true,
  } as const;

  // LIST — busca por nome/QID + paginação server-side.
  app.get('/admin/catalogo/media', guard, async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    const limit = Math.min(Math.max(Number.parseInt(q.limit ?? '', 10) || 25, 1), 100);
    const offset = Math.max(Number.parseInt(q.offset ?? '', 10) || 0, 0);
    const search = (q.q ?? '').trim();

    const where: Prisma.ClubWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { qid: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { rows, total } = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const [found, count] = await Promise.all([
        tx.club.findMany({
          where,
          orderBy: { name: 'asc' },
          take: limit,
          skip: offset,
          select: MEDIA_SELECT,
        }),
        tx.club.count({ where }),
      ]);
      return { rows: found, total: count };
    });

    const data = rows.map((club) => ({
      id: club.id,
      name: club.name,
      qid: club.qid,
      updatedAt: club.updatedAt,
      hasMedia: hasMedia(club as unknown as Record<string, unknown>),
      media: projectMedia(club as unknown as Record<string, unknown>),
    }));
    return reply.send({ data, total });
  });

  // CREATE — mídia para um clube que ainda não tem nenhuma.
  app.post('/admin/catalogo/media', guard, async (request, reply) => {
    try {
      const body = CreateSchema.parse(request.body) as Record<string, unknown>;
      const clubId = body.clubId as string;

      const result = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
        const club = await tx.club.findFirst({
          where: { id: clubId, deletedAt: null },
          select: MEDIA_SELECT,
        });
        if (!club) return { notFound: true as const };
        if (hasMedia(club as unknown as Record<string, unknown>))
          return { conflict: true as const };

        const data: Record<string, unknown> = {};
        for (const f of mediaKeysIn(body)) data[f] = toStorage(f, body[f]);

        const updated = await tx.club.update({
          where: { id: clubId },
          data: data as Prisma.ClubUpdateInput,
          select: MEDIA_SELECT,
        });
        return { updated };
      });

      if ('notFound' in result)
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Clube não encontrado' } });
      if ('conflict' in result)
        return reply.status(409).send({
          error: {
            code: 'MEDIA_EXISTS',
            message: 'O clube já tem mídia; use PATCH para editar.',
          },
        });

      await auditLog.record({
        entityType: EntityType.CLUB,
        entityId: clubId,
        action: AuditAction.ENTITY_CREATE,
        userId: request.user!.id,
        metadata: { resource: 'club.media', fields: mediaKeysIn(body) },
      });
      return reply.status(201).send({
        data: {
          id: result.updated.id,
          name: result.updated.name,
          media: projectMedia(result.updated as unknown as Record<string, unknown>),
        },
      });
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // UPDATE — PATCH parcial: só os campos enviados.
  app.patch<{ Params: { clubId: string } }>(
    '/admin/catalogo/media/:clubId',
    guard,
    async (request, reply) => {
      try {
        const body = PatchSchema.parse(request.body) as Record<string, unknown>;
        const fields = mediaKeysIn(body);
        if (fields.length === 0)
          return reply.status(422).send({
            error: { code: 'VALIDATION_ERROR', message: 'Nenhum campo de mídia enviado.' },
          });

        const result = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
          const club = await tx.club.findFirst({
            where: { id: request.params.clubId, deletedAt: null },
            select: MEDIA_SELECT,
          });
          if (!club) return { notFound: true as const };

          const data: Record<string, unknown> = {};
          const changes: Record<string, { old: unknown; new: unknown }> = {};
          for (const f of fields) {
            data[f] = toStorage(f, body[f]);
            changes[f] = {
              old: (club as unknown as Record<string, unknown>)[f] ?? null,
              new: body[f],
            };
          }

          const updated = await tx.club.update({
            where: { id: request.params.clubId },
            data: data as Prisma.ClubUpdateInput,
            select: MEDIA_SELECT,
          });
          return { updated, changes };
        });

        if ('notFound' in result)
          return reply
            .status(404)
            .send({ error: { code: 'NOT_FOUND', message: 'Clube não encontrado' } });

        await auditLog.record({
          entityType: EntityType.CLUB,
          entityId: request.params.clubId,
          action: AuditAction.ENTITY_UPDATE,
          userId: request.user!.id,
          changes: result.changes,
          metadata: { resource: 'club.media' },
        });
        return reply.send({
          data: {
            id: result.updated.id,
            name: result.updated.name,
            media: projectMedia(result.updated as unknown as Record<string, unknown>),
          },
        });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  // DELETE — soft delete do conteúdo de mídia (clube preservado; snapshot reversível).
  app.delete<{ Params: { clubId: string } }>(
    '/admin/catalogo/media/:clubId',
    guard,
    async (request, reply) => {
      const result = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
        const club = await tx.club.findFirst({
          where: { id: request.params.clubId, deletedAt: null },
          select: { ...MEDIA_SELECT, metadata: true },
        });
        if (!club) return { notFound: true as const };

        const row = club as unknown as Record<string, unknown>;
        if (!hasMedia(row)) return { empty: true as const };

        const snapshot = projectMedia(row);
        const baseMeta =
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        const removedAt = new Date();
        const metadata = {
          ...baseMeta,
          mediaSoftDeletion: {
            at: removedAt.toISOString(),
            byAdminId: request.user!.id,
            snapshot,
          },
        };

        const data: Record<string, unknown> = { metadata };
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        for (const f of MEDIA_FIELDS) {
          data[f] = toStorage(f, null);
          changes[f] = { old: row[f] ?? null, new: null };
        }

        await tx.club.update({
          where: { id: request.params.clubId },
          data: data as Prisma.ClubUpdateInput,
        });
        return { snapshot, changes, removedAt };
      });

      if ('notFound' in result)
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Clube não encontrado' } });
      if ('empty' in result)
        return reply.status(409).send({
          error: { code: 'NOTHING_TO_REMOVE', message: 'O clube não tem mídia para remover.' },
        });

      await auditLog.record({
        entityType: EntityType.CLUB,
        entityId: request.params.clubId,
        action: AuditAction.ENTITY_DELETE,
        userId: request.user!.id,
        changes: result.changes,
        metadata: { resource: 'club.media', softDelete: true, at: result.removedAt.toISOString() },
      });
      return reply.send({
        data: {
          id: request.params.clubId,
          removedAt: result.removedAt,
          snapshot: result.snapshot,
        },
      });
    },
  );
};
