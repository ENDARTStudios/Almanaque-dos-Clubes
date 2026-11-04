import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { formatCount } from '@/lib/format';
import { fillCompeticao, type ConceitoCompeticaoStrings } from '@/i18n/wsConceitoCompeticao';
import TabelaFicha, { type TabelaColuna } from './TabelaFicha';
import { GAP, formatGoalDifference, type ClassificationRow } from './derive';

/**
 * A TABELA DENSA de classificação do conceito FICHA.
 *
 * ── AS COLUNAS SÃO AS DO QUADRO, MAS SÓ AS QUE EXISTEM ─────────────────────────────────────
 * #, clube, J, V, E, D, GP, GC, SG, Pts — e "Últ. 5" SOMENTE se alguma linha trouxer forma
 * (hoje nenhuma traz: `CompetitionSeason.standings` não tem esse campo, e a tabela derivada
 * das partidas também não). Inventar V/E/D de forma seria desenhar um dado que não existe.
 *
 * ── DE ONDE VEM CADA NÚMERO ────────────────────────────────────────────────────────────────
 * · posição, jogos, V/E/D, gols e pontos: da tabela catalogada, publicada pela fonte;
 * · SG: aritmética de GP − GC (o dado não publica saldo; a conta é declarada na nota);
 * · na tabela derivada das partidas, tudo vem de `GET /competitions/:id/history`.
 *
 * ── ZONAS ─────────────────────────────────────────────────────────────────────────────────
 * O quadro pinta as cinco primeiras linhas e desenha a legenda Champions/Europa/Rebaixamento.
 * O acervo não tem zonas por competição: nenhuma linha recebe peso de "classificado" e a
 * legenda NÃO é desenhada — a lacuna é declarada no bloco de critérios.
 */
export interface TabelaClassificacaoProps {
  rows: ClassificationRow[];
  locale: Locale;
  competitionName: string;
  season?: string | null;
  /** `standings` = tabela catalogada; `history` = derivada das partidas. */
  kind: 'standings' | 'history';
  s: ConceitoCompeticaoStrings;
  testId: string;
  rowTestId: string;
}

function columnsFor(s: ConceitoCompeticaoStrings, showForm: boolean): TabelaColuna[] {
  const columns: TabelaColuna[] = [
    {
      key: 'position',
      label: s.tables.columns.position,
      full: s.tables.abbreviations.position,
      align: 'right',
      width: 5,
    },
    {
      key: 'club',
      label: s.tables.columns.club,
      full: s.tables.abbreviations.club,
      align: 'left',
    },
    {
      key: 'played',
      label: s.tables.columns.played,
      full: s.tables.abbreviations.played,
      align: 'right',
      width: 5,
    },
    {
      key: 'won',
      label: s.tables.columns.won,
      full: s.tables.abbreviations.won,
      align: 'right',
      width: 5,
    },
    {
      key: 'drawn',
      label: s.tables.columns.drawn,
      full: s.tables.abbreviations.drawn,
      align: 'right',
      width: 5,
    },
    {
      key: 'lost',
      label: s.tables.columns.lost,
      full: s.tables.abbreviations.lost,
      align: 'right',
      width: 5,
    },
    {
      key: 'goalsFor',
      label: s.tables.columns.goalsFor,
      full: s.tables.abbreviations.goalsFor,
      align: 'right',
      width: 6,
    },
    {
      key: 'goalsAgainst',
      label: s.tables.columns.goalsAgainst,
      full: s.tables.abbreviations.goalsAgainst,
      align: 'right',
      width: 6,
    },
    {
      key: 'goalDifference',
      label: s.tables.columns.goalDifference,
      full: s.tables.abbreviations.goalDifference,
      align: 'right',
      width: 7,
    },
    {
      key: 'points',
      label: s.tables.columns.points,
      full: s.tables.abbreviations.points,
      align: 'right',
      width: 7,
    },
  ];
  if (showForm) {
    columns.push({
      key: 'form',
      label: s.tables.columns.form,
      full: s.tables.abbreviations.form,
      align: 'left',
      width: 9,
    });
  }
  return columns;
}

function numberCell(value: number | null, locale: Locale, s: ConceitoCompeticaoStrings) {
  if (value == null) return <span className="text-ink-3">{s.tables.gap}</span>;
  return <span>{formatCount(value, locale)}</span>;
}

export default function TabelaClassificacao({
  rows,
  locale,
  competitionName,
  season = null,
  kind,
  s,
  testId,
  rowTestId,
}: TabelaClassificacaoProps) {
  // A coluna de forma só nasce quando a fonte a publica — hoje, nunca.
  const showForm = rows.some((row) => (row.form?.length ?? 0) > 0);
  const columns = columnsFor(s, showForm);

  const caption =
    kind === 'standings'
      ? fillCompeticao(s.tables.captionStandings, {
          competition: competitionName,
          season: season ?? GAP,
        })
      : fillCompeticao(s.tables.captionHistory, { competition: competitionName });

  const regionLabel =
    kind === 'standings'
      ? fillCompeticao(s.tables.regionLabelStandings, {
          competition: competitionName,
          season: season ?? GAP,
        })
      : fillCompeticao(s.tables.regionLabelHistory, { competition: competitionName });

  const body = rows.map((row) => {
    const cells = [
      <span key="position">{formatCount(row.position, locale)}</span>,
      row.clubId ? (
        <Link
          key="club"
          href={`/clubs/${row.clubId}`}
          className="inline-flex min-h-6 items-center text-foreground hover:text-primary-ink hover:underline"
        >
          {row.clubName ?? GAP}
        </Link>
      ) : (
        <span key="club" className="text-foreground">
          {row.clubName ?? GAP}
        </span>
      ),
      numberCell(row.played, locale, s),
      numberCell(row.won, locale, s),
      numberCell(row.drawn, locale, s),
      numberCell(row.lost, locale, s),
      numberCell(row.goalsFor, locale, s),
      numberCell(row.goalsAgainst, locale, s),
      <span key="goal-difference">
        {row.goalDifference == null ? (
          <span className="text-ink-3">{s.tables.gap}</span>
        ) : (
          formatGoalDifference(row.goalDifference)
        )}
      </span>,
      <span key="points" className="font-semibold text-foreground">
        {row.points == null ? (
          <span className="text-ink-3">{s.tables.gap}</span>
        ) : (
          formatCount(row.points, locale)
        )}
      </span>,
    ];
    if (showForm) {
      cells.push(
        <span key="form" className="text-ink-2">
          {row.form && row.form.length > 0 ? row.form.join(' ') : s.tables.gap}
        </span>,
      );
    }
    return cells;
  });

  return (
    <TabelaFicha
      columns={columns}
      rows={body}
      caption={caption}
      regionLabel={regionLabel}
      testId={testId}
      rowTestId={rowTestId}
    />
  );
}
