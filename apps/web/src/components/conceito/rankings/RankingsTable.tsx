import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { formatCount } from '@/lib/format';
import { CountryFlag } from '@/components/CountryFlag';
import type { ConceitoRankingsStrings } from '@/i18n/wsConceitoRankings';

/**
 * A TABELA DENSA do conceito FICHA, aplicada a /rankings.
 *
 * ── O QUE ESTE COMPONENTE DESENHA ───────────────────────────────────────────────────────────
 * Cabeçalho minúsculo em caixa alta (9px, tracking 1.6), fio de 2px sob o cabeçalho, zebra em
 * `surface-2`, fio de 1px entre linhas e número SEMPRE à direita com numeral tabular — é a
 * régua do quadro `design/concept/app/rankings.png`. Raio 2px, borda de 1px, nenhuma sombra.
 *
 * ── O QUE ELE NÃO DESENHA, PORQUE O DADO NÃO EXISTE ───────────────────────────────────────
 * O conceito pede `Var.` (variação de posição) e `Últ. 5` (forma). A API pública
 * `/rankings/entries` não devolve nenhum dos dois; em vez de inventar uma seta ou uma sequência
 * de "V/E/D", a última coluna mostra a BASE AUDITÁVEL que o endpoint entrega (partidas da base).
 * `Títulos` é dado real (`baseTitles`) e fica.
 *
 * ── SEMÂNTICA ──────────────────────────────────────────────────────────────────────────────
 * É um `<table>` de verdade: `<caption>` (sr-only), `<th scope="col">` e `<td>`. Número em
 * coluna sem `tabular-nums` faz a coluna "dançar" entre linhas — é a razão de o requisito ser
 * explícito aqui.
 */
export type RankingsView = 'division' | 'pyramid';

/** Linha crua da API (`/rankings/entries`), do jeito que a página recebe. */
export interface RankingRowData {
  position: number | null;
  points: number | null;
  clubId: string | null;
  clubName: string | null;
  playerId?: string | null;
  playerName?: string | null;
  country: string | null;
  baseTitles: number | null;
  baseMatches: number | null;
  divisionLevel?: number | null;
  divisionLabel?: string | null;
  multiplier?: number | null;
}

interface ColumnDef {
  key: string;
  label: string;
  align: 'left' | 'right';
  /**
   * Largura em % da tabela. O quadro do conceito distribui as colunas em larguras fixas e deixa
   * a última área respirar; uma coluna de clube "flexível" empurraria País e Pts para a direita
   * e a tabela perderia a leitura em coluna do desenho.
   */
  width: string;
}

const HEADER_CLASS =
  'border-b-2 border-foreground pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-3';
const CELL_CLASS = 'border-b border-border py-1.5 align-middle text-[13px] leading-5';

function numberCell(value: number | null | undefined, locale: Locale, gap: string): string {
  if (value == null || !Number.isFinite(value)) return gap;
  return Number.isInteger(value) ? formatCount(value, locale) : String(value);
}

function columnsFor(view: RankingsView, s: ConceitoRankingsStrings): ColumnDef[] {
  if (view === 'pyramid') {
    return [
      { key: 'position', label: s.colPosition, align: 'right', width: '5%' },
      { key: 'club', label: s.colClub, align: 'left', width: '30%' },
      { key: 'country', label: s.colCountry, align: 'left', width: '14%' },
      { key: 'points', label: s.colPoints, align: 'right', width: '8%' },
      { key: 'division', label: s.colDivision, align: 'left', width: '18%' },
      { key: 'level', label: s.colLevel, align: 'right', width: '10%' },
      { key: 'multiplier', label: s.colMultiplier, align: 'right', width: '15%' },
    ];
  }
  return [
    { key: 'position', label: s.colPosition, align: 'right', width: '5%' },
    { key: 'club', label: s.colClub, align: 'left', width: '38%' },
    { key: 'country', label: s.colCountry, align: 'left', width: '16%' },
    { key: 'points', label: s.colPoints, align: 'right', width: '10%' },
    { key: 'titles', label: s.colTitles, align: 'right', width: '12%' },
    { key: 'base', label: s.colBase, align: 'right', width: '19%' },
  ];
}

/** Clube ou jogador — o link usa a rota real só quando o id existe. */
function nameCell(row: RankingRowData, s: ConceitoRankingsStrings) {
  const strongName = row.playerName ?? row.clubName;
  if (row.playerId) {
    return (
      <Link
        href={`/players/${row.playerId}`}
        className="inline-flex min-h-6 items-center text-foreground hover:text-primary-ink hover:underline"
      >
        {strongName ?? s.gap}
      </Link>
    );
  }
  if (row.clubId) {
    return (
      <Link
        href={`/clubs/${row.clubId}`}
        className="inline-flex min-h-6 items-center text-foreground hover:text-primary-ink hover:underline"
      >
        {strongName ?? s.gap}
      </Link>
    );
  }
  return <span>{strongName ?? s.gap}</span>;
}

export default function RankingsTable({
  rows,
  locale,
  view,
  s,
}: {
  rows: RankingRowData[];
  locale: Locale;
  view: RankingsView;
  s: ConceitoRankingsStrings;
}) {
  const columns = columnsFor(view, s);
  const caption = view === 'pyramid' ? s.tableCaptionPyramid : s.tableCaption;

  return (
    /* O wrapper é o contêiner de rolagem: com `tabIndex={0}` o teclado alcança a tabela em
       390px (WCAG 2.1.1) e o `role="region"` + rótulo anunciam o bloco antes da tabela. */
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={caption}
      tabIndex={0}
      data-testid="conceito-rankings-table"
    >
      <table
        className={`w-full table-fixed border-collapse text-[13px] ${
          view === 'pyramid' ? 'min-w-[820px]' : 'min-w-[720px]'
        }`}
      >
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${HEADER_CLASS} ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.key === 'position' ? 'pr-4' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const strong = index < 3;
            const strongClass = strong ? 'font-semibold' : '';
            return (
              <tr
                key={`${row.playerId ?? row.clubId ?? 'row'}-${row.position ?? index}`}
                data-testid="conceito-rankings-row"
                className={index % 2 === 1 ? 'bg-surface-2' : undefined}
              >
                <td
                  className={`${CELL_CLASS} ${strongClass} pr-4 text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                >
                  {row.position ?? s.gap}
                </td>
                <td className={`${CELL_CLASS} ${strongClass} pl-1 text-foreground`}>
                  {nameCell(row, s)}
                </td>
                <td className={`${CELL_CLASS} ${strongClass} text-foreground`}>
                  {row.country ? (
                    <CountryFlag
                      code={row.country}
                      locale={locale}
                      basePath="/clubs"
                      destination="clubs"
                      showName
                    />
                  ) : (
                    <span className="text-ink-3">{s.gap}</span>
                  )}
                </td>
                <td
                  className={`${CELL_CLASS} ${strongClass} text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                >
                  {numberCell(row.points, locale, s.gap)}
                </td>

                {view === 'pyramid' ? (
                  <>
                    <td className={`${CELL_CLASS} ${strongClass} text-foreground`}>
                      {row.divisionLabel ?? s.gap}
                    </td>
                    <td
                      className={`${CELL_CLASS} ${strongClass} text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                    >
                      {row.divisionLevel ?? s.gap}
                    </td>
                    <td
                      className={`${CELL_CLASS} ${strongClass} text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                    >
                      {numberCell(row.multiplier, locale, s.gap)}
                    </td>
                  </>
                ) : (
                  <>
                    <td
                      className={`${CELL_CLASS} ${strongClass} text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                    >
                      {numberCell(row.baseTitles, locale, s.gap)}
                    </td>
                    <td
                      className={`${CELL_CLASS} ${strongClass} text-right text-ink-2 [font-variant-numeric:tabular-nums]`}
                    >
                      {numberCell(row.baseMatches, locale, s.gap)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
