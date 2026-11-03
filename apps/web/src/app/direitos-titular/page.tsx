import type { Metadata } from 'next';
import { legalAlternates } from '@/lib/legal-hreflang';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import DireitosTitularPanel from '@/components/DireitosTitularPanel';
import FichaHead from '@/components/ficha/FichaHead';

// T470 — Direitos do titular (LGPD art. 18): processo com protocolo rastreável.
// Logado = fluxo automatizado (pedido/export/exclusão). Deslogado = orientação +
// canal manual (sem SMTP). Gate de superfície legal (legalPagesEnabled).

export const metadata: Metadata = {
  alternates: legalAlternates('/direitos-titular'),
  title: 'Direitos do Titular | Almanaque dos Clubes',
  description:
    'Exercício dos direitos previstos no art. 18 da LGPD: confirmação, acesso, correção, anonimização, portabilidade, eliminação e mais, com protocolo de acompanhamento.',
};

export default function DireitosTitularPage() {
  if (!legalPagesEnabled()) notFound();
  return (
    <div className="measure-readable mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-2">
        <Link href="/privacidade" className="text-sm text-primary-ink hover:underline">
          ← /privacidade
        </Link>
      </div>
      {/* FichaHead no lugar do h1. O título continua literal: esta é uma página legal em
          português, atrás de flag — traduzir o conteúdo dela é outra tarefa. */}
      <FichaHead title="Direitos do Titular" />
      <p className="text-sm text-foreground/70 mb-8">LGPD, art. 18 · END ART Studios</p>
      <p className="text-foreground/70 mb-8 leading-relaxed">
        Exerça seus direitos com protocolo rastreável. O recebimento é confirmado na hora; a
        resposta conclusiva sai em até 15 dias no Brasil (LGPD, art. 18, §3, prorrogável, com
        comunicação à ANPD) ou em até 1 mês no EEE/Reino Unido quando aplicável. Canal manual (sem
        conta): endart.studios+privacidade@gmail.com.
      </p>
      <DireitosTitularPanel />
    </div>
  );
}
