import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import PageHeading from '@/components/PageHeading';
import RankingsTable from '@/components/RankingsTable';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';

// T438 — página pública dos Rankings 0-100 (tabela + filtros + cursor).
// T583 — título/descrição por idioma (mesmo cookie das demais telas de servidor).
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].rankings;
  return { title: t.title, description: t.description };
}

export default function RankingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.rankings.title" subtitleKey="pages.rankings.subtitle" />
      <RankingsTable />
    </div>
  );
}
