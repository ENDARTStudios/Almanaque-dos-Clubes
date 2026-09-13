import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiBase } from '@/lib/api-base';

interface Player {
  id: string;
  fullName: string;
  shortName?: string | null;
  birthDate?: string | null;
  country?: string | null;
  position?: string | null;
  qid?: string | null;
  importedFrom?: string | null;
  sourceUrl?: string | null;
}

async function getPlayer(id: string) {
  try {
    const res = await fetch(`${getApiBase()}/players/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as Player | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPlayer(id);
  if (!p) return { title: 'Jogador não encontrado' };
  return { title: p.fullName, description: `${p.fullName} — ${p.country ?? ''}` };
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPlayer(id);
  if (!p) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.fullName,
    birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined,
    nationality: p.country ?? undefined,
  };

  const birthYear = p.birthDate ? String(p.birthDate).slice(0, 4) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/players" className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer">
        &larr; Voltar para Jogadores
      </Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {p.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">{p.fullName}</h1>
            {p.shortName && <p className="text-sm text-foreground/40">({p.shortName})</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
          {p.country && <InfoItem label="País" value={p.country} />}
          {p.position && <InfoItem label="Posição" value={p.position} />}
          {birthYear && <InfoItem label="Nascimento" value={birthYear} />}
          {p.qid && <InfoItem label="Wikidata" value={p.qid} />}
          {p.importedFrom && <InfoItem label="Origem" value={p.importedFrom} />}
          {p.sourceUrl && (
            <InfoItem label="Fonte (Wikidata)" value={
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Ver no Wikidata</a>
            } />
          )}
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
