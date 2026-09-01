import Stripe from 'stripe';

/**
 * Cliente Stripe — inicializado somente quando STRIPE_SECRET_KEY está presente.
 * Assim o servidor sobe mesmo sem pagamento configurado (dev/test).
 */
const secretKey = process.env.STRIPE_SECRET_KEY;

let _client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}

export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY não configurada. Configure no .env / Vercel para habilitar cobrança.',
    );
  }
  if (!_client) {
    _client = new Stripe(secretKey, { appInfo: { name: 'Almanaque dos Clubes' } });
  }
  return _client;
}

/** Preços configurados no painel Stripe (price IDs). */
export const STRIPE_PRICES = {
  proMonth: process.env.STRIPE_PRICE_PRO_MONTH ?? '',
  proYear: process.env.STRIPE_PRICE_PRO_YEAR ?? '',
  eliteMonth: process.env.STRIPE_PRICE_ELITE_MONTH ?? '',
  eliteYear: process.env.STRIPE_PRICE_ELITE_YEAR ?? '',
} as const;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export type PlanKey = 'PRO' | 'ELITE';
export type IntervalKey = 'month' | 'year';

export function resolvePriceId(plan: PlanKey, interval: IntervalKey): string {
  const key = plan.toLowerCase() + (interval === 'year' ? 'Year' : 'Month');
  const id = STRIPE_PRICES[key as keyof typeof STRIPE_PRICES];
  if (!id) {
    throw new Error(
      'Price ID não configurado: STRIPE_PRICE_' +
        plan +
        '_' +
        (interval === 'year' ? 'YEAR' : 'MONTH') +
        '. Crie o preço de recorrência no painel Stripe e defina a env.',
    );
  }
  return id;
}
