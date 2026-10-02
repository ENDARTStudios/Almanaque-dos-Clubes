/**
 * WS-C-8 — geração de notificações `new_title` (hook do data-refresh).
 *
 * Após cada run do pipeline, arestas WON criadas desde o início do run são
 * transformadas em notificações para os usuários que favoritaram o clube.
 * Anti-spam (despacho): máx 1 notificação `new_title` por clube por usuário
 * por dia — títulos adicionais do mesmo clube no mesmo dia viram agregado
 * (`payload.titles[]`).
 *
 * Tudo em contexto SERVICE (criação é do sistema); leitura de favoritos idem.
 * Falha de notificação NUNCA falha o job de ETL (log + contador, sem throw).
 */
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { withRlsContext } from '../../config/rls-context.js';
import { logger } from '../../config/logger.js';
import {
  mergeTitleIntoToday,
  startOfUtcDay,
  type NewTitlePayload,
  type TitlePayloadPart,
} from './notification.service.js';

export interface NewTitleEvent {
  clubId: string;
  title: TitlePayloadPart;
}

export interface GenerationOutcome {
  events: number;
  notificationsCreated: number;
  notificationsMerged: number;
  usersNotified: number;
  skippedNoFavorites: number;
}

/**
 * PURO — converte arestas WON (já filtradas por createdAt > since) em eventos
 * por clube. `edgeSourceId` é o clube (sourceType='Club'); a competição é o
 * target; metadados da aresta trazem year/hierarchy.
 */
export function buildTitleEvents(
  edges: Array<{
    sourceId: string;
    targetId: string;
    metadata: unknown;
  }>,
  competitionsById: Map<string, { name: string | null; qid: string | null }>,
): NewTitleEvent[] {
  // Um evento POR aresta: a agregação anti-spam (máx 1/clube/usuário/dia) é
  // feita pelo generateTitleNotifications via mergeTitleIntoToday.
  return edges.flatMap((e) => {
    const comp = competitionsById.get(e.targetId);
    const meta = (e.metadata as Record<string, unknown> | null) ?? {};
    const title: TitlePayloadPart = {
      competitionId: e.targetId,
      competitionName: comp?.name ?? null,
      year: typeof meta.year === 'number' ? meta.year : null,
      hierarchy: typeof meta.hierarchy === 'string' ? meta.hierarchy : null,
    };
    return [{ clubId: e.sourceId, title }];
  });
}

/**
 * Gera notificações new_title para os eventos. Um evento por clube; se o
 * usuário já tiver notificação do clube HOJE, agrega (mergeTitleIntoToday).
 */
export async function generateTitleNotifications(
  events: NewTitleEvent[],
): Promise<GenerationOutcome> {
  const outcome: GenerationOutcome = {
    events: events.length,
    notificationsCreated: 0,
    notificationsMerged: 0,
    usersNotified: 0,
    skippedNoFavorites: 0,
  };
  if (events.length === 0) return outcome;

  const dayStart = startOfUtcDay();

  return withRlsContext({ role: 'SERVICE' }, async (tx) => {
    const clubIds = [...new Set(events.map((e) => e.clubId))];
    const clubs = await tx.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, qid: true, name: true },
    });
    const clubById = new Map(clubs.map((c) => [c.id, c]));

    for (const event of events) {
      const club = clubById.get(event.clubId);
      if (!club) continue;
      const favorites = await tx.favorite.findMany({
        where: { clubId: event.clubId, deletedAt: null },
        select: { userId: true },
      });
      if (favorites.length === 0) {
        outcome.skippedNoFavorites += 1;
        continue;
      }

      for (const { userId } of favorites) {
        // notificação de hoje deste usuário para este clube (anti-spam diário)
        const todayRows = await tx.notification.findMany({
          where: { userId, type: 'new_title', createdAt: { gte: dayStart } },
          select: { id: true, payload: true },
        });
        const todayForClub = todayRows.find(
          (n) => (n.payload as Record<string, unknown>)?.clubId === event.clubId,
        );

        if (todayForClub) {
          const merged = mergeTitleIntoToday(
            { id: todayForClub.id, payload: todayForClub.payload as Record<string, unknown> },
            event.title,
          );
          if (merged) {
            await tx.notification.update({
              where: { id: merged.id },
              data: {
                payload: merged.payload as unknown as Prisma.InputJsonObject,
                read: false,
                readAt: null,
              },
            });
            outcome.notificationsMerged += 1;
            outcome.usersNotified += 1;
          }
          continue;
        }

        const payload: NewTitlePayload = {
          clubId: club.id,
          clubQid: club.qid,
          clubName: club.name,
          titles: [event.title],
        };
        await tx.notification.create({
          data: {
            userId,
            type: 'new_title',
            payload: payload as unknown as Prisma.InputJsonObject,
          },
        });
        outcome.notificationsCreated += 1;
        outcome.usersNotified += 1;
      }
    }

    logger.info({ ...outcome }, 'notifications: new_title gerado');
    return outcome;
  });
}

/**
 * Hook do data-refresh: arestas WON criadas desde `since` → eventos → notificações.
 * NUNCA lança: falha de notificação não pode derrubar o job de ETL (log + retorno).
 */
export async function notifyNewTitlesSince(since: Date): Promise<GenerationOutcome | null> {
  try {
    const edges = await prisma.knowledgeGraph.findMany({
      where: { relation: 'WON', sourceType: 'Club', createdAt: { gt: since } },
      select: { sourceId: true, targetId: true, metadata: true },
      take: 200,
    });
    if (edges.length === 0) return null;
    const compIds = [...new Set(edges.map((e) => e.targetId))];
    const comps = await prisma.competition.findMany({
      where: { id: { in: compIds }, deletedAt: null },
      select: { id: true, name: true, qid: true },
    });
    const compsById = new Map(comps.map((c) => [c.id, c]));
    const events = buildTitleEvents(edges, compsById);
    return await generateTitleNotifications(events);
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'notifications: falha ao gerar new_title (job de ETL não é afetado)',
    );
    return null;
  }
}
