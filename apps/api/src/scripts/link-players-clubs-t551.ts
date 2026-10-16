/**
 * T551 — vincula JOGADOR → CLUBE ATUAL a partir do P54 do Wikidata (CC0).
 *
 * Por que existe: `players."clubId"` estava em **0 de 105.211** — a rota
 * `/players?clubId=` já existe e devolvia sempre vazio (não há "elenco" por clube no
 * produto). Nenhuma fonte de blog resolve isso sem risco jurídico; o P54 é dado livre e
 * cobre o acervo inteiro, e o casamento é só contra clubes que JÁ estão no acervo.
 *
 * A regra de "clube atual" (inferência, não campo direto) está em
 * `player-current-club.ts`, com o porquê de cada corte. O LOTE está em
 * `link-players-clubs.service.ts` (T575 — o mesmo lote alimenta o bot contínuo; este
 * script é só a interface de linha de comando, com a saída que o operador já conhece).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/link-players-clubs-t551.js --limit=500
 *   APPLY:              ... --apply
 *   REFRESH:            ... --refresh-days=30   (default: 30 — transferência muda o clube)
 */
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { linkPlayersClubsBatch } from '../modules/etl/link-players-clubs.service.js';
import { countPendingPlayers } from '../modules/etl/media-cursor.js';
import { logger } from '../config/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '500' },
    'refresh-days': { type: 'string', default: '30' },
    'max-age-years': { type: 'string', default: '5' },
  },
});
const LIMIT = parseInt(values.limit ?? '500', 10) || 500;
const REFRESH_DAYS = parseInt(values['refresh-days'] ?? '30', 10);
const MAX_AGE_YEARS = parseInt(values['max-age-years'] ?? '5', 10) || 5;

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  const refreshDays = REFRESH_DAYS > 0 ? REFRESH_DAYS : undefined;
  try {
    // A contagem sai do MESMO predicado da seleção (cursor + "clubId IS NULL") — a linha
    // de escopo mostra a fila real, não o `--limit` pedido.
    const { pending } = await countPendingPlayers(prisma, {
      media: ['club'],
      needs: Prisma.sql`"clubId" IS NULL`,
      refreshDays,
    });
    console.log(
      `[t551] escopo: ${pending} jogadores sem clube · refresh=${REFRESH_DAYS}d · janela=${MAX_AGE_YEARS}a · modo=${values.apply ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (pending === 0) {
      console.log('[t551] nada pendente.');
      return 0;
    }
    const out = await linkPlayersClubsBatch(LIMIT, {
      apply: values.apply,
      prisma,
      refreshDays,
      maxAgeYears: MAX_AGE_YEARS,
    });
    console.log(
      `[t551] fim: processados=${out.processed} · vinculados=${out.linked}` +
        ` · sem-contrato-aberto=${out.noOpenContract} · time-fora-do-acervo=${out.outsideArchive}` +
        ` · clubes-alvo=${out.targetClubsFound}/${out.targetQids}` +
        `${out.failures > 0 ? ` · FALHAS=${out.failures} (nada carimbado, fila intacta)` : ''}` +
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
    logger.error({ err: String(err).slice(0, 200) }, '[t551] falha no vinculo jogador-clube');
    process.exit(1);
  });
