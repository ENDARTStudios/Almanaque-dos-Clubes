import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeading from '@/components/PageHeading';
import { getApiBase } from '@/lib/api-base';

export const metadata: Metadata = {
  title: 'Jogadores',
  description: 'Jogadores de futebol de todos os tempos, com posição, país e proveniência.',
};

interface PlayerRow {
  id: string;
  fullName: string;
  country?: string | null;
  position?: string | null;
}

async function getPlayers() {
  try {
    const res = await fetch(getApiBase() + '/players?limit=60', { cache: 'no-store' });
    if (!res.ok) return { data: [], total: 0 };
    return await res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

export default async function PlayersPage() {
  const { data: players, total } = await getPlayers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.players.title" subtitleKey="pages.players.subtitle" />
      <p className="text-sm text-foreground/50 mt-2 mb-6">Jogadores diferentes no acervo: {total}</p>
      {players.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((p: PlayerRow) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="block bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 border border-border/50 hover:border-primary/40 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm mb-3">
                {p.fullName.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground">{p.fullName}</h3>
              <div className="text-sm text-foreground/60 mt-1">
                {p.position ?? '—'}
                {p.country ? ' · ' + p.country : ''}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-foreground/60 py-12">Nenhum jogador encontrado.</p>
      )}
    </div>
  );
}
