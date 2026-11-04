/**
 * FICHA — cabeçalho de seção.
 *
 * Substitui o "kicker" do conceito, que era um rótulo de 10px em CAIXA ALTA com tracking +2,2
 * acima de cada bloco. A skill proíbe as duas coisas ("no eyebrows", "no tiny uppercase
 * letter-spaced labels"), e o rótulo ainda por cima repetia o óbvio: "DESTAQUES" acima de uma
 * lista de destaques.
 *
 * Aqui é um cabeçalho de seção de verdade: caixa baixa, no tamanho de leitura, sem tracking.
 * Nomeia o bloco que vem abaixo — que é o que a skill pede ("a heading on every section") — e
 * não é um adorno acima de outro título.
 */
import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  children: ReactNode;
  /** Contagem ou qualificação à direita, já traduzida. Ex.: "48 títulos · 12 competições". */
  aside?: ReactNode;
  /** Nível semântico. `h2` por padrão; `h3` quando dentro de uma seção já titulada. */
  as?: 'h2' | 'h3';
  id?: string;
}

export default function SectionHeading({
  children,
  aside,
  as: Tag = 'h2',
  id,
}: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <Tag
        id={id}
        className={`font-semibold text-foreground ${Tag === 'h2' ? 'text-[12.5px]' : 'text-[12.5px]'}`}
      >
        {children}
      </Tag>
      {aside ? <div className="text-[11px] text-ink-3">{aside}</div> : null}
    </div>
  );
}
