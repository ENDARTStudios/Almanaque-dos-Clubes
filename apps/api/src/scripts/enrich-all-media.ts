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
      full: { type: 'boolean', default: false },
      concurrency: { type: 'string', default: '4' },
      'max-iter': { type: 'string', default: '60' },
    },
    allowPositionals: true,
  });
  const batch = Number.parseInt(values.batch ?? String(DEFAULT_BATCH), 10);
  const prisma = new PrismaClient();
  try {
    const started = Date.now();
    // T535 — `--full`: laço até não sobrar clube pendente, com progresso a cada
    // `reportEvery` clubes. Roda em background (nohup) sem depender do cron nem do
    // timeout de job; o cursor de tentativa garante que cada clube é visto UMA vez.
    let out = await enrichAllMediaBatch(batch, { apply: values.apply, prisma });
    if (values.full) {
      const total = {
        processed: out.processed,
        enriched: out.enriched,
        gaps: out.gaps,
        errors: out.errors,
      };
      const byMedia = out.byMedia;
      let iter = 1;
      const maxIter = Number.parseInt(values['max-iter'] ?? '60', 10);
      while (out.processed > 0 && iter < maxIter) {
        iter += 1;
        out = await enrichAllMediaBatch(batch, {
          apply: values.apply,
          prisma,
          concurrency: Number.parseInt(values.concurrency ?? '4', 10),
          onProgress: (feitos, totalLote) => {
            if ((total.processed + feitos) % 1000 === 0) {
              console.log(
                `   progresso: ${total.processed + feitos} clubes processados (lote ${feitos}/${totalLote}, iter ${iter})`,
              );
            }
          },
        });
        total.processed += out.processed;
        total.enriched += out.enriched;
        total.gaps += out.gaps;
        total.errors += out.errors;
        for (const k of ['kits', 'anthem', 'pennants'] as const) {
          byMedia[k].found += out.byMedia[k].found;
          byMedia[k].gap += out.byMedia[k].gap;
          byMedia[k].already += out.byMedia[k].already;
        }
        console.log(
          `   iter ${iter}: processados=${out.processed} enriquecidos=${out.enriched} ` +
            `acumulado=${total.processed} (${Math.round((Date.now() - started) / 1000)}s)`,
        );
      }
      out = { ...out, ...total, byMedia };
    }
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
