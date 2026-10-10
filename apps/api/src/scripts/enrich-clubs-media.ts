/**
 * T502/T506 — CLI do enriquecimento de MÍDIA de clubes (escudo/estádio/cores).
 * Lógica no service (`enrich-media.service.ts`) — compartilhada com o cron T451.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-clubs-media.js --limit=100 --country=BR
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { enrichClubsMediaBatch } from '../modules/etl/enrich-media.service.js';
import { logger } from '../config/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '500' },
    country: { type: 'string', default: '' },
  },
});
const limit = parseInt(values.limit ?? '500', 10) || 500;

async function main(): Promise<number> {
  const mode = values.apply ? 'APPLY' : 'DRY-RUN';
  console.log(
    `[w1] escopo: ate ${limit} clubes · pais=${values.country || 'todos'} · modo=${mode}`,
  );
  const out = await enrichClubsMediaBatch(limit, {
    apply: values.apply,
    ...(values.country ? { country: values.country } : {}),
  });
  console.log(
    `[w1] fim: processados=${out.processed} · atualizados=${values.apply ? out.updated : 0} (dry) · sem-alteracao=${out.skipped}`,
  );
  if (out.unknownColors.length > 0) {
    const uniq = [...new Set(out.unknownColors)];
    console.log(`[w1] cores nao mapeadas (${uniq.length}): ${uniq.slice(0, 8).join(', ')}`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logger.error({ err: String(err).slice(0, 200) }, '[w1] falha no enrich de midia dos clubes');
    process.exit(1);
  });
