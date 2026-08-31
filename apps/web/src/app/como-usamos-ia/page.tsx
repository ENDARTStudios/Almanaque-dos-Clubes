import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';

export const metadata: Metadata = {
  title: 'Como usamos IA | Almanaque dos Clubes',
  description: 'Transparência sobre o uso de inteligência artificial no Almanaque dos Clubes.',
};

export default function IaPage() {
  return <ContentDocument namespace="ia" />;
}
