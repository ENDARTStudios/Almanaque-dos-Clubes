'use client';
/**
 * WS-C-14 — grid de favoritos recentes (todos os tipos) com link para o perfil.
 */
import Link from 'next/link';

export interface RecentFavorite {
  targetType: 'club' | 'player' | 'competition';
  targetId: string;
  targetName: string;
  targetQid: string | null;
  addedAt: string;
}

const BASE_HREF: Record<string, string> = {
  club: '/clubs',
  player: '/players',
  competition: '/competitions',
};

const TYPE_LABEL: Record<string, string> = {
  club: 'Clube',
  player: 'Jogador',
  competition: 'Competição',
};

export default function RecentFavorites({ items }: { items: RecentFavorite[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground/60 py-6" data-testid="recent-favorites-empty">
        Você ainda não favoritou nada. Use o coração nas páginas de clubes, jogadores e competições.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="recent-favorites">
      {items.map((f) => (
        <Link
          key={f.targetId}
          href={`${BASE_HREF[f.targetType]}/${f.targetId}`}
          data-testid={`recent-favorite-${f.targetType}`}
          className="rounded-xl border border-border bg-background p-3 hover:border-primary/50 transition-colors"
        >
          <p className="text-xs uppercase tracking-wide text-foreground/40">{TYPE_LABEL[f.targetType]}</p>
          <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">{f.targetName}</p>
          <p className="text-xs text-foreground/40 mt-1">
            {new Date(f.addedAt).toLocaleDateString('pt-BR')}
          </p>
        </Link>
      ))}
    </div>
  );
}
