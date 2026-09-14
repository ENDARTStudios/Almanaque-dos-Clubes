import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ContentDocument from '@/components/ContentDocument';
import { mapCountryToCurrency } from '@/lib/pricing';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Termos de Assinatura — Pro e Elite | Almanaque dos Clubes',
  description: 'Contrato de assinatura dos planos Pro e Elite do Almanaque dos Clubes.',
};

export default async function TermosAssinaturaPage() {
  // Moeda pela localização real (país do IP via Vercel) — nunca por idioma/escolha.
  const h = await headers();
  if (!legalPagesEnabled()) notFound();
  const country = h.get('x-vercel-ip-country') ?? null;
  const currency = mapCountryToCurrency(country);

  return <ContentDocument namespace="termosAssinatura" currency={currency} />;
}
