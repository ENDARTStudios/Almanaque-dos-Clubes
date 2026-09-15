'use client';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useFavorites } from '@/hooks/useFavorites';
import { useI18n } from '@/i18n/Provider';

// T439 — Painel "Meu Almanaque" (/favoritos): favoritos do usuário com badge
// do ranking vigente e indicador de tempo real (WS conectado).

function FavoritosPanel() {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const { favorites, loaded, error, live, remove } = useFavorites();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
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
