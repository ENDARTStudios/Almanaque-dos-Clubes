import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiBase } from '@/lib/api-base';
import FavoriteButton from '@/components/FavoriteButton';

async function getClub(id: string) {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

interface ClubTitle {
  year: number | null;
  season: string | null;
  competition: { id: string; name: string | null } | null;
  hierarchy: string;
  gender: 'men' | 'women';
  sourceUrl: string | null;
}

// T448 — galeria de honra: arestas WON do clube (KnowledgeGraph), com fonte.
async function getClubTitles(id: string): Promise<{ data: ClubTitle[]; total: number } | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs/${id}/titles`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const HIERARCHY_LABELS: Record<string, string> = {
  mundial: 'Mundial',
  continental: 'Continental',
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const club = await getClub(id);
  if (!club) return { title: 'Clube não encontrado' };
  return {
    title: club.name,
    description: `${club.name} — ${club.city ? `${club.city}, ` : ''}${club.country ?? ''}`,
  };
}

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await getClub(id);
  if (!club) notFound();
  const titles = await getClubTitles(id);
  const titleList = titles?.data ?? [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: club.name,
    location: club.city ? { '@type': 'City', name: club.city } : undefined,
    country: club.country,
    foundingDate: club.foundedYear ? `${club.foundedYear}` : undefined,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/clubs"
        className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; Voltar para Clubes
      </Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {club.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              {club.name}
            </h1>
            {club.fullName && <p className="text-foreground/60 mt-1">{club.fullName}</p>}
            {club.shortName && <p className="text-sm text-foreground/40">({club.shortName})</p>}
          </div>
          <div className="shrink-0">
            <FavoriteButton clubId={club.id} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
          {club.country && <InfoItem label="País" value={club.country} />}
          {club.city && <InfoItem label="Cidade" value={club.city} />}
          {club.state && <InfoItem label="Estado" value={club.state} />}
          {club.foundedYear && <InfoItem label="Fundação" value={String(club.foundedYear)} />}
          {club.status && <InfoItem label="Status" value={club.status} />}
          {club.website && (
            <div>
              <p className="text-xs text-foreground/40 uppercase tracking-wider">Site</p>
              <a
                href={club.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                {club.website}
              </a>
            </div>
          )}
          {club.sourceUrl && (
            <div>
              <p className="text-xs text-foreground/40 uppercase tracking-wider">
                Fonte (Wikidata)
              </p>
              <a
                href={club.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                Ver no Wikidata
              </a>
            </div>
          )}
        </div>
      </div>

      {titleList.length > 0 ? (
        <section
          className="mt-8 bg-background rounded-2xl p-8 shadow-md border border-border/50"
          aria-label="Galeria de honra"
          data-testid="club-honour-gallery"
        >
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <span aria-hidden="true">🏆</span> Galeria de honra
          </h2>
          <p className="text-xs text-foreground/40 mt-1">
            {titleList.length > 1 ? `${titleList.length} títulos auditáveis` : '1 título auditável'}{' '}
            no acervo (fonte por título)
          </p>
          <ul className="mt-5 divide-y divide-border/50">
            {titleList.map((t, i) => (
              <li
                key={`${t.competition?.id ?? 'x'}-${t.year ?? i}-${i}`}
                className="flex items-center justify-between gap-4 py-3"
                data-testid="club-honour-title"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.competition?.id ? (
                      <Link
                        href={`/competitions/${t.competition.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {t.competition.name ?? 'Competição'}
                      </Link>
                    ) : (
                      (t.competition?.name ?? 'Competição')
                    )}
                  </p>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    {HIERARCHY_LABELS[t.hierarchy] ?? t.hierarchy}
                    {t.gender === 'women' ? ' · Feminino' : ''}
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
                      aria-label={`Fonte da conquista de ${t.year ?? 'ano desconhecido'}`}
                      className="text-xs text-foreground/40 hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
                    >
                      fonte
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-6 text-sm text-foreground/50" data-testid="club-honour-empty">
          Nenhuma conquista auditável registrada para este clube ainda — o acervo de títulos está em
          crescimento.
        </p>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
