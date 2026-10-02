import type { Metadata } from 'next';
import PageHeading from '@/components/PageHeading';
import RankingsTable from '@/components/RankingsTable';

// T438 — página pública dos Rankings 0-100 (tabela + filtros + cursor).
export const metadata: Metadata = {
  title: 'Rankings 0-100 — Almanaque dos Clubes',
  description:
    'Rankings 0-100 por temporada com base auditável em partidas e títulos: posição, pontuação normalizada e proveniência por clube.',
};

export default function RankingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.rankings.title" subtitleKey="pages.rankings.subtitle" />
      <RankingsTable />
    </div>
  );
}
