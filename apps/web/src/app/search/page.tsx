import { Suspense } from 'react';
import type { Metadata } from 'next';
import GlobalSearch from '@/components/GlobalSearch';

export const metadata: Metadata = {
  title: 'Busca global',
  description: 'Busque clubes e competições em todo o acervo auditável do futebol mundial.',
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Suspense fallback={<div className="h-12 rounded-xl bg-foreground/5 animate-pulse" />}>
        <GlobalSearch />
      </Suspense>
    </div>
  );
}
