import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Histórico' };

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/dashboard" className="text-sm text-primary hover:underline mb-6 inline-block cursor-pointer">&larr; Voltar ao Painel</Link>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">Histórico</h1>
      <p className="text-foreground/60 mb-8">Registro das suas atividades recentes no Almanaque dos Clubes.</p>
      <div className="bg-background rounded-xl p-8 text-center text-foreground/40 border-2 border-dashed border-border">
        <p className="text-lg">Nenhuma atividade registrada ainda.</p>
        <p className="text-sm mt-1">Comece a pesquisar clubes e jogadores para ver seu histórico aqui.</p>
      </div>
    </div>
  );
}
