import type { Metadata } from 'next';
import SearchBar from '@/components/SearchBar';

export const metadata: Metadata = { title: 'Jogadores', description: 'Pesquise jogadores de futebol de todos os tempos.' };

export default function PlayersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Jogadores</h1>
      <p className="text-foreground/60 mb-8">Pesquise jogadores de futebol de todos os tempos e lugares.</p>
      <SearchBar placeholder="Buscar jogadores por nome, posição ou nacionalidade..." />
      <div className="mt-12 text-center text-foreground/40 py-12 border-2 border-dashed border-border rounded-2xl">
        <p className="text-lg">Módulo de jogadores em desenvolvimento</p>
        <p className="text-sm mt-1">Em breve: perfis completos com estatísticas e histórico.</p>
      </div>
    </div>
  );
}
