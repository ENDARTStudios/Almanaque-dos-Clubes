import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import GlobalSearch from '@/components/GlobalSearch';
import FichaHead from '@/components/ficha/FichaHead';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'Busca global',
  description: 'Busque clubes e competições em todo o acervo auditável do futebol mundial.',
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* A pagina tinha `metadata.title` e NENHUM h1 visível: para o leitor de tela, não havia
          título de página nenhum. O h1 é estrutura, não decoração. */}
      <FichaHead title={dict.nav.search} />
      <Suspense fallback={<div className="h-12 rounded-xl bg-foreground/5 animate-pulse" />}>
        <GlobalSearch />
      </Suspense>
    </div>
  );
}
