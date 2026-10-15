'use client';

import type { ReactNode } from 'react';

/**
 * DataTable — tabela de dado com as colunas DECLARADAS.
 *
 * Por que existe, em vez de cada `<table>` montar o próprio `<thead>`: a lista de rankings
 * tem duas formas (por divisão e pirâmide nacional) e, antes, cada uma repetia o cabeçalho e a
 * célula à mão. Isso fazia o alinhamento divergir entre elas e tornava impossível afirmar uma
 * regra sobre a tabela inteira. Aqui a coluna declara QUATRO coisas de uma vez:
 *
 *   1. `key`   — identidade estável (React e testabilidade);
 *   2. `label` — o rótulo do cabeçalho;
 *   3. `align` — e é por isso que o componente existe: número se lê em COLUNA. Sem alinhamento
 *      à direita, `100` e `9` começam no mesmo x e a vírgula decimal de um não casa com a do
 *      outro; a coluna deixa de ser comparável de cima a baixo;
 *   4. `numeric` — aplica `.num` (Barlow Condensed + `tabular-nums` + `tnum`). Numeral tabular
 *      é o que impede as colunas de "dançarem" entre linhas, porque na fonte proporcional o
 *      `1` é mais estreito que o `8`.
 *
 * `dense` existe porque uma tabela de 25 linhas numa página com filtros não pode ter 48px de
 * altura por linha: em `dense` o padding vertical cai, e o alvo de toque continua >= 44px na
 * versão normal (WCAG 2.2 · 2.5.8).
 */

export interface Column<Row> {
  key: string;
  label: ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Coluna de número: aplica `.num` e alinha à direita por padrão. */
  numeric?: boolean;
  /** Renderiza a célula. Recebe a linha inteira, não só o valor — a célula costuma ter link. */
  cell: (row: Row) => ReactNode;
  /** Classe extra aplicada à célula (cor de tinta, largura). */
  cellClass?: string;
}

const alignClass = (c: Column<unknown>) => {
  const a = c.align ?? (c.numeric ? 'right' : 'left');
  return a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  dense = false,
  footer,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  /** Chave estável de cada linha. */
  rowKey: (row: Row, index: number) => string;
  /** Texto acessível da tabela. Obrigatório: `role` de tabela sem nome não diz o que lista. */
  caption: string;
  dense?: boolean;
  /** Rodapé opcional (paginação, procedência). */
  footer?: ReactNode;
  empty?: ReactNode;
}) {
  const pad = dense ? 'px-4 py-2' : 'px-4 py-3';

  if (rows.length === 0 && empty) {
    return <div className="rounded-xl border border-border bg-surface px-4 py-6">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          {/* Cabeçalho com o degrau de superfície seguinte (`surface-2`) em vez de
              `bg-foreground/5`: a opacidade sobre a superfície muda conforme o tema, enquanto o
              token de superfície é o mesmo papel nos dois. */}
          <tr className="bg-surface-2">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`${pad} eyebrow ${alignClass(c as Column<unknown>)}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              // Zebra sutil: ajuda a seguir a linha em tabela larga. A primeira linha não
              // recebe, para não competir com o cabeçalho.
              className={i % 2 === 1 ? 'bg-surface-2/60' : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${pad} ${alignClass(c as Column<unknown>)} ${
                    c.numeric ? 'num text-base' : ''
                  } ${c.cellClass ?? ''}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}
