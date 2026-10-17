/**
 * Deriva `players."clubId"` das arestas `PLAYED_FOR` do knowledge graph (T034).
 *
 * Por que existe: a ingestão de elencos grava as arestas, mas `clubId` continuava em
 * 108 de 105.211 jogadores (só o que o P54 do T551 preencheu). O dado de elenco já
 * estava no acervo — faltava lê-lo no campo que a UI usa.
 *
 * A regra de "clube atual" (aresta mais recente, janela de 2 anos, só clube do acervo,
 * empate = no_source, zero overwrite) está em `player-club-from-squad.ts`, com o
 * porquê. O lote e o cursor próprio (`clubFromSquad`) estão em
 * `derive-players-club-from-squad.service.ts`.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/derive-players-club-from-squad.js --limit=300
 *   APPLY:              ... --apply
 *   REFRESH:            ... --apply --refresh-days=30  (default: 0 = só nunca tentado)
 */
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { derivePlayersClubFromSquadBatch } from '../modules/etl/derive-players-club-from-squad.service.js';
import { countPendingPlayers } from '../modules/etl/media-cursor.js';
import { logger } from '../config/logger.js';

/** Teto do lote: a rodada é bounded por decisão (não derruba a API em produção). */
const LIMITE_MAXIMO = 300;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: String(LIMITE_MAXIMO) },
    'refresh-days': { type: 'string', default: '0' },
    'max-age-years': { type: 'string', default: '2' },
  },
});
const pedido = parseInt(values.limit ?? String(LIMITE_MAXIMO), 10) || LIMITE_MAXIMO;
const LIMIT = Math.min(pedido, LIMITE_MAXIMO);
if (pedido > LIMITE_MAXIMO) {
  console.log(`[t582] --limit=${pedido} limitado a ${LIMITE_MAXIMO} por rodada.`);
}
const REFRESH_DAYS = parseInt(values['refresh-days'] ?? '0', 10);
const MAX_AGE_YEARS = parseInt(values['max-age-years'] ?? '2', 10);
if (!Number.isFinite(MAX_AGE_YEARS) || MAX_AGE_YEARS < 0) {
  throw new Error('--max-age-years precisa ser >= 0');
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const refreshDays = REFRESH_DAYS > 0 ? REFRESH_DAYS : undefined;
  try {
    // Mesmo predicado da seleção (cursor `clubFromSquad` + `clubId IS NULL`).
    const { pending } = await countPendingPlayers(prisma, {
      media: ['clubFromSquad'],
      needs: Prisma.sql`"clubId" IS NULL`,
      refreshDays,
    });
    console.log(
      `[t582] escopo: ${pending} jogadores sem clube com tentativa pendente` +
        ` · refresh=${REFRESH_DAYS}d · janela=${MAX_AGE_YEARS}a` +
        ` · lote=${LIMIT} · modo=${values.apply ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (pending === 0) {
      console.log('[t582] nada pendente.');
      return 0;
    }

    const out = await derivePlayersClubFromSquadBatch(LIMIT, {
      apply: values.apply,
      prisma,
      refreshDays,
      maxAgeYears: MAX_AGE_YEARS,
    });
    console.log(
      `[t582] fim: processados=${out.processed} · vinculados=${out.linked}` +
        ` · sem-aresta=${out.noEdge} · sem-ano=${out.noTemporalSignal}` +
        ` · elenco-antigo=${out.stale} · fora-do-acervo=${out.outsideArchive}` +
        ` · empate-ano=${out.ambiguousLatest} · ja-vinculado=${out.alreadyLinked}` +
        `${values.apply ? '' : ' (dry)'}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logger.error({ err: String(err).slice(0, 200) }, '[t582] falha na derivacao clube-elenco');
    process.exit(1);
  });
