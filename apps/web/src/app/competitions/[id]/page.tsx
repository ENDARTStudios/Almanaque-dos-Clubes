import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiBase } from '@/lib/api-base';

interface Competition {
  id: string;
  name: string;
  country?: string | null;
  type?: string | null;
  qid?: string | null;
  importedFrom?: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  LEAGUE: 'Liga',
  CUP: 'Copa',
  TOURNAMENT: 'Torneio',
  SUPER_CUP: 'Supercopa',
};

async function getCompetition(id: string) {
  try {
    const res = await fetch(`${getApiBase()}/competitions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as Competition | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const comp = await getCompetition(id);
  if (!comp) return { title: 'Competição não encontrada' };
  return { title: comp.name, description: `${comp.name} — ${comp.country ?? 'Internacional'}` };
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comp = await getCompetition(id);
  if (!comp) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: comp.name,
    location: comp.country ? { '@type': 'Country', name: comp.country } : undefined,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/competitions" className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer">
        &larr; Voltar para Competições
      </Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {comp.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">{comp.name}</h1>
            {comp.country ? (
              <p className="text-foreground/60 mt-1">{comp.country}</p>
            ) : (
              <p className="text-foreground/60 mt-1">Competição internacional</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
          {comp.country && <InfoItem label="País" value={comp.country} />}
          {comp.type && <InfoItem label="Tipo" value={TYPE_LABEL[comp.type] ?? comp.type} />}
          {comp.qid && <InfoItem label="Wikidata" value={comp.qid} />}
          {comp.importedFrom && <InfoItem label="Origem" value={comp.importedFrom} />}
        </div>
      </div>
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
