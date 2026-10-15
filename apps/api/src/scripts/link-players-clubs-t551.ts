/**
 * T551 — vincula JOGADOR → CLUBE ATUAL a partir do P54 do Wikidata (CC0).
 *
 * Por que existe: `players."clubId"` estava em **0 de 105.211** — a rota
 * `/players?clubId=` já existe e devolvia sempre vazio (não há "elenco" por clube no
 * produto). Nenhuma fonte de blog resolve isso sem risco jurídico; o P54 é dado livre e
 * cobre o acervo inteiro, e o casamento é só contra clubes que JÁ estão no acervo.
 *
 * A regra de "clube atual" (inferência, não campo direto) está em
 * `player-current-club.ts`, com o porquê de cada corte.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/link-players-clubs-t551.js --limit=500
 *   APPLY:              ... --apply
 *   REFRESH:            ... --refresh-days=30   (default: 30 — transferência muda o clube)
 */
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  fetchEntities,
  MEDIA_USER_AGENT,
} from '../modules/etl/connectors/wikidata-media.connector.js';
import { currentTeamQid, type P54StatementLike } from '../modules/etl/player-current-club.js';
import { selectPendingPlayers, stampPlayerAttempt } from '../modules/etl/media-cursor.js';
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
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    // Cursor próprio (`club`): a fila avança por tentativa, não por "campo vazio".
    // `refreshDays` porque transferência muda o clube atual — e faz o caso
    // "time fora do acervo" se curar sozinho se o clube entrar numa ingestão futura.
    const pendentes = await selectPendingPlayers(prisma, {
      limit: LIMIT,
      media: ['club'],
      needs: Prisma.sql`"clubId" IS NULL`,
      refreshDays: REFRESH_DAYS > 0 ? REFRESH_DAYS : undefined,
    });
    console.log(
      `[t551] escopo: ${pendentes.length} jogadores sem clube · refresh=${REFRESH_DAYS}d · janela=${MAX_AGE_YEARS}a · modo=${values.apply ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (pendentes.length === 0) {
      console.log('[t551] nada pendente.');
      return 0;
    }

    const entities = new Map<string, { claims?: Record<string, unknown> }>();
    const qids = pendentes.map((p) => p.qid);
    for (let i = 0; i < qids.length; i += 50) {
      const res = await fetchEntities(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) entities.set(qid, e as { claims?: Record<string, unknown> });
    }

    const alvo = new Map<string, string>();
    let semContratoAberto = 0;
    for (const p of pendentes) {
      const t = currentTeamQid(entities.get(p.qid)?.claims?.P54 as P54StatementLike[] | undefined, {
        maxAgeYears: MAX_AGE_YEARS,
      });
      if (t) alvo.set(p.id, t);
      else semContratoAberto += 1;
    }

    // Só vincula a clube DO ACERVO, e só se for clube de verdade (P54 aponta para seleção
    // e time juvenil também; `kind` filtra).
    const qidsAlvo = [...new Set(alvo.values())];
    const clubes = qidsAlvo.length
      ? await prisma.club.findMany({
          where: { qid: { in: qidsAlvo }, deletedAt: null, kind: 'club' },
          select: { id: true, qid: true },
        })
      : [];
    const porQid = new Map(clubes.map((c) => [c.qid as string, c.id]));

    let vinculados = 0;
    let foraDoAcervo = 0;
    for (const p of pendentes) {
      const alvoQid = alvo.get(p.id);
      const clubId = alvoQid ? porQid.get(alvoQid) : undefined;
      if (clubId) {
        if (values.apply) {
          await prisma.player.update({ where: { id: p.id }, data: { clubId } });
          await stampPlayerAttempt(prisma, p.id, 'club', 'enriched');
        }
        vinculados += 1;
        continue;
      }
      // Nada gravado: carimba a TENTATIVA (senão o jogador volta à cabeça da fila sempre).
      if (values.apply) await stampPlayerAttempt(prisma, p.id, 'club', 'no_source');
      if (alvoQid) foraDoAcervo += 1;
    }

    console.log(
      `[t551] fim: processados=${pendentes.length} · vinculados=${vinculados}` +
        ` · sem-contrato-aberto=${semContratoAberto} · time-fora-do-acervo=${foraDoAcervo}` +
        ` · clubes-alvo=${porQid.size}/${qidsAlvo.length}${values.apply ? '' : ' (dry)'}`,
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
