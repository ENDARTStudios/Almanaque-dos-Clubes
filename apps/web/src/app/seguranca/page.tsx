import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Segurança e Vulnerabilidades | Almanaque dos Clubes',
  description:
    'Política de segurança e canal para reporte de vulnerabilidades do Almanaque dos Clubes.',
};

export default function SegurancaPage() {
  if (!legalPagesEnabled()) notFound();
  return <ContentDocument namespace="seguranca" />;
}
