/**
 * T424 — Ingestão de futebol feminino via Wikidata (CC0) com dedup e anti-órfão.
 *
 * Ingestão de competições/clubes/jogadoras femininos e dos vínculos P54 (member of
 * sports team, qualificador P580=ano) das jogadoras. Combina o connector PURO
 * wikidata-womens-football com um repositório Prisma real. Vínculos cuja jogadora/clube
 * NÃO exista no acervo NUNCA são persistidos (anti-órfão) — vão para a fila de revisão.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-womens-football.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-womens-football.ts --apply  # grava
 *
 * Reversível (Postgres):
 *   DELETE FROM knowledge_graph WHERE "relation"='PLAYED_FOR' AND "metadata"->>'gender'='women';
 *   -- Entidades (competição/clubes/jogadoras) criadas são idempotentes; re-run não duplica.
 *
 * Convenção de gênero (SEM coluna nova): o metadata.gender="women" nos vínculos e o registro
 * WOMENS_COMPETITION_QIDS (connector) marcam o feminino; a normalização isolada por gênero
 * do Ranking (T425) deriva o gênero desse registro documentado.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchCompetitions,
  fetchClubs,
  fetchPlayers,
  fetchEdges,
  syncWomensFootball,
  womensEdgeDedupKey,
  WOMENS_DEFAULT_USER_AGENT,
  PLAYED_FOR_RELATION,
  WOMENS_DATASOURCE,
  WOMENS_GENDER_VALUE,
  type WomensSyncData,
  type WomensRepository,
} from '../src/modules/etl/connectors/wikidata-womens-football.connector.js';

const APPLY = process.argv.includes('--apply');
const PLAYER_MAX_PAGES = Number(process.env.WOMENS_PLAYER_MAX_PAGES ?? (APPLY ? 8 : 1));
const MAX_PAGES = Number(process.env.WOMENS_MAX_PAGES ?? (APPLY ? 20 : 2));
const LIMIT = Number(process.env.WOMENS_LIMIT ?? 1000);
const TARGET_MIN_COMPETITIONS = Number(process.env.WOMENS_TARGET_MIN_COMPETITIONS ?? 200);
const TARGET_MIN_CLUBS = Number(process.env.WOMENS_TARGET_MIN_CLUBS ?? 500);
const TARGET_MIN_PLAYERS = Number(process.env.WOMENS_TARGET_MIN_PLAYERS ?? 1000);

function dedupe<T extends { qid: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (seen.has(it.qid)) continue;
    seen.add(it.qid);
    out.push(it);
  }
  return out;
}

function dedupeEdges(
  items: Awaited<ReturnType<typeof fetchEdges>>,
): Awaited<ReturnType<typeof fetchEdges>> {
  const seen = new Set<string>();
  const out: Awaited<ReturnType<typeof fetchEdges>> = [];
  for (const e of items) {
    const k = womensEdgeDedupKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function reportSample(
  label: string,
  items: { qid: string; name?: string; fullName?: string }[],
  n = 5,
): void {
  for (const it of items.slice(0, n)) console.log(`  ${label} ${it.qid} ${it.fullName ?? it.name}`);
}

/** Repositório real sobre Prisma (find-or-create por QID + anti-órfão). */
function createPrismaWomensRepository(prisma: PrismaClient): WomensRepository {
  return {
    async findCompetitionByQid(qid) {
      return prisma.competition.findFirst({ where: { qid }, select: { id: true } });
    },
    async upsertCompetition(row, provenance) {
      const byQid = await prisma.competition.findFirst({
        where: { qid: row.qid },
        select: { id: true },
      });
      if (byQid) return { id: byQid.id, created: false };
      const created = await prisma.competition.create({
        data: {
          name: row.name,
          country: row.country,
          qid: row.qid,
          importedFrom: WOMENS_DATASOURCE,
          importedAt: provenance.importedAt,
        },
        select: { id: true },
      });
      return { id: created.id, created: true };
    },
    async findClubByQid(qid) {
      return prisma.club.findFirst({ where: { qid }, select: { id: true } });
    },
    async upsertClub(row, provenance) {
      const byQid = await prisma.club.findFirst({ where: { qid: row.qid }, select: { id: true } });
      if (byQid) return { id: byQid.id, created: false };
      try {
        const created = await prisma.club.create({
          data: {
            name: row.name,
            country: row.country,
            qid: row.qid,
            importedFrom: WOMENS_DATASOURCE,
            importedAt: provenance.importedAt,
          },
          select: { id: true },
        });
        return { id: created.id, created: true };
      } catch (err) {
        // Conflito no unique (name, country): reaproveita o clube existente (sem duplicar).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const byName = await prisma.club.findFirst({
            where: { name: row.name, country: row.country },
            select: { id: true },
          });
          if (byName) return { id: byName.id, created: false };
        }
        throw err;
      }
    },
    async findPlayerByQid(qid) {
      return prisma.player.findFirst({ where: { qid }, select: { id: true } });
    },
    async upsertPlayer(row, provenance) {
      const byQid = await prisma.player.findFirst({
        where: { qid: row.qid },
        select: { id: true },
      });
      if (byQid) return { id: byQid.id, created: false };
      const created = await prisma.player.create({
        data: {
          fullName: row.fullName,
          country: row.country,
          position: row.position,
          qid: row.qid,
          importedFrom: WOMENS_DATASOURCE,
          importedAt: provenance.importedAt,
        },
        select: { id: true },
      });
      return { id: created.id, created: true };
    },
    async findEdgeByKey({ sourceId, targetId, relation, year }) {
      // JSON path filter ('metadata.path') NAO e suportado no client SQLite (so Postgres/MySQL), entao filtro em JS (cross-DB).
      const rows = await prisma.knowledgeGraph.findMany({
        where: { sourceId, targetId, relation },
        select: { id: true, metadata: true },
      });
      const found = rows.find((e) => (e.metadata as Record<string, unknown> | null)?.year === year);
      return found ? { id: found.id } : null;
    },
    async createEdge(args) {
      return prisma.knowledgeGraph.create({
        data: {
          sourceId: args.sourceId,
          sourceType: args.sourceType,
          targetId: args.targetId,
          targetType: args.targetType,
          relation: args.relation,
          metadata: args.metadata as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
    },
  };
}

async function main(): Promise<void> {
  console.log('T424 futebol feminino inger — competicoes/clubes/jogadoras + P54 (Wikidata / CC0)');
  console.log('  user-agent: ' + WOMENS_DEFAULT_USER_AGENT);
  console.log('  modo: ' + (APPLY ? 'APPLY (grava)' : 'DRY-RUN (nao grava)'));

  if (!APPLY) {
    // DRY-RUN nao abre o banco. Baixa amostra barata (sem DISTINCT/ORDER BY para evitar 504).
    const [comps, clubs, players, edges] = await Promise.all([
      fetchCompetitions({ limit: LIMIT, maxPages: MAX_PAGES, distinct: false, orderBy: false }),
      fetchClubs({ limit: LIMIT, maxPages: MAX_PAGES, distinct: false, orderBy: false }),
      fetchPlayers({ limit: LIMIT, maxPages: PLAYER_MAX_PAGES, distinct: false, orderBy: false }),
      fetchEdges({ limit: LIMIT, maxPages: MAX_PAGES, distinct: false, orderBy: false }),
    ]);
    console.log(
      `  amostra validada — competicoes=${comps.length} clubes=${clubs.length} jogadoras=${players.length} vínculos=${edges.length}` +
        ` (dedup: comp=${dedupe(comps).length} club=${dedupe(clubs).length} jog=${dedupe(players).length} edge=${dedupeEdges(edges).length})`,
    );
    console.log('  amostra (competicoes):');
    reportSample('COMP', comps, 3);
    console.log('  amostra (clubes):');
    reportSample('CLUB', clubs, 3);
    console.log('  amostra (jogadoras):');
    reportSample('PLAYER', players, 3);
    console.log(
      '  DRY-RUN — nada gravado. Rode com --apply para persistir (resolve por QID e aplica anti-órfão).',
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    // 1) entidades
    const comps = dedupe(await fetchCompetitions({ limit: LIMIT, maxPages: MAX_PAGES }));
    const clubs = dedupe(await fetchClubs({ limit: LIMIT, maxPages: MAX_PAGES }));
    const players = dedupe(await fetchPlayers({ limit: LIMIT, maxPages: PLAYER_MAX_PAGES }));
    // 2) vínculos, limitados aos clubes do acervo feminino (anti-órfão por construção)
    const clubQids = dedupe(clubs.map((c) => c.qid));
    const edges = dedupeEdges(await fetchEdges({ limit: LIMIT, maxPages: MAX_PAGES, clubQids }));

    const data: WomensSyncData = { competitions: comps, clubs, players, edges };
    console.log(
      `  origem: comp=${comps.length} club=${clubs.length} jog=${players.length} edge=${edges.length}`,
    );

    const repo = createPrismaWomensRepository(prisma);
    const res = await syncWomensFootball(data, repo);
    console.log(
      `  sync: compCriadas=${res.competitions.created.length} compSkip=${res.competitions.skipped.length}`,
    );
    console.log(
      `  sync: clubCriados=${res.clubs.created.length} clubSkip=${res.clubs.skipped.length}`,
    );
    console.log(
      `  sync: jogCriadas=${res.players.created.length} jogSkip=${res.players.skipped.length}`,
    );
    console.log(
      `  sync: edgeCriados=${res.edgesPersisted.length} edgeSkip=${res.edgesSkipped.length} orfaos=${res.orphans.length}`,
    );
    if (res.orphans.length > 0) {
      console.log(
        `  FILA DE REVISAO (nao persistidos por anti-órfao): ${res.orphans.length}` +
          `  ex: ${res.orphans
            .slice(0, 5)
            .map((o) => o.playerQid + '->' + o.clubQid + '/' + o.year + ':' + o.reason)
            .join(' | ')}`,
      );
    }
    console.log(
      '  isolamento por genero — registro feminino (women): ' +
        res.womensQids.length +
        ' QIDs marcados',
    );

    // JSON path filter nao suportado no client SQLite; filtro o gender em JS (cross-DB).
    const edgesAll = await prisma.knowledgeGraph.findMany({
      where: { relation: PLAYED_FOR_RELATION },
      select: { metadata: true },
    });
    const totalEdges = edgesAll.filter(
      (e) => (e.metadata as Record<string, unknown> | null)?.gender === WOMENS_GENDER_VALUE,
    ).length;
    const totalComps = await prisma.competition.count({ where: { qid: { not: null } } });
    const totalClubs = await prisma.club.count({ where: { qid: { not: null } } });
    const totalPlayers = await prisma.player.count({ where: { qid: { not: null } } });
    console.log(
      `  banco: competicoes=${totalComps} clubes=${totalClubs} jogadoras=${totalPlayers} edgesP54Geradas=${totalEdges}`,
    );

    if (comps.length < TARGET_MIN_COMPETITIONS) {
      console.log(
        `  AVISO-HONESTO: apenas ${comps.length} competicoes femininas no Wikidata via classe Q135641755 (meta ${TARGET_MIN_COMPETITIONS}). Nao fabricado.`,
      );
    }
    if (clubs.length < TARGET_MIN_CLUBS) {
      console.log(
        `  AVISO-HONESTO: apenas ${clubs.length} clubes femininos no Wikidata via Q28140340/Q51481377 (meta ${TARGET_MIN_CLUBS}). Nao fabricado.`,
      );
    }
    if (players.length < TARGET_MIN_PLAYERS) {
      console.log(
        `  AVISO-HONESTO: jogadoras amostradas=${players.length} (meta ${TARGET_MIN_PLAYERS}). Aumente WOMENS_PLAYER_MAX_PAGES.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
