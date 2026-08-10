'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { useGsapStagger, useGsapHover } from '@/hooks/useGsap';
import type { JSX } from 'react';

interface Club {
  id: string; name: string; country?: string; city?: string; status?: string;
}

function ClubCard({ club }: { club: Club }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapHover(ref);
  return (
    <Link href={`/clubs/${club.id}`}>
      <div ref={ref} className="bg-background rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/50">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm mb-3">
          {club.name.slice(0, 2).toUpperCase()}
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground">{club.name}</h3>
        {club.country && <p className="text-sm text-foreground/60 mt-1">{club.city ? `${club.city}, ` : ''}{club.country}</p>}
        {club.status && (
          <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${club.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {club.status === 'ACTIVE' ? 'Ativo' : club.status}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ClubGrid({ clubs }: { clubs: Club[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapStagger(ref, '.club-card');

  if (!clubs.length) {
    return <p className="text-center text-foreground/60 py-12">Nenhum clube encontrado.</p>;
  }

  return (
    <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {clubs.map((club) => (
        <div key={club.id} className="club-card">
          <ClubCard club={club} />
        </div>
      ))}
    </div>
  );
}
