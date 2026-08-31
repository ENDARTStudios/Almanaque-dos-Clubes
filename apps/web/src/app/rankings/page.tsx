import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';
import PageHeading from '@/components/PageHeading';
import ComingSoon from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Rankings', description: 'Rankings históricos auditáveis do futebol mundial.' };

export default function RankingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.rankings.title" subtitleKey="pages.rankings.subtitle" />
      <SearchBar placeholderKey="pages.search.placeholder" />
      <ComingSoon />
    </div>
  );
}
