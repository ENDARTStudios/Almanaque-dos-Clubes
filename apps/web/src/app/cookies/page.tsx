import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Política de Cookies | Almanaque dos Clubes',
  description: 'Política de Cookies do Almanaque dos Clubes, operado por END ART Studios.',
};

export default function CookiesPage() {
  if (!legalPagesEnabled()) notFound();
  return <ContentDocument namespace="cookiePolicy" />;
}
