/**
 * T034 (mapeamento do portal, Operador 09/10) — ingESTA de JOGADORES em escala
 * via Wikidata P54, criando vínculos PLAYED_FOR que alimentam os perfis.
 *
 * REGRAS (do briefing):
 *  - Dedup por QID (nunca duplicar); ZERO overwrite de jogador existente;
 *  - Proveniência obrigatória (qid + importedFrom='wikidata-players' + sourceUrl);
 *  - Clube fora do acervo = recusa honesta (anti-órfão — nunca cria clube);
 *  - Sem P54 = não entra; não toca rankings/entries;
 *  - Rate limit Wikidata 1 req/s + User-Agent identificado (connector).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/ingest-players-squads.js --countries=BR --max-pages=2
 *   APPLY:              ... --apply            (lotes de 100 jogadores)
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchPlayersSquads,
  type PlayerSquad,
  PLAYERS_SQUADS_USER_AGENT,
} from '../modules/etl/connectors/wikidata-players-squads.connector.js';
import {
  syncSquads,
  type SquadsEntry,
  type SquadsRepository,
} from '../modules/etl/connectors/wikidata-squads.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const BATCH = 100; // regra do Operador: apply em lotes de 100

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    countries: { type: 'string', default: 'BR' },
    'max-pages': { type: 'string', default: '3' },
    'page-size': { type: 'string', default: '500' },
    limit: { type: 'string', default: '' },
  },
});
const COUNTRIES = (values.countries ?? 'BR').split(',').map((c) => c.trim().toUpperCase());
const MAX_PAGES = Math.max(1, parseInt(values['max-pages'] ?? '3', 10));
const PAGE_SIZE = Math.min(Math.max(parseInt(values['page-size'] ?? '500', 10) || 500, 100), 1000);
const LIMIT = values.limit ? parseInt(values.limit, 10) : Infinity;

export interface IngestStats {
  playersFetched: number;
  playersCreated: number;
  playersExisting: number;
  edgesCreated: number;
  edgesSkipped: number;
  clubMissingLinks: number;
  yearlessLinks: number;
  batches: number;
}

/** Cria os jogadores ausentes (insert-only, zero overwrite) em lotes de 100. */
export async function createMissingPlayers(
  missing: PlayerSquad[],
  prisma: PrismaClient,
): Promise<{ created: number; batches: number }> {
  let created = 0;
  let batches = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    batches += 1;
    for (const p of chunk) {
      try {
        await prisma.player.create({
          data: {
            fullName: p.name.slice(0, 300),
            birthDate: p.birthDate ? new Date(p.birthDate) : null,
            country: p.countryCode,
            gender: p.gender,
            position: p.position,
            qid: p.qid,
            importedFrom: 'wikidata-players',
            importedAt: new Date(),
            sourceUrl: 'https://www.wikidata.org/wiki/' + p.qid,
          },
        });
        created += 1;
      } catch (err) {
        // P2002 = corrida de unique(qid) — já existe, mantém (zero overwrite).
        if ((err as { code?: string }).code !== 'P2002') throw err;
      }
    }
  }
  return { created, batches };
}

/** Cria as arestas PLAYED_FOR (com ano via dedup year; sem ano via sentinel 0). */
export async function linkEdges(
  players: PlayerSquad[],
  prisma: PrismaClient,
  clubIdByQid: Map<string, string>,
  playerIdByQid: Map<string, string>,
): Promise<{ created: number; skipped: number; clubMissing: number }> {
  const repo: SquadsRepository = {
    async findPlayerByQid(qid) {
      const cached = playerIdByQid.get(qid);
      if (cached) return { id: cached };
      return prisma.player.findFirst({ where: { qid }, select: { id: true } });
    },
    async findClubByQid(qid) {
      const cached = clubIdByQid.get(qid);
      if (cached) return { id: cached };
      return prisma.club.findFirst({ where: { qid }, select: { id: true } });
    },
    async findEdgeByKey({ sourceId, targetId, relation, year }) {
      return prisma.knowledgeGraph.findFirst({
        where: { sourceId, targetId, relation, metadata: { path: ['year'], equals: year } },
        select: { id: true },
      });
    },
    async createEdge(args) {
      return prisma.knowledgeGraph.create({
        data: { ...args, metadata: args.metadata as Prisma.InputJsonValue },
        select: { id: true },
      });
    },
  };

  let created = 0;
  let skipped = 0;
  let clubMissing = 0;

  for (const player of players) {
    for (const link of player.teams) {
      const year = link.startYear ?? link.endYear ?? 0; // 0 = vínculo sem ano (honesto)
      const entry: SquadsEntry = {
        playerQid: player.qid,
        clubQid: link.clubQid,
        year: year >= 1900 ? year : 0,
      };
      const result = await syncSquads([entry], repo, {
        sourceUrlBase: 'https://www.wikidata.org/wiki/',
      });
      if (result.orphans.length > 0) {
        clubMissing += 1;
        continue;
      }
      if (result.persisted.length > 0) {
        // Enriquece o metadata com P54:true e startYear/endYear reais.
        const edgeId = result.persisted[0].edgeId!;
        const meta = {
          P54: true,
          startYear: link.startYear,
          endYear: link.endYear,
          dataSource: 'wikidata',
          license: 'CC0',
          sourceUrl: 'https://www.wikidata.org/wiki/' + player.qid,
          ...(year >= 1900 ? { year, season: String(year) } : {}),
        };
        await prisma.knowledgeGraph.update({
          where: { id: edgeId },
          data: { metadata: meta as Prisma.InputJsonValue },
        });
        created += 1;
      } else {
        skipped += result.skipped.length;
      }
    }
  }
  return { created, skipped, clubMissing };
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    // 1. Clubes do escopo (país + QID) — fora do acervo = recusa honesta.
    const clubs = await prisma.club.findMany({
      where: { country: { in: COUNTRIES }, qid: { not: null }, deletedAt: null },
      select: { id: true, qid: true, name: true },
    });
    const clubQids = clubs.map((c) => c.qid!).filter(Boolean);
    const clubIdByQid = new Map(clubs.map((c) => [c.qid!, c.id]));
    console.log(
      `[t034] escopo: países=${COUNTRIES.join(',')} · clubes com QID=${clubQids.length} · modo=${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (clubQids.length === 0) {
      console.log('[t034] nenhum clube no escopo — nada a fazer.');
      return 0;
    }

    // 2. Wikidata: jogadores com P54 nesses clubes (1 req/s, User-Agent identificado).
    // VALUES grandes derrubam o Query Service (503) — chunk de 50 clubes por query,
    // dedup por QID entre chunks (jogador pode ter P54 em clubes de chunks distintos).
    const CLUB_CHUNK = 50;
    const byQid = new Map<string, PlayerSquad>();
    for (let i = 0; i < clubQids.length; i += CLUB_CHUNK) {
      const chunk = clubQids.slice(i, i + CLUB_CHUNK);
      console.log(`[t034] wikidata chunk ${Math.floor(i / CLUB_CHUNK) + 1}/${Math.ceil(clubQids.length / CLUB_CHUNK)} (${chunk.length} clubes)…`);
      const found = await fetchPlayersSquads({
        clubQids: chunk,
        limit: PAGE_SIZE,
        maxPages: MAX_PAGES,
        userAgent: PLAYERS_SQUADS_USER_AGENT,
      });
      for (const p of found) if (!byQid.has(p.qid)) byQid.set(p.qid, p);
    }
    const players = [...byQid.values()];
    const capped = players.slice(0, LIMIT);
    console.log(
      `[t034] wikidata: ${players.length} jogadores com P54+dados (limitado a ${capped.length})`,
    );

    // 3. Dedup por QID contra o acervo (zero overwrite).
    const qids = capped.map((p) => p.qid);
    const existing = await prisma.player.findMany({
      where: { qid: { in: qids } },
      select: { id: true, qid: true },
    });
    const existingQids = new Set(existing.map((e) => e.qid));
    const missing = capped.filter((p) => !existingQids.has(p.qid));
    const sample = missing
      .slice(0, 5)
      .map(
        (p) => `${p.qid} ${p.name} (${p.position ?? 's/posição'}, ${p.countryCode ?? 's/país'})`,
      );
    console.log(
      `[t034] dedup: existentes=${existing.length} · wouldCreate=${missing.length} · vínculos=${missing.reduce((n, p) => n + p.teams.length, 0)}`,
    );
    for (const s of sample) console.log(`  amostra: ${s}`);

    if (!APPLY) {
      console.log('[t034] DRY-RUN — nada gravado. Rode com --apply.');
      return 0;
    }

    // 4. APPLY: cria ausentes (lotes 100) e depois vincula (anti-órfão).
    const created = await createMissingPlayers(missing, prisma);
    console.log(`[t034] jogadores criados=${created.created} em ${created.batches} lote(s)`);

    const now = await prisma.player.findMany({
      where: { qid: { in: qids } },
      select: { id: true, qid: true },
    });
    const playerIdByQid = new Map(now.map((e) => [e.qid!, e.id]));
    const links = await linkEdges(capped, prisma, clubIdByQid, playerIdByQid);
    console.log(
      `[t034] vínculos PLAYED_FOR: criados=${links.created} · já-existiam=${links.skipped} · clube-fora-do-acervo (recusados)=${links.clubMissing}`,
    );

    const edgesTotal = await prisma.knowledgeGraph.count({
      where: { relation: 'PLAYED_FOR', metadata: { path: ['P54'], equals: true } },
    });
    console.log(`[t034] knowledge_graph PLAYED_FOR com P54:true = ${edgesTotal}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('ingest-players-squads')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err }, '[t034] falha na ingestão de jogadores');
      process.exit(1);
    });
}
