'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * WS-C-6 — carrossel de conquistas recentes dos clubes favoritados.
 * Fonte: GET /api/v1/favorites/feed (ano DESC, cap 20, proveniência por item).
 * Falha ao carregar → renderiza nada (o painel principal segue usável);
 * sem conquistas → mensagem honesta.
 */

interface FeedItem {
  clubId: string;
  clubName: string;
  year: number | null;
  season: string | null;
  competitionId: string | null;
  competitionName: string | null;
  hierarchy: string;
  sourceUrl: string | null;
}

interface FeedResponse {
  data: FeedItem[];
  total: number;
}

export default function FavoritesFeed() {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<FeedResponse>('/favorites/feed')
      .then((r) => {
        if (alive) setItems(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed || items === null) return null;

  if (items.length === 0) {
    return (
      <section className="mt-8" data-testid="favorites-feed-empty">
        <h2 className="text-xl font-heading font-bold text-foreground mb-3">{t.feedTitle}</h2>
        <p className="text-sm text-foreground/50">{t.feedEmpty}</p>
      </section>
    );
  }

  return (
    <section className="mt-8" data-testid="favorites-feed">
      <h2 className="text-xl font-heading font-bold text-foreground mb-4">{t.feedTitle}</h2>
      <ul
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        aria-label={t.feedTitle}
      >
        {items.map((it, i) => (
          <li
            key={`${it.clubId}-${it.competitionId ?? 'x'}-${it.year ?? 'y'}-${i}`}
            data-testid="favorites-feed-item"
            className="snap-start shrink-0 w-56 rounded-xl border border-border bg-background p-4"
          >
            <p className="text-2xl font-heading font-bold text-primary tabular-nums">
              {it.year ?? '—'}
            </p>
            <Link
              href={`/clubs/${it.clubId}`}
              className="mt-1 block text-sm font-medium text-foreground hover:text-primary truncate"
            >
              {it.clubName}
            </Link>
            <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
              {it.competitionId ? (
                <Link href={`/competitions/${it.competitionId}`} className="hover:text-primary">
                  {it.competitionName ?? '—'}
                </Link>
              ) : (
                (it.competitionName ?? '—')
              )}
            </p>
            {it.sourceUrl && (
              <a
                href={it.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-foreground/40 hover:text-primary underline decoration-dotted underline-offset-2"
              >
                fonte
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
