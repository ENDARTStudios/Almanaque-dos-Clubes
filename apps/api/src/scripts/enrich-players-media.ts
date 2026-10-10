/**
 * T502/T506 — CLI do enriquecimento de MÍDIA de jogadores (foto/país/posição).
 * Lógica no service (`enrich-media.service.ts`) — compartilhada com o cron T451.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-players-media.js --limit=100
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { enrichPlayersMediaBatch } from '../modules/etl/enrich-media.service.js';
import { logger } from '../config/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '2000' },
  },
});
const limit = parseInt(values.limit ?? '2000', 10) || 2000;

async function main(): Promise<number> {
  const mode = values.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[w2] escopo: ate ${limit} jogadores · modo=${mode}`);
  const out = await enrichPlayersMediaBatch(limit, { apply: values.apply });
  console.log(
    `[w2] fim: processados=${out.processed} · atualizados=${values.apply ? out.updated : 0} (dry) · sem-alteracao=${out.skipped}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logger.error({ err: String(err).slice(0, 200) }, '[w2] falha no enrich de midia dos jogadores');
    process.exit(1);
  });
