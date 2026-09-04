/**
 * T425 — Cron diário do Ranking 0-100 (BullMQ, fila `ranking`, 03:00 UTC).
 *
 * Job idempotente: não recalcula/republca o ranking do mesmo ano+escopo se já
 * existir um Ranking publicado com o mesmo nome/season/competitionId.
 * Roda com contexto RLS `SERVICE` (`withRlsContext`) e usa o repositório Prisma.
 *
 * A normalização é ISOLADA por gênero: para cada ano+escopo geramos um Ranking
 * masculino e um feminino (quando `gender` não é passado), cada um normalizado
 * separadamente, evitando que o feminino seja esmagado pela escala masculina.
 *
 * Execução manual (teste/CI):
 *   import { runRankingForSeason } from '.../ranking-cron.job.js';
 *   await runRankingForSeason({ season: '2023' });
 */
import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { queues, createWorker } from '../../services/queue.js';
import { withRlsContext } from '../../config/rls-context.js';
import {
  buildClubRanking,
  createPrismaRankingAlgorithmRepo,
  type ClubRankingResult,
  type Gender,
} from './ranking-algorithm.service.js';

/** Horário UTC diário 03:00. */
export const RANKING_CRON_PATTERN = '0 3 * * *' as const;
export const RANKING_JOB_NAME = 'ranking:compute' as const;

export interface RankingRunScope {
  season: string;
  competitionId?: string | null;
  gender?: Gender | null;
}

export interface RankingRunOutcome {
  skipped: boolean;
  results: ClubRankingResult[];
  rankingIds: string[];
}

/** Persiste um Ranking (ano+escopo+gênero) se ainda não publicado (idempotente). */
export async function runRankingJob(scope: {
  season: string;
  competitionId?: string | null;
  gender: Gender;
}): Promise<{
  skipped: boolean;
  rankingId: string | null;
  result: ClubRankingResult | null;
}> {
  const genderLabel = scope.gender === 'women' ? 'Feminino' : 'Masculino';
  const rankingName = `Ranking 0-100 ${scope.season} — ${genderLabel}`;

  return withRlsContext({ role: 'SERVICE' }, async (tx) => {
    const repo = createPrismaRankingAlgorithmRepo(tx);

    // Idempotência: se já existe Ranking publicado p/ o mesmo ano+escopo, NÃO recalcula/republca.
    const existing = await tx.ranking.findFirst({
      where: {
        name: rankingName,
        season: scope.season,
        competitionId: scope.competitionId ?? null,
        publishedAt: { not: null },
      },
      select: { id: true },
    });
    if (existing) return { skipped: true, rankingId: null, result: null };

    const result = await buildClubRanking(repo, {
      season: scope.season,
      competitionId: scope.competitionId,
      gender: scope.gender,
    });

    const ranking = await tx.ranking.create({
      data: {
        name: rankingName,
        season: scope.season,
        competitionId: scope.competitionId ?? null,
        publishedAt: new Date(),
      },
    });

    for (const row of result.rows) {
      await tx.rankingEntry.create({
        data: {
          rankingId: ranking.id,
          clubId: row.clubId,
          position: row.position,
          points: row.points,
          baseMatches: row.baseMatches,
          baseTitles: row.baseTitles,
          dataSourceIds: row.dataSourceIds as Prisma.InputJsonValue,
          reason: row.reason,
          gender: row.gender,
        },
      });
    }

    return { skipped: false, rankingId: ranking.id, result };
  });
}

/** Roda o Ranking para um ano+escopo, separando por gênero (isolamento). */
export async function runRankingForSeason(scope: RankingRunScope): Promise<RankingRunOutcome> {
  const genders: Gender[] = scope.gender ? [scope.gender] : ['men', 'women'];
  const results: ClubRankingResult[] = [];
  const rankingIds: string[] = [];
  let anyCreated = false;

  for (const g of genders) {
    const out = await runRankingJob({
      season: scope.season,
      competitionId: scope.competitionId,
      gender: g,
    });
    if (!out.skipped) anyCreated = true;
    if (out.rankingId) rankingIds.push(out.rankingId);
    if (out.result) results.push(out.result);
  }

  return { skipped: !anyCreated, results, rankingIds };
}

/** Handler do job BullMQ (fila `ranking`). Extrai o ano/escopo do payload. */
export async function rankingJobHandler(job: Job): Promise<void> {
  const data = (job.data ?? {}) as { season?: string; competitionId?: string | null };
  const season = data.season ?? String(new Date().getUTCFullYear());
  console.log(`[RankingCron] computation for season=${season}`);
  const outcome = await runRankingForSeason({ season, competitionId: data.competitionId ?? null });
  console.log(
    `[RankingCron] done skip=${outcome.skipped} rankings=${outcome.rankingIds.join(',')} ranked=${outcome.results.reduce((n, r) => n + r.rankedCount, 0)}`,
  );
}

let registered = false;

/**
 * Agenda o job recorrente (03:00 UTC) na fila `ranking` e registra o worker.
 * Idempotente por processo. Só deve ser chamado fora de testes (exige Redis).
 */
export async function registerRankingCron(): Promise<void> {
  if (registered) return;
  registered = true;
  createWorker('ranking', rankingJobHandler);
  await queues.ranking.upsertJobScheduler(
    'ranking-daily',
    { pattern: RANKING_CRON_PATTERN },
    {
      name: RANKING_JOB_NAME,
      data: {},
      opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 100 } },
    },
  );
  console.log(`[RankingCron] scheduled at ${RANKING_CRON_PATTERN} (UTC)`);
}

// Fallback para workers dedicados: se este módulo for importado no processo worker
// (NODE_ENV não é test), registra a cron automaticamente.
if (process.env.NODE_ENV !== 'test' && process.env.RANKING_CRON_AUTO === '1') {
  void registerRankingCron();
}
