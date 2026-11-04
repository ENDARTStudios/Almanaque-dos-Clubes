import type { Metadata } from 'next';
import { legalAlternates } from '@/lib/legal-hreflang';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import DireitosAutoraisPanel from '@/components/DireitosAutoraisPanel';
import LegalShell from '@/components/legal/LegalShell';

// T470 — Notificações de direitos autorais (Lei 9.610/98 + análoga; sem safe harbor formal).
// Conceito FICHA: o painel entra dentro do shell legal (abas, "Em uma frase", navegação).

export const metadata: Metadata = {
  alternates: legalAlternates('/direitos-autorais'),
  title: 'Direitos Autorais | Almanaque dos Clubes',
  description:
    'Canal interno de notificação e contranotificação de direitos autorais (Lei 9.610/98 e normas análogas; sem safe harbor formal) da plataforma Almanaque dos Clubes, operada por END ART Studios.',
};

export default function DireitosAutoraisPage() {
  if (!legalPagesEnabled()) notFound();
  return (
    <LegalShell active="direitos" title="Direitos Autorais" sections={[]}>
      <p className="max-w-[900px] text-[13px] leading-[20px] text-ink-2">
        Notificações e contranotificações são registradas com protocolo e passam por triagem manual
        com decisão motivada; conteúdo inequivocamente infrator é removido. Canal manual (sem
        conta): endart.studios+direitos@gmail.com.
      </p>
      <div className="mt-6">
        <DireitosAutoraisPanel />
      </div>
    </LegalShell>
  );
}
