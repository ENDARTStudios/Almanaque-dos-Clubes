/**
 * Subscription service — gerência de assinaturas SaaS e billing.
 *
 * Modelos:
 * - Subscription: um usuário tem EXATAMENTE UMA assinatura (userId @unique)
 *   - plan: FREE | PRO | ELITE
 *   - status: ACTIVE | INACTIVE | CANCELLED | EXPIRED | PENDING
 * - Billing: histórico de transações financeiras
 *   - amountCents: valor em centavos (evita float)
 *   - currency: BRL (default) / USD / EUR (ISO 4217)
 *   - status: PENDING | PAID | REFUNDED | FAILED | CANCELLED
 *   - externalId: ID no provedor (Stripe, PagSeguro, etc.) — null se manual
 *
 * Preços (em centavos de BRL; o valor cobrado vem do Stripe por moeda/origem):
 * - FREE: 0 (gratuito)
 * - PRO: 490 (= R$ 4,90/mês; 15% off na anuidade)
 * - ELITE: 990 (= R$ 9,90/mês; 15% off na anuidade)
 *
 * Ciclo: mensal. currentPeriodEnd = data de fim do ciclo atual.
 */
import { prisma } from '../../config/prisma.js';

// Tipos unificados — funcionam tanto para PostgreSQL (enums) quanto SQLite (strings)
type SubscriptionPlan = 'FREE' | 'PRO' | 'ELITE';
type BillingStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' | 'CANCELLED';

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startedAt: Date;
  cancelledAt: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Billing {
  id: string;
  subscriptionId: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONSTANTES — Preços por plano (em centavos de BRL)
// =============================================================================

export const PLAN_PRICES_CENTS: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 490, // R$ 4,90 (Stripe para refletir valor real; 15% off anual)
  ELITE: 990, // R$ 9,90 (Stripe para refletir valor real; 15% off anual)
};

export const PLAN_CYCLE_DAYS = 30; // mensal

// Anuidade com 15% de desconto (aplicado via preço anual no Stripe)
export const PLAN_ANNUAL_DISCOUNT_PCT = 15;

/**
 * Hierarquia de planos: FREE < PRO < ELITE.
 */
const PLAN_HIERARCHY: SubscriptionPlan[] = ['FREE', 'PRO', 'ELITE'];

/**
 * Helper para validar string como SubscriptionPlan.
 */
export function isValidPlan(plan: string): plan is SubscriptionPlan {
  return plan in PLAN_PRICES_CENTS;
}

// =============================================================================
// SUBSCRIPTION — CRUD e mudanças de plano
// =============================================================================

/**
 * Cria uma assinatura FREE inicial para um novo usuário.
 * Idempotente: se já existe, retorna a existente.
 *
 * Chamado automaticamente no fluxo de register (Tarefa 3.2).
 */
export async function createFreeSubscription(userId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing as unknown as Subscription;

  const created = await prisma.subscription.create({
    data: {
      userId,
      plan: 'FREE',
      status: 'ACTIVE',
      startedAt: new Date(),
      currentPeriodEnd: null,
    },
  });
  return created as unknown as Subscription;
}

/**
 * Retorna a assinatura de um usuário.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const result = await prisma.subscription.findUnique({ where: { userId } });
  return result as unknown as Subscription | null;
}

/**
 * Troca o plano de um usuário (upgrade ou downgrade).
 *
 * - Pro → Elite: upgrade
 * - Elite → Pro: downgrade
 * - Qualquer → Free: cancelamento efetivo
 *
 * Atualiza:
 * - plan: novo plano
 * - status: ACTIVE
 * - currentPeriodEnd: +30 dias a partir de agora (próxima cobrança)
 *
 * Não cria Billing automaticamente — isso é responsabilidade do webhook
 * do provedor de pagamento (Fase 4.6).
 */
export async function changePlan(userId: string, newPlan: SubscriptionPlan): Promise<Subscription> {
  if (!isValidPlan(newPlan)) {
    throw new Error(`Plano inválido: ${newPlan}`);
  }

  const now = new Date();
  const currentPeriodEnd =
    newPlan === 'FREE' ? null : new Date(now.getTime() + PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: newPlan,
      status: 'ACTIVE',
      currentPeriodEnd,
      cancelledAt: null,
    },
    create: {
      userId,
      plan: newPlan,
      status: 'ACTIVE',
      startedAt: now,
      currentPeriodEnd,
    },
  });
  return result as unknown as Subscription;
}

/**
 * Cancela a assinatura de um usuário.
 *
 * - status → CANCELLED
 * - cancelledAt → now
 * - Mantém plan e currentPeriodEnd (usuário continua com acesso até o fim do ciclo)
 *
 * Após currentPeriodEnd, job agendado deve mudar status → EXPIRED e plan → FREE
 * (Tarefa 9.x).
 */
export async function cancelSubscription(userId: string): Promise<Subscription | null> {
  const result = await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
  return result as unknown as Subscription;
}

/**
 * Verifica se a assinatura do usuário está ativa e dentro do período.
 * Útil para middleware de feature gating (ex.: "apenas PRO+ pode exportar").
 */
export async function isActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  if (sub.status !== 'ACTIVE') return false;
  if (sub.plan === 'FREE') return true;
  if (!sub.currentPeriodEnd) return false;
  return sub.currentPeriodEnd > new Date();
}

/**
 * Verifica se o usuário tem um plano mínimo.
 *
 * @example
 *   // Verifica se é PRO ou superior (PRO, ELITE)
 *   if (!(await hasMinimumPlan(user.id, 'PRO'))) {
 *     throw new ForbiddenError('Recurso disponível apenas para PRO+');
 *   }
 *
 * Hierarquia: FREE < PRO < ELITE
 */
export async function hasMinimumPlan(userId: string, minPlan: SubscriptionPlan): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== 'ACTIVE') return false;

  const userPlanIdx = PLAN_HIERARCHY.indexOf(sub.plan as SubscriptionPlan);
  const minPlanIdx = PLAN_HIERARCHY.indexOf(minPlan);
  return userPlanIdx >= minPlanIdx;
}

// =============================================================================
// BILLING — Registro de transações
// =============================================================================

/**
 * Cria um registro de billing (transação financeira).
 *
 * Status inicial: PENDING. Após webhook de pagamento confirmado:
 *   - muda para PAID via markBillingPaid()
 *   - atualiza subscription.currentPeriodEnd
 */
export async function createBilling(input: {
  userId: string;
  subscriptionId: string;
  amountCents: number;
  currency?: string;
  externalId?: string;
}): Promise<Billing> {
  if (input.amountCents < 0) {
    throw new Error('amountCents não pode ser negativo');
  }
  const result = await prisma.billing.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      amountCents: input.amountCents,
      currency: input.currency ?? 'BRL',
      status: 'PENDING',
      externalId: input.externalId ?? null,
    },
  });
  return result as unknown as Billing;
}

/**
 * Marca uma cobrança como paga.
 *
 * Atualiza:
 * - billing.status → PAID
 * - billing.paidAt → now
 * - subscription.currentPeriodEnd → +30 dias (renovação)
 *
 * Usa transação para garantir atomicidade (billing + subscription renovação).
 *
 * Chamado pelo webhook do provedor (Fase 4.6) quando pagamento é confirmado.
 */
export async function markBillingPaid(billingId: string): Promise<Billing | null> {
  const now = new Date();

  const billing = await prisma.$transaction(async (tx) => {
    const updated = await tx.billing.update({
      where: { id: billingId },
      data: {
        status: 'PAID',
        paidAt: now,
      },
    });

    const newPeriodEnd = new Date(now.getTime() + PLAN_CYCLE_DAYS * 24 * 60 * 60 * 1000);
    await tx.subscription.update({
      where: { id: updated.subscriptionId },
      data: {
        currentPeriodEnd: newPeriodEnd,
        status: 'ACTIVE',
        cancelledAt: null,
      },
    });

    return updated;
  });

  return billing as unknown as Billing;
}

/**
 * Marca uma cobrança como reembolsada.
 * NÃO reverte currentPeriodEnd (usuário mantém acesso até fim do ciclo já pago).
 */
export async function refundBilling(billingId: string): Promise<Billing | null> {
  const result = await prisma.billing.update({
    where: { id: billingId },
    data: { status: 'REFUNDED' },
  });
  return result as unknown as Billing;
}

/**
 * Marca uma cobrança como falha (pagamento recusado pelo provedor).
 */
export async function failBilling(billingId: string): Promise<Billing | null> {
  const result = await prisma.billing.update({
    where: { id: billingId },
    data: { status: 'FAILED' },
  });
  return result as unknown as Billing;
}

/**
 * Lista o histórico de cobranças de um usuário.
 * Paginação offset (Tarefa 4.9 — migração para cursor-based no futuro).
 */
export async function listUserBillings(
  userId: string,
  options: { status?: BillingStatus; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options;
  const result = await prisma.billing.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    skip: offset,
  });
  return result as unknown as Billing[];
}

/**
 * Busca uma cobrança por externalId (ID no provedor).
 * Usado pelo webhook para idempotência: se já processamos essa cobrança, ignorar.
 */
export async function findBillingByExternalId(externalId: string): Promise<Billing | null> {
  const result = await prisma.billing.findFirst({ where: { externalId } });
  return result as unknown as Billing | null;
}
