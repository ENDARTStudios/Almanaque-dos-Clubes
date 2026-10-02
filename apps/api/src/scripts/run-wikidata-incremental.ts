/**
 * T451 — runner manual do job `wikidata-incremental` (fora da fila).
 *
 * Uso (produção, no container — padrão T430):
 *   node dist/scripts/run-wikidata-incremental.js                    # DRY-RUN (default)
 *   node dist/scripts/run-wikidata-incremental.js --dry-run --limit=5
 *   node dist/scripts/run-wikidata-incremental.js --apply            # EXIGE WIKIDATA_DRY_RUN=false no env
 *
 * O apply é duplamente guardado: além de --apply aqui, o WIKIDATA_DRY_RUN
 * do ambiente precisa ser 'false' (defesa em profundidade do T451).
 */
import { runWikidataIncremental } from '../jobs/wikidata-incremental.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const limitArg = argv.find((x) => x.startsWith('--limit='));
  const batchSize = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  if (apply && (process.env.WIKIDATA_DRY_RUN ?? 'true') !== 'false') {
    console.error(
      'RECUSADO: --apply exige WIKIDATA_DRY_RUN=false no ambiente (default dry-run do T451).',
    );
    process.exit(2);
  }

  console.log(
    `T451 wikidata-incremental (${apply ? 'APPLY' : 'DRY-RUN'}${batchSize ? `, batch=${batchSize}` : ''})`,
  );
  const out = await runWikidataIncremental({ batchSize, dryRun: !apply });
  console.log(
    JSON.stringify({
      dryRun: out.dryRun,
      scanned: out.scanned,
      clubsWouldUpdate: out.clubsWouldUpdate,
      clubsUpdated: out.clubsUpdated,
      errors: out.errors,
    }),
  );
  await prismaDisconnect();
}

async function prismaDisconnect(): Promise<void> {
  const { prisma } = await import('../config/prisma.js');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('FALHA:', err instanceof Error ? err.message : err);
  process.exit(1);
});
