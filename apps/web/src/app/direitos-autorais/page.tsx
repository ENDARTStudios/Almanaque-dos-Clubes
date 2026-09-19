import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import CopyrightClaimForm from '@/components/CopyrightClaimForm';

// T445 — Notificações de direitos autorais (DMCA art. 512 / Lei 9.610/98):
// formulário público com honeypot + rate-limit no backend.

export const metadata: Metadata = {
  title: 'Direitos Autorais (DMCA) | Almanaque dos Clubes',
  description:
    'Canal de notificações de violação de direitos autorais (DMCA art. 512 / Lei 9.610/98) da plataforma Almanaque dos Clubes, operada por END ART Studios.',
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
        Direitos Autorais (DMCA)
      </h1>
      <p className="text-sm text-foreground/50 mb-8">
        DMCA art. 512 · Lei 9.610/98 · END ART Studios
      </p>
      <p className="text-foreground/70 mb-8 leading-relaxed">
        Notificações passam por triagem com decisão motivada; conteúdo inequivocamente infrator é
        removido. Canal alternativo: endart.studios@gmail.com.
      </p>
      <CopyrightClaimForm />
    </div>
  );
}
