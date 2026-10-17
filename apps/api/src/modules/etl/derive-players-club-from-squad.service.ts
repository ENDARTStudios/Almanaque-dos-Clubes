/**
 * Lote da derivação JOGADOR → CLUBE a partir das arestas `PLAYED_FOR` já existentes
 * no knowledge graph. A regra (janela, zero overwrite, clube do acervo, empate) mora
 * em `player-club-from-squad.ts`; aqui é só a fila, a resolução em lote e o carimbo.
 *
 * Cursor PRÓPRIO (`clubFromSquad`), separado da chave `club` do P54 (T551): os dois
 * jobs podem rodar na mesma base sem apagar a tentativa um do outro. `selectPendingPlayers`
 * faz o merge atômico do JSONB.
 *
 * Toda saída carimba — inclusive "sem aresta", "sem ano", "elenco antigo", "clube fora
 * do acervo" e "empate". Sem isso o jogador reencabeça a fila para sempre (o defeito
 * que congelou a mídia no T528).
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as prismaSingleton } from '../../config/prisma.js';
import { selectPendingPlayers, stampPlayerAttempt } from './media-cursor.js';
import {
  deriveClubFromSquadEdges,
  SQUAD_CLUB_SOURCE,
  type SquadClubNoSourceReason,
} from './player-club-from-squad.js';

export interface DerivePlayersClubFromSquadOptions {
  apply: boolean;
  prisma?: PrismaClient;
  /** Reprocessar tentativas com mais de N dias (default: desligado — re-run é noop). */
  refreshDays?: number;
  /** Janela de recência da temporada, em anos (default 2). */
  maxAgeYears?: number;
  /** Injetável para teste determinístico. */
  now?: Date;
  /** Restringe o lote a estes jogadores (operação pontual e fixtures de teste). */
  playerIds?: string[];
}

export interface DerivePlayersClubFromSquadResult {
  /** Jogadores que saíram da fila nesta rodada. */
  processed: number;
  /** Jogadores que ganharam `clubId` nesta rodada. */
  linked: number;
  /** Sem NENHUMA aresta `PLAYED_FOR`. */
  noEdge: number;
  /** Arestas existem, mas nenhuma tem ano válido (`year = 0`). */
  noTemporalSignal: number;
  /** A aresta mais recente é anterior à janela. */
  stale: number;
  /** A aresta mais recente aponta para alvo que não é clube do acervo. */
  outsideArchive: number;
  /** Dois clubes distintos na mesma temporada mais recente. */
  ambiguousLatest: number;
  /** `clubId` foi preenchido entre a seleção e a escrita (corrida) — não sobrescrevemos. */
  alreadyLinked: number;
}

const vazio = (): DerivePlayersClubFromSquadResult => ({
  processed: 0,
  linked: 0,
  noEdge: 0,
  noTemporalSignal: 0,
  stale: 0,
  outsideArchive: 0,
  ambiguousLatest: 0,
  alreadyLinked: 0,
});

/** Contador por motivo de `no_source`. */
function contarNoSource(
  out: DerivePlayersClubFromSquadResult,
  reason: SquadClubNoSourceReason,
): void {
  if (reason === 'no_edge') out.noEdge += 1;
  else if (reason === 'no_temporal_signal') out.noTemporalSignal += 1;
  else if (reason === 'stale') out.stale += 1;
  else if (reason === 'outside_archive') out.outsideArchive += 1;
  else if (reason === 'ambiguous_latest') out.ambiguousLatest += 1;
  else out.alreadyLinked += 1;
}

/**
 * Processa até `limit` jogadores da fila. Nunca lê a rede: o dado já está no grafo.
 * Nunca sobrescreve `clubId` e nunca escreve clube que não esteja no acervo.
 */
export async function derivePlayersClubFromSquadBatch(
  limit: number,
  opts: DerivePlayersClubFromSquadOptions,
): Promise<DerivePlayersClubFromSquadResult> {
  const prisma = opts.prisma ?? prismaSingleton;
  const out = vazio();

  // `clubId IS NULL` no cursor e na escrita: o P54 é dono do que ele já preencheu.
  const pendentes = await selectPendingPlayers(prisma, {
    limit,
    media: ['clubFromSquad'],
    needs: Prisma.sql`"clubId" IS NULL`,
    refreshDays: opts.refreshDays,
    ids: opts.playerIds,
  });
  if (pendentes.length === 0) return out;

  const ids = pendentes.map((p) => p.id);
  const edges = await prisma.knowledgeGraph.findMany({
    where: {
      sourceId: { in: ids },
      sourceType: 'Player',
      relation: 'PLAYED_FOR',
      targetType: 'Club',
    },
    select: { sourceId: true, targetId: true, metadata: true },
  });

  const arestasPorJogador = new Map<string, Array<{ targetId: string; metadata: unknown }>>();
  for (const e of edges) {
    const arr = arestasPorJogador.get(e.sourceId);
    if (arr) arr.push({ targetId: e.targetId, metadata: e.metadata });
    else arestasPorJogador.set(e.sourceId, [{ targetId: e.targetId, metadata: e.metadata }]);
  }

  // Um único lookup para todos os alvos das arestas do lote (bounded por `limit`).
  const alvos = [...new Set(edges.map((e) => e.targetId))];
  const clubes = alvos.length
    ? await prisma.club.findMany({
        where: { id: { in: alvos }, deletedAt: null, kind: 'club' },
        select: { id: true },
      })
    : [];
  const archiveClubIds = new Set(clubes.map((c) => c.id));

  for (const p of pendentes) {
    const decisao = deriveClubFromSquadEdges(arestasPorJogador.get(p.id) ?? [], {
      archiveClubIds,
      maxAgeYears: opts.maxAgeYears,
      now: opts.now,
    });

    if (decisao.status === 'linked') {
      out.linked += 1;
      if (!opts.apply) continue;

      // Guarda atômica: se outro job preencheu `clubId` durante o lote, não sobrescreve.
      const atualizado = await prisma.player.updateMany({
        where: { id: p.id, clubId: null },
        data: { clubId: decisao.clubId },
      });
      if (atualizado.count === 0) {
        out.linked -= 1;
        out.alreadyLinked += 1;
        await stampPlayerAttempt(prisma, p.id, 'clubFromSquad', 'already_present', undefined, {
          source: SQUAD_CLUB_SOURCE,
          reason: 'already_linked',
          year: decisao.year,
        });
        continue;
      }
      await stampPlayerAttempt(prisma, p.id, 'clubFromSquad', 'enriched', undefined, {
        source: SQUAD_CLUB_SOURCE,
        reason: null,
        year: decisao.year,
      });
      continue;
    }

    contarNoSource(out, decisao.reason);
    if (opts.apply) {
      await stampPlayerAttempt(prisma, p.id, 'clubFromSquad', 'no_source', undefined, {
        source: SQUAD_CLUB_SOURCE,
        reason: decisao.reason,
        year: decisao.year,
      });
    }
  }

  out.processed = pendentes.length;
  return out;
}
