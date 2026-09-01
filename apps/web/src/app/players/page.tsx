import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';
import PageHeading from '@/components/PageHeading';
import ComingSoon from '@/components/ComingSoon';

export const metadata: Metadata = { title: 'Jogadores', description: 'Pesquise jogadores de futebol de todos os tempos.' };

export default function PlayersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.players.title" subtitleKey="pages.players.subtitle" />
      <SearchBar placeholderKey="pages.players.placeholder" />
      <ComingSoon />
    </div>
  );
}
