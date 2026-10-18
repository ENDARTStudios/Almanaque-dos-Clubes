/**
 * T-24/28 — preenche `clubs.stateId` (estado/província do clube) em DUAS passadas.
 *
 * Por quê: a bandeira do estado aparece em cadeia no mapa via `stateRef → State.flagUrl`
 * (populada pelo `enrich-competitions --states`) — clube sem `stateId` fica sem bandeira.
 *
 * Fonte/licença:
 *   - Passada 1 = ACERVO (determinística): `clubs.cityId → cities.stateId`. Derivada
 *     do próprio banco — re-derivável a qualquer momento, nada externo é lido.
 *   - Passada 2 = Wikidata `action=wbgetentities` (dados **CC0**), `props=claims`:
 *     cadeia de **P131** ("localizado na entidade administrativa") a partir do QID do
 *     clube, com no MÁXIMO 3 saltos. Se qualquer QID visitado estiver em `states.qid`
 *     (coluna única), grava o `stateId` correspondente.
 *
 * GUARDA DE SEGURANÇA (país): um State só é aceito se pertencer ao MESMO país do
 * clube (`states.countryId → countries.iso2 == COALESCE(clubs.country, clubs.countryRef.iso2)`).
 * Cadeia que chega a QID de estado de outro país = DESCARTADA + contador próprio
 * (evita, ex., clube brasileiro caindo num estado uruguaio por homonímia de P131).
 *
 * Regras (idempotent-seed, à risca):
 *   - ZERO OVERWRITE: só clubes com `stateId IS NULL` (re-run = noop por natureza —
 *     sem cursor: quem foi preenchido sai da fila sozinho);
 *   - DRY-RUN é o default (`--apply` grava); contadores nos dois modos;
 *   - `clubs.importedFrom` NUNCA é tocado (nem para marcar proveniência — a
 *     distinção entre passadas é por predicado, ver "Como reverter");
 *   - chunks de 50 QIDs por wbgetentities, 500 ms entre chunks, backoff 429/502
 *     via `fetchWithRetry` (mesmo padrão do enrich-competitions);
 *   - fila ordenada (`ORDER BY name`) — sem ORDER BY não há fila determinística.
 *
 * Como reverter (as passadas são DISTINGUÍVEIS por predicado, pois a passada 1 só
 * grava `stateId = cities.stateId`; NÃO há coluna de proveniência e `importedFrom`
 * fica intocado por design):
 *   -- passada 1 (derivada do acervo):
 *   UPDATE clubs SET "stateId" = NULL
 *    WHERE "stateId" IS NOT NULL AND "cityId" IS NOT NULL
 *      AND "stateId" = (SELECT ci."stateId" FROM cities ci WHERE ci.id = clubs."cityId");
 *   -- passada 2 (Wikidata) = o que SOBRAR depois da de cima:
 *   UPDATE clubs SET "stateId" = NULL
 *    WHERE "stateId" IS NOT NULL
 *      AND NOT ("cityId" IS NOT NULL
 *               AND "stateId" = (SELECT ci."stateId" FROM cities ci WHERE ci.id = clubs."cityId"));
 *
 * Uso (local, Postgres de dev em infra/):
 *   npx tsx scripts/fill-club-states.ts                          # DRY-RUN completo
 *   npx tsx scripts/fill-club-states.ts --apply                  # grava as duas passadas
 *   npx tsx scripts/fill-club-states.ts --apply --country=BR     # passada 2 só Brasil (default BR)
 *   npx tsx scripts/fill-club-states.ts --apply --limit=100      # limita a fila da passada 2
 */
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { fetchWithRetry } from '../lib/http-resilience.js';

const UA = 'AlmanaqueDosClubes-FillClubStates/1.0 (+https://almanaquedosclubes.com)';
const ENTITY_URL = (qids: string[]) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}` +
  `&props=claims&format=json`;
const CHUNK_SIZE = 50;
const PAUSE_MS = 500;
const MAX_HOPS = 3;

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(
  (process.argv.find((a) => a.startsWith('--limit=')) ?? '--limit=500').split('=')[1],
);
const COUNTRY = (
  (process.argv.find((a) => a.startsWith('--country=')) ?? '--country=BR').split('=')[1] ?? 'BR'
).toUpperCase();

// ---------------------------------------------------------------------------
// Extração pura (exportada para teste)
// ---------------------------------------------------------------------------
/** Shape mínimo de wbgetentities usado aqui (só claims). */
interface EntityLike {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
}

/**
 * QIDs "place-like" para iniciar/continuar a caminhada até o estado.
 * PROVADO na fonte (10-18): CLUBES NÃO TÊM P131 (propriedade de lugar) — o
 * caminho canônico é P159 (sede, ex.: Q687712 → Q1642662 = Volta Redonda) e
 * P115 (arena); daí P131 sobe cidade → estado. P131 puro resolvia 2/666.
 */
export function extractPlaceQids(entity: unknown): string[] {
  const claims = (entity as EntityLike | null)?.claims ?? {};
  const out: string[] = [];
  for (const prop of ['P131', 'P159', 'P115'] as const) {
    for (const snak of claims[prop] ?? []) {
      const value = snak?.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
      if (typeof value?.id === 'string' && /^Q\d+$/.test(value.id)) out.push(value.id);
    }
  }
  return out;
}

export interface StateRef {
  id: string;
  /** ISO 3166-1 alpha-2 do país do estado (via states.countryId → countries.iso2). */
  countryIso2: string;
}

export interface P131WalkResult {
  stateId: string | null;
  /** Salto em que o estado foi encontrado (1..maxHops); null se não achou. */
  hopsUsed: number | null;
  /** QIDs visitados (clube + intermediários). */
  visited: number;
  /** QIDs da fronteira cuja entidade não foi obtida do Wikidata. */
  missingEntities: number;
  /** Achou QID de estado, mas de OUTRO país → descartado pela guarda. */
  crossCountryDiscard: boolean;
}

/**
 * Caminhada BFS por P131 a partir do QID do clube (máx. `maxHops`, default 3).
 * Pura: recebe as entidades já buscadas e o índice `states.qid → StateRef`.
 * Primeiro estado ENCONTRADO no salto mais raso vence (cidade antes de região).
 */
export function resolveStateViaP131(input: {
  clubQid: string;
  clubCountryIso2: string | null;
  entities: ReadonlyMap<string, unknown>;
  statesByQid: ReadonlyMap<string, StateRef>;
  maxHops?: number;
}): P131WalkResult {
  const maxHops = input.maxHops ?? MAX_HOPS;
  const out: P131WalkResult = {
    stateId: null,
    hopsUsed: null,
    visited: 0,
    missingEntities: 0,
    crossCountryDiscard: false,
  };
  const visited = new Set<string>([input.clubQid]);
  let frontier: string[] = [input.clubQid];
  for (let hop = 1; hop <= maxHops && frontier.length > 0; hop++) {
    const next: string[] = [];
    for (const qid of frontier) {
      out.visited++;
      const ent = input.entities.get(qid);
      if (!ent) {
        out.missingEntities++;
        continue;
      }
      for (const target of extractPlaceQids(ent)) {
        const state = input.statesByQid.get(target);
        if (state) {
          // GUARDA DE PAÍS: State só é aceito no MESMO país do clube.
          if (input.clubCountryIso2 != null && state.countryIso2 === input.clubCountryIso2) {
            out.stateId = state.id;
            out.hopsUsed = hop;
            return out;
          }
          out.crossCountryDiscard = true;
          continue; // segue procurando outro QID da cadeia
        }
        if (!visited.has(target)) {
          visited.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetch chunkado de entidades (50 QIDs por chamada, backoff T448)
// ---------------------------------------------------------------------------
function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchEntitiesChunked(qids: string[]): Promise<Map<string, EntityLike>> {
  const out = new Map<string, EntityLike>();
  for (const part of chunked([...new Set(qids)], CHUNK_SIZE)) {
    try {
      const res = await fetchWithRetry(
        ENTITY_URL(part),
        { headers: { 'user-agent': UA, Accept: 'application/json' } },
        { label: 'fill-club-states' },
      );
      const json = (await res.json()) as { entities?: Record<string, EntityLike> };
      for (const [qid, ent] of Object.entries(json.entities ?? {})) out.set(qid, ent);
    } catch (err) {
      // Falha ruidosa do CHUNK: os QIDs dele ficam sem dado (contam como erro no
      // resumo); o lote continua. Sem cursor — a fila é `stateId IS NULL`, sempre
      // re-tentável na próxima passada.
      console.error(`  chunk (${part.length} QIDs) falhou: ${(err as Error).message.slice(0, 90)}`);
    }
    await sleep(PAUSE_MS);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Passada 1 — cidade→estado (fonte = acervo, determinística)
// ---------------------------------------------------------------------------
interface Pass1Totals {
  queue: number; // clubs com stateId NULL e cityId preenchido
  resolvable: number; // desses, cuja cidade tem stateId
  withoutCityState: number; // cidade sem estado no acervo (gap declarado)
}

async function pass1CityToState(prisma: PrismaClient): Promise<Pass1Totals> {
  const [row] = await prisma.$queryRaw<Array<{ queue: bigint; resolvable: bigint }>>`
    SELECT
      COUNT(*)::bigint AS queue,
      COUNT(ci."stateId")::bigint AS resolvable
      FROM clubs c
      JOIN cities ci ON ci.id = c."cityId"
     WHERE c."stateId" IS NULL`;
  const totals: Pass1Totals = {
    queue: Number(row?.queue ?? 0),
    resolvable: Number(row?.resolvable ?? 0),
    withoutCityState: 0,
  };
  totals.withoutCityState = totals.queue - totals.resolvable;

  if (!APPLY) {
    console.log(
      `  passada 1 (acervo): fila=${totals.queue} resolvíveis=${totals.resolvable} ` +
        `cidade-sem-estado=${totals.withoutCityState}`,
    );
    return totals;
  }

  if (totals.resolvable > 0) {
    const updated = await prisma.$executeRaw`
      UPDATE clubs AS c
         SET "stateId" = ci."stateId", "updatedAt" = now()
        FROM cities AS ci
       WHERE c."cityId" = ci.id
         AND c."stateId" IS NULL
         AND ci."stateId" IS NOT NULL`;
    console.log(`  passada 1 (acervo): ${updated} clube(s) receberam stateId da cidade`);
    totals.resolvable = Number(updated);
  } else {
    console.log('  passada 1 (acervo): nada a preencher');
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Passada 2 — Wikidata P131 (para quem tem qid e ainda sem estado)
// ---------------------------------------------------------------------------
interface ClubRow {
  id: string;
  qid: string;
  name: string;
  country: string | null;
}

async function loadStatesByQid(prisma: PrismaClient): Promise<Map<string, StateRef>> {
  const rows = await prisma.$queryRaw<Array<{ qid: string; id: string; iso2: string }>>`
    SELECT s.qid, s.id, c.iso2
      FROM states s
      JOIN countries c ON c.id = s."countryId"
     WHERE s.qid IS NOT NULL`;
  const map = new Map<string, StateRef>();
  for (const r of rows) map.set(r.qid, { id: r.id, countryIso2: r.iso2 });
  return map;
}

async function pass2WikidataP131(prisma: PrismaClient): Promise<void> {
  // Fila: qid != null, stateId NULL, não-deletado, do país pedido (COALESCE cobre
  // clube com country legado NULL mas countryId normalizado).
  const clubs = await prisma.$queryRaw<Array<ClubRow>>`
    SELECT c.id, c.qid, c.name, COALESCE(c.country, cc.iso2) AS country
      FROM clubs c
      LEFT JOIN countries cc ON cc.id = c."countryId"
     WHERE c.qid IS NOT NULL
       AND c."stateId" IS NULL
       AND c."deletedAt" IS NULL
       AND COALESCE(c.country, cc.iso2) = ${COUNTRY}
     ORDER BY c.name ASC
     LIMIT ${Math.max(1, LIMIT)}`;
  console.log(`\nPassada 2 (Wikidata P131, país=${COUNTRY}) — fila: ${clubs.length}`);

  const statesByQid = await loadStatesByQid(prisma);
  console.log(`  índice states.qid: ${statesByQid.size} estado(s) com QID`);

  const totals = {
    processed: 0,
    resolved: 0,
    noMatch: 0,
    crossCountry: 0,
    errors: 0,
    byHop: { 1: 0, 2: 0, 3: 0 } as Record<number, number>,
  };

  // Lote a lote: 3 rodadas de fetch = 3 saltos de P131 (rodada 1 = entidades dos
  // clubes; rodadas seguintes = P131 desconhecidos da rodada anterior; QIDs que já
  // são estados conhecidos NÃO são buscados — o índice local basta).
  for (let i = 0; i < clubs.length; i += CHUNK_SIZE) {
    const batch = clubs.slice(i, i + CHUNK_SIZE);
    const entities = new Map<string, EntityLike>();
    const fetched = new Set<string>();
    let frontier: string[] = batch.map((c) => c.qid as string);
    for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop++) {
      const fresh = frontier.filter((q) => !fetched.has(q));
      for (const q of fresh) fetched.add(q);
      const got = await fetchEntitiesChunked(fresh);
      for (const [qid, ent] of got) entities.set(qid, ent);
      const next = new Set<string>();
      for (const qid of fresh) {
        for (const t of extractPlaceQids(entities.get(qid))) {
          if (!statesByQid.has(t) && !fetched.has(t)) next.add(t);
        }
      }
      frontier = [...next];
    }

    for (const club of batch) {
      totals.processed++;
      if (!entities.has(club.qid)) {
        totals.errors++;
        console.log(`  [${club.qid}] ${club.name}: entidade não obtida do Wikidata`);
        continue; // falha de LEITURA — volta na próxima passada (fila = stateId NULL)
      }
      const walk = resolveStateViaP131({
        clubQid: club.qid,
        clubCountryIso2: club.country,
        entities,
        statesByQid,
        maxHops: MAX_HOPS,
      });
      if (walk.stateId) {
        totals.resolved++;
        if (walk.hopsUsed != null)
          totals.byHop[walk.hopsUsed] = (totals.byHop[walk.hopsUsed] ?? 0) + 1;
        if (APPLY) {
          // Guarda de não-sobrescrita: só grava se AINDA estiver NULL.
          await prisma.club.updateMany({
            where: { id: club.id, stateId: null },
            data: { stateId: walk.stateId },
          });
        }
        console.log(
          `  [${club.qid}] ${club.name}: stateId via P131 (salto ${walk.hopsUsed}, ` +
            `${walk.visited} QID visitados)`,
        );
      } else {
        totals.noMatch++;
        if (walk.crossCountryDiscard) totals.crossCountry++;
        const motivo = walk.crossCountryDiscard
          ? 'estado de OUTRO país descartado pela guarda'
          : `nenhum QID de states.qid em até ${MAX_HOPS} saltos`;
        console.log(`  [${club.qid}] ${club.name}: sem estado — ${motivo} (gap declarado)`);
      }
    }
  }

  console.log(
    `\nResumo passada 2 (${APPLY ? 'APPLY' : 'DRY-RUN'}): processado=${totals.processed} ` +
      `resolvido=${totals.resolved} sem-match=${totals.noMatch} ` +
      `cross-country=${totals.crossCountry} erros=${totals.errors} ` +
      `saltos(1/2/3)=${totals.byHop[1] ?? 0}/${totals.byHop[2] ?? 0}/${totals.byHop[3] ?? 0}`,
  );
}

async function main(): Promise<void> {
  console.log(
    `T-24/28 fill-club-states (${APPLY ? 'APPLY' : 'DRY-RUN'}) · país=${COUNTRY} · limit=${LIMIT}`,
  );
  const prisma = new PrismaClient();
  try {
    const p1 = await pass1CityToState(prisma);
    await pass2WikidataP131(prisma);
    if (!APPLY) {
      console.log(
        `\nDRY-RUN: nenhuma escrita foi feita (passada 1 gravaria ${p1.resolvable}). ` +
          'Use --apply para gravar.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Guarda de invocação direta: o módulo exporta extratores puros (testados no
// vitest) — importá-lo NÃO deve conectar no banco nem disparar o bot.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('fill-club-states falhou:', err);
    process.exit(1);
  });
}
