import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CheckoutButton from '@/components/CheckoutButton';
import { mapCountryToCurrency } from '@/lib/pricing';
import CheckoutSummary from '@/components/CheckoutSummary';

// T444/T472a — /checkout: resumo pré-confirmação (CDC/LGPD) i18n pt/en/es +
// disparo do checkout do provedor (redirect — PCI minimizado).
// Flag PAYMENTS_ENABLED off → 404 (pagamentos não existem em produção ainda).

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <CheckoutSummary />
      <CheckoutButton paymentsEnabled currency={currency} />
    </div>
  );
}
