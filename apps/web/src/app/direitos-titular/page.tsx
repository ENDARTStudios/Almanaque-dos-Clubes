import type { Metadata } from 'next';
import { legalAlternates } from '@/lib/legal-hreflang';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import DireitosTitularPanel from '@/components/DireitosTitularPanel';
import LegalShell from '@/components/legal/LegalShell';

// T470 — Direitos do titular (LGPD art. 18): processo com protocolo rastreável.
// Conceito FICHA: o painel entra dentro do shell legal (aba LGPD, "Em uma frase").

export const metadata: Metadata = {
  alternates: legalAlternates('/direitos-titular'),
  title: 'Direitos do Titular | Almanaque dos Clubes',
  description:
    'Exercício dos direitos previstos no art. 18 da LGPD: confirmação, acesso, correção, anonimização, portabilidade, eliminação e mais, com protocolo de acompanhamento.',
};

export default function DireitosTitularPage() {
  if (!legalPagesEnabled()) notFound();
  return (
    <LegalShell active="lgpd" title="Direitos do Titular" sections={[]}>
      <p className="text-[11px] text-ink-3">LGPD, art. 18 · END ART Studios</p>
      <p className="mt-2 max-w-[900px] text-[13px] leading-[20px] text-ink-2">
        Exerça seus direitos com protocolo rastreável. O recebimento é confirmado na hora; a
        resposta conclusiva sai em até 15 dias no Brasil (LGPD, art. 18, §3, prorrogável, com
        comunicação à ANPD) ou em até 1 mês no EEE/Reino Unido quando aplicável. Canal manual (sem
        conta): endart.studios+privacidade@gmail.com.
      </p>
      <div className="mt-6">
        <DireitosTitularPanel />
      </div>
    </LegalShell>
  );
}
