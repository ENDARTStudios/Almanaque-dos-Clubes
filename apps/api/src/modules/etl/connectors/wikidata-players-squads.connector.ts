/**
 * Mapeamento do portal / T034 (Operador, 09/10) — ingESTA de JOGADORES em escala
 * via Wikidata P54 (member of sports team), criando vínculos PLAYED_FOR que
 * alimentam os perfis de jogador.
 *
 * ARQUITETURA (2 fases baratas — a query "rica" com labels/P106/OPTIONALs
 * expirava no Query Service e voltava PARCIAL sem erro, lição 09/10):
 *  1. SPARQL minimalista de vínculos (padrão T421): player→club + P580/P582.
 *  2. Enriquecimento por Special:EntityData em lotes de 50 (barato, sem SPARQL):
 *     rótulo (pt>en>es), P569, P27→ISO (via mapa P297 obtido 1×), P21, P413
 *     (rótulo EN dos QIDs de posição), P106 (futebolista Q11513337 OU treinador
 *     Q1920462 — filtro pós-busca).
 *
 * Fonte: Wikidata (CC0). Rate limit 1 req/s + User-Agent identificado.
 */
import { z } from 'zod';

export const PLAYERS_SQUADS_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata players P54 ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const PLAYERS_SQUADS_MIN_INTERVAL_MS = 1000; // 1 req/s (regra do Operador)
export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

/** Ocupações aceitas: futebolista (Q11513337) OU treinador de futebol (Q1920462). */
// QIDs validados na Wikidata em 09/10 (lição T424 de novo — os QIDs do briefing
// eram de ATLETISMO e de uma MARIPOSA!): futebolista Q937857, treinador Q628099.
export const OCCUPATION_QIDS = ['Q937857', 'Q628099'] as const;

/** Gênero Wikidata → valor do acervo. */
const GENDER_MAP: Record<string, 'men' | 'women'> = {
  Q6581097: 'men',
  Q6581072: 'women',
};

/** P413 (rótulo EN) → posição do acervo. Desconhecida ⇒ null (nunca inventar). */
export function positionFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('goalkeeper')) return 'GOALKEEPER';
  if (l.includes('defender') || l.includes('centre-back') || l.includes('fullback'))
    return 'DEFENDER';
  if (l.includes('midfielder')) return 'MIDFIELDER';
  if (l.includes('forward') || l.includes('striker') || l.includes('winger')) return 'FORWARD';
  return null;
}

function qidFromUri(uri: string | undefined): string | null {
  const last = uri?.trim().split('/').pop();
  return last && /^Q\d+$/.test(last) ? last : null;
}
function yearFromIso(value: string | undefined): number | null {
  const m = /^(\d{4})-/.exec(value ?? '');
  if (!m) return null;
  const y = Number.parseInt(m[1], 10);
  return Number.isInteger(y) ? y : null;
}

// ---------------------------------------------------------------------------
// Fase 1 — SPARQL minimalista de vínculos
// ---------------------------------------------------------------------------

export interface BuildLinksQueryOptions {
  clubQids: string[];
  limit?: number;
  offset?: number;
}

/** Igual ao T421: player→club + P580/P582, sem labels/P106/OPTIONALs caros. */
export function buildLinksQuery(opts: BuildLinksQueryOptions): string {
  const { clubQids, limit = 1000, offset = 0 } = opts;
  const values = clubQids.map((q) => 'wd:' + q).join(' ');
  return `SELECT ?player ?club ?start ?end WHERE {
  VALUES ?club { ${values} }
  ?player p:P54 ?stmt .
  ?stmt ps:P54 ?club .
  OPTIONAL { ?stmt pq:P580 ?start . }
  OPTIONAL { ?stmt pq:P582 ?end . }
}
LIMIT ${limit} OFFSET ${offset}`;
}

export interface PlayerLink {
  playerQid: string;
  clubQid: string;
  startYear: number | null;
  endYear: number | null;
}

const bindingsShape = z
  .object({
    results: z
      .object({
        bindings: z
          .array(
            z.record(z.string(), z.unknown()) as z.ZodType<
              Record<string, { type?: string; value?: string } | undefined>
            >,
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export function parseLinksResponse(json: unknown): PlayerLink[] {
  const parsed = bindingsShape.safeParse(json);
  if (!parsed.success) return [];
  const out: PlayerLink[] = [];
  const seen = new Set<string>();
  for (const b of parsed.data.results?.bindings ?? []) {
    const playerQid = qidFromUri(b.player?.value);
    const clubQid = qidFromUri(b.club?.value);
    if (!playerQid || !clubQid) continue;
    const key = `${playerQid}|${clubQid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      playerQid,
      clubQid,
      startYear: yearFromIso(b.start?.value),
      endYear: yearFromIso(b.end?.value),
    });
  }
  return out;
}

export interface FetchLinksOptions {
  endpoint?: string;
  userAgent?: string;
  clubQids: string[];
  /** Tamanho do chunk de clubes por query (VALUES grandes → 503). */
  clubChunk?: number;
  pageLimit?: number;
  maxPagesPerChunk?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
}

/**
 * Fase 1: busca vínculos por chunks de clubes, paginando cada chunk até
 * página vazia, com retry 3× (backoff 2/4s) e intervalo mínimo entre requests.
 */
export async function fetchLinks(opts: FetchLinksOptions): Promise<PlayerLink[]> {
  const {
    endpoint = WIKIDATA_SPARQL_ENDPOINT,
    userAgent = PLAYERS_SQUADS_USER_AGENT,
    clubQids,
    clubChunk = 50,
    pageLimit = 1000,
    maxPagesPerChunk = 10,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = PLAYERS_SQUADS_MIN_INTERVAL_MS,
  } = opts;

  const all: PlayerLink[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < clubQids.length; i += clubChunk) {
    const chunk = clubQids.slice(i, i + clubChunk);
    for (let page = 0; page < maxPagesPerChunk; page++) {
      const query = buildLinksQuery({
        clubQids: chunk,
        limit: pageLimit,
        offset: page * pageLimit,
      });
      const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;
      let body: unknown = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetchImpl(url, {
            headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
          });
          if (!res.ok) {
            lastError = new Error(`SPARQL HTTP ${res.status}`);
          } else {
            body = await res.json();
            break;
          }
        } catch (err) {
          lastError = err;
        }
        if (attempt < 2) await sleep(2000 * 2 ** attempt);
      }
      if (body === null) {
        throw lastError instanceof Error ? lastError : new Error('SPARQL fetch falhou');
      }
      const links = parseLinksResponse(body);
      let novos = 0;
      for (const l of links) {
        const key = `${l.playerQid}|${l.clubQid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(l);
        novos += 1;
      }
      if (novos === 0) break; // chunk esgotado
      await sleep(minIntervalMs);
    }
    await sleep(minIntervalMs);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Fase 2 — enriquecimento via Special:EntityData (lotes de 50)
// ---------------------------------------------------------------------------

export interface PlayerEntityData {
  qid: string;
  name: string | null;
  birthDate: string | null;
  countryCodeQid: string | null;
  genderQid: string | null;
  positionQids: string[];
  occupations: Set<string>;
}

interface ClaimSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
}

const entityDataShape = z
  .object({
    entities: z.record(
      z.string(),
      z.object({
        labels: z
          .record(z.string(), z.object({ language: z.string(), value: z.string() }))
          .optional(),
        claims: z.record(z.string(), z.array(z.custom<ClaimSnak>()).optional()).optional(),
      }),
    ),
  })
  .passthrough();

type EntityShape = NonNullable<z.infer<typeof entityDataShape>['entities']>[string];

function claimValues(entity: EntityShape, pid: string): unknown[] {
  return (entity.claims?.[pid] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v): v is NonNullable<typeof v> => v != null);
}

/** Extrai dados do jogador de UM entity JSON (Special:EntityData). */
export function extractPlayerEntity(qid: string, entityJson: unknown): PlayerEntityData | null {
  const parsed = entityDataShape.safeParse(entityJson);
  if (!parsed.success) return null;
  const entity = parsed.data.entities?.[qid];
  if (!entity) return null;

  // Rótulo: pt (rank 3) > en (2) > es (1) > qualquer (0)
  let name: string | null = null;
  let nameRank = -1;
  for (const [lang, l] of Object.entries(entity.labels ?? {})) {
    const rank =
      lang === 'pt-br' || lang === 'pt'
        ? 3
        : lang === 'en' || lang === 'en-us'
          ? 2
          : lang === 'es'
            ? 1
            : 0;
    if (rank > nameRank) {
      name = l.value;
      nameRank = rank;
    }
  }

  // P569 datavalue: { time: '+1996-05-03T00:00:00Z', precision: 11, ... }
  const birth = claimValues(entity, 'P569')[0] as { time?: string } | undefined;
  const birthTime =
    typeof birth === 'object' && birth !== null ? birth.time : (birth as string | undefined);
  const birthDate = birthTime ? (birthTime.match(/^\+?(\d{4}-\d{2}-\d{2})/)?.[1] ?? null) : null;

  // datavalue de item: { 'entity-type': 'item', 'numeric-id': N, id: 'Q…' }
  const qidFromValue = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === 'object' && 'id' in (v as Record<string, unknown>)) {
      const id = (v as { id?: unknown }).id;
      return typeof id === 'string' && /^Q\d+$/.test(id) ? id : null;
    }
    return qidFromUri(String(v));
  };

  const countryQid = qidFromValue(claimValues(entity, 'P27')[0]);
  const genderQid = qidFromValue(claimValues(entity, 'P21')[0]);
  const positionQids = claimValues(entity, 'P413')
    .map(qidFromValue)
    .filter((q): q is string => !!q);
  const occupations = new Set(
    claimValues(entity, 'P106')
      .map(qidFromValue)
      .filter((q): q is string => !!q),
  );

  return {
    qid,
    name,
    birthDate,
    countryCodeQid: countryQid,
    genderQid,
    positionQids,
    occupations,
  };
}

export interface EnrichedPlayer {
  qid: string;
  name: string;
  birthDate: string | null;
  countryCode: string | null;
  gender: 'men' | 'women' | null;
  position: string | null;
}

/**
 * Converte dados de entidade em jogador do acervo. Retornos:
 *  - enriched (aceito: ocupação futebolista/treinador + rótulo humano)
 *  - rejected com motivo (sem rótulo=R4; ocupação fora do escopo)
 */
export function enrichPlayer(
  d: PlayerEntityData,
  countryIsoByQid: Map<string, string>,
  positionLabelByQid: Map<string, string>,
):
  | { ok: true; player: EnrichedPlayer }
  | { ok: false; reason: 'no_label' | 'occupation_out_of_scope' } {
  if (!d.name) return { ok: false, reason: 'no_label' };
  const inScope = [...d.occupations].some((o) =>
    (OCCUPATION_QIDS as readonly string[]).includes(o),
  );
  if (!inScope) return { ok: false, reason: 'occupation_out_of_scope' };
  const position =
    d.positionQids
      .map((q) => positionFromLabel(positionLabelByQid.get(q) ?? null))
      .find((p) => p) ?? null;
  return {
    ok: true,
    player: {
      qid: d.qid,
      name: d.name,
      birthDate: d.birthDate,
      countryCode: d.countryCodeQid ? (countryIsoByQid.get(d.countryCodeQid) ?? null) : null,
      gender: d.genderQid ? (GENDER_MAP[d.genderQid] ?? null) : null,
      position,
    },
  };
}

/** Mapa QID-país → ISO 3166-1 alpha-2 (1 query SPARQL; ~250 linhas). */
export function buildCountryIsoQuery(): string {
  return 'SELECT ?c ?cc WHERE { ?c wdt:P297 ?cc . }';
}

/** Rótulos EN para os QIDs de posição (P413) distintos. */
export function buildPositionLabelsQuery(positionQids: string[]): string {
  const values = positionQids.map((q) => 'wd:' + q).join(' ');
  return `SELECT ?p ?l WHERE { VALUES ?p { ${values} } ?p rdfs:label ?l . FILTER(LANG(?l) = 'en') }`;
}

export function parsePairsResponse(json: unknown): Array<{ qid: string; value: string }> {
  const parsed = bindingsShape.safeParse(json);
  if (!parsed.success) return [];
  const out: Array<{ qid: string; value: string }> = [];
  const seen = new Set<string>();
  for (const b of parsed.data.results?.bindings ?? []) {
    const qid = qidFromUri(b.c?.value ?? b.p?.value);
    const value = b.cc?.value ?? b.l?.value;
    if (!qid || !value || seen.has(qid)) continue;
    seen.add(qid);
    out.push({ qid, value });
  }
  return out;
}

/** Fase 2 — busca EntityData em lotes de 50 (1 req/s). */
export async function fetchEntityDataBatch(
  qids: string[],
  opts: {
    base?: string;
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    minIntervalMs?: number;
    batchSize?: number;
  } = {},
): Promise<Map<string, PlayerEntityData>> {
  const {
    userAgent = PLAYERS_SQUADS_USER_AGENT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = PLAYERS_SQUADS_MIN_INTERVAL_MS,
    batchSize = 50,
  } = opts;
  const out = new Map<string, PlayerEntityData>();
  for (let i = 0; i < qids.length; i += batchSize) {
    const chunk = qids.slice(i, i + batchSize);
    // Special:EntityData via path não aceita mais múltiplas entidades (400/404);
    // wbgetentities é o endpoint oficial e devolve o MESMO shape (entities.qid).
    const url =
      `${WIKIDATA_API}?action=wbgetentities&ids=${chunk.join('|')}` +
      `&format=json&props=labels|claims`;
    const res = await fetchImpl(url, { headers: { 'user-agent': userAgent } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const parsed = entityDataShape.safeParse(await res.json());
    if (!parsed.success) throw new Error('EntityData payload inválido');
    for (const qid of chunk) {
      const d = extractPlayerEntity(qid, parsed.data);
      if (d) out.set(qid, d);
    }
    if (i + batchSize < qids.length) await sleep(minIntervalMs);
  }
  return out;
}
