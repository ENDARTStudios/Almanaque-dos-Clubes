/**
 * T-24/28 — seed/link de `states` a partir da coluna legada `clubs.state` +
 * Wikidata P300 (ISO 3166-2), para fechar o mapa por estado (#706/#708).
 *
 * Por quê: `clubs.state` guarda SIGLAS de UF ("MS", "SC", "RS", "CE", "PE"...)
 * com `stateId` NULL — o mapa por estado só cobria 197/418 clubes BR. A tabela
 * `states` tem pouquíssimas linhas comparadas ao domínio ISO 3166-2.
 *
 * Estratégia (duas fases por par distinto `(país, state)` da fila de clubes):
 *   1. MATCH LOCAL primeiro: se existe `State` do MESMO país com
 *      `code = '<ISO2>-<state>'` (case/acento-insensitive) OU
 *      `lower(name) = lower(state)` → apenas LINKA os clubes (`stateId`);
 *      nada é criado.
 *   2. CRIAÇÃO via Wikidata (dados **CC0**), determinística por **P300**
 *      (first-class entity path — a propriedade canônica do ISO 3166-2):
 *      SPARQL `SELECT ?item ?label WHERE { ?item wdt:P300 "<ISO2>-<STATE>" ;
 *      rdfs:label ?label . FILTER(lang(?label)='en') }`. Exatamente 1 item →
 *      cria o State (abaixo) e linka os clubes. 0 ou >1 itens distintos →
 *      par fica `unresolved` (gap declarado, sem invenção).
 *      PROVADO na fonte (2026-10-18): `wdt:P300 "BR-MS"` → Q43319
 *      "Mato Grosso do Sul" (1 hit — caminho que funciona; é o preferencial).
 *   2b. FALLBACK por nome (SÓ se o P300 não resolver e `state` NÃO parecer
 *      código — tem acento/espaço/len>3, ex. "São Paulo"): SPARQL
 *      `?item wdt:P31/wdt:P279* wd:Q10864048 ; rdfs:label "<state>"@en ;
 *      wdt:P17 ?country . ?country wdt:P297 "<ISO2>"` (Q10864048 =
 *      "first-level administrative division"; guarda de país por P297).
 *      PROVADO na fonte (2026-10-18): "São Paulo"@en + P297 "BR" → Q175
 *      (exatamente 1 hit). Regra: 1 item distinto = cria; 0/2+ = unresolved.
 *
 * Criação de State (dedup por `code` @unique — NUNCA sobrescreve linha
 * existente): `{ code: '<ISO2>-<STATE>', name: label-en (ou a própria string
 * `state` se o label faltar), qid, countryId (pelo iso2), importedFrom:
 * 'wikidata:P300', importedAt, sourceUrl: 'https://www.wikidata.org/wiki/<QID>' }`.
 *
 * Regras (idempotent-seed, à risca):
 *   - DRY-RUN é o default (`--apply` grava); contadores nos dois modos;
 *   - ZERO OVERWRITE em states (create-only por code; corrida P2002 = adota) E
 *     em clubs (`stateId` só quando NULL — `UPDATE ... WHERE "stateId" IS NULL`;
 *     re-run = noop por natureza — quem foi linkado sai da fila sozinho);
 *   - `clubs.state` (coluna legada) NUNCA é tocada;
 *   - backoff 429/502 e timeout via `fetchWithRetry` (3 tentativas 1s/2s/4s —
 *     política T426 do projeto) + UA própria + pausa entre queries SPARQL;
 *   - fila determinística: `ORDER BY contagem DESC, country, state`.
 *
 * Como reverter (a parte criada é distinguível por proveniência; o link em
 * clubes para states PRÉ-EXISTENTES é dado canônico do acervo e não precisa
 * reverter):
 *   UPDATE clubs SET "stateId" = NULL
 *    WHERE "stateId" IN (SELECT id FROM states WHERE "importedFrom"='wikidata:P300');
 *   DELETE FROM states WHERE "importedFrom" = 'wikidata:P300';
 *
 * Uso:
 *   npx tsx scripts/seed-states.ts                            # DRY-RUN, todos os países
 *   npx tsx scripts/seed-states.ts --apply                    # grava
 *   npx tsx scripts/seed-states.ts --apply --country=BR       # filtra 1 país (iso2)
 *   npx tsx scripts/seed-states.ts --apply --limit=20         # teto de PARES consultados
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { fetchWithRetry } from '../lib/http-resilience.js';

const UA = 'AlmanaqueDosClubes-SeedStates/1.0 (+https://almanaquedosclubes.com)';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const PAUSE_MS = 500;

const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || Infinity;
const COUNTRY = (
  process.argv.find((a) => a.startsWith('--country='))?.split('=')[1] ?? ''
).toUpperCase();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Funções puras (exportadas para teste) — normalização, matcher local, parse
// ---------------------------------------------------------------------------
/** Maiúsculas + sem acentos + espaços colapsados — chave de comparação estável. */
export function normalizeStateKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * `state` parece SIGLA de código (caminho P300)? Sem acento/espaço e 2–3
 * letras (2ª parte do ISO 3166-2 é 1–3 alfanumérico; no acervo é sigla).
 */
export function looksLikeCode(state: string): boolean {
  const key = normalizeStateKey(state);
  return /^[A-Z]{2,3}$/.test(key);
}

/** '<ISO2>-<STATE>' (ex. BR-MS). null se país/state inválidos (guard). */
export function buildStateCode(countryIso2: string, state: string): string | null {
  const iso2 = normalizeStateKey(countryIso2);
  const st = normalizeStateKey(state);
  if (!/^[A-Z]{2}$/.test(iso2) || st.length === 0) return null;
  return `${iso2}-${st}`;
}

export interface LocalStateRow {
  id: string;
  code: string;
  name: string;
  countryIso2: string;
}

/**
 * Matcher local (fase 1): State do MESMO país cujo `code` caseia com
 * '<ISO2>-<state>' (case/acento-insensitive) OU cujo `name` caseia com a
 * string `state`. Sem match = null (o par segue para o Wikidata).
 */
export function matchLocalState(
  states: readonly LocalStateRow[],
  countryIso2: string,
  state: string,
): LocalStateRow | null {
  const iso2 = normalizeStateKey(countryIso2);
  const stateKey = normalizeStateKey(state);
  const codeKey = buildStateCode(countryIso2, state);
  return (
    states.find(
      (s) =>
        normalizeStateKey(s.countryIso2) === iso2 &&
        ((codeKey !== null && normalizeStateKey(s.code) === codeKey) ||
          normalizeStateKey(s.name) === stateKey),
    ) ?? null
  );
}

export interface SparqlHit {
  qid: string;
  label: string | null;
}

/** QID a partir do URI do binding (`http://www.wikidata.org/entity/Q43319` → Q43319). */
function qidFromUri(uri: string): string | null {
  const m = /\/entity\/(Q\d+)$/.exec(uri);
  return m?.[1] ?? null;
}

/**
 * Parse da resposta SPARQL (bindings → hits). Payload externo é hostil:
 * binding sem item-URI válido é descartado; label ausente = null (o criador
 * usa a própria string `state`).
 */
export function parseSparqlHits(json: unknown): SparqlHit[] {
  const bindings =
    (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } } | null)?.results
      ?.bindings ?? [];
  const out: SparqlHit[] = [];
  for (const b of bindings) {
    const qid = typeof b.item?.value === 'string' ? qidFromUri(b.item.value) : null;
    if (!qid) continue;
    out.push({ qid, label: typeof b.label?.value === 'string' ? b.label.value : null });
  }
  return out;
}

/**
 * Regra de determinância: exatamente 1 QID distinto → hit; 0 ou >1 → null
 * (gap declarado — nunca escolhe "o mais provável").
 */
export function resolveHits(hits: readonly SparqlHit[]): SparqlHit | null {
  const distinct = new Map<string, SparqlHit>();
  for (const h of hits) if (!distinct.has(h.qid)) distinct.set(h.qid, h);
  if (distinct.size !== 1) return null;
  return distinct.values().next().value ?? null;
}

/** Escape de literal SPARQL (aspas/backslash) — a entrada vem do banco. */
export function sparqlString(s: string): string {
  return `"${s.replace(/[\\"]/g, '\\$&')}"`;
}

/** Query canônica P300 (ISO 3166-2) — o caminho que funciona (provado). */
export function p300Query(code: string): string {
  return (
    'SELECT ?item ?label WHERE { ' +
    `?item wdt:P300 ${sparqlString(code)} ; rdfs:label ?label . ` +
    "FILTER(lang(?label)='en') }"
  );
}

/** Fallback por nome (só se P300 falhar e `state` não for sigla). */
export function nameFallbackQuery(state: string, iso2: string): string {
  return (
    'SELECT ?item ?label WHERE { ' +
    '?item wdt:P31/wdt:P279* wd:Q10864048 ; ' +
    `rdfs:label ${sparqlString(state)}@en ; wdt:P17 ?country . ` +
    `?country wdt:P297 ${sparqlString(iso2)} }`
  );
}

// ---------------------------------------------------------------------------
// Rede — SPARQL com a política de resiliência do projeto (T426)
// ---------------------------------------------------------------------------
async function sparql(query: string): Promise<unknown> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetchWithRetry(
    url,
    { headers: { 'user-agent': UA, Accept: 'application/sparql-results+json' } },
    { label: 'seed-states' },
  );
  return res.json();
}

// ---------------------------------------------------------------------------
// Fila — pares distintos (país, state) com contagem de clubes
// ---------------------------------------------------------------------------
interface PairRow {
  country: string | null; // COALESCE(clubs.country, countries.iso2)
  state: string;
  clubs: number;
}

async function collectPairs(prisma: PrismaClient): Promise<PairRow[]> {
  const rows = await prisma.$queryRaw<Array<{ country: string | null; state: string; n: bigint }>>`
    SELECT COALESCE(c.country, cc.iso2) AS country, c.state AS state, COUNT(*)::bigint AS n
      FROM clubs c
      LEFT JOIN countries cc ON cc.id = c."countryId"
     WHERE c."stateId" IS NULL
       AND c.state IS NOT NULL
       AND c."deletedAt" IS NULL
       ${COUNTRY ? Prisma.sql`AND COALESCE(c.country, cc.iso2) = ${COUNTRY}` : Prisma.empty}
     GROUP BY 1, 2
     ORDER BY n DESC, 1 ASC, 2 ASC`;
  return rows.map((r) => ({ country: r.country, state: r.state, clubs: Number(r.n) }));
}

/** Linka (zero-overwrite) os clubes do par → stateId. Retorna quantos linkou. */
async function linkClubs(
  prisma: PrismaClient,
  countryIso2: string,
  state: string,
  stateId: string,
): Promise<number> {
  const updated = await prisma.$executeRaw`
    UPDATE clubs AS c
       SET "stateId" = ${stateId}, "updatedAt" = now()
      WHERE c."stateId" IS NULL
        AND c."deletedAt" IS NULL
        AND c.state = ${state}
        AND COALESCE(c.country, (SELECT cc.iso2 FROM countries cc WHERE cc.id = c."countryId")) =
            ${countryIso2}`;
  return Number(updated);
}

interface Totals {
  pairs: number;
  linkedLocal: number;
  createdStates: number;
  existingStates: number;
  clubsLinked: number;
  unresolved: number;
  noCountry: number;
  errors: number;
}

/**
 * Processa um par (país, state): match local → P300 → fallback por nome →
 * criação create-only + link. Muta apenas `totals`; rede com pausa entre
 * queries. `countries`/`localStates` vêm do acervo (fase de coleta).
 */
async function processPair(
  prisma: PrismaClient,
  pair: PairRow,
  countryIdByIso2: ReadonlyMap<string, string>,
  localStates: readonly LocalStateRow[],
  totals: Totals,
): Promise<void> {
  // GUARD: sem país resolvido não há code nem escopo de match — gap.
  const iso2 = pair.country ? normalizeStateKey(pair.country) : null;
  if (!iso2 || !countryIdByIso2.has(iso2)) {
    totals.noCountry++;
    totals.unresolved++;
    console.log(`  [${pair.country ?? '-'}|${pair.state}] sem país no acervo (gap declarado)`);
    return;
  }

  // FASE 1 — match local (nada é criado)
  const local = matchLocalState(localStates, iso2, pair.state);
  if (local) {
    totals.linkedLocal++;
    console.log(
      `  [${iso2}|${pair.state}] local: "${local.name}" (${local.code}) — ` +
        `${pair.clubs} clube(s) a linkar`,
    );
    if (APPLY) totals.clubsLinked += await linkClubs(prisma, iso2, pair.state, local.id);
    return;
  }

  // FASE 2 — Wikidata P300 (determinística: exatamente 1 item distinto)
  const code = buildStateCode(iso2, pair.state);
  if (!code) {
    totals.unresolved++;
    return;
  }
  let hit: SparqlHit | null; // catch sempre faz return — sem valor inicial
  try {
    hit = resolveHits(parseSparqlHits(await sparql(p300Query(code))));
  } catch (err) {
    totals.errors++;
    console.log(
      `  [${iso2}|${pair.state}] SPARQL P300 falhou: ${(err as Error).message.slice(0, 90)}`,
    );
    await sleep(PAUSE_MS);
    return;
  }
  await sleep(PAUSE_MS);

  // FASE 2b — fallback por nome, SÓ se P300 não resolveu e não é sigla
  if (!hit && !looksLikeCode(pair.state)) {
    try {
      hit = resolveHits(parseSparqlHits(await sparql(nameFallbackQuery(pair.state, iso2))));
    } catch (err) {
      totals.errors++;
      console.log(
        `  [${iso2}|${pair.state}] SPARQL nome falhou: ${(err as Error).message.slice(0, 90)}`,
      );
    }
    await sleep(PAUSE_MS);
  }

  if (!hit) {
    totals.unresolved++;
    console.log(`  [${iso2}|${pair.state}] sem match no Wikidata (gap declarado)`);
    return;
  }

  // Criação create-only por code @unique (nunca sobrescreve) + link.
  let stateId: string | null = null;
  let existed = false;
  const existing = await prisma.state.findUnique({ where: { code }, select: { id: true } });
  if (existing) {
    totals.existingStates++;
    existed = true;
    stateId = existing.id;
  } else if (APPLY) {
    try {
      const created = await prisma.state.create({
        data: {
          code,
          name: hit.label ?? pair.state,
          qid: hit.qid,
          countryId: countryIdByIso2.get(iso2)!,
          importedFrom: 'wikidata:P300',
          importedAt: new Date(),
          sourceUrl: `https://www.wikidata.org/wiki/${hit.qid}`,
        },
        select: { id: true },
      });
      stateId = created.id;
      totals.createdStates++;
    } catch (err) {
      // Corrida benigna P2002 (code surgiu entre findUnique e create).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await prisma.state.findUnique({ where: { code }, select: { id: true } });
        if (winner) {
          totals.existingStates++;
          existed = true;
          stateId = winner.id;
        }
      } else {
        throw err;
      }
    }
  }
  if (!stateId) {
    totals.createdStates++; // DRY-RUN: contabiliza a criação que ocorreria
    console.log(
      `  [${iso2}|${pair.state}] criaria State ${code} = "${hit.label ?? pair.state}" ` +
        `(${hit.qid}) — ${pair.clubs} clube(s) a linkar`,
    );
    return;
  }
  console.log(
    `  [${iso2}|${pair.state}] wikidata: ${code} = "${hit.label ?? pair.state}" ` +
      `(${hit.qid}${existed ? ', já existia' : ', criado'}) — ${pair.clubs} clube(s)`,
  );
  if (APPLY) totals.clubsLinked += await linkClubs(prisma, iso2, pair.state, stateId);
}

async function main(): Promise<void> {
  console.log(
    `T-24/28 seed-states (${APPLY ? 'APPLY' : 'DRY-RUN'}) · país=${COUNTRY || 'todos'} · ` +
      `limit=${LIMIT === Infinity ? '∞' : LIMIT}`,
  );
  const prisma = new PrismaClient();
  const totals: Totals = {
    pairs: 0,
    linkedLocal: 0,
    createdStates: 0,
    existingStates: 0,
    clubsLinked: 0,
    unresolved: 0,
    noCountry: 0,
    errors: 0,
  };
  try {
    const countries = await prisma.country.findMany({ select: { id: true, iso2: true } });
    const countryIdByIso2 = new Map(countries.map((c) => [c.iso2.toUpperCase(), c.id]));
    const localStates = await prisma.$queryRaw<Array<LocalStateRow>>`
      SELECT s.id, s.code, s.name, c.iso2 AS "countryIso2"
        FROM states s JOIN countries c ON c.id = s."countryId"`;
    console.log(`  acervo: ${localStates.length} state(s), ${countries.length} país(es)`);

    const pairs = await collectPairs(prisma);
    const queue = pairs.slice(0, LIMIT === Infinity ? pairs.length : LIMIT);
    totals.pairs = queue.length;
    console.log(`  fila: ${queue.length} par(es) (país,state) — ${pairs.length} no total\n`);

    for (const pair of queue) {
      await processPair(prisma, pair, countryIdByIso2, localStates, totals);
    }

    console.log(
      `\nResumo (${APPLY ? 'APPLY' : 'DRY-RUN'}): pares=${totals.pairs} ` +
        `local=${totals.linkedLocal} states-criados=${totals.createdStates} ` +
        `já-existiam=${totals.existingStates} clubes-linkados=${totals.clubsLinked} ` +
        `unresolved=${totals.unresolved} sem-país=${totals.noCountry} erros=${totals.errors}`,
    );
    if (!APPLY) console.log('DRY-RUN: nenhuma escrita foi feita. Use --apply para gravar.');
  } finally {
    await prisma.$disconnect();
  }
}

// Guarda de invocação direta: o módulo exporta funções puras (testadas no
// vitest) — importá-lo NÃO deve conectar no banco nem disparar o bot.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('seed-states falhou:', err);
    process.exit(1);
  });
}
