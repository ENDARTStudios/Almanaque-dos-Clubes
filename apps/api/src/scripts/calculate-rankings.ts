/**
 * T438 — CLI de cálculo dos Rankings 0-100.
 *
 * Fino por propósito: parse de argumentos + orquestrador `runRankingCronOnce`
 * (que já faz métricas, logs estruturados Pino e captura de erro). Exit code
 * 0 em sucesso (incluindo execução honestamente vazia / skip por idempotência),
 * 1 em falha — para o cron/supervisor detectar.
 *
 * Uso:
 *   Dev (tsx):        pnpm --filter @almanaque/api exec tsx src/scripts/calculate-rankings.ts --year 2026
 *   Produção (dist):  node dist/scripts/calculate-rankings.js --year 2026
 *
 * Opções:
 *   --year <ano>              temporada alvo (default: ano UTC corrente)
 *   --competition <id>        restringe a uma competição (opcional)
 *   --gender <men|women>      restringe a um gênero (default: ambos, isolados)
 */
import { parseArgs } from 'node:util';
import { runRankingCronOnce } from '../modules/rankings/ranking-cron.job.js';
import { logger } from '../config/logger.js';

export interface CalculateRankingsArgs {
  year: string;
  competitionId: string | null;
  gender: 'men' | 'women' | null;
}

/** Parse puro (testável). Lança em argumento inválido. */
export function parseCalculateArgs(argv: string[]): CalculateRankingsArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      year: { type: 'string' },
      competition: { type: 'string' },
      gender: { type: 'string' },
    },
  });
  const year = values.year ?? String(new Date().getUTCFullYear());
  if (!/^\d{4}$/.test(year)) throw new Error(`--year inválido: "${year}" (esperado YYYY)`);
  const gender = values.gender === undefined ? null : (values.gender as 'men' | 'women' | null);
  if (gender !== null && gender !== 'men' && gender !== 'women') {
    throw new Error(`--gender inválido: "${String(values.gender)}" (use men|women)`);
  }
  return { year, competitionId: values.competition ?? null, gender };
}

export async function main(argv: string[]): Promise<number> {
  let args: CalculateRankingsArgs;
  try {
    args = parseCalculateArgs(argv);
  } catch (err) {
    logger.error({ err }, 'Argumentos inválidos');
    return 1;
  }
  try {
    const outcome = await runRankingCronOnce({
      season: args.year,
      competitionId: args.competitionId,
      gender: args.gender,
    });
    logger.info(
      {
        year: args.year,
        rankingsPublicados: outcome.rankingIds.length,
        clubesRanqueados: outcome.results.reduce((n, r) => n + r.rankedCount, 0),
        resultadosVazios: outcome.emptyResults,
        skipped: outcome.skipped,
      },
      'calculate-rankings concluído',
    );
    return 0;
  } catch {
    return 1;
  }
}

// Execução direta (não import): roda e sai com o código de status.
if (process.argv[1] && /calculate-rankings\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
