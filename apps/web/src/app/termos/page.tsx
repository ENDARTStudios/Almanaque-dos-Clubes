import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Termos de Uso e Serviço | Almanaque dos Clubes',
  description:
    'Termos de Uso e Serviço da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function TermosPage() {
  return <LegalDocument kind="terms" />;
}
