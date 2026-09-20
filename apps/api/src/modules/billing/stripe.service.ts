import type Stripe from 'stripe';
import { prisma } from '../../config/prisma.js';
import {
  getStripe,
  resolvePriceId,
  STRIPE_WEBHOOK_SECRET,
  type PlanKey,
  type IntervalKey,
  type Currency,
} from '../../config/stripe.js';
import {
  createBilling,
  createFreeSubscription,
  markBillingPaid,
  findBillingByExternalId,
} from './subscription.service.js';
import { applyPaymentEvent, recordProviderEvent } from './payment-events.service.js';

export async function createCheckoutSession(input: {
  userId: string;
  plan: PlanKey;
  interval: IntervalKey;
  currency?: Currency;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
}) {
  const stripe = getStripe();
  const price = resolvePriceId(input.plan, input.interval, input.currency);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    customer_email: input.customerEmail || undefined,
    metadata: {
      userId: input.userId,
      plan: input.plan,
      interval: input.interval,
      currency: input.currency || '',
    },
  });
  return { url: session.url };
}

/**
 * T447 — status de assinatura Stripe → evento interno (vocabulário do
 * applyPaymentEvent). Estados fora do domínio atual (trialing, incomplete,
 * paused) retornam null — registrados, sem efeito.
 */
function stripeSubStatusToEvent(status: string): string | null {
  switch (status) {
    case 'active':
      return 'subscription.reactivated';
    case 'past_due':
    case 'unpaid':
      return 'subscription.past_due';
    case 'canceled':
      return 'subscription.canceled';
    default:
      return null;
  }
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = (session.metadata?.plan as PlanKey | undefined) ?? null;
      if (!userId || !plan) return;

      await createFreeSubscription(userId);
      // T447 — idempotência ANTES do efeito financeiro: replay do mesmo evento
      // sai em duplicate:true sem criar billing duplicada (antes: update direto
      // sem registro — cada replay criava uma billing nova).
      const outcome = await applyPaymentEvent({
        provider: 'stripe',
        providerEventId: event.id,
        type: 'checkout.succeeded',
        userId,
        plan,
        payload: event,
      });
      if (outcome.duplicate || !outcome.applied) return;

      const sub = await prisma.subscription.findUnique({ where: { userId } });
      if (!sub) return;

      const billing = await createBilling({
        userId,
        subscriptionId: sub.id,
        amountCents: session.amount_total ?? 0,
        currency: (session.currency ?? 'brl').toUpperCase(),
        externalId: (session.subscription as string) ?? undefined,
      });
      await markBillingPaid(billing.id);
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const billing = await findBillingByExternalId(subscription.id);
      if (!billing) return;
      const internalType = stripeSubStatusToEvent(subscription.status);
      if (!internalType) {
        await recordProviderEvent({
          provider: 'stripe',
          providerEventId: event.id,
          type: event.type,
          payload: event,
        });
        return;
      }
      const outcome = await applyPaymentEvent({
        provider: 'stripe',
        providerEventId: event.id,
        type: internalType,
        userId: billing.userId,
        payload: event,
      });
      // Sincroniza metadados do ciclo (não é transição de estado).
      const cpe = (subscription as unknown as { current_period_end?: number }).current_period_end;
      if (outcome.applied && cpe) {
        await prisma.subscription.updateMany({
          where: { userId: billing.userId },
          data: { currentPeriodEnd: new Date(cpe * 1000) },
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      // T447 — FASE 3: renovação recusada → PAST_DUE (via máquina de estados).
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription;
      if (!subscriptionId) return; // fatura avulsa sem assinatura: fora do domínio
      const billing = await findBillingByExternalId(subscriptionId);
      if (!billing) return;
      await applyPaymentEvent({
        provider: 'stripe',
        providerEventId: event.id,
        type: 'subscription.past_due',
        userId: billing.userId,
        payload: event,
      });
      break;
    }

    case 'charge.refunded': {
      // T447 — FASE 4: reembolso é contabilidade (billing REFUNDED + PaymentEvent).
      // Sem transição de assinatura: refundBilling mantém acesso até o fim do
      // ciclo pago; withdraw (CDC art. 49) já encerra localmente.
      const charge = event.data.object as Stripe.Charge;
      const subscriptionId = (charge as unknown as { subscription?: string | null }).subscription;
      if (!subscriptionId) return;
      const billing = await findBillingByExternalId(subscriptionId);
      if (billing) {
        await prisma.billing.updateMany({
          where: { id: billing.id, status: 'PAID' },
          data: { status: 'REFUNDED' },
        });
      }
      await recordProviderEvent({
        provider: 'stripe',
        providerEventId: event.id,
        type: event.type,
        payload: event,
      });
      break;
    }

    default: {
      // Eventos não mapeados: registrados para auditoria (sem efeito local).
      await recordProviderEvent({
        provider: 'stripe',
        providerEventId: event.id,
        type: event.type,
        payload: event,
      });
    }
  }
}

/**
 * T451 — resolve o PaymentIntent cobrado de uma assinatura, em cascata:
 * (a) invoice.payment_intent (formato antigo); (b) charges do customer
 * (formato Checkout recente — invoice e PI não se referenciam nessa forma;
 * validado em produção 2026-09-20). Retorna null quando não resolvível —
 * o chamador DEVE falhar alto, nunca marcar REFUNDED local sem efeito externo.
 */
export function resolveRefundablePaymentIntentId(
  paidInvoices: Array<{ id: string; payment_intent?: string | null; customer?: string | null }>,
  customerCharges: Array<{ status: string; refunded: boolean; payment_intent?: string | null }>,
): string | null {
  for (const inv of paidInvoices) {
    if (inv.payment_intent) return inv.payment_intent;
  }
  const charge = customerCharges.find((c) => c.status === 'succeeded' && !c.refunded && c.payment_intent);
  return charge?.payment_intent ?? null;
}

export class RefundNotPossibleError extends Error {
  constructor(stripeSubscriptionId: string) {
    super(
      `Não foi possível resolver o pagamento a estornar da assinatura ${stripeSubscriptionId} no provedor.`,
    );
    this.name = 'RefundNotPossibleError';
  }
}

/**
 * T451 — FAIL-LOUD: cancela a assinatura no provedor, resolve o PI cobrado
 * (cascata acima) e cria o refund. Qualquer falha LANÇA — o estado local
 * só é marcado como REFUNDED pelo route DEPOIS do sucesso aqui.
 */
export async function refundStripeSubscription(
  stripeSubscriptionId: string,
): Promise<{ refundId: string; paymentIntentId: string }> {
  const stripe = getStripe();
  await stripe.subscriptions.cancel(stripeSubscriptionId);

  const invoices = await stripe.invoices.list({ subscription: stripeSubscriptionId, limit: 20 });
  const paidInvoices = invoices.data
    .filter((i) => i.status === 'paid')
    .map((i) => ({
      id: i.id,
      payment_intent: (i as unknown as { payment_intent?: string | null }).payment_intent ?? null,
      customer: typeof i.customer === 'string' ? i.customer : null,
    }));
  const customer = paidInvoices[0]?.customer ?? null;
  const charges = customer
    ? (await stripe.charges.list({ customer, limit: 20 })).data.map((c) => ({
        status: c.status as string,
        refunded: c.refunded,
        payment_intent: (c as unknown as { payment_intent?: string | null }).payment_intent ?? null,
      }))
    : [];

  const pi = resolveRefundablePaymentIntentId(paidInvoices, charges);
  if (!pi) {
    throw new RefundNotPossibleError(stripeSubscriptionId);
  }

  const refund = await stripe.refunds.create({ payment_intent: pi });
  return { refundId: refund.id, paymentIntentId: pi };
}

export { STRIPE_WEBHOOK_SECRET, getStripe };
