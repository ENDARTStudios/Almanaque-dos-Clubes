/**
 * T444 — Aplicação de eventos de pagamento verificados.
 *
 * Idempotência: `payment_events.providerEventId` UNIQUE — o insert-first
 * garante que o mesmo evento processado 2× gera 1 efeito (o segundo cai no
 * catch de unique violation e retorna { duplicate: true } sem efeito).
 *
 * Máquina de estados: toda transição passa por assertTransition; transição
 * válida é auditada (auditLog); inválida é rejeitada (nunca aplicada).
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { auditLog, EntityType, AuditAction } from '../audit/audit-log.service.js';
import { assertTransition, type SubStatus } from './subscription-state-machine.js';

export interface ApplyEventInput {
  provider: string;
  providerEventId: string;
  type: string; // checkout.succeeded | subscription.canceled | subscription.past_due | subscription.reactivated
  userId: string;
  plan?: 'PRO' | 'ELITE' | 'FREE';
  payload?: unknown;
}

export interface ApplyEventResult {
  duplicate: boolean;
  applied: boolean;
  from?: SubStatus;
  to?: SubStatus;
}

/**
 * T447 — registro idempotente de evento verificado (insert-first).
 * Unique violation em providerEventId → { duplicate: true } sem efeito.
 * Usado por applyPaymentEvent (com transição) e pelo handler Stripe para
 * eventos somente-contabilidade (ex.: charge.refunded).
 */
export async function recordProviderEvent(input: {
  provider: string;
  providerEventId: string;
  type: string;
  payload?: unknown;
}): Promise<{ duplicate: boolean }> {
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' // unique violation em providerEventId
    ) {
      return { duplicate: true };
    }
    throw err;
  }
  return { duplicate: false };
}

export async function applyPaymentEvent(input: ApplyEventInput): Promise<ApplyEventResult> {
  const { duplicate } = await recordProviderEvent({
    provider: input.provider,
    providerEventId: input.providerEventId,
    type: input.type,
    payload: input.payload,
  });
  if (duplicate) {
    return { duplicate: true, applied: false };
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: input.userId } });
  if (!subscription) {
    return { duplicate: false, applied: false };
  }

  const from = subscription.status as SubStatus;

  // Mapeamento evento → estado alvo (validado pela máquina de estados).
  const toByType: Record<string, SubStatus> = {
    'checkout.succeeded': 'ACTIVE',
    'subscription.canceled': 'CANCELLED',
    'subscription.past_due': 'PAST_DUE',
    'subscription.reactivated': 'ACTIVE',
  };
  const to = toByType[input.type];
  if (!to) {
    return { duplicate: false, applied: false };
  }

  try {
    assertTransition(from, to);
  } catch (err) {
    // Transição inválida: registra o evento (auditoria) mas NÃO aplica.
    await auditLog.record({
      entityType: EntityType.USER,
      entityId: input.userId,
      action: AuditAction.SUBSCRIPTION_PLAN_CHANGED,
      userId: input.userId,
      metadata: { transitionRejected: true, from, to: input.type, reason: (err as Error).message },
    });
    return { duplicate: false, applied: false };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: to,
      cancelledAt: to === 'CANCELLED' ? new Date() : null,
      plan: input.plan && input.type === 'checkout.succeeded' ? input.plan : subscription.plan,
    },
  });

  await auditLog.record({
    entityType: EntityType.USER,
    entityId: input.userId,
    action: AuditAction.SUBSCRIPTION_PLAN_CHANGED,
    userId: input.userId,
    metadata: { provider: input.provider, from, to, eventId: input.providerEventId },
  });

  return { duplicate: false, applied: true, from, to };
}
