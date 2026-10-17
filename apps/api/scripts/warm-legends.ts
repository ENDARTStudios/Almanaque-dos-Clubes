/**
 * Warm-up/validação do resumo Legends (hall da fama).
 *
 * Chama o MESMO service da rota GET /api/v1/legends (mesma agregação, mesmo
 * cache `legends:summary` 300s) e imprime o resumo. Único efeito de escrita:
 * a chave de cache Redis — nada de banco é alterado.
 *
 * Uso (dentro do container da API em produção, ou local com DATABASE_URL):
 *   pnpm --filter @almanaque/api exec tsx scripts/warm-legends.ts
 */
import { prisma } from '../src/config/prisma.js';
import { getLegendsSummary } from '../src/modules/legends/service.js';

async function main(): Promise<void> {
  const { data, generatedAt } = await getLegendsSummary();

  console.log(`Legends summary (gerado em ${generatedAt})\n`);

  console.log('— Maiores campeões —');
  if (data.topChampions.items.length === 0) {
    console.log(
      `  (vazio — nenhum título auditável; base: ${data.topChampions.provenance.titlesCounted} arestas WON)`,
    );
  }
  for (const t of data.topChampions.items) {
    const year = t.lastTitleYear === null ? 's/ano na fonte' : String(t.lastTitleYear);
    console.log(`  ${t.clubName} — ${t.titles} títulos (último: ${year})`);
  }
  console.log(`  base: ${data.topChampions.provenance.titlesCounted} arestas WON\n`);

  console.log('— Líderes por competição —');
  if (data.competitionLeaders.items.length === 0) {
    console.log('  (vazio — nenhuma competição com títulos auditáveis)');
  }
  for (const l of data.competitionLeaders.items) {
    console.log(`  ${l.competitionName ?? l.competitionId} — ${l.leaderClubName} (${l.titles})`);
  }
  console.log(`  base: ${data.competitionLeaders.provenance.competitionsConsidered} competições\n`);

  console.log('— Recordes (partidas com placar) —');
  const r = data.records;
  console.log(`  base: ${r.provenance.matchesConsidered} partidas consideradas`);
  const fmt = (
    m: {
      homeClubName: string;
      awayClubName: string;
      homeScore: number;
      awayScore: number;
      date: string;
    } | null,
  ): string =>
    m
      ? `${m.homeClubName} ${m.homeScore}×${m.awayScore} ${m.awayClubName} (${m.date.slice(0, 10)})`
      : '(sem dado)';
  console.log(`  maior saldo: ${fmt(r.biggestWin)}`);
  console.log(`  mais gols:   ${fmt(r.mostGoalsMatch)}`);
  console.log(
    r.mostGoalsClubSeason
      ? `  mais gols clube+temporada: ${r.mostGoalsClubSeason.clubName} — ${r.mostGoalsClubSeason.goals} gols em ${r.mostGoalsClubSeason.matches} jogos (${r.mostGoalsClubSeason.seasonName ?? 's/temporada na fonte'})`
      : '  mais gols clube+temporada: (sem dado)',
  );
  console.log(
    r.longestUnbeatenSeason
      ? `  maior invencibilidade: ${r.longestUnbeatenSeason.clubName} — ${r.longestUnbeatenSeason.length} jogos (${r.longestUnbeatenSeason.fromDate.slice(0, 10)} a ${r.longestUnbeatenSeason.toDate.slice(0, 10)})`
      : '  maior invencibilidade: (sem dado)',
  );
}

// Guarda de importação: em testes (vitest) o módulo é importado sem executar.
const invokedAsScript = (process.argv[1] ?? '')
  .replace(/\\/g, '/')
  .endsWith('scripts/warm-legends.ts');
if (invokedAsScript) {
  main()
    .catch((err) => {
      console.error('Erro:', (err as Error).message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
