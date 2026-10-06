/**
 * WS-C-15 — presente de aniversário: 1 mês de Elite grátis no dia do aniversário.
 *
 * Regras (anti-fraude):
 *  - 1 concessão por usuário por ano civil (birthdayGiftLastYear na própria
 *    linha do usuário, atualizada condicionalmente — race-safe);
 *  - birthDate fica travado após a 1ª concessão (update com guard);
 *  - usuário Elite PAGO ativo: estende currentPeriodEnd em 30 dias sem tocar
 *    cobrança (nenhum billing criado);
 *  - usuário não-Elite: changePlan('elite') — 30 dias grátis, sem billing;
 *  - falha de email NÃO reverte a concessão (email é best-effort via fila);
 *  - auditoria via audit_logs (ENTITY_UPDATE com kind='birthday_gift').
 *
 * Agendamento: diário 06:00 UTC via fila `gamification` (scheduler próprio),
 * atrás da flag BIRTHDAY_GIFT_ENABLED.
 */
import { prisma } from '../../config/prisma.js';
import { changePlan, getSubscription, PLAN_CYCLE_DAYS } from '../billing/subscription.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { queues } from '../../services/queue.js';
import type { SessionMetadata } from '../auth/session.service.js';

export interface BirthdayGrantResult {
  userId: string;
  action: 'granted' | 'extended';
  expiresAt: Date;
}

/** MM-DD de hoje (UTC) para casar com a coluna birthDate (date). */
function isoMonthDay(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function todayMonthDay(now = new Date()): string {
  return now.toISOString().slice(5, 10);
}

/**
 * Concede o presente para todos os aniversariantes do dia.
 * Idempotente por ano: o guard condicional de birthdayGiftLastYear impede
 * duplicação mesmo em re-run no mesmo dia.
 */
export async function grantBirthdayGifts(
  metadata: SessionMetadata = {},
  now = new Date(),
): Promise<{ granted: number; extended: number; skipped: number }> {
  const year = now.getUTCFullYear();
  const monthDay = todayMonthDay(now);

  const birthdayUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      birthDate: { not: null },
      OR: [{ birthdayGiftLastYear: null }, { birthdayGiftLastYear: { lt: year } }],
    },
    select: { id: true, email: true, name: true, birthDate: true, birthdayGiftLastYear: true },
  });

  const today = birthdayUsers.filter((u) => u.birthDate && isoMonthDay(u.birthDate) === monthDay);

  const results = { granted: 0, extended: 0, skipped: 0 };
  for (const u of today) {
    try {
      const r = await grantToUser(u.id, year, metadata, now);
      results[r.action === 'granted' ? 'granted' : 'extended']++;
    } catch (err) {
      results.skipped++;
      // Log sem email completo (redact) — apenas o id interno.
      console.error(`[Birthday Gift] falha para ${u.id}: ${(err as Error).message.slice(0, 120)}`);
    }
  }
  return results;
}

/**
 * Concessão individual. Guard anti-fraude race-safe: UPDATE condicional por
 * ano — se outro processo já concedeu, afeta 0 linhas e o fluxo aborta.
 */
export async function grantToUser(
  userId: string,
  year: number,
  metadata: SessionMetadata = {},
  now = new Date(),
): Promise<BirthdayGrantResult> {
  const yearGuard = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ birthdayGiftLastYear: null }, { birthdayGiftLastYear: { lt: year } }],
    },
    data: { birthdayGiftLastYear: year },
  });
  if (yearGuard.count === 0) {
    throw new Error(`Presente de aniversário já concedido em ${year} (guard)`);
  }

  const sub = await getSubscription(userId);
  const isPaidElite =
    sub?.plan === 'ELITE' &&
    sub.status === 'ACTIVE' &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd > now;

  let expiresAt: Date;
  if (isPaidElite) {
    // Elite pago: estende o ciclo em 30 dias sem sobrescrever cobrança.
    const base = sub!.currentPeriodEnd as Date;
    expiresAt = new Date(base.getTime() + PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { userId },
      data: { currentPeriodEnd: expiresAt },
    });
  } else {
    // Free/Pro (ou Elite expirado): 30 dias de Elite, sem billing.
    const s = await changePlan(userId, 'ELITE');
    expiresAt =
      (s.currentPeriodEnd as Date) ??
      new Date(now.getTime() + PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000);
  }

  await auditLog.record({
    entityType: EntityType.USER,
    entityId: userId,
    action: AuditAction.ENTITY_UPDATE,
    userId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'birthday_gift',
      year,
      expiresAt: expiresAt.toISOString(),
    },
  });

  await createNotification(userId, 'birthday_gift', {
    expiresAt: expiresAt.toISOString(),
  });

  // Email best-effort: enfileira na fila `email` (worker Resend). Falha de
  // envio NÃO reverte a concessão (retry 3x do worker cobre o transiente).
  await queues.email.add(
    'birthday-gift',
    { type: 'birthday-gift', userId, expiresAt: expiresAt.toISOString() },
    { attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
  );

  return { userId, action: isPaidElite ? 'extended' : 'granted', expiresAt };
}
