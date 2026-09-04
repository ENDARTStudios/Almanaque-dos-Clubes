/**
 * WS-D / T421 — Ingestão de elencos clube↔jogador via Wikidata (P54) com dedup e anti-órfão.
 *
 * Lê vínculos P54 (member of sports team) + qualificador P580 (ano/temporada) do Wikidata (CC0),
 * resolve jogador/clube por QID contra o acervo e grava em `knowledge_graph` (relation='PLAYED_FOR').
 * Vínculos cujo jogador/clube NÃO exista no acervo NUNCA são persistidos — vão para a fila de revisão
 * (log/report) porque a tabela `knowledge_graph` não tem FK (anti-órfão).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-squads.ts          # DRY-RUN (baixa+parse+reporta, não grava)
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-squads.ts --apply  # grava no banco (teste/CI)
 *
 * Reversível (Postgres):
 *   DELETE FROM knowledge_graph WHERE "relation"='PLAYED_FOR' AND "metadata"->>'dataSource'='wikidata';
 *
 * Variáveis de ambiente (defaults entre parênteses):
 *   SQUADS_MIN_YEAR(1900) · SQUADS_LIMIT(1000) · SQUADS_MAX_PAGES(1 em dry-run, 20 em apply)
 *   SQUADS_PLAYER_CHUNK(400) · SQUADS_TARGET_MIN(10000) — apenas reporte.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchSquads,
  syncSquads,
  squadsDedupKey,
  SQUADS_DEFAULT_USER_AGENT,
  PLAYED_FOR_RELATION,
  SQUADS_DATASOURCE,
  type SquadsEntry,
  type SquadsRepository,
} from '../src/modules/etl/connectors/wikidata-squads.connector.js';

const APPLY = process.argv.includes('--apply');
const MIN_YEAR = Number(process.env.SQUADS_MIN_YEAR ?? 1900);
const LIMIT = Number(process.env.SQUADS_LIMIT ?? 1000);
const MAX_PAGES_DRY = Number(process.env.SQUADS_MAX_PAGES ?? (APPLY ? 20 : 2));
const PLAYER_CHUNK = Number(process.env.SQUADS_PLAYER_CHUNK ?? 400);
const TARGET_MIN = Number(process.env.SQUADS_TARGET_MIN ?? 10000);

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function dedupe(entries: SquadsEntry[]): SquadsEntry[] {
  const byKey = new Map<string, SquadsEntry>();
  for (const e of entries) byKey.set(squadsDedupKey(e), e);
  return [...byKey.values()];
}

function reportSamples(entries: SquadsEntry[], n = 5): void {
  for (const e of entries.slice(0, n)) {
    console.log(`  ${e.playerQid} -> ${e.clubQid} (temporada ${e.year})`);
  }
}

/** Repositório real sobre o Prisma (aplica as quatro operações do contrato). */
function createPrismaSquadsRepository(prisma: PrismaClient): SquadsRepository {
  return {
    async findPlayerByQid(qid) {
      return prisma.player.findFirst({ where: { qid }, select: { id: true } });
    },
    async findClubByQid(qid) {
      return prisma.club.findFirst({ where: { qid }, select: { id: true } });
    },
    async findEdgeByKey({ sourceId, targetId, relation, year }) {
      return prisma.knowledgeGraph.findFirst({
        where: {
          sourceId,
          targetId,
          relation,
          metadata: { path: ['year'], equals: year },
        },
        select: { id: true },
      });
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

async function fetchForCatalog(playerQids: string[], clubQids: string[]): Promise<SquadsEntry[]> {
  const all: SquadsEntry[] = [];
  for (const p of chunk(playerQids, PLAYER_CHUNK)) {
    const page = await fetchSquads({
      playerQids: p,
      clubQids,
      minYear: MIN_YEAR,
      limit: LIMIT,
      maxPages: MAX_PAGES_DRY,
    });
    all.push(...page);
  }
  return dedupe(all);
}

async function main(): Promise<void> {
  console.log('T421 squads inger — elencos clube↔jogador (Wikidata P54 / CC0)');
  console.log(`  user-agent: ${SQUADS_DEFAULT_USER_AGENT}`);
  console.log(`  modo: ${APPLY ? 'APPLY (grava)' : 'DRY-RUN (não grava)'}`);

  if (!APPLY) {
    // Dry-run NÃO abre o banco. Baixa uma amostra, parseia e reporta.
    const entries = await fetchSquads({
      minYear: MIN_YEAR,
      limit: LIMIT,
      maxPages: MAX_PAGES_DRY,
      // Consulta genérica (sem VALUES) sobre todos os P54 do mundo: usar amostragem barata,
      // sem DISTINCT/ORDER BY (senão estoura o timeout 504 do endpoint).
      distinct: false,
      orderBy: false,
    });
    const unique = dedupe(entries);
    console.log(`  vínculos lidos: ${entries.length} | dedup key únicas: ${unique.length}`);
    console.log('  amostra:');
    reportSamples(unique);
    console.log(
      '  DRY-RUN — nada gravado. Rode com --apply para persistir (resolve jogador/clube por QID e aplica anti-órfão).',
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const [players, clubs] = await Promise.all([
      prisma.player.findMany({ where: { qid: { not: null } }, select: { qid: true } }),
      prisma.club.findMany({ where: { qid: { not: null } }, select: { qid: true } }),
    ]);
    const playerQids = players.map((p) => p.qid!).sort();
    const clubQids = clubs.map((c) => c.qid!).sort();

    console.log(
      `  acervo: ${playerQids.length} jogadores com QID · ${clubQids.length} clubes com QID`,
    );

    const entries = await fetchForCatalog(playerQids, clubQids);
    console.log(`  vínculos destilados e deduped: ${entries.length}`);

    const repo = createPrismaSquadsRepository(prisma);
    const result = await syncSquads(entries, repo);

    console.log(
      `  sincronizados: criados=${result.persisted.length} · já-existiam/duplicados=${result.skipped.length} · órfãos=${result.orphans.length}`,
    );
    if (result.orphans.length > 0) {
      console.log(`  FILA DE REVISÃO (não persistidos por anti-órfão): ${result.orphans.length}`);
      for (const o of result.orphans.slice(0, 10)) {
        console.log(`    ${o.playerQid} -> ${o.clubQid} (${o.year}) motivo=${o.reason}`);
      }
    }

    const total = await prisma.knowledgeGraph.count({
      where: { relation: PLAYED_FOR_RELATION },
    });
    const targeted = await prisma.knowledgeGraph.count({
      where: {
        relation: PLAYED_FOR_RELATION,
        metadata: { path: ['dataSource'], equals: SQUADS_DATASOURCE },
      },
    });
    console.log(`  knowledge_graph total PLAYED_FOR=${total} · dataSource=wikidata=${targeted}`);
    if (targeted < TARGET_MIN) {
      console.log(
        `  AVISO: menos de ${TARGET_MIN} vínculos persistidos (${targeted}). Reveja filtros/acervo.`,
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
