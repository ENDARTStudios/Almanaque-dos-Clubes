import Link from 'next/link';
import { getApiBase } from '@/lib/api-base';
import { wsC5Strings } from '@/i18n/wsC5';
import type { Locale } from '@/i18n/config';

/**
 * WS-C-5 — linha do tempo de conquistas (arestas WON com proveniência).
 * Renderiza somente o que a API entrega; sem dado → mensagem honesta de vazio.
 * Fonte: GET /api/v1/clubs/:id/timeline (cache de 300s no fetch).
 */

interface TimelineItem {
  year: number | null;
  season: string | null;
  competitionId: string | null;
  competitionQid: string | null;
  competitionName: string | null;
  hierarchy: string;
  source: string | null;
  sourceUrl: string | null;
}

interface ClubTimelineData {
  clubId: string;
  qid: string | null;
  name: string;
  timeline: TimelineItem[];
  totalTitles: number;
  byHierarchy: Record<string, number>;
}

async function getTimeline(id: string): Promise<ClubTimelineData | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/timeline`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ClubTimelineData;
  } catch {
    return null;
  }
}

export default async function ClubTimeline({
  clubId,
  locale,
}: {
  clubId: string;
  locale: Locale;
}) {
  const s = wsC5Strings[locale].timeline;
  const data = await getTimeline(clubId);
  if (!data) return null;

  return (
    <section
      className="mt-8 bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50"
      data-testid="club-timeline"
    >
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xl font-heading font-bold text-foreground">{s.title}</h2>
        {data.totalTitles > 0 && (
          <span
            className="text-sm text-foreground/40 tabular-nums"
            aria-label={`${data.totalTitles}`}
          >
            {data.totalTitles}
          </span>
        )}
      </div>

      {data.timeline.length === 0 ? (
        <p className="text-sm text-foreground/50" data-testid="club-timeline-empty">
          {s.empty}
        </p>
      ) : (
        <ol className="divide-y divide-border/50">
          {data.timeline.map((t, i) => (
            <li
              key={`${t.competitionId ?? 'x'}-${t.year ?? 'y'}-${i}`}
              data-testid="club-timeline-item"
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {t.competitionId ? (
                    <Link
                      href={`/competitions/${t.competitionId}`}
                      className="hover:text-primary transition-colors"
                    >
                      {t.competitionName ?? '—'}
                    </Link>
                  ) : (
                    (t.competitionName ?? '—')
                  )}
                </p>
                <p className="text-xs text-foreground/40 mt-0.5">
                  {s.hierarchies[t.hierarchy as keyof typeof s.hierarchies] ?? t.hierarchy}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-heading font-semibold text-primary tabular-nums">
                  {t.year ?? '—'}
                </span>
                {t.sourceUrl && (
                  <a
                    href={t.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground/40 hover:text-primary underline decoration-dotted underline-offset-2"
                  >
                    {s.source}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
