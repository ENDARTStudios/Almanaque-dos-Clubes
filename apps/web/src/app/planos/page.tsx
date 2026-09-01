import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ContentDocument from '@/components/ContentDocument';
import CheckoutButton from '@/components/CheckoutButton';
import { mapCountryToCurrency } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Planos | Almanaque dos Clubes',
  description: 'Planos Free, Pro e Elite do Almanaque dos Clubes. Consulte valores, recursos e condições antes de contratar.',
};

export default async function PlanosPage() {
  // Moeda pela localização real (Vercel fornece o país do IP do visitante).
  // O idioma NUNCA determina a moeda; o usuário NUNCA escolhe a moeda.
  const h = await headers();
  const country = h.get('x-vercel-ip-country') ?? null;
  const currency = mapCountryToCurrency(country);

  return (
    <>
      <ContentDocument namespace="planos" currency={currency} />
      <CheckoutButton />
    </>
  );
}
