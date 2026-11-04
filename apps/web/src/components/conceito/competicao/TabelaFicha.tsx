import type { ReactNode } from 'react';

/**
 * TABELA da ficha — o molde do conceito FICHA para dado em linha.
 *
 * ── AS TRÊS REGRAS (as mesmas da `DataTable` do sistema, mais a rolagem acessível) ────────
 *   1. NÚMERO À DIREITA com `tabular-nums`: alinhado à esquerda o olho lê dígito por dígito.
 *   2. ZEBRA por degrau de tom (`bg-surface-2`) e fio de 1px entre linhas — a tabela real é a
 *      única exceção que a skill permite para linhas.
 *   3. Cabeçalho de 9px em caixa alta com `abbr`: as letras do conceito (J, V, GP, SG) são
 *      compactas de propósito; o `abbr` leva a palavra inteira ao leitor de tela sem inchar o
 *      desenho.
 *
 * ── POR QUE NÃO A `DataTable` COMPARTILHADA ────────────────────────────────────────────────
 * O invólucro rolável precisa de `role="region"`, rótulo e `tabIndex={0}` para o teclado
 * alcançar a tabela em 390px (WCAG 2.1.1). A `DataTable` é arquivo compartilhado e não pode
 * ser editada nesta sessão; este componente é o molde do conceito com a semântica completa.
 *
 * É um `<table>` de verdade: `<caption>` (sr-only), `<th scope="col">` com `abbr` e `<td>`.
 */
export interface TabelaColuna {
  key: string;
  /** Rótulo curto visível (ex.: "J"). */
  label: string;
  /** Forma expandida para leitor de tela (ex.: "Jogos"); vai no atributo `abbr`. */
  full?: string;
  align: 'left' | 'right';
  /** Largura em % da tabela. A coluna de clube fica sem largura e recebe o resto. */
  width?: number;
}

export interface TabelaFichaProps {
  columns: TabelaColuna[];
  /** Uma linha por item; o comprimento deve casar com `columns`. */
  rows: ReactNode[][];
  /** Legenda acessível — diz o que a tabela conta e de quando. */
  caption: string;
  /** Rótulo do bloco rolável (anunciado antes da tabela). */
  regionLabel: string;
  testId?: string;
  rowTestId?: string;
  /** Largura mínima em 390px; abaixo disso a tabela rola na horizontal. */
  minWidthClass?: string;
}

const HEADER =
  'border-b-2 border-foreground pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-3';
const CELL = 'border-b border-border py-1.5 align-middle text-[13px] leading-5 text-ink-2';

export default function TabelaFicha({
  columns,
  rows,
  caption,
  regionLabel,
  testId,
  rowTestId,
  minWidthClass = 'min-w-[760px]',
}: TabelaFichaProps) {
  return (
    /* `tabIndex={0}`: sem isso a tabela é inalcançável por teclado quando rola em 390px. */
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={regionLabel}
      tabIndex={0}
      data-testid={testId}
    >
      <table className={`w-full table-fixed border-collapse text-[13px] ${minWidthClass}`}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: `${col.width}%` } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key}
                scope="col"
                abbr={col.full}
                className={`${HEADER} ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                  index === columns.length - 1 ? '' : col.align === 'right' ? 'pr-4' : 'pr-3'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              data-testid={rowTestId}
              className={rowIndex % 2 === 1 ? 'bg-surface-2' : undefined}
            >
              {row.map((cell, cellIndex) => {
                const column = columns[cellIndex];
                const align = column?.align === 'right' ? 'text-right' : 'text-left';
                const pad =
                  cellIndex === row.length - 1 ? '' : column?.align === 'right' ? 'pr-4' : 'pr-3';
                return (
                  <td
                    key={`cell-${cellIndex}`}
                    className={`${CELL} ${pad} ${align} ${
                      column?.align === 'right' ? '[font-variant-numeric:tabular-nums]' : ''
                    }`}
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
