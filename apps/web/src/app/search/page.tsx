import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';
import PageHeading from '@/components/PageHeading';
import { SearchResults } from '@/components/SearchResults';

export const metadata: Metadata = { title: 'Busca Avançada', description: 'Busca avançada em todo o acervo do futebol mundial.' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.search.title" subtitleKey="pages.search.subtitle" />
      <SearchBar placeholderKey="pages.search.placeholder" />
      {q && <SearchResults query={q} />}
    </div>
  );
}
