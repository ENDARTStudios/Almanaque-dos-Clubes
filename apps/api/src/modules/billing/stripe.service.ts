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
 * Cancela a assinatura no Stripe e estorna o pagamento da fatura mais recente
 * (best-effort — se falhar, o estado local já foi tratado pelo route).
 */
export async function refundStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(stripeSubscriptionId);
    const invoices = await stripe.invoices.list({ subscription: stripeSubscriptionId, limit: 1 });
    const invoice = invoices.data[0];
    const pi = (invoice as unknown as { payment_intent?: string | null })?.payment_intent;
    if (invoice && pi) {
      await stripe.refunds.create({ payment_intent: pi });
    }
  } catch {
    // best-effort — reembolso físico pode ser concluído via webhook/manual
  }
}

export { STRIPE_WEBHOOK_SECRET, getStripe };
