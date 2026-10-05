/**
 * WS-C-8 — serviço de notificações de usuário.
 *
 * Owner-only por RLS (rls_notifications_setup.sql): o usuário só lê/marca as
 * PRÓPRIAS notificações via `withRlsContext` — deny no banco, não só no código.
 * Criação é SEMPRE `SERVICE` (crons/ETL geram; o usuário não cria).
 *
 * Anti-spam (despacho): máx 1 notificação por tipo por clube por dia — múltiplos
 * títulos do mesmo clube no mesmo dia viram UMA notificação agregada
 * (`payload.titles[]`, `mergeTitleIntoToday` puro para testes).
 */
import { withRlsContext } from '../../config/rls-context.js';
import type { Prisma } from '@prisma/client';

export type NotificationType =
  'new_title' | 'new_competition' | 'ranking_change' | 'proposal_reviewed' | 'system';

export interface TitlePayloadPart {
  competitionId: string | null;
  competitionName: string | null;
  year: number | null;
  hierarchy: string | null;
}

export interface NewTitlePayload {
  clubId: string;
  clubQid: string | null;
  clubName: string;
  titles: TitlePayloadPart[];
}

export interface NotificationView {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  readAt: Date | null;
}

/** Cria notificação (SERVICE — usado por crons/ETL/system). */
export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  return withRlsContext({ role: 'SERVICE' }, async (tx) => {
    const n = await tx.notification.create({
      data: { userId, type, payload: payload as unknown as Prisma.InputJsonObject },
      select: { id: true },
    });
    return { id: n.id };
  });
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export async function listForUser(
  userId: string,
  opts: ListOptions = {},
): Promise<{ notifications: NotificationView[]; total: number; unreadCount: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  return withRlsContext({ userId, role: 'USER' }, async (tx) => {
    const [rows, total, unread] = await Promise.all([
      tx.notification.findMany({
        // userId no where: escopo no código (RLS é defesa em profundidade —
        // o role local de teste é superuser e bypassa FORCE RLS).
        where: {
          userId,
          ...(opts.unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      tx.notification.count({
        where: { userId, ...(opts.unreadOnly ? { read: false } : {}) },
      }),
      tx.notification.count({ where: { userId, read: false } }),
    ]);
    return {
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        payload: (n.payload ?? {}) as Record<string, unknown>,
        read: n.read,
        createdAt: n.createdAt,
        readAt: n.readAt,
      })),
      total,
      unreadCount: unread,
    };
  });
}

export async function countUnread(userId: string): Promise<number> {
  return withRlsContext({ userId, role: 'USER' }, async (tx) =>
    tx.notification.count({ where: { read: false } }),
  );
}

/**
 * Marca UMA notificação como lida. RLS garante owner-only: notificação de
 * outro usuário nem é encontrada (updateMany count 0 → false).
 */
export async function markRead(notificationId: string, userId: string): Promise<boolean> {
  return withRlsContext({ userId, role: 'USER' }, async (tx) => {
    const res = await tx.notification.updateMany({
      where: { id: notificationId, userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return res.count > 0;
  });
}

export async function markAllRead(userId: string): Promise<number> {
  return withRlsContext({ userId, role: 'USER' }, async (tx) => {
    const res = await tx.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return res.count;
  });
}

/** Início do dia UTC (janela da regra anti-spam). */
export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * PURO — mescla um novo título na notificação de hoje (se existir). Retorna
 * `null` quando não há notificação de hoje para o clube (caller cria nova).
 */
export function mergeTitleIntoToday(
  existing: { id: string; payload: Record<string, unknown> } | null,
  title: TitlePayloadPart,
): { id: string; payload: NewTitlePayload } | null {
  if (!existing) return null;
  const payload = existing.payload as unknown as NewTitlePayload;
  const titles = Array.isArray(payload.titles) ? payload.titles : [];
  return {
    id: existing.id,
    payload: { ...payload, titles: [...titles, title] },
  };
}
