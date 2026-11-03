/**
 * FICHA — card de destaque por ALCANCE.
 *
 * ── O DEFEITO QUE ISTO CORRIGE ──────────────────────────────────────────────────────────────
 * A seção "Destaques" mostrava blocos de chips idênticos: "FIFA World Cup" e "Campeonato
 * Cearense" com o mesmo peso visual. Além de misturar escalas incomparáveis, era exatamente o
 * que a skill bane — "no rows of identical cards". Todo card igual significa que nenhum é
 * destaque.
 *
 * ── A HIERARQUIA É POR FORMA, NÃO POR COR ───────────────────────────────────────────────────
 * O degrau se lê pelo TAMANHO DO ALVO e pela BORDA, não só pela matiz:
 *
 *   mundial ..... borda de 2px + taça grande + título em display
 *   continental . fio de 1px + taça média + título em texto
 *   nacional .... ficha compacta, sem taça
 *
 * A cor (`--color-tier-*`) reforça, mas não é o portador único: impresso em preto e branco o
 * degrau continua legível pela borda e pelo tamanho. É o requisito que a skill chama de
 * "hierarquia que passa em preto e branco".
 */
import Link from 'next/link';
import { Trophy } from './Metal';

// os ids são os da lib existente (`DegrauId` em lib/competition-tier.ts) — não um
// vocabulário paralelo. Regra zero do design system: um sistema só.
export type Tier = 'mundial' | 'continentalTop' | 'continentalSecundaria' | 'nacional';

const ESTILO: Record<
  Tier,
  { borda: string; peso: string; trofeu: number; titulo: string; corRotulo: string }
> = {
  mundial: {
    borda: 'border-[color:var(--color-tier-mundial)]',
    peso: 'border-2',
    trofeu: 52,
    titulo: 'font-heading text-xl font-bold',
    corRotulo: 'text-[color:var(--color-tier-mundial)]',
  },
  continentalTop: {
    borda: 'border-border',
    peso: 'border',
    trofeu: 40,
    titulo: 'text-base font-semibold',
    corRotulo: 'text-[color:var(--color-tier-continental)]',
  },
  continentalSecundaria: {
    borda: 'border-border',
    peso: 'border',
    trofeu: 32,
    titulo: 'text-sm font-semibold',
    corRotulo: 'text-[color:var(--color-tier-continental)]',
  },
  nacional: {
    borda: 'border-border',
    peso: 'border',
    trofeu: 0,
    titulo: 'text-sm font-semibold',
    corRotulo: 'text-[color:var(--color-tier-nacional)]',
  },
};

export interface TierCardProps {
  tier: Tier;
  /** Nome da competição. */
  name: string;
  /** Linha de apoio. Ex.: "1930 · 23 edições". */
  meta: string;
  /** Rótulo do alcance, já traduzido. Ex.: "Mundial". */
  tierLabel: string;
  /** Rota. Sem `href`, o card não é interativo — e então não finge ser. */
  href?: string;
}

export default function TierCard({ tier, name, meta, tierLabel, href }: TierCardProps) {
  const e = ESTILO[tier];

  const corpo = (
    <>
      {e.trofeu > 0 ? (
        <div className="flex justify-center pt-2">
          <Trophy size={e.trofeu} />
        </div>
      ) : null}
      <div className="mt-3">
        <div className={`${e.titulo} text-foreground`}>{name}</div>
        <div className="mt-1 text-xs text-ink-3">{meta}</div>
        <div className={`mt-2 text-xs font-semibold ${e.corRotulo}`}>{tierLabel}</div>
      </div>
    </>
  );

  const classes = `flex h-full flex-col rounded-lg bg-surface p-4 transition-colors duration-200 ${e.peso} ${e.borda}`;

  if (!href) {
    return <div className={classes}>{corpo}</div>;
  }

  return (
    <Link href={href} className={`${classes} hover:border-primary/60`}>
      {corpo}
    </Link>
  );
}
