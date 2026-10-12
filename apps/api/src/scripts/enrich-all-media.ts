/**
 * T528 — CLI do enriquecimento de mídia em lote (mesmo serviço que o cron usa).
 *
 *   node dist/scripts/enrich-all-media.js                    # dry-run, lote 500
 *   node dist/scripts/enrich-all-media.js --apply            # grava o lote
 *   node dist/scripts/enrich-all-media.js --apply --batch=200
 *   node dist/scripts/enrich-all-media.js --apply --recheck  # prova de noop
 *
 * O cron noturno (`enrich-all-media`, 07:00 UTC) chama ESTE mesmo serviço —
 * não existe caminho paralelo de escrita (padrão T451).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { parseArgs } from 'node:util';
import {
  enrichAllMediaBatch,
  ALL_MEDIA_USER_AGENT,
} from '../modules/etl/enrich-all-media.service.js';
import { logger } from '../config/logger.js';

const DEFAULT_BATCH = 500;

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      batch: { type: 'string', default: String(DEFAULT_BATCH) },
      apply: { type: 'boolean', default: false },
      recheck: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  const batch = Number.parseInt(values.batch ?? String(DEFAULT_BATCH), 10);
  const prisma = new PrismaClient();
  try {
    const started = Date.now();
    const out = await enrichAllMediaBatch(batch, { apply: values.apply, prisma });
    const trophies = await prisma.competition.count({
      where: { trophyImageUrl: { not: null }, trophyModel: { equals: Prisma.DbNull } },
    });
    const pendentes = await prisma.club.count({
      where: { qid: { not: null }, deletedAt: null, mediaEnrichment: { equals: Prisma.DbNull } },
    });

    // Linha estruturada (o alerta de `enriched=0` por 3 dias lê este formato).
    console.log(
      `enrich-all-media: processed=${out.processed} enriched=${out.enriched} gaps=${out.gaps} ` +
        `errors=${out.errors} kits=${out.byMedia.kits.found} anthem=${out.byMedia.anthem.found} ` +
        `pennants=${out.byMedia.pennants.found} trophies_sem_modelo=${trophies} ` +
        `pendentes=${pendentes} modo=${values.apply ? 'apply' : 'dry-run'}${values.recheck ? ' recheck' : ''} ` +
        `ms=${Date.now() - started}`,
    );
    for (const k of ['kits', 'anthem', 'pennants'] as const) {
      const m = out.byMedia[k];
      console.log(`   ${k}: encontrados=${m.found} gap=${m.gap} ja_tinha=${m.already}`);
    }
    if (pendentes > 0) {
      const noites = Math.ceil(pendentes / batch);
      console.log(`   cobertura: faltam ${pendentes} clubes; a ${batch}/noite = ~${noites} noites`);
    }
    logger.info({ ...out, trophies, pendentes, apply: values.apply }, 'enrich-all-media: fim');
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('enrich-all-media')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error(
        { err: String(err).slice(0, 300), ua: ALL_MEDIA_USER_AGENT },
        'enrich-all-media: falha',
      );
      process.exit(1);
    });
}
