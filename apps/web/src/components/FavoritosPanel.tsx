'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import { useI18n } from '@/i18n/Provider';
import FavoritesFeed from '@/components/FavoritesFeed';
import FavoritesTargetList from '@/components/FavoritesTargetList';

/**
 * T597 — painel de FAVORITOS embutido no Meu Almanaque (/dashboard).
 *
 * Era a página /favoritos (que se intitulava "Meu Almanaque", o mesmo nome da
 * área — duas entradas de navegação para a mesma lógica). Integrado como
 * SEÇÃO da área do usuário: aqui vive a lista por tipo (clubes/jogadores/
 * competições) com badge do ranking vigente e indicador de tempo real (WS).
 * A rota /favoritos continua existindo só como redirecionamento de compatibilidade.
 */

type Tab = 'club' | 'player' | 'competition';

export default function FavoritosPanel() {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const { favorites, loaded, error, live, remove } = useFavorites();
  const [tab, setTab] = useState<Tab>('club');

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'club', label: t.tabClub },
    { key: 'player', label: t.tabPlayer },
    { key: 'competition', label: t.tabCompetition },
  ];

  return (
    <section id="favoritos" aria-labelledby="favoritos-title" className="mb-10" data-testid="favoritos-section">
      <div className="flex items-center justify-between mb-3">
        <h2 id="favoritos-title" className="font-heading text-lg font-bold text-foreground">
          {t.title}
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
            live ? 'bg-success-surface text-success-ink' : 'bg-foreground/5 text-foreground/70'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-success-ink animate-pulse' : 'bg-foreground/30'}`}
          />
          {live ? t.live : t.offline}
        </span>
      </div>

      {/* WS-C-12 — abas por tipo */}
      <div
        role="tablist"
        aria-label={t.tablistAria}
        className="flex gap-1 mb-6 border border-border rounded-xl p-1 w-fit"
      >
        {tabs.map((tb) => (
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
            <p className="text-sm text-foreground/70">…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-danger-ink">
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
                      className="font-heading font-semibold text-foreground hover:text-primary-ink"
                    >
                      {f.club.name}
                    </Link>
                    <p className="text-xs text-foreground/70 mt-0.5">
                      {[f.club.city, f.club.state, f.club.country].filter(Boolean).join(', ')}
                    </p>
                    {f.ranking ? (
                      <p className="text-xs text-primary-ink mt-1">
                        {t.rankingBadge
                          .replace('{position}', String(f.ranking.position))
                          .replace('{name}', f.ranking.name)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(f.clubId)}
                    className="text-sm rounded-lg border border-border px-3 py-1.5 text-foreground/70 hover:border-danger-ink hover:text-danger-ink"
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
    </section>
  );
}
