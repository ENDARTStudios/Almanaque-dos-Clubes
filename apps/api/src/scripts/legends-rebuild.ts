/**
 * T603 — BOT `legends-rebuild`: hall da fama (lendas/imortais) é DERIVADO.
 *
 * Não existe fonte externa de "imortal": o hall agrega arestas WON vivas e
 * recordes de partidas já ingeridas (`modules/legends/service.ts`). O que este bot
 * faz é recomputar e invalidar o cache para que a vitrine reflita a última
 * ingestão — e declarar, no log, quanto de base existe (zero é resposta legítima).
 *
 * Não escreve em tabela nenhuma: `writes: false` no registro.
 */
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { getLegendsSummary, LEGENDS_CACHE_KEY } from '../modules/legends/service.js';
import { cache } from '../services/cache.js';

async function main(): Promise<void> {
  const [won, finishedWithScore] = await Promise.all([
    prisma.knowledgeGraph.count({ where: { relation: 'WON' } }),
    prisma.match.count({ where: { status: 'FINISHED', homeScore: { not: null } } }),
  ]);

  // `invalidate` é a API do cache do projeto (não há `del`).
  await cache.invalidate(LEGENDS_CACHE_KEY).catch(() => undefined);
  const summary = await getLegendsSummary();

  logger.info(
    {
      base: { wonEdges: won, matchesWithScore: finishedWithScore },
      resultado: {
        // `LegendsResponse` embrulha o resumo em `data`.
        clubes: summary.data.topChampions.items.length,
        competicoes: summary.data.competitionLeaders.items.length,
        recordesComPartida: [
          summary.data.records.biggestWin,
          summary.data.records.mostGoalsMatch,
        ].filter(Boolean).length,
      },
    },
    'legends-rebuild: cache invalidado e hall recomputado',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    logger.error({ err: String(err).slice(0, 300) }, 'legends-rebuild falhou');
    await prisma.$disconnect();
    process.exit(1);
  });
