import type { Metadata } from 'next';
import Link from 'next/link';
import SubscriptionManager from '@/components/SubscriptionManager';

export const metadata: Metadata = { title: 'Assinatura' };

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
    price: 'R$ 4,90/mês',
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
    price: 'R$ 9,90/mês',
    features: ['Tudo do PRO', 'API Keys', 'Webhooks', 'Knowledge Graph', 'Suporte prioritário'],
    cta: 'Fazer upgrade',
  },
];

export default function SubscriptionPage() {
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
