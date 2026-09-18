import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';
import DireitosTitularForm from '@/components/DireitosTitularForm';

// T445 — Direitos do titular (LGPD art. 18): formulário público + acompanhamento
// por protocolo. Mesmo gate de superfície legal do WS-L (legalPagesEnabled).

export const metadata: Metadata = {
  title: 'Direitos do Titular | Almanaque dos Clubes',
  description:
    'Exercício dos direitos previstos no art. 18 da LGPD: confirmação, acesso, correção, anonimização, portabilidade, eliminação e mais, com protocolo de acompanhamento.',
};

export default function DireitosTitularPage() {
  if (!legalPagesEnabled()) notFound();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-2">
        <Link href="/privacidade" className="text-sm text-primary hover:underline">
          ← /privacidade
        </Link>
      </div>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
        Direitos do Titular
      </h1>
      <p className="text-sm text-foreground/50 mb-8">LGPD, art. 18 · END ART Studios</p>
      <p className="text-foreground/70 mb-8 leading-relaxed">
        Confirmação e acesso têm resposta imediata; os demais direitos em até 15 dias (prazo ANPD),
        prorrogável nos termos do art. 18, §3, com comunicação ao órgão regulador. Canal alternativo:
        endart.studios@gmail.com.
      </p>
      <DireitosTitularForm />
    </div>
  );
}
