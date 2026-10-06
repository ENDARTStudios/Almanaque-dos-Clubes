'use client';
import { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useFavorites } from '@/hooks/useFavorites';
import { useI18n } from '@/i18n/Provider';
import FavoritesFeed from '@/components/FavoritesFeed';
import FavoritesTargetList from '@/components/FavoritesTargetList';

// T439 — Painel "Meu Almanaque" (/favoritos): favoritos do usuário com badge
// do ranking vigente e indicador de tempo real (WS conectado).
// WS-C-12 — abas por tipo: Clubes (legado) · Jogadores · Competições.

type Tab = 'club' | 'player' | 'competition';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'club', label: 'Clubes' },
  { key: 'player', label: 'Jogadores' },
  { key: 'competition', label: 'Competições' },
];

function FavoritosPanel() {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const { favorites, loaded, error, live, remove } = useFavorites();
  const [tab, setTab] = useState<Tab>('club');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold">{t.title}</h1>
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
            live ? 'bg-green-100 text-green-700' : 'bg-foreground/5 text-foreground/50'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-foreground/30'}`}
          />
          {live ? t.live : t.offline}
        </span>
      </div>

      {/* WS-C-12 — abas por tipo */}
      <div
        role="tablist"
        aria-label="Tipo de favorito"
        className="flex gap-1 mb-6 border border-border rounded-xl p-1 w-fit"
      >
        {TABS.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            type="button"
            aria-selected={tab === tb.key}
            data-testid={`favoritos-tab-${tb.key}`}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === tb.key
                ? 'bg-primary text-on-primary'
                : 'text-foreground/70 hover:bg-foreground/5'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'player' && <FavoritesTargetList targetType="player" />}
      {tab === 'competition' && <FavoritesTargetList targetType="competition" />}

      {tab === 'club' && (
        <>
          {!loaded ? (
            <p className="text-sm text-foreground/50">…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-600">
              {t.error}
            </p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-foreground/60 py-10">{t.empty}</p>
          ) : (
            <ul className="space-y-3">
              {favorites.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
                >
                  <div>
                    <Link
                      href={`/clubs/${f.clubId}`}
                      className="font-heading font-semibold text-foreground hover:text-primary"
                    >
                      {f.club.name}
                    </Link>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {[f.club.city, f.club.state, f.club.country].filter(Boolean).join(', ')}
                    </p>
                    {f.ranking ? (
                      <p className="text-xs text-primary mt-1">
                        {t.rankingBadge
                          .replace('{position}', String(f.ranking.position))
                          .replace('{name}', f.ranking.name)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(f.clubId)}
                    className="text-sm rounded-lg border border-border px-3 py-1.5 text-foreground/70 hover:border-red-300 hover:text-red-600"
                  >
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* WS-C-6 — conquistas recentes dos favoritos (ano DESC, cap 20). */}
          {loaded && !error && favorites.length > 0 && <FavoritesFeed />}
        </>
      )}
    </div>
  );
}

export default function FavoritosPage() {
  return (
    <ProtectedRoute>
      <FavoritosPanel />
    </ProtectedRoute>
  );
}
