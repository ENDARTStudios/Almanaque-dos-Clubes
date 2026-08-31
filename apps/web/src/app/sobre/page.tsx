import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';

export const metadata: Metadata = {
  title: 'Sobre nós | Almanaque dos Clubes',
  description: 'Conheça o Almanaque dos Clubes, plataforma de pesquisa e organização de informações históricas sobre futebol.',
};

export default function SobrePage() {
  return <ContentDocument namespace="sobre" />;
}
