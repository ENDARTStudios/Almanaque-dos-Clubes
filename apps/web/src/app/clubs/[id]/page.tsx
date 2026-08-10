import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getClub(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/clubs/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const club = await getClub(id);
  if (!club) return { title: 'Clube não encontrado' };
  return { title: club.name, description: `${club.name} — ${club.city ? `${club.city}, ` : ''}${club.country ?? ''}` };
}

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await getClub(id);
  if (!club) notFound();

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/clubs" className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer">&larr; Voltar para Clubes</Link>
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-2xl shrink-0">
            {club.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">{club.name}</h1>
            {club.fullName && <p className="text-foreground/60 mt-1">{club.fullName}</p>}
            {club.shortName && <p className="text-sm text-foreground/40">({club.shortName})</p>}
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
              <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline cursor-pointer">{club.website}</a>
            </div>
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
