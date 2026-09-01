import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';

export const metadata: Metadata = {
  title: 'Termos de Assinatura — Pro e Elite | Almanaque dos Clubes',
  description: 'Contrato de assinatura dos planos Pro e Elite do Almanaque dos Clubes.',
};

export default function TermosAssinaturaPage() {
  return <ContentDocument namespace="termosAssinatura" />;
}
