import type { Metadata } from 'next';
import { legalAlternates } from '@/lib/legal-hreflang';
import LegalDocument from '@/components/LegalDocument';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  alternates: legalAlternates('/termos'),
  title: 'Termos de Uso e Serviço | Almanaque dos Clubes',
  description:
    'Termos de Uso e Serviço da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function TermosPage() {
  if (!legalPagesEnabled()) notFound();
  return <LegalDocument kind="terms" />;
}
