import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';

export const metadata: Metadata = { title: 'Busca Avançada', description: 'Busca avançada em todo o acervo do futebol mundial.' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Busca Avançada</h1>
      <p className="text-foreground/60 mb-8">Pesquise em todo o acervo: clubes, jogadores, competições e rankings.</p>
      <SearchBar placeholder={q ? '' : 'O que você quer encontrar?'} />
      {q && (
        <div className="mt-8 p-6 bg-background rounded-xl border border-border/50">
          <p className="text-sm text-foreground/60">Resultados para: <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span></p>
          <p className="text-sm text-foreground/40 mt-2">A busca full-text será implementada com PostgreSQL tsvector + pg_trgm para fornecer resultados rápidos mesmo com grandes volumes de dados.</p>
        </div>
      )}
    </div>
  );
}
