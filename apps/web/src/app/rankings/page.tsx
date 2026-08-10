import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';

export const metadata: Metadata = { title: 'Rankings', description: 'Rankings históricos auditáveis do futebol mundial.' };

export default function RankingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Rankings</h1>
      <p className="text-foreground/60 mb-8">Rankings históricos auditáveis com fontes verificadas e data de publicação.</p>
      <SearchBar placeholder="Buscar rankings por nome, temporada..." />
      <div className="mt-12 text-center text-foreground/40 py-12 border-2 border-dashed border-border rounded-2xl">
        <p className="text-lg">Módulo de rankings em desenvolvimento</p>
        <p className="text-sm mt-1">Em breve: rankings completos com posições e pontuações.</p>
      </div>
    </div>
  );
}
