/**
 * T578 — CLI do COLETOR DE IMAGENS do Wikimedia Commons (categorias).
 *
 * A lógica vive no service `modules/etl/commons-images.service.ts`, compartilhado com
 * o bot contínuo (`enrich-bot-queues.ts`) — o mesmo lote, o mesmo cursor por tentativa
 * (`commonsLogo`/`commonsPhoto`) e a mesma licença por arquivo. Este arquivo é só a
 * interface de linha de comando.
 *
 *   node dist/scripts/harvest-commons-images.js --kind=club --limit=25            # DRY-RUN
 *   node dist/scripts/harvest-commons-images.js --kind=player --limit=50 --apply
 *   node dist/scripts/harvest-commons-images.js --kind=trophy --limit=20
 *   node dist/scripts/harvest-commons-images.js --kind=club --qid=Q173175          # um alvo só
 *
 * Regras que este coletor respeita (e que a revisão cobra):
 *  - SÓ preenche o que está NULL (nunca sobrescreve imagem existente);
 *  - SÓ grava licença LIVRE verificável por arquivo (política em
 *    `commons-categories.connector.ts`), registrando o motivo da rejeição;
 *  - cadência (~900 ms) + backoff no connector; FALHA DE LEITURA **nunca** carimba
 *    "sem fonte" — o alvo volta na próxima volta.
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_TRY_FILES,
  harvestClubsBatch,
  harvestPlayersBatch,
  harvestTrophiesBatch,
  type HarvestOptions,
  type HarvestReport,
} from '../modules/etl/commons-images.service.js';
import type { HarvestKind } from '../modules/etl/connectors/commons-categories.connector.js';
import { logger } from '../config/logger.js';

function imprimirRelatorio(rep: HarvestReport, apply: boolean): void {
  const motivos = Object.entries(rep.rejections)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => `${k}=${n}`)
    .join(' · ');
  console.log(
    `[commons] ${rep.kind}: processados=${rep.processed} · ` +
      `${apply ? 'gravados' : 'candidatos'}=${rep.enriched} · sem-fonte=${rep.noSource} · ` +
      `erros-leitura=${rep.readErrors}${motivos ? ` · rejeicoes: ${motivos}` : ''}`,
  );
  for (const ex of rep.examples.slice(0, 5)) console.log(`   ✓ ${ex}`);
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      kind: { type: 'string', default: 'club' },
      limit: { type: 'string', default: '25' },
      apply: { type: 'boolean', default: false },
      qid: { type: 'string', default: '' },
      depth: { type: 'string', default: '1' },
      'max-files': { type: 'string', default: '100' },
      'try-files': { type: 'string', default: String(DEFAULT_TRY_FILES) },
    },
  });
  const kind = (values.kind ?? 'club') as HarvestKind;
  if (!['club', 'player', 'trophy'].includes(kind)) {
    console.error(`[commons] --kind invalido: ${kind} (use club|player|trophy)`);
    return 2;
  }
  const limit = Number.parseInt(values.limit ?? '25', 10) || 25;
  const opts: HarvestOptions & { qid?: string } = {
    apply: values.apply,
    depth: Number.parseInt(values.depth ?? '1', 10),
    maxFiles: Number.parseInt(values['max-files'] ?? '100', 10),
    tryFiles: Number.parseInt(values['try-files'] ?? String(DEFAULT_TRY_FILES), 10),
    ...(values.qid ? { qid: values.qid } : {}),
  };
  console.log(
    `[commons] alvo=${kind} · ate ${limit} · escopo=${values.qid || 'fila do cursor'} · ` +
      `modo=${values.apply ? 'APPLY' : 'DRY-RUN'}`,
  );
  const prisma = new PrismaClient();
  try {
    const rep =
      kind === 'club'
        ? await harvestClubsBatch(prisma, limit, opts)
        : kind === 'player'
          ? await harvestPlayersBatch(prisma, limit, opts)
          : await harvestTrophiesBatch(prisma, limit, opts);
    imprimirRelatorio(rep, values.apply);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('harvest-commons-images')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[commons] falha no coletor de imagens');
      process.exit(1);
    });
}
