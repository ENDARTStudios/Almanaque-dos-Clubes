import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import DireitosAutoraisPanel from '@/components/DireitosAutoraisPanel';

// T470 — Notificações de direitos autorais (Lei 9.610/98 + análoga; SEM safe
// harbor formal/DMCA). Logado = formulários com protocolo; deslogado = canal manual.

export const metadata: Metadata = {
  title: 'Direitos Autorais | Almanaque dos Clubes',
  description:
    'Canal interno de notificação e contranotificação de direitos autorais (Lei 9.610/98 e normas análogas; sem safe harbor formal) da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function DireitosAutoraisPage() {
  if (!legalPagesEnabled()) notFound();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-2">
        <Link href="/termos" className="text-sm text-primary hover:underline">
          ← /termos
        </Link>
      </div>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
        Direitos Autorais
      </h1>
      <p className="text-sm text-foreground/50 mb-8">
        Lei 9.610/98 e normas análogas · END ART Studios
      </p>
      <p className="text-foreground/70 mb-8 leading-relaxed">
        Notificações e contranotificações são registradas com protocolo e passam por triagem manual
        com decisão motivada; conteúdo inequivocamente infrator é removido. Canal manual (sem conta):
        endart.studios@gmail.com.
      </p>
      <DireitosAutoraisPanel />
    </div>
  );
}
