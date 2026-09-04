/**
 * WS-D / T423 — Ingestão de estádios via Wikidata (classe Q483110) com dedup (QID), anti-órfão e
 * gravação da geometria PostGIS (`location geometry(Point,4326)`).
 *
 * Lê estádios do Wikidata (CC0), extrai capacidade (P1083), coordenadas (P625), cidade (P131),
 * país (P17->P297) e o clube ocupante (P466). Resolve o clube por `Club.qid` contra o acervo e
 * grava em `stadiums` com `importedFrom='wikidata'` e `importedAt`. Estádio SEM clube associado
 * é persistido com `clubId=null`; estádio COM clube não-casado NUNCA é persistido (fila de revisão).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-stadiums.ts          # DRY-RUN (default) — baixa+parse+reporta, não grava
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-stadiums.ts --apply  # grava no banco (teste/CI)
 *
 * Reversível (Postgres):
 *   DELETE FROM stadiums WHERE "importedFrom"='wikidata';
 *
 * Variáveis de ambiente (defaults entre parênteses):
 *   STADIUMS_LIMIT(500) · STADIUMS_MAX_PAGES(2 em dry-run, 20 em apply) · STADIUMS_CLUB_CHUNK(400)
 *   STADIUMS_TARGET_MIN(500) — apenas reporte, não trava.
 */
import { PrismaClient } from '@prisma/client';
import {
  fetchStadiums,
  syncStadiums,
  stadiumsDedupKey,
  STADIUMS_DEFAULT_USER_AGENT,
  STADIUMS_DATASOURCE,
  type StadiumEntry,
  type StadiumsRepository,
  type StadiumCreateInput,
} from '../src/modules/etl/connectors/wikidata-stadiums.connector.js';

const APPLY = process.argv.includes('--apply');
// BROAD: no modo apply, além dos estádios dos clubes do acervo (P466), também busca uma
// amostra genérica de estádios (classe Q483110). Aumenta o alcance sem varrer os P54 do mundo;
// estádios sem P466 são persistidos com clubId=null; os com P466 não-casado caem na fila de revisão.
const BROAD = process.env.STADIUMS_BROAD === 'true' || process.argv.includes('--broad');
const LIMIT = Number(process.env.STADIUMS_LIMIT ?? 500);
const MAX_PAGES_DRY = Number(process.env.STADIUMS_MAX_PAGES ?? (APPLY ? 20 : 2));
const CLUB_CHUNK = Number(process.env.STADIUMS_CLUB_CHUNK ?? 400);
const TARGET_MIN = Number(process.env.STADIUMS_TARGET_MIN ?? 500);
// O endpoint retorna 504 em consultas pesadas na primeira execução (cache frio) e cacheia depois.
// Retry + backoff exponencial atravessa esses 504 transitórios.
const RETRIES = Number(process.env.STADIUMS_RETRIES ?? 3);
const BACKOFF_MS = Number(process.env.STADIUMS_BACKOFF_MS ?? 10000);

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function dedupe(entries: StadiumEntry[]): StadiumEntry[] {
  const byKey = new Map<string, StadiumEntry>();
  for (const e of entries) byKey.set(stadiumsDedupKey(e), e);
  return [...byKey.values()];
}

function reportStats(label: string, entries: StadiumEntry[]): void {
  const withCoords = entries.filter((e) => e.latitude != null && e.longitude != null).length;
  const withCapacity = entries.filter((e) => e.capacity != null).length;
  const withClub = entries.filter((e) => e.clubQid != null).length;
  console.log('  ' + label + ': ' + entries.length + ' estádios');
  console.log('    com coordenadas (P625): ' + withCoords);
  console.log('    com capacidade (P1083): ' + withCapacity);
  console.log('    com clube associado (P466): ' + withClub);
}

function reportSamples(entries: StadiumEntry[], n = 10): void {
  for (const e of entries.slice(0, n)) {
    const loc =
      e.latitude != null && e.longitude != null
        ? e.latitude.toFixed(4) + ',' + e.longitude.toFixed(4)
        : 'sem-geo';
    console.log(
      '    ' +
        e.qid +
        ' ' +
        e.name +
        ' | cap=' +
        (e.capacity ?? '?') +
        ' | ' +
        loc +
        ' | clube=' +
        (e.clubQid ?? '(sem)') +
        ' | ' +
        (e.country ?? '?'),
    );
  }
}

/** Repositório real sobre o Prisma — cria o estádio e seta o ponto PostGIS `location`. */
function createPrismaStadiumsRepository(prisma: PrismaClient): StadiumsRepository {
  return {
    async findClubByQid(qid) {
      return prisma.club.findFirst({ where: { qid }, select: { id: true } });
    },
    async findStadiumByQid(qid) {
      return prisma.stadium.findFirst({ where: { qid }, select: { id: true } });
    },
    async createStadium(args: StadiumCreateInput) {
      const created = await prisma.stadium.create({
        data: {
          name: args.name,
          qid: args.qid,
          latitude: args.latitude ?? null,
          longitude: args.longitude ?? null,
          capacity: args.capacity ?? null,
          city: args.city ?? null,
          state: args.state ?? null,
          country: args.country ?? null,
          surface: args.surface ?? null,
          clubId: args.clubId ?? null,
          importedFrom: args.importedFrom,
          importedAt: args.importedAt,
        },
        select: { id: true },
      });
      // Preenche a geometria PostGIS (coluna `location`, Unsupported no Prisma).
      if (args.latitude != null && args.longitude != null) {
        await prisma.$executeRaw`
          UPDATE stadiums
          SET location = ST_SetSRID(ST_MakePoint(${args.longitude}, ${args.latitude}), 4326)
          WHERE id = ${created.id}
        `;
      }
      return created;
    },
  };
}

async function main(): Promise<void> {
  console.log('T423 stadiums ingest — estádios via Wikidata (Q483110 / CC0 / PostGIS)');
  console.log('  user-agent: ' + STADIUMS_DEFAULT_USER_AGENT);
  console.log('  modo: ' + (APPLY ? 'APPLY (grava)' : 'DRY-RUN (não grava)'));

  if (!APPLY) {
    // DRY-RUN — NÃO abre banco. Baixa uma amostra genérica (sem VALUES), valida e reporta.
    const entries = await fetchStadiums({
      limit: LIMIT,
      maxPages: MAX_PAGES_DRY,
      distinct: false,
      orderBy: false,
    });
    const unique = dedupe(entries);
    reportStats('estádios lidos', entries);
    console.log('  dedup key únicas (QID): ' + unique.length);
    console.log('  amostra:');
    reportSamples(unique);
    console.log(
      '  DRY-RUN — nada gravado. Rode com --apply para persistir (resolve clube por QID e aplica anti-órfão).',
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const clubs = await prisma.club.findMany({
      where: { qid: { not: null } },
      select: { qid: true },
    });
    const clubQids = clubs.map((c) => c.qid!).sort();
    console.log('  acervo: ' + clubQids.length + ' clubes com QID');

    const entries: StadiumEntry[] = [];
    if (clubQids.length > 0) {
      for (const c of chunk(clubQids, CLUB_CHUNK)) {
        // ORDER BY sobre a transitiva de Q483110 é caro e estoura o timeout (HTTP 504)
        // do endpoint; usamos amostragem sem DISTINCT/ORDER BY e o dedup por QID resolve overlap.
        const page = await fetchStadiums({
          clubQids: c,
          limit: LIMIT,
          maxPages: MAX_PAGES_DRY,
          distinct: false,
          orderBy: false,
          maxRetries: RETRIES,
          backoffMs: BACKOFF_MS,
        });
        entries.push(...page);
      }
      console.log('  estádios dos clubes do acervo (P466, dedup): ' + entries.length);
    }
    if (BROAD || clubQids.length === 0) {
      const broad = await fetchStadiums({
        limit: LIMIT,
        maxPages: MAX_PAGES_DRY,
        distinct: false,
        orderBy: false,
        maxRetries: RETRIES,
        backoffMs: BACKOFF_MS,
      });
      entries.push(...broad);
      console.log('  amostra genérica (classe Q483110) adicionada: ' + broad.length);
    }
    const unique = dedupe(entries);
    console.log('  estádios únicos (dedup por QID): ' + unique.length);

    const repo = createPrismaStadiumsRepository(prisma);
    const result = await syncStadiums(unique, repo);

    console.log(
      '  sincronizados: criados=' +
        result.persisted.length +
        ' · já-existiam/duplicados=' +
        result.skipped.length +
        ' · órfãos=' +
        result.orphans.length,
    );
    if (result.orphans.length > 0) {
      console.log('  FILA DE REVISÃO (não persistidos por anti-órfão): ' + result.orphans.length);
      for (const o of result.orphans.slice(0, 10)) {
        console.log(
          '    ' + o.qid + ' ' + o.name + ' motivo=club_missing (' + (o.clubQid ?? '?') + ')',
        );
      }
    }

    const persistedEntries = result.persisted.map((p) => p);
    reportStats('persistidos (criados agora)', persistedEntries);

    const total = await prisma.stadium.count();
    const targeted = await prisma.stadium.count({ where: { importedFrom: STADIUMS_DATASOURCE } });
    const withGeo = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
      SELECT COUNT(*)::int AS n FROM stadiums WHERE location IS NOT NULL
    `;
    console.log('  stadiums total=' + total + ' · importedFrom=wikidata=' + targeted);
    console.log('  stadiums com PostGIS location preenchido = ' + (withGeo[0]?.n ?? 0));
    if (targeted < TARGET_MIN) {
      console.log(
        '  AVISO: menos de ' +
          TARGET_MIN +
          ' estádios persistidos (' +
          targeted +
          '). Reveja filtros/acervo (muitos itens Wikidata de estádio não têm P625/P1083).',
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
