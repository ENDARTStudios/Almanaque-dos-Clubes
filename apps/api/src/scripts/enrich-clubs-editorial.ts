/**
 * T507 (W5) — CLI do texto editorial de clubes via Wikipedia REST (pt/en/es, CC-BY-SA).
 * Lógica no service (`enrich-media.service.ts`) — compartilhada com o cron 06:00.
 *
 * T549 — antes este script tinha um laço próprio que selecionava por `editorialText IS NULL`
 * e nunca escrevia `clubs."mediaEnrichment"`: relia o mesmo começo da fila a cada execução.
 * Agora delega ao batch, que usa o cursor por tentativa (chave `editorial`).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-clubs-editorial.js --limit=100 [--country=BR]
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { enrichClubsEditorialBatch } from '../modules/etl/enrich-media.service.js';
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
    `[w5] escopo: ate ${limit} clubes · pais=${values.country || 'todos'} · modo=${mode}`,
  );
  const out = await enrichClubsEditorialBatch(limit, {
    apply: values.apply,
    ...(values.country ? { country: values.country } : {}),
  });
  console.log(
    `[w5] fim: processados=${out.processed} · atualizados=${values.apply ? out.updated : 0} (dry) · sem-artigo=${out.skipped}`,
  );
  return 0;
}

if (process.argv[1]?.includes('enrich-clubs-editorial')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[w5] falha no enriquecimento editorial');
      process.exit(1);
    });
}
