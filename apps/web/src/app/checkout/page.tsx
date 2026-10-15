import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CheckoutButton from '@/components/CheckoutButton';
import { mapCountryToCurrency, nextChargeDate } from '@/lib/pricing';
import CheckoutSummary from '@/components/CheckoutSummary';

// T444/T472a — /checkout: resumo pré-confirmação (CDC/LGPD) i18n pt/en/es +
// disparo do checkout do provedor (redirect — PCI minimizado).
// Flag PAYMENTS_ENABLED off → 404 (pagamentos não existem em produção ainda).
//
// T555 — as datas da cobrança seguinte são calculadas AQUI (servidor) e descem prontas:
// o resumo continua um componente de cliente puro, sem relógio e sem risco de o HTML
// do servidor divergir do hidratado.

export const metadata: Metadata = {
  title: 'Checkout — Almanaque dos Clubes',
  robots: { index: false },
};

export default async function CheckoutPage() {
  if (process.env.PAYMENTS_ENABLED !== 'true') notFound();

  // Moeda pela localização real (Vercel fornece o país do IP) — mesma regra do
  // /planos; o idioma NUNCA determina a moeda (T493 §3.4).
  const h = await headers();
  const currency = mapCountryToCurrency(h.get('x-vercel-ip-country'));

  // A primeira cobrança ocorre na confirmação; a SEGUINTE é +30 (mensal) ou +365 (anual),
  // conforme os Termos prometem exibir antes do redirect (seção 5).
  const agora = new Date();
  const proximaMensalIso = nextChargeDate(agora, 'month').toISOString();
  const proximaAnualIso = nextChargeDate(agora, 'year').toISOString();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <CheckoutSummary
        currency={currency}
        nextChargeMonthlyIso={proximaMensalIso}
        nextChargeYearlyIso={proximaAnualIso}
      />
      {/* showPriceTable=false: o resumo acima já traz preço, periodicidade, desconto e
          renovação — repetir aqui duplicaria o mesmo bloco na mesma tela. */}
      <CheckoutButton paymentsEnabled currency={currency} showPriceTable={false} />
    </div>
  );
}
