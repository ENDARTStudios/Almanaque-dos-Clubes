import Stripe from 'stripe';

/**
 * Cliente Stripe — inicializado somente quando STRIPE_SECRET_KEY está presente.
 * Assim o servidor sobe mesmo sem pagamento configurado (dev/test).
 */
const secretKey = process.env.STRIPE_SECRET_KEY;

// Incidente 2026-09-20 — keys live em ambiente de dev são revólver carregado:
// cobrança real nunca pode partir de um servidor que não seja produção.
if (secretKey?.startsWith('sk_live_') && process.env.NODE_ENV !== 'production') {
  throw new Error(
    `STRIPE_SECRET_KEY live detectada fora de produção (NODE_ENV=${process.env.NODE_ENV ?? 'indefinido'}). ` +
      'Remova a key live deste ambiente — dev/test usa apenas test mode (D-2026-09-20-checkout-app-url-e-guard-live).',
  );
}

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
export type Currency = 'BRL' | 'USD' | 'EUR';

export function resolvePriceId(plan: PlanKey, interval: IntervalKey, currency?: Currency): string {
  const i = interval === 'year' ? 'YEAR' : 'MONTH';
  // Cobrança por origem: STRIPE_PRICE_<PLAN>_<INTERVAL>_<CURRENCY>
  if (currency) {
    const perCurrency = process.env['STRIPE_PRICE_' + plan + '_' + i + '_' + currency];
    if (perCurrency) return perCurrency;
  }
  const fallback =
    STRIPE_PRICES[
      (plan.toLowerCase() + (interval === 'year' ? 'Year' : 'Month')) as keyof typeof STRIPE_PRICES
    ];
  if (fallback) return fallback;
  throw new Error(
    'Price ID não configurado: ' +
      (currency
        ? 'STRIPE_PRICE_' + plan + '_' + i + '_' + currency
        : 'STRIPE_PRICE_' + plan + '_' + i) +
      '. Crie o preço de recorrência no painel Stripe e defina a env.',
  );
}
