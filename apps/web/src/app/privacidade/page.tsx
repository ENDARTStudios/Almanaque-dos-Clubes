import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Almanaque dos Clubes',
  description:
    'Política de Privacidade (LGPD) da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function PrivacidadePage() {
  return <LegalDocument kind="privacy" />;
}
