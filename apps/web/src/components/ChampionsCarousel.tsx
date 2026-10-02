'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsC2Strings } from '@/i18n/wsC2';
import { selectCarouselSubset, type CarouselScope } from '@/lib/carousel';

// WS-C-2 — Carrossel determinístico sobre GET /api/v1/champions/carousel.
// Regras: usa somente KG WON ativas com proveniência; ambíguos/ausentes são OMITIDOS pela API.
// Performance: NÃO renderiza os ~418 scopes de uma vez — subconjunto determinístico (≤ MAX_CARDS),
// priorizando mundial → continental → nacional → estadual. Sem autoplay (prefers-reduced-motion).

interface CarouselUnavailable {
  hierarchy: string;
  season: number | null;
  gender: string | null;
  competitionId: string | null;
  reason: string;
}
interface CarouselResponse {
  generatedAt: string;
  rulesVersion: string;
  scopes: CarouselScope[];
  unavailable: CarouselUnavailable[];
  limitations: string[];
}

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9 text-primary/70"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18 4V2H6v2H2v3a5 5 0 0 0 4.2 4.93A6 6 0 0 0 11 15.9V18H8v2h8v-2h-3v-2.1a6 6 0 0 0 4.8-3.97A5 5 0 0 0 22 7V4h-4ZM4 7V6h2v4.83A3 3 0 0 1 4 7Zm16 0a3 3 0 0 1-2 2.83V6h2v1Z" />
    </svg>
  );
}

export default function ChampionsCarousel() {
  const { dict, locale } = useI18n();
  const t = dict.pages.champions;
  const c2 = wsC2Strings[locale].carousel;
  const trackRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CarouselResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get<CarouselResponse>('/champions/carousel')
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

  const cards = data ? selectCarouselSubset(data.scopes) : [];
  const municipalGap = data?.unavailable.some((u) => u.hierarchy === 'municipal');

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
      scrollTo(Math.min(current + 1, cards.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollTo(Math.max(current - 1, 0));
    }
  }

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      role="region"
      aria-label={c2.title}
    >
      <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-6">{c2.title}</h2>

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
      ) : cards.length === 0 ? (
        <p className="text-sm text-foreground/60 py-6" data-testid="champions-empty">
          {c2.empty}
        </p>
      ) : (
        <>
          <div
            ref={trackRef}
            onKeyDown={onKeyNav}
            tabIndex={0}
            role="group"
            aria-label={c2.title}
            aria-live="polite"
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            {cards.map((scope) => (
              <article
                key={`${scope.hierarchy}-${scope.competition.id}-${scope.gender}-${scope.season}`}
                data-testid="champion-card"
                className="snap-start shrink-0 w-72 rounded-xl border border-border bg-background p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {t[`hierarchy_${scope.hierarchy}` as keyof typeof t] ?? scope.hierarchy}
                    {scope.gender === 'women' ? ` · ${dict.pages.rankings.genderWomen}` : ''}
                  </span>
                  <TrophyIcon />
                </div>
                <Link href={`/clubs/${scope.champion.id}`} className="block group">
                  <p className="text-lg font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                    {scope.champion.name}
                  </p>
                </Link>
                <p className="text-sm text-foreground/60 mt-1">
                  {scope.competition.id ? (
                    <Link
                      href={`/competitions/${scope.competition.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {scope.competition.name ?? '—'}
                    </Link>
                  ) : (
                    (scope.competition.name ?? '—')
                  )}
                </p>
                <p className="text-xs text-foreground/40 mt-0.5">
                  {c2.season}: {scope.season}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] uppercase tracking-wide text-foreground/40">
                    {scope.source.type}
                  </span>
                  {scope.source.license && (
                    <span className="text-[11px] text-foreground/40">· {scope.source.license}</span>
                  )}
                </div>
                {scope.source.sourceUrl && (
                  <a
                    href={scope.source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`champion-source-${scope.hierarchy}`}
                    className="inline-block text-xs text-foreground/50 hover:text-primary transition-colors mt-1 underline decoration-dotted underline-offset-2"
                  >
                    {c2.source}
                  </a>
                )}
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5" role="tablist" aria-label={t.dots}>
              {cards.map((scope, i) => (
                <button
                  key={`${scope.hierarchy}-${scope.competition.id}-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={current === i}
                  aria-label={`${t.dots} ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={`h-2 rounded-full transition-all ${current === i ? 'w-6 bg-primary' : 'w-2 bg-foreground/25'}`}
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
                onClick={() => scrollTo(Math.min(current + 1, cards.length - 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary/50"
              >
                →
              </button>
            </div>
          </div>

          <p className="text-xs text-foreground/40 mt-3">
            {c2.gapsNote}
            {municipalGap ? ` · ${c2.municipalGap}` : ''}
          </p>
        </>
      )}
    </section>
  );
}
