import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import SubscriptionManager from '@/components/SubscriptionManager';
import { mapCountryToCurrency, formatPrice, PLAN_CENTS } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Assinatura' };

export default async function SubscriptionPage() {
  // Moeda pela localização real (país do IP via Vercel) — nunca por idioma/escolha.
  const h = await headers();
  const currency = mapCountryToCurrency(h.get('x-vercel-ip-country') ?? null);

  const plans = [
    {
      name: 'FREE',
      price: 'Grátis',
      features: ['Clubes: leitura', 'Competições: leitura', 'Rankings: leitura'],
      cta: 'Seu plano atual',
      active: true,
    },
    {
      name: 'PRO',
      price: formatPrice(currency, PLAN_CENTS.PRO, 'pt-br') + '/mês',
      features: [
        'Clubes: leitura + escrita',
        'Jogadores: leitura + escrita',
        'Exportação CSV',
        'Busca avançada',
      ],
      cta: 'Fazer upgrade',
    },
    {
      name: 'ELITE',
      price: formatPrice(currency, PLAN_CENTS.ELITE, 'pt-br') + '/mês',
      features: ['Tudo do PRO', 'API Keys', 'Webhooks', 'Knowledge Graph', 'Suporte prioritário'],
      cta: 'Fazer upgrade',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; Voltar ao Painel
      </Link>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Planos</h1>
      <p className="text-foreground/60 mb-8">Escolha o plano ideal para você.</p>
      <SubscriptionManager />
      <div className="grid sm:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl p-6 shadow-md border ${plan.active ? 'border-primary ring-2 ring-primary/20' : 'border-border/50'} bg-white`}
          >
            <h2 className="text-xl font-heading font-bold text-foreground">{plan.name}</h2>
            <p className="text-2xl font-heading font-bold text-primary mt-2">{plan.price}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-foreground/70 flex items-center gap-2">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              className="mt-6 w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer"
              aria-label={plan.cta}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
