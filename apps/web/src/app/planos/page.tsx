import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';

export const metadata: Metadata = {
  title: 'Planos | Almanaque dos Clubes',
  description: 'Planos Free, Pro e Elite do Almanaque dos Clubes. Consulte valores, recursos e condições antes de contratar.',
};

export default function PlanosPage() {
  return <ContentDocument namespace="planos" />;
}
