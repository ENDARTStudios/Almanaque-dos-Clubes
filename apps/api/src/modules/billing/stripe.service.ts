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

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = (session.metadata?.plan as PlanKey | undefined) ?? null;
      if (!userId || !plan) return;

      await createFreeSubscription(userId);
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
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { plan, status: 'ACTIVE', cancelledAt: null },
      });
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const billing = await findBillingByExternalId(subscription.id);
      if (!billing) return;
      const status =
        subscription.status === 'canceled'
          ? 'CANCELLED'
          : subscription.status === 'active'
            ? 'ACTIVE'
            : 'EXPIRED';
      const cpe = (subscription as unknown as { current_period_end?: number }).current_period_end;
      const periodEnd = cpe ? new Date(cpe * 1000) : null;
      await prisma.subscription.update({
        where: { id: billing.subscriptionId },
        data: {
          status,
          currentPeriodEnd: periodEnd,
          cancelledAt: subscription.status === 'canceled' ? new Date() : null,
        },
      });
      break;
    }

    default:
      break;
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
