import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CheckoutButton from '@/components/CheckoutButton';
// T465 — fonte única dos recursos por plano: a lista abaixo CONSUME
// plan-features.ts (nunca hardcodar — a divergência entre páginas era o bug).
import { PLAN_FEATURES } from '@/lib/plan-features';

// T444 — /checkout: resumo pré-confirmação (CDC/LGPD) + disparo do checkout
// do provedor (redirect — PCI minimizado, sem dados de cartão no domínio).
// Flag PAYMENTS_ENABLED off → 404 (pagamentos não existem em produção ainda).

interface SearchParams {
  plan?: string;
  interval?: string;
}

export const metadata: Metadata = {
  title: 'Checkout — Almanaque dos Clubes',
  robots: { index: false },
};

export default function CheckoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const enabled = process.env.PAYMENTS_ENABLED === 'true';
  if (!enabled) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold mb-2">Checkout</h1>
      <p className="text-foreground/70 mb-6">
        Escolha o plano e a periodicidade. Preço total, moeda e forma de pagamento são exibidos
        antes da confirmação. Assinatura com renovação automática até cancelamento; arrependimento
        em até 7 dias (CDC art. 49).
      </p>
      <div className="rounded-xl border border-border p-6 mb-8 text-sm text-foreground/70">
        <p className="font-semibold text-foreground mb-2">Antes de assinar, você tem:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link href="/planos" className="underline">
              Comparativo completo dos planos
            </Link>{' '}
            com recursos e limites
          </li>
          <li>
            <Link href="/termos" className="underline">
              Termos de Uso
            </Link>{' '}
            vigentes (versão registrada) e{' '}
            <Link href="/privacidade" className="underline">
              Política de Privacidade
            </Link>
          </li>
          <li>Cancelamento da renovação em 1 clique no painel da assinatura</li>
          <li>
            Arrependimento em 7 dias:{' '}
            <a className="underline" href="mailto:endart.studios@gmail.com">
              endart.studios@gmail.com
            </a>
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-border p-6 mb-8 text-sm">
        <p className="font-semibold text-foreground mb-2">Recursos incluídos (por plano)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['PRO', 'ELITE'] as const).map((plan) => (
            <div key={plan}>
              <p className="font-semibold text-primary mb-1">{plan}</p>
              <ul className="list-disc pl-4 text-foreground/70 space-y-0.5">
                {PLAN_FEATURES[plan].map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <CheckoutButton paymentsEnabled />
    </div>
  );
}
