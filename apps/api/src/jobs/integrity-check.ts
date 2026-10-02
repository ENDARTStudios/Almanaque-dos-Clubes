/**
 * T451 — job `integrity-check` (fila data-refresh, semanal domingo 04:00 UTC).
 *
 * Verifica anomalias do acervo (READ-ONLY — NUNCA corrige automaticamente):
 *  - clubes ativos sem QID;
 *  - competições ativas sem QID;
 *  - QID duplicado (clubes e competições);
 *  - arestas WON sem proveniência (metadata.sourceUrl);
 *  - ranking_entries com points fora de 0-100.
 *
 * O relatório vai estruturado no log (JSON) e no retorno do job.
 */
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export interface Anomaly {
  check: string;
  count: number;
  sample: Array<Record<string, unknown>>;
}

export interface IntegrityReport {
  checkedAt: string;
  anomalies: Anomaly[];
  ok: boolean;
}

const SAMPLE_SIZE = 10;

export async function runIntegrityCheck(): Promise<IntegrityReport> {
  const anomalies: Anomaly[] = [];

  const activeClubsWithoutQid = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM clubs WHERE "deletedAt" IS NULL AND qid IS NULL`,
  );
  await pushIfAny(anomalies, 'clubs_active_without_qid', activeClubsWithoutQid, async () =>
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, name FROM clubs WHERE "deletedAt" IS NULL AND qid IS NULL ORDER BY name LIMIT ${SAMPLE_SIZE}`,
    ),
  );

  const activeCompetitionsWithoutQid = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM competitions WHERE "deletedAt" IS NULL AND qid IS NULL`,
  );
  await pushIfAny(
    anomalies,
    'competitions_active_without_qid',
    activeCompetitionsWithoutQid,
    async () =>
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, name FROM competitions WHERE "deletedAt" IS NULL AND qid IS NULL ORDER BY name LIMIT ${SAMPLE_SIZE}`,
      ),
  );

  const duplicateClubQids = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM (
       SELECT qid FROM clubs WHERE "deletedAt" IS NULL AND qid IS NOT NULL
       GROUP BY qid HAVING count(*) > 1
     ) d`,
  );
  await pushIfAny(anomalies, 'clubs_duplicate_qid', duplicateClubQids, async () =>
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT qid, count(*)::int AS n, min(name) AS sample_name FROM clubs
       WHERE "deletedAt" IS NULL AND qid IS NOT NULL
       GROUP BY qid HAVING count(*) > 1 ORDER BY n DESC LIMIT ${SAMPLE_SIZE}`,
    ),
  );

  const duplicateCompetitionQids = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM (
       SELECT qid FROM competitions WHERE "deletedAt" IS NULL AND qid IS NOT NULL
       GROUP BY qid HAVING count(*) > 1
     ) d`,
  );
  await pushIfAny(anomalies, 'competitions_duplicate_qid', duplicateCompetitionQids, async () =>
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT qid, count(*)::int AS n, min(name) AS sample_name FROM competitions
       WHERE "deletedAt" IS NULL AND qid IS NOT NULL
       GROUP BY qid HAVING count(*) > 1 ORDER BY n DESC LIMIT ${SAMPLE_SIZE}`,
    ),
  );

  const wonWithoutProvenance = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM knowledge_graph
     WHERE relation = 'WON' AND (metadata->>'sourceUrl' IS NULL OR metadata->>'sourceUrl' = '')`,
  );
  await pushIfAny(anomalies, 'kg_won_without_provenance', wonWithoutProvenance, async () =>
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, "sourceId", "targetId" FROM knowledge_graph
       WHERE relation = 'WON' AND (metadata->>'sourceUrl' IS NULL OR metadata->>'sourceUrl' = '')
       LIMIT ${SAMPLE_SIZE}`,
    ),
  );

  const pointsOutOfRange = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT count(*) AS n FROM ranking_entries WHERE points IS NOT NULL AND (points < 0 OR points > 100)`,
  );
  await pushIfAny(anomalies, 'ranking_entries_points_out_of_range', pointsOutOfRange, async () =>
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, "rankingId", "clubId", points FROM ranking_entries
       WHERE points IS NOT NULL AND (points < 0 OR points > 100) LIMIT ${SAMPLE_SIZE}`,
    ),
  );

  const report: IntegrityReport = {
    checkedAt: new Date().toISOString(),
    anomalies,
    ok: anomalies.length === 0,
  };
  // Log estruturado JSON (o Operador/alertas podem grepar).
  logger.info({ report }, 'integrity-check: relatório');
  return report;
}

/** Anexa a anomalia só quando count > 0 (amostra preguiçosa — não busca se zero). */
async function pushIfAny(
  anomalies: Anomaly[],
  check: string,
  countRows: Array<{ n: bigint }>,
  sample: () => Promise<Array<Record<string, unknown>>>,
): Promise<void> {
  const n = Number(countRows[0]?.n ?? 0);
  if (n > 0) {
    anomalies.push({ check, count: n, sample: await sample() });
  }
}
