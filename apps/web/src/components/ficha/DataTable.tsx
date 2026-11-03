/**
 * FICHA — tabela de dados.
 *
 * ── POR QUE UMA TABELA, E NÃO UMA GRADE DE CARTÕES ──────────────────────────────────────────
 * Um acervo de 1.932 competições e 17.265 partidas é lido em LINHA, não em cartão. A tabela é o
 * componente que o conceito chama de "o dado é o produto": 20 linhas × 11 colunas não caberiam em
 * cartões, e em cartões toda linha pesa igual — que é o defeito de hierarquia que a skill chama de
 * "rows of identical cards".
 *
 * ── AS TRÊS REGRAS QUE ESTA TABELA GARANTE ──────────────────────────────────────────────────
 *   1. NÚMERO À DIREITA, sempre. É o que permite comparar magnitude de relance; alinhado à
 *      esquerda, o olho lê dígito por dígito.
 *   2. ZEBRA por degrau de tom (`bg-surface-2`), nunca por linha de borda em toda célula.
 *      Fio só na separação entre linhas — o que a skill permite porque tabela real é exceção.
 *   3. `font-variant-numeric: tabular-nums` nos números: sem isso as colunas dançam, porque
 *      "111" e "888" têm larguras diferentes na proporcional.
 *
 * ── SEMÂNTICA ───────────────────────────────────────────────────────────────────────────────
 * É um `<table>` de verdade, com `<thead>`, `<th scope="col">` e `<caption>`. Leitor de tela
 * anuncia a coluna de cada célula; uma grade de `div` não anuncia nada.
 */
import type { ReactNode } from 'react';

export interface Column {
  /** Cabeçalho da coluna, já traduzido. */
  header: string;
  /** `right` para número, `left` para texto. O padrão é `left`. */
  align?: 'left' | 'right';
  /** Largura opcional em rem; sem ela a tabela distribui. */
  width?: number;
}

export interface DataTableProps {
  columns: Column[];
  /** Uma linha por item. O comprimento deve casar com `columns`. */
  rows: ReactNode[][];
  /** Legenda acessível — obrigatória num acervo: diz o que a tabela conta e de quando. */
  caption: string;
  /** Mostra a legenda visualmente (útil em tabela densa). Desligada por padrão. */
  showCaption?: boolean;
  /** Marca as primeiras N linhas como destaque (peso da fonte, não cor). */
  emphasisRows?: number;
}

export default function DataTable({
  columns,
  rows,
  caption,
  showCaption = false,
  emphasisRows = 0,
}: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className={showCaption ? 'mb-2 text-left text-xs text-ink-3' : 'sr-only'}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={`${col.header}-${i}`}
                scope="col"
                style={col.width ? { width: `${col.width}rem` } : undefined}
                className={`border-b border-border pb-2 text-xs font-semibold text-ink-3 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-surface-2' : undefined}>
              {row.map((cell, ci) => {
                const align = columns[ci]?.align === 'right' ? 'text-right' : 'text-left';
                const strong = ri < emphasisRows;
                return (
                  <td
                    key={ci}
                    className={`border-b border-border/60 py-2 ${align} ${
                      strong ? 'font-semibold text-foreground' : 'text-ink-2'
                    }`}
                    style={{
                      fontVariantNumeric:
                        columns[ci]?.align === 'right' ? 'tabular-nums' : undefined,
                    }}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
