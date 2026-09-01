'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';

const CURRENCY_BY_LOCALE: Record<string, 'BRL' | 'USD' | 'EUR'> = {
  'pt-br': 'BRL',
  'en-us': 'USD',
  'es-es': 'EUR',
};

const LABELS: Record<string, { subscribe: string; monthly: string; yearly: string; pro: string; elite: string; error: string }> = {
  'pt-br': { subscribe: 'Assinar', monthly: 'mensal', yearly: 'anual (15% off)', pro: 'Pro', elite: 'Elite', error: 'Não foi possível iniciar o pagamento.' },
  'en-us': { subscribe: 'Subscribe', monthly: 'monthly', yearly: 'yearly (15% off)', pro: 'Pro', elite: 'Elite', error: 'Could not start checkout.' },
  'es-es': { subscribe: 'Suscribir', monthly: 'mensual', yearly: 'anual (15% dto.)', pro: 'Pro', elite: 'Elite', error: 'No se pudo iniciar el pago.' },
};

export default function CheckoutButton() {
  const { locale } = useI18n();
  const currency = CURRENCY_BY_LOCALE[locale] ?? 'BRL';
  const l = LABELS[locale] ?? LABELS['pt-br'];
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function start(plan: 'PRO' | 'ELITE') {
    setLoading(plan);
    setError('');
    try {
      const res = await api.post<{ data: { url: string } }>('/billing/checkout', { plan, interval, currency });
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
      <div className="flex flex-wrap gap-3">
        <button onClick={() => start('PRO')} disabled={!!loading} className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer">
          {loading === 'PRO' ? '...' : l.subscribe + ' ' + l.pro}
        </button>
        <button onClick={() => start('ELITE')} disabled={!!loading} className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/5 disabled:opacity-50 cursor-pointer">
          {loading === 'ELITE' ? '...' : l.subscribe + ' ' + l.elite}
        </button>
      </div>
      <p className="mt-4 text-xs text-foreground/50">Stripe · {l.monthly} / {l.yearly}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
