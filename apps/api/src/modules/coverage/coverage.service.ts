/**
 * DQ-01 — MATRIZ DE COBERTURA por competição × temporada × tipo de dado.
 *
 * ── PARA QUE SERVE ────────────────────────────────────────────────────────────────
 * Diz, para cada recorte do piloto (e do acervo inteiro), o que HÁ: partidas,
 * resultados (placar preenchido), fonte e data de atualização. É a régua que
 * impede o produto de apresentar cobertura completa onde ela não existe (DQ-05)
 * e a porta de saída do beta (LAUNCH-03).
 *
 * ── DECISÕES ──────────────────────────────────────────────────────────────────────
 * - Temporada = ano da data da partida (o `seasonId` é nullable na ingestão
 *   histórica; agrupar por ano é honesto e estável).
 * - "com resultado" = `homeScore` preenchido (o placar é o dado que o usuário
 *   consome; partidas SCHEDULED não são lacuna, são calendário).
 * - `sources` = `importedFrom` distintos do recorte — a proveniência é por linha.
 * - `pilot` = QID no escopo do MVP (constante abaixo, derivada do ACERVO — os
 *   QIDs foram lidos da produção, nunca lembrados).
 * - Uma consulta SQL agregada (a tabela pode ter 10⁵+ linhas; não carregar na
 *   memória do Node para agrupar).
 */
import { prisma } from '../../config/prisma.js';

/** QIDs das competições do piloto MVP (lidos do acervo em produção, 2026-10-25). */
export const PILOT_COMPETITION_QIDS = ['Q206813', 'Q9448', 'Q184795'] as const;

export interface CoverageRow {
  competitionId: string | null;
  competitionName: string | null;
  qid: string | null;
  country: string | null;
  year: number;
  matchesTotal: number;
  matchesWithScore: number;
  matchesScheduled: number;
  matchesWithSourceUrl: number;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  lastUpdatedAt: string | null;
  sources: string[];
  rankings: number;
  pilot: boolean;
}

export interface CoverageMatrix {
  generatedAt: string;
  pilotQids: string[];
  rows: CoverageRow[];
  /** Só os recortes do MVP (Série A, Premier League, Libertadores). */
  pilot: CoverageRow[];
}

interface RawRow {
  competitionId: string | null;
  competitionName: string | null;
  qid: string | null;
  country: string | null;
  year: number;
  total: bigint;
  withScore: bigint;
  scheduled: bigint;
  withSourceUrl: bigint;
  firstDate: Date | null;
  lastDate: Date | null;
  updatedAt: Date | null;
  sources: string | null;
}

/** Matriz completa do acervo. `pilotOnly` corta para os 3 recortes do MVP. */
export async function buildCoverageMatrix(pilotOnly = false): Promise<CoverageMatrix> {
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT
      m."competitionId"                    AS "competitionId",
      c.name                               AS "competitionName",
      c.qid                                AS "qid",
      c.country                            AS "country",
      EXTRACT(YEAR FROM m.date)::int       AS year,
      COUNT(*)::bigint                     AS total,
      COUNT(m."homeScore")::bigint         AS "withScore",
      COUNT(*) FILTER (WHERE m.status = 'SCHEDULED')::bigint   AS scheduled,
      COUNT(*) FILTER (WHERE m."sourceUrl" IS NOT NULL)::bigint AS "withSourceUrl",
      MIN(m.date)                          AS "firstDate",
      MAX(m.date)                          AS "lastDate",
      MAX(m."updatedAt")                   AS "updatedAt",
      STRING_AGG(DISTINCT m."importedFrom", ',') AS sources
    FROM matches m
    LEFT JOIN competitions c ON c.id = m."competitionId"
    GROUP BY m."competitionId", c.name, c.qid, c.country, EXTRACT(YEAR FROM m.date)
    ORDER BY c.name NULLS LAST, year DESC`;

  // Rankings por competição (contagem simples; temporada fica no campo season).
  const rankingCounts = await prisma.ranking.groupBy({
    by: ['competitionId'],
    _count: { _all: true },
    where: { competitionId: { not: null } },
  });
  const rankingsByComp = new Map(
    rankingCounts.map((r) => [r.competitionId as string, r._count._all]),
  );

  const pilotSet = new Set<string>(PILOT_COMPETITION_QIDS);
  const rows: CoverageRow[] = raw
    .map((r) => ({
      competitionId: r.competitionId,
      competitionName: r.competitionName,
      qid: r.qid,
      country: r.country,
      year: Number(r.year),
      matchesTotal: Number(r.total),
      matchesWithScore: Number(r.withScore),
      matchesScheduled: Number(r.scheduled),
      matchesWithSourceUrl: Number(r.withSourceUrl),
      firstMatchDate: r.firstDate ? r.firstDate.toISOString().slice(0, 10) : null,
      lastMatchDate: r.lastDate ? r.lastDate.toISOString().slice(0, 10) : null,
      lastUpdatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      sources: (r.sources ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      rankings: r.competitionId ? (rankingsByComp.get(r.competitionId) ?? 0) : 0,
      pilot: r.qid ? pilotSet.has(r.qid) : false,
    }))
    .filter((r) => (pilotOnly ? r.pilot : true));

  return {
    generatedAt: new Date().toISOString(),
    pilotQids: [...PILOT_COMPETITION_QIDS],
    rows,
    pilot: rows.filter((r) => r.pilot),
  };
}

/** Tabela markdown da matriz (para o relatório CLI e para issues). */
export function renderMarkdown(m: CoverageMatrix): string {
  const head =
    '| Competição | QID | Ano | Partidas | Com placar | Agendadas | Com fonte | Fontes | Rankings | Última atualização |\n' +
    '|---|---|---|---|---|---|---|---|---|---|';
  const lines = m.rows.map(
    (r) =>
      `| ${r.competitionName ?? '(sem competição)'} | ${r.qid ?? '—'} | ${r.year} | ${r.matchesTotal} | ${r.matchesWithScore} | ${r.matchesScheduled} | ${r.matchesWithSourceUrl} | ${r.sources.join('/') || '—'} | ${r.rankings} | ${r.lastUpdatedAt ?? '—'} |`,
  );
  return [head, ...lines].join('\n');
}
