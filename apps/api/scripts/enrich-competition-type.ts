/**
 * WS-D / M1 — Enriquecimento do tipo de competição (LEAGUE) por classe Wikidata.
 * As competições ingeridas vêm da classe "association football league" (Q15991303,
 * P31/P279*), logo o type = LEAGUE é mapeado pela CLASSE (não pelo nome).
 * Idempotente: só preenche onde type está null. Reversível: type=NULL.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
async function main() {
  const comps = await prisma.competition.findMany({
    where: { importedFrom: 'wikidata', type: null },
    select: { id: true, name: true },
  });
  console.log('Competições wikidata sem type: ' + comps.length);
  if (!APPLY) {
    console.log('DRY-RUN — seriam marcadas LEAGUE. Rode --apply.');
    for (const c of comps.slice(0, 4)) console.log('  ' + c.name);
    return;
  }
  const res = await prisma.competition.updateMany({
    where: { importedFrom: 'wikidata', type: null },
    data: { type: 'LEAGUE' },
  });
  const byType = await prisma.competition.groupBy({ by: ['type'], _count: { _all: true } });
  console.log('APPLY: atualizadas=' + res.count);
  for (const g of byType) console.log('  type=' + (g.type ?? 'null') + ': ' + g._count._all);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
