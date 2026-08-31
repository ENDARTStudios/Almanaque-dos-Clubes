import type { Metadata } from 'next';
import ContentDocument from '@/components/ContentDocument';

export const metadata: Metadata = {
  title: 'Política de Cookies | Almanaque dos Clubes',
  description: 'Política de Cookies do Almanaque dos Clubes, operado por END ART Studios.',
};

export default function CookiesPage() {
  return <ContentDocument namespace="cookiePolicy" />;
}
