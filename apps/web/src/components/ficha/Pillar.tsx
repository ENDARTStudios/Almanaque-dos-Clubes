/**
 * FICHA — pilar: rótulo, número de display e nota.
 *
 * É o bloco que responde "quem é este clube" em três segundos: títulos, jogos, gols, fundação.
 * Aparece no clube, no jogador, no estádio e no admin — por isso vive num componente só.
 *
 * O número usa `font-heading` (Barlow Condensed) porque aqui ele é IMAGEM, não dado de tabela:
 * quatro dígitos grandes ao lado de um rótulo pequeno precisam de condensada para não empurrar o
 * rótulo para fora do eixo. É a mesma distinção que faz o número da tabela ficar em Barlow.
 */
import type { ReactNode } from 'react';

export interface PillarProps {
  /** Rótulo do pilar, já traduzido. Ex.: "Títulos". */
  label: string;
  /** O número. Vem como string para preservar "1895", "0,94" e "199.854". */
  value: string;
  /** Nota de apoio. Ex.: "oficiais reconhecidos". */
  note?: ReactNode;
  /** Destaca o pilar em crimson. Use em UM por página — é o que carrega a página. */
  accent?: boolean;
  /** `dark` para a faixa escura do panteão. */
  dark?: boolean;
}

export default function Pillar({ label, value, note, accent = false, dark = false }: PillarProps) {
  return (
    <div>
      <div className={`text-xs ${dark ? 'text-ink-3' : 'text-ink-3'}`}>{label}</div>
      <div
        className={`mt-1 font-heading text-3xl font-bold leading-none tracking-[-0.02em] sm:text-4xl ${
          accent ? 'text-primary-ink' : dark ? 'text-foreground' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      {note ? <div className="mt-1.5 text-xs text-ink-3">{note}</div> : null}
    </div>
  );
}
