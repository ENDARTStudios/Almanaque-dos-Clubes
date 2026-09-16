'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

// T441 — Carrossel de campeões: slider horizontal com scroll-snap (CSS puro),
// setas + teclado (ArrowLeft/Right), dots indicadores, aria-live="polite".
// Sem autoplay (respeita prefers-reduced-motion e foco do usuário).
// Honestidade 1.3: sem campeão auditável no acervo → estado vazio explícito.

interface ChampionEntry {
  hierarchy: string;
  champion: {
    club: { id: string; name: string; country: string | null };
    competition: { id: string; name: string | null };
    season: number | null;
    trophy: string | null;
    gender: 'men' | 'women' | null;
    ranking: { name: string; position: number; points: number | null } | null;
  } | null;
  reason?: string;
}

interface ChampionsResponse {
  data: ChampionEntry[];
  generatedAt: string;
}

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-10 w-10 text-primary/70"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18 4V2H6v2H2v3a5 5 0 0 0 4.2 4.93A6 6 0 0 0 11 15.9V18H8v2h8v-2h-3v-2.1a6 6 0 0 0 4.8-3.97A5 5 0 0 0 22 7V4h-4ZM4 7V6h2v4.83A3 3 0 0 1 4 7Zm16 0a3 3 0 0 1-2 2.83V6h2v1Z" />
    </svg>
  );
}

export default function ChampionsCarousel() {
  const { dict } = useI18n();
  const t = dict.pages.champions;
  const trackRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ChampionsResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get<ChampionsResponse>('/champions')
      .then((res) => {
        if (active) {
          setData(res);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const champions = (data?.data ?? []).filter((d) => d.champion !== null);

  function scrollTo(index: number): void {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    if (card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      setCurrent(index);
    }
  }

  function onKeyNav(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollTo(Math.min(current + 1, champions.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollTo(Math.max(current - 1, 0));
    }
  }

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      role="region"
      aria-label={t.title}
      aria-live="polite"
    >
      <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6">{t.title}</h2>

      {!loaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-foreground/5 animate-pulse"
              data-testid={`champion-skeleton-${i}`}
            />
          ))}
        </div>
      ) : champions.length === 0 ? (
        <p className="text-sm text-foreground/60 py-6" data-testid="champions-empty">
          {t.empty}
        </p>
      ) : (
        <>
          <div
            ref={trackRef}
            onKeyDown={onKeyNav}
            tabIndex={0}
            role="group"
            aria-label={t.title}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            {champions.map((entry) => {
              const c = entry.champion!;
              return (
                <article
                  key={entry.hierarchy}
                  className="snap-start shrink-0 w-72 rounded-xl border border-border bg-background p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {t[`hierarchy_${entry.hierarchy}` as keyof typeof t] ?? entry.hierarchy}
                    </span>
                    <TrophyIcon />
                  </div>
                  <Link
                    href={`/clubs/${c.club.id}?season=${c.season ?? ''}`}
                    className="block group"
                  >
                    <p className="text-lg font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                      {c.club.name}
                    </p>
                  </Link>
                  <p className="text-sm text-foreground/60 mt-1">{c.competition.name ?? '—'}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {t.season}: {c.season ?? '—'}
                    {c.club.country ? ` · ${c.club.country}` : ''}
                  </p>
                  {c.ranking ? (
                    <p className="text-xs text-primary mt-2">
                      {t.rankingBadge
                        .replace('{position}', String(c.ranking.position))
                        .replace('{name}', c.ranking.name)}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5" role="tablist" aria-label={t.dots}>
              {champions.map((entry, i) => (
                <button
                  key={entry.hierarchy}
                  type="button"
                  role="tab"
                  aria-selected={current === i}
                  aria-label={`${t.dots} ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    current === i ? 'w-6 bg-primary' : 'w-2 bg-foreground/25'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label={t.prev}
                onClick={() => scrollTo(Math.max(current - 1, 0))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary/50"
              >
                ←
              </button>
              <button
                type="button"
                aria-label={t.next}
                onClick={() => scrollTo(Math.min(current + 1, champions.length - 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary/50"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
