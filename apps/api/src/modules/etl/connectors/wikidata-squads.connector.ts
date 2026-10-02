/**
 * WS-D / T421 — Connector de elencos clube↔jogador via Wikidata (P54: "member of sports team").
 *
 * Fonte: Wikidata (CC0). Propriedade P54 liga `?player -> ?club`; o qualificador P580 (start time)
 * dá a temporada/ano. Este módulo é PURA (sem rede de teste, sem Prisma): só constrói consulta,
 * busca via `globalThis.fetch` (mockável), valida o payload externo com Zod e faz o sync
 * *anti-órfão* (resolve jogador/clube por QID contra um repositório injetado — nunca cria vínculo
 * apontando para entidade que não exista no acervo).
 *
 * Nunca criar um edge do KnowledgeGraph sem que `.sourceId`/`.targetId` resolvam para uma entidade
 * real: a tabela `knowledge_graph` não tem FK, então qualquer vínculo órfão corromperia o grafo.
 *
 * Uso no seed: `scripts/seed-squads.ts` (dry-run default; `--apply` grava).
 */
import { z } from 'zod';

export const PLAYED_FOR_RELATION = 'PLAYED_FOR' as const;
export const SQUADS_DATASOURCE = 'wikidata' as const;
export const SQUADS_LICENSE = 'CC0' as const;
export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql' as const;
export const SQUADS_DEFAULT_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata squads ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const SQUADS_DEFAULT_MIN_YEAR = 1900;
export const SQUADS_DEFAULT_LIMIT = 1000;
export const SQUADS_DEFAULT_MAX_PAGES = 1;

// ---------------------------------------------------------------------------
// Zod — validação de todo payload externo
// ---------------------------------------------------------------------------

/** Entrada de vínculo já destilada: QIDs do jogador/clube + ano da temporada. */
export const SquadsEntrySchema = z.object({
  playerQid: z.string().regex(/^Q\d+$/, 'playerQid deve ser um Q-ID (ex.: Q123)'),
  clubQid: z.string().regex(/^Q\d+$/, 'clubQid deve ser um Q-ID (ex.: Q456)'),
  year: z
    .number()
    .int()
    .min(SQUADS_DEFAULT_MIN_YEAR, 'year deve ser >= 1900')
    .max(2100, 'year inválido'),
});
export type SquadsEntry = z.infer<typeof SquadsEntrySchema>;

/**
 * Chave de dedup estável: `playerQid|clubQid|year`.
 * É o identificador natural do vínculo P54 (jogador + clube + temporada) e a base da idempotência.
 */
export function squadsDedupKey(entry: Pick<SquadsEntry, 'playerQid' | 'clubQid' | 'year'>): string {
  return [entry.playerQid, entry.clubQid, entry.year].join('|');
}

// ---------------------------------------------------------------------------
// SPARQL
// ---------------------------------------------------------------------------

export interface BuildSquadsQueryOptions {
  /** Filtra o vínculo aos jogadores já presentes no acervo (por QID). */
  playerQids?: string[];
  /** Filtra o vínculo aos clubes já presentes no acervo (por QID). */
  clubQids?: string[];
  /** Ano mínimo (default 1900). Aplicado via FILTER em `YEAR(?start)`. */
  minYear?: number;
  offset?: number;
  limit?: number;
  /** `SELECT DISTINCT` (default true). Use false para amostragem barata (dry-run). */
  distinct?: boolean;
  /** `ORDER BY ?player ?club ?start` (default true) — necessário p/ paginação estável. */
  orderBy?: boolean;
}

/**
 * Monta a consulta SPARQL de elencos (P54 + P580).
 *
 * Usa `p:P54 ?stmt` / `?stmt ps:P54 ?club` / `?stmt pq:P580 ?start` conforme o contrato,
 * e `FILTER(YEAR(?start) >= minYear)` para descartar vínculos sem temporada determinável.
 * Os `VALUES ?player {...}` / `VALUES ?club {...}` limitam a consulta aos QIDs do acervo
 * (evita varrer todos os vínculos P54 do mundo e previne órfãos).
 *
 * Em consulta genérica (sem VALUES) o `SELECT DISTINCT ... ORDER BY` sobre TODOS os P54 do mundo
 * é caro e pode estourar o timeout (HTTP 504); passe `distinct:false` / `orderBy:false` para
 * amostragem barata (modo dry-run do seed).
 */
export function buildSquadsQuery(opts: BuildSquadsQueryOptions = {}): string {
  const {
    playerQids = [],
    clubQids = [],
    minYear = SQUADS_DEFAULT_MIN_YEAR,
    offset = 0,
    limit = SQUADS_DEFAULT_LIMIT,
    distinct = true,
    orderBy = true,
  } = opts;

  const playerValues =
    playerQids.length > 0
      ? `  VALUES ?player { ${playerQids.map((q) => 'wd:' + q).join(' ')} }
`
      : '';
  const clubValues =
    clubQids.length > 0
      ? `  VALUES ?club { ${clubQids.map((q) => 'wd:' + q).join(' ')} }
`
      : '';

  const select = distinct ? 'SELECT DISTINCT ?player ?club ?start' : 'SELECT ?player ?club ?start';
  const order = orderBy ? 'ORDER BY ?player ?club ?start\n' : '';

  return `${select} WHERE {
  ?player p:P54 ?stmt .
  ?stmt ps:P54 ?club ;
        pq:P580 ?start .
  FILTER(YEAR(?start) >= ${minYear})
${playerValues}${clubValues}}
${order}LIMIT ${limit} OFFSET ${offset}
`;
}

// ---------------------------------------------------------------------------
// Parse do payload SPARQL (Zod)
// ---------------------------------------------------------------------------

interface BindingMap {
  [k: string]: { type?: string; value?: string } | undefined;
}

function qidFromUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const last = uri.trim().split('/').pop();
  return last !== undefined && /^Q\d+$/.test(last) ? last : null;
}

function yearFromIso(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{4})-/.exec(value);
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  return Number.isInteger(year) ? year : null;
}

/**
 * Valida e destila o corpo JSON de uma resposta SPARQL de elencos.
 * Entradas que violam `SquadsEntrySchema` (QID malformado, ano ausente/<1900) são descartadas.
 */
export function parseSquadsResponse(json: unknown): SquadsEntry[] {
  const input = z
    .object({
      results: z
        .object({
          bindings: z.array(z.record(z.unknown()) as z.ZodType<BindingMap>).optional(),
        })
        .optional(),
    })
    .passthrough();

  const parsed = input.safeParse(json);
  if (!parsed.success) return [];

  const bindings = (parsed.data.results?.bindings ?? []) as BindingMap[];
  const entries: SquadsEntry[] = [];
  for (const b of bindings) {
    const playerQid = qidFromUri(b.player?.value);
    const clubQid = qidFromUri(b.club?.value);
    const year = yearFromIso(b.start?.value);
    if (!playerQid || !clubQid || year === null) continue;
    const candidate = { playerQid, clubQid, year } satisfies SquadsEntry;
    const check = SquadsEntrySchema.safeParse(candidate);
    if (check.success) entries.push(check.data);
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Fetch (usa globalThis.fetch, paginação sequencial — concorrência 1 — com backoff)
// ---------------------------------------------------------------------------

export interface FetchSquadsOptions {
  /** Endpoint SPARQL (default: query.wikidata.org). */
  endpoint?: string;
  /** Header `user-agent` identificado. */
  userAgent?: string;
  playerQids?: string[];
  clubQids?: string[];
  minYear?: number;
  /** Offset inicial (default 0). */
  offset?: number;
  /** Tamanho da página (default 1000). */
  limit?: number;
  /** Nº máximo de páginas a buscar (default 1 — evita loop infinito p/ testes). */
  maxPages?: number;
  /** Retries por página com backoff antes de desistir. */
  maxRetries?: number;
  /** Backoff inicial (ms), dobrado a cada retry. */
  backoffMs?: number;
  /** Injetável para testes (default: globalThis.fetch). */
  fetchImpl?: typeof globalThis.fetch;
  /** Injetável para testes (default: setTimeout). */
  sleep?: (ms: number) => Promise<void>;
  /** `SELECT DISTINCT` (default true). */
  distinct?: boolean;
  /** `ORDER BY ?player ?club ?start` (default true). */
  orderBy?: boolean;
}

/**
 * Busca vínculos P54 paginando o endpoint. Concorrência 1 (páginas sequenciais) e backoff simples
 * (`retry` + espera exponencial) em erro HTTP/rede. Retorna os vínculos destilados e validados.
 */
export async function fetchSquads(opts: FetchSquadsOptions = {}): Promise<SquadsEntry[]> {
  const {
    endpoint = WIKIDATA_SPARQL_ENDPOINT,
    userAgent = SQUADS_DEFAULT_USER_AGENT,
    playerQids,
    clubQids,
    minYear,
    offset = 0,
    limit = SQUADS_DEFAULT_LIMIT,
    maxPages = SQUADS_DEFAULT_MAX_PAGES,
    maxRetries = 0,
    backoffMs = 1000,
    fetchImpl = globalThis.fetch,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    distinct = true,
    orderBy = true,
  } = opts;

  const entries: SquadsEntry[] = [];
  for (let page = 0; page < maxPages; page++) {
    const query = buildSquadsQuery({
      playerQids,
      clubQids,
      minYear,
      offset: offset + page * limit,
      limit,
      distinct,
      orderBy,
    });
    const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;

    let body: unknown = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetchImpl(url, {
          headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
        });
        if (!res.ok) {
          lastError = new Error(`SPARQL HTTP ${res.status}`);
          // tenta de novo após backoff
        } else {
          body = await res.json();
          break;
        }
      } catch (err) {
        lastError = err;
      }
      if (attempt < maxRetries) await sleep(backoffMs * 2 ** attempt);
    }
    if (body === null) {
      throw lastError instanceof Error ? lastError : new Error('SPARQL fetch falhou');
    }

    const pageEntries = parseSquadsResponse(body);
    entries.push(...pageEntries);
    if (pageEntries.length === 0) break;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Sync anti-órfão + idempotência (repositório injetado; teste usa memória)
// ---------------------------------------------------------------------------

export interface SquadsRepository {
  /** Resolve um jogador pelo QID. `null` = não está no acervo (não criar vínculo). */
  findPlayerByQid(qid: string): Promise<{ id: string } | null>;
  /** Resolve um clube pelo QID. `null` = não está no acervo (não criar vínculo). */
  findClubByQid(qid: string): Promise<{ id: string } | null>;
  /** Verifica existência de edge (idempotência) por (jogador, clube, relação, ano). */
  findEdgeByKey(args: {
    sourceId: string;
    targetId: string;
    relation: string;
    year: number;
  }): Promise<{ id: string } | null>;
  /** Persiste um edge do grafo. */
  createEdge(args: {
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    relation: string;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export interface SquadsSyncItem extends SquadsEntry {
  edgeId?: string;
}

export interface SquadsOrphan extends SquadsEntry {
  reason: 'player_missing' | 'club_missing';
}

export interface SquadsSyncResult {
  /** Vínculos criados (não existiam). */
  persisted: SquadsSyncItem[];
  /** Vínculos já presentes ou duplicados no mesmo lote (idempotência). */
  skipped: SquadsSyncItem[];
  /** Vínculos cujo jogador/clube NÃO está no acervo → fila de revisão, NUNCA persistidos. */
  orphans: SquadsOrphan[];
  /** Total de entradas recebidas. */
  total: number;
}

export interface SquadsSyncOptions {
  /** Base da URL de proveniência (default: https://www.wikidata.org/wiki/). */
  sourceUrlBase?: string;
  relation?: string;
}

/**
 * Aplica o sync com dedup key `playerQid|clubQid|year`. Para cada entrada:
 *  - descarta duplicados do mesmo lote (Set de dedup key);
 *  - resolve jogador/clube por QID → ausente = ÓRFÃO (revisão), nunca persiste;
 *  - checa edge existente → idempotente (skipped, não duplica);
 *  - senão cria o edge com proveniência obrigatória em `metadata`.
 */
export async function syncSquads(
  entries: SquadsEntry[],
  repo: SquadsRepository,
  opts: SquadsSyncOptions = {},
): Promise<SquadsSyncResult> {
  const relation = opts.relation ?? PLAYED_FOR_RELATION;
  const sourceUrlBase = opts.sourceUrlBase ?? 'https://www.wikidata.org/wiki/';

  const seen = new Set<string>();
  const persisted: SquadsSyncItem[] = [];
  const skipped: SquadsSyncItem[] = [];
  const orphans: SquadsOrphan[] = [];

  for (const entry of entries) {
    const key = squadsDedupKey(entry);
    if (seen.has(key)) {
      skipped.push({ ...entry });
      continue;
    }
    seen.add(key);

    const player = await repo.findPlayerByQid(entry.playerQid);
    if (!player) {
      orphans.push({ ...entry, reason: 'player_missing' });
      continue;
    }
    const club = await repo.findClubByQid(entry.clubQid);
    if (!club) {
      orphans.push({ ...entry, reason: 'club_missing' });
      continue;
    }

    const existing = await repo.findEdgeByKey({
      sourceId: player.id,
      targetId: club.id,
      relation,
      year: entry.year,
    });
    if (existing) {
      skipped.push({ ...entry, edgeId: existing.id });
      continue;
    }

    const edge = await repo.createEdge({
      sourceId: player.id,
      sourceType: 'Player',
      targetId: club.id,
      targetType: 'Club',
      relation,
      metadata: {
        season: String(entry.year),
        year: entry.year,
        dataSource: SQUADS_DATASOURCE,
        sourceUrl: sourceUrlBase + entry.playerQid,
        license: SQUADS_LICENSE,
      },
    });
    persisted.push({ ...entry, edgeId: edge.id });
  }

  return { persisted, skipped, orphans, total: entries.length };
}
