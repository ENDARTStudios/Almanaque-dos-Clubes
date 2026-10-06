'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';
import { formatPrice, PLAN_CENTS, type BillingCurrency } from '@/lib/pricing';

// A moeda NÃO é determinada aqui. A API deriva a moeda da localização real do
// usuário (país do IP) e NUNCA aceita a moeda vinda do cliente ou do idioma.
// O preço/periodicidade exibidos antes da confirmação espelham a decisão de
// preço do repo (PLAN_CENTS; anual = 12 × mensal com 15% off) — T493 §3.4.
const LABELS: Record<
  string,
  {
    subscribe: string;
    monthly: string;
    yearly: string;
    pro: string;
    elite: string;
    error: string;
    soon: string;
    perMonth: string;
    perYear: string;
    yearlyDetail: string;
    renewal: string;
  }
> = {
  'pt-br': {
    subscribe: 'Assinar', monthly: 'mensal', yearly: 'anual (15% off)', pro: 'Pro', elite: 'Elite',
    error: 'Não foi possível iniciar o pagamento.', soon: 'Pagamentos em breve.',
    perMonth: '/mês', perYear: '/ano', yearlyDetail: '12 × {price} com 15% de desconto',
    renewal: 'Assinatura recorrente: renova automaticamente no fim do período; cancele a qualquer momento no painel. Primeira cobrança na confirmação.',
  },
  'en-us': {
    subscribe: 'Subscribe', monthly: 'monthly', yearly: 'yearly (15% off)', pro: 'Pro', elite: 'Elite',
    error: 'Could not start checkout.', soon: 'Payments coming soon.',
    perMonth: '/month', perYear: '/year', yearlyDetail: '12 × {price} with 15% off',
    renewal: 'Recurring subscription: renews automatically at the end of each period; cancel anytime from the dashboard. First charge upon confirmation.',
  },
  'es-es': {
    subscribe: 'Suscribir', monthly: 'mensual', yearly: 'anual (15% dto.)', pro: 'Pro', elite: 'Elite',
    error: 'No se pudo iniciar el pago.', soon: 'Pagos muy pronto.',
    perMonth: '/mes', perYear: '/año', yearlyDetail: '12 × {price} con 15% de descuento',
    renewal: 'Suscripción recurrente: se renueva automáticamente al final del período; cancela cuando quieras desde el panel. Primer cargo al confirmar.',
  },
};

export default function CheckoutButton({
  paymentsEnabled = true,
  currency = 'BRL',
}: {
  paymentsEnabled?: boolean;
  currency?: BillingCurrency;
} = {}) {
  const { locale } = useI18n();
  const l = LABELS[locale] ?? LABELS['pt-br'];
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function start(plan: 'PRO' | 'ELITE') {
    setLoading(plan);
    setError('');
    try {
      // A moeda é resolvida no servidor pela localização real; não a enviamos.
      const res = await api.post<{ data: { url: string } }>('/billing/checkout', { plan, interval });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : l.error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <p className="text-foreground/70 mb-3">
        {l.monthly} / {l.yearly}
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setInterval('month')}
          className={(interval === 'month' ? 'bg-primary text-on-primary' : 'border border-border text-foreground') + ' px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer'}
        >
          {l.monthly}
        </button>
        <button
          onClick={() => setInterval('year')}
          className={(interval === 'year' ? 'bg-primary text-on-primary' : 'border border-border text-foreground') + ' px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer'}
        >
          {l.yearly}
        </button>
      </div>
      {/* §3.4 — preço total, periodicidade e renovação visíveis ANTES da confirmação */}
      <div className="rounded-xl border border-border p-4 mb-4 text-sm">
        {(['PRO', 'ELITE'] as const).map((plan) => {
          const monthly = PLAN_CENTS[plan];
          const yearly = Math.round(monthly * 12 * 0.85);
          return (
            <div key={plan} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-foreground">{plan === 'PRO' ? l.pro : l.elite}:</span>
              {interval === 'month' ? (
                <span className="text-foreground">
                  {formatPrice(currency, monthly, locale)}
                  {l.perMonth}
                </span>
              ) : (
                <span className="text-foreground">
                  {formatPrice(currency, yearly, locale)}
                  {l.perYear}{' '}
                  <span className="text-foreground/50">
                    ({l.yearlyDetail.replace('{price}', formatPrice(currency, monthly, locale))})
                  </span>
                </span>
              )}
            </div>
          );
        })}
        <p className="mt-2 text-xs text-foreground/60">{l.renewal}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => start('PRO')} disabled={!!loading || !paymentsEnabled} className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
          {loading === 'PRO' ? '...' : l.subscribe + ' ' + l.pro}
        </button>
        <button onClick={() => start('ELITE')} disabled={!!loading || !paymentsEnabled} className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/5 disabled:opacity-50 cursor-pointer">
          {loading === 'ELITE' ? '...' : l.subscribe + ' ' + l.elite}
        </button>
        {!paymentsEnabled && <p className="w-full text-sm text-foreground/50">{l.soon}</p>}
      </div>
      <p className="mt-4 text-xs text-foreground/50">Stripe · {l.monthly} / {l.yearly}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
