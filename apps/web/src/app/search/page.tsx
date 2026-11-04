import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import GlobalSearch from '@/components/GlobalSearch';
import FichaHead from '@/components/ficha/FichaHead';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsConceitoBusca } from '@/i18n/wsConceitoBusca';

export const metadata: Metadata = {
  title: 'Busca global',
  description: 'Busque clubes e competições em todo o acervo auditável do futebol mundial.',
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoBusca[locale];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* A pagina tinha `metadata.title` e NENHUM h1 visível: para o leitor de tela, não havia
          título de página nenhum. O h1 é estrutura, não decoração. */}
      <FichaHead title={s.title} subtitle={`${s.kicker} · ${s.subtitle}`} />
      <Suspense fallback={<div className="h-14 rounded-[2px] bg-surface-2 animate-pulse" />}>
        <GlobalSearch />
      </Suspense>
    </div>
  );
}
