/**
 * T449c-v1 — Aplicação do plano de nível (fonte única usada pelo script e pelos testes).
 * Tipagem ESTRUTURAL (sem importar Prisma) → puro o bastante para testes; o `where` garante
 * que só atualiza competição cujo `qid` casa E cujo `level` ainda difere; rowcount != 1 ⇒ throw
 * (rollback total da transação chamadora).
 */
import type { EnLevelBackfillPlan } from './plan-backfill.js';

export interface LevelUpdateManyArgs {
  where: {
    qid: string;
    OR: Array<{ level: number | null } | { level: { not: number } }>;
  };
  data: { level: number };
}

export interface LevelUpdateClient {
  competition: {
    updateMany(args: LevelUpdateManyArgs): Promise<{ count: number }>;
  };
}

export async function applyEnLevelBackfill(
  client: LevelUpdateClient,
  plan: EnLevelBackfillPlan,
): Promise<{ updated: number; noop: number }> {
  let updated = 0;
  let noop = 0;
  for (const item of plan.items) {
    if (item.action === 'noop') {
      noop += 1;
      continue;
    }
    const res = await client.competition.updateMany({
      where: {
        qid: item.competitionQid,
        OR: [{ level: null }, { level: { not: item.level } }],
      },
      data: { level: item.level },
    });
    if (res.count !== 1) {
      throw new Error(
        `rowcount != 1 para ${item.competitionQid} (count=${res.count}) — rollback total`,
      );
    }
    updated += 1;
  }
  return { updated, noop };
}
