import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Almanaque dos Clubes',
  description:
    'Política de Privacidade (LGPD) da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function PrivacidadePage() {
  if (!legalPagesEnabled()) notFound();
  return <LegalDocument kind="privacy" />;
}
