import Link from 'next/link';
import { getApiBase } from '@/lib/api-base';
import { wsC5Strings } from '@/i18n/wsC5';
import type { Locale } from '@/i18n/config';

/**
 * WS-C-5 — clubes relacionados (same_city/same_state/same_competition/rival).
 * Cards com link para o perfil; sem dado → mensagem honesta de vazio.
 * Fonte: GET /api/v1/clubs/:id/related (cache de 300s no fetch). Rivalidade só
 * existe com aresta explícita no KG — o rótulo nunca é inferido.
 */

interface RelatedItem {
  clubId: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  relationType: 'same_city' | 'same_state' | 'same_competition' | 'rival';
  confidence: number;
}

async function getRelated(id: string): Promise<RelatedItem[] | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/related`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data.related as RelatedItem[];
  } catch {
    return null;
  }
}

export default async function RelatedClubs({
  clubId,
  locale,
}: {
  clubId: string;
  locale: Locale;
}) {
  const s = wsC5Strings[locale].related;
  const related = await getRelated(clubId);
  if (!related) return null;

  return (
    <section
      className="mt-8 bg-background rounded-2xl p-6 sm:p-8 shadow-md border border-border/50"
      data-testid="related-clubs"
    >
      <h2 className="text-xl font-heading font-bold text-foreground mb-4">{s.title}</h2>

      {related.length === 0 ? (
        <p className="text-sm text-foreground/50" data-testid="related-clubs-empty">
          {s.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {related.map((r) => (
            <li key={r.clubId}>
              <Link
                href={`/clubs/${r.clubId}`}
                data-testid="related-club-card"
                className="block rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:text-primary transition-colors"
              >
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-foreground/40 mt-1">
                  {[r.city, r.state, r.country].filter(Boolean).join(' · ') || '—'}
                </p>
                <span
                  className={`inline-block mt-2 text-xs rounded-full px-2.5 py-0.5 border ${
                    r.relationType === 'rival'
                      ? 'border-primary/40 text-primary'
                      : 'border-border text-foreground/50'
                  }`}
                >
                  {s.relations[r.relationType]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
