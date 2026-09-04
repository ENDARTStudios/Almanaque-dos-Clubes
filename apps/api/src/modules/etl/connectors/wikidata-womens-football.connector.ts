/**
 * T424 / WS-D — Connector de futebol feminino via Wikidata (CC0).
 *
 * Ingestão de três famílias de entidades + os vínculos P54 ("member of sports team") das
 * jogadoras, com proveniência, dedup por QID e resolução anti-órfão:
 *
 *   1. Competições femininas   (classe Q135641755 "women's association football league")
 *   2. Clubes femininos        (classes Q28140340 "women's association football team" e
 *                               Q51481377 "women's association football club")
 *   3. Jogadoras               (P106=Q937857 "association football player" + P21=Q6581072 "female")
 *   4. Vínculos clube<->jogadora (P54 + qualificador P580/ano)
 *
 * ATENÇÃO — QIDs corrigidos (verificados no Wikidata):
 *   - Q461753 (citado na tarefa como "women's association football") é na verdade "Jean
 *     Duvieusart" (político belga). O QID correto é Q606060.
 *   - Q104548798 (citado como clube feminino) é "Samuel Frankfurter" (pessoa). O QID correto é
 *     Q28140340. Ver docs/DATA-INGESTION.md §14.
 *
 * CONVENÇÃO DE GÊNERO (SEM novo schema): o schema Prisma não tem coluna de gênero. O
 * "feminino" é representado por convenção documentada:
 *   - WOMENS_GENDER_VALUE='women' gravado em metadata.gender de TODA entidade/vínculo criado
 *     por este connector no KnowledgeGraph;
 *   - o registro WOMENS_COMPETITION_QIDS (QIDs que marcam competição feminina) é o contrato
 *     que a normalização isolada por gênero do Ranking (T425) usa para derivar o gênero, sem
 *     coluna nova.
 *
 * Este módulo é PURA (sem rede, sem Prisma): constrói consulta, busca via globalThis.fetch
 * (mockável), valida payload externo com Zod e faz o sync anti-órfão com repositório injetado.
 */
import { z } from 'zod';

export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql' as const;
export const WOMENS_DATASOURCE = 'wikidata' as const;
export const WOMENS_LICENSE = 'CC0' as const;
export const PLAYED_FOR_RELATION = 'PLAYED_FOR' as const;
export const WOMENS_DEFAULT_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata womens football ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const WOMENS_DEFAULT_MIN_YEAR = 1900;
export const WOMENS_DEFAULT_LIMIT = 1000;
export const WOMENS_DEFAULT_MAX_PAGES = 1;

// ---------------------------------------------------------------------------
// Convenção de gênero (registro documentado — consultado por T425)
// ---------------------------------------------------------------------------
export const WOMENS_GENDER_KEY = 'gender' as const;
export const WOMENS_GENDER_VALUE = 'women' as const;

/** QIDs que identificam "futebol feminino" e as classes de competição feminina (registro documentado). */
export const WOMENS_COMPETITION_QIDS: readonly string[] = [
  'Q606060', // women's association football (raiz do esporte)
  'Q135641755', // women's association football league
  'Q61983760', // women's sports competition
] as const;

/** Classe de clube feminino: "women's association football team". */
export const WOMENS_CLUB_TEAM_CLASS_QID = 'Q28140340' as const;
/** Classe de clube feminino: "women's association football club". */
export const WOMENS_CLUB_CLASS_QID = 'Q51481377' as const;
/** Ocupação de jogador(a) de futebol (P106). */
export const WOMENS_PLAYER_OCCUPATION_QID = 'Q937857' as const;
/** Sexo/gênero feminino (P21). */
export const WOMENS_GENDER_QID = 'Q6581072' as const;

// ---------------------------------------------------------------------------
// Zod — validação de todo payload externo
// ---------------------------------------------------------------------------
const QID = z.string().regex(/^Q\d+$/, 'deve ser um Q-ID (ex.: Q123)');
const ISO_COUNTRY = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'país deve ser ISO 3166-1 alpha-2')
  .transform((v) => v.toUpperCase());

export const WomensCompetitionSchema = z.object({
  qid: QID,
  name: z.string().min(1, 'nome obrigatório'),
  country: ISO_COUNTRY.optional(),
});
export type WomensCompetition = z.infer<typeof WomensCompetitionSchema>;

export const WomensClubSchema = z.object({
  qid: QID,
  name: z.string().min(1, 'nome obrigatório'),
  country: ISO_COUNTRY.optional(),
});
export type WomensClub = z.infer<typeof WomensClubSchema>;

export const WomensPlayerSchema = z.object({
  qid: QID,
  fullName: z.string().min(1, 'nome obrigatório'),
  country: ISO_COUNTRY.optional(),
  position: z.string().min(1).optional(),
});
export type WomensPlayer = z.infer<typeof WomensPlayerSchema>;

export const WomensEdgeSchema = z.object({
  playerQid: QID,
  clubQid: QID,
  year: z.number().int().min(WOMENS_DEFAULT_MIN_YEAR).max(2100),
});
export type WomensEdge = z.infer<typeof WomensEdgeSchema>;

/** Chave estável de dedup de entidade = QID (único no acervo). */
export function womensEntityDedupKey(qid: string): string {
  return qid;
}

/** Chave estável de dedup do vínculo P54 = playerQid|clubQid|year (base da idempotência). */
export function womensEdgeDedupKey(
  edge: Pick<WomensEdge, 'playerQid' | 'clubQid' | 'year'>,
): string {
  return [edge.playerQid, edge.clubQid, edge.year].join('|');
}

// ---------------------------------------------------------------------------
// SPARQL — construtores de consulta
// ---------------------------------------------------------------------------
export interface BuildWomensQueryOptions {
  offset?: number;
  limit?: number;
  distinct?: boolean;
  orderBy?: boolean;
  /** QIDs de clubes para limitar a consulta (evita varrer o mundo; anti-órfão). */
  clubQids?: string[];
}

/** Competições femininas (classe Q135641755 "women's association football league" + P279*). */
export function buildCompetitionsQuery(opts: BuildWomensQueryOptions = {}): string {
  const { offset = 0, limit = WOMENS_DEFAULT_LIMIT, distinct = true, orderBy = true } = opts;
  const select = distinct
    ? 'SELECT DISTINCT ?comp ?compLabel ?country'
    : 'SELECT ?comp ?compLabel ?country';
  const order = orderBy ? 'ORDER BY ?comp\n' : '';
  return (
    select +
    ' WHERE {\n' +
    '  ?comp wdt:P31/wdt:P279* wd:Q135641755 .\n' +
    '  OPTIONAL { ?comp wdt:P297 ?country }\n' +
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }\n' +
    '}\n' +
    order +
    'LIMIT ' +
    limit +
    ' OFFSET ' +
    offset +
    '\n'
  );
}

/** Clubes femininos (classes Q28140340 e Q51481377). */
export function buildClubsQuery(opts: BuildWomensQueryOptions = {}): string {
  const { offset = 0, limit = WOMENS_DEFAULT_LIMIT, distinct = true, orderBy = true } = opts;
  const select = distinct
    ? 'SELECT DISTINCT ?club ?clubLabel ?country'
    : 'SELECT ?club ?clubLabel ?country';
  const order = orderBy ? 'ORDER BY ?club\n' : '';
  return (
    select +
    ' WHERE {\n' +
    '  { ?club wdt:P31/wdt:P279* wd:Q28140340 } UNION\n' +
    '  { ?club wdt:P31/wdt:P279* wd:Q51481377 }\n' +
    '  OPTIONAL { ?club wdt:P297 ?country }\n' +
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }\n' +
    '}\n' +
    order +
    'LIMIT ' +
    limit +
    ' OFFSET ' +
    offset +
    '\n'
  );
}

/** Jogadoras (P106=Q937857 + P21=Q6581072), com país e posição opcionais. */
export function buildPlayersQuery(opts: BuildWomensQueryOptions = {}): string {
  const { offset = 0, limit = WOMENS_DEFAULT_LIMIT, distinct = true, orderBy = true } = opts;
  const select = distinct
    ? 'SELECT DISTINCT ?player ?playerLabel ?country ?positionLabel'
    : 'SELECT ?player ?playerLabel ?country ?positionLabel';
  const order = orderBy ? 'ORDER BY ?player\n' : '';
  return (
    select +
    ' WHERE {\n' +
    '  ?player wdt:P106 wd:Q937857 ; wdt:P21 wd:Q6581072 .\n' +
    '  OPTIONAL { ?player wdt:P297 ?country }\n' +
    '  OPTIONAL { ?player wdt:P413 ?position }\n' +
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }\n' +
    '}\n' +
    order +
    'LIMIT ' +
    limit +
    ' OFFSET ' +
    offset +
    '\n'
  );
}

/** Vínculos P54 das jogadoras (com ano via P580). */
export function buildEdgesQuery(opts: BuildWomensQueryOptions = {}): string {
  const {
    offset = 0,
    limit = WOMENS_DEFAULT_LIMIT,
    distinct = true,
    orderBy = true,
    clubQids = [],
  } = opts;
  const clubValues =
    clubQids.length > 0
      ? '  VALUES ?club { ' + clubQids.map((q) => 'wd:' + q).join(' ') + ' }\n'
      : '';
  const select = distinct ? 'SELECT DISTINCT ?player ?club ?year' : 'SELECT ?player ?club ?year';
  const order = orderBy ? 'ORDER BY ?player ?club ?year\n' : '';
  return (
    select +
    ' WHERE {\n' +
    '  ?player wdt:P106 wd:Q937857 ; wdt:P21 wd:Q6581072 .\n' +
    '  ?player p:P54 ?stmt .\n' +
    '  ?stmt ps:P54 ?club ; pq:P580 ?start .\n' +
    '  BIND(YEAR(?start) AS ?year)\n' +
    '  FILTER(?year >= ' +
    WOMENS_DEFAULT_MIN_YEAR +
    ')\n' +
    clubValues +
    '}\n' +
    order +
    'LIMIT ' +
    limit +
    ' OFFSET ' +
    offset +
    '\n'
  );
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

function bstr(b: BindingMap, key: string): string | undefined {
  // eslint-disable-next-line security/detect-object-injection
  return b[key]?.value;
}

/** Ano vindo de uma expressão SPARQL (ex.: BIND(YEAR(?start))). Aceita \"2023\" e \"2023-01-01\". */
function yearFromAny(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{4})-?/.exec(value.trim());
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  return Number.isInteger(year) ? year : null;
}

/** Um "Q-ID como label" (ex.: Q140159744) significa que não há rótulo em en → descarta. */
function hasRealName(name: string | undefined): boolean {
  return !!name && !/^Q\d+$/.test(name);
}

/** Base comum do corpo JSON de uma resposta SPARQL. */
function sparqlRoot(json: unknown): BindingMap[] {
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
  return (parsed.data.results?.bindings ?? []) as BindingMap[];
}

export function parseCompetitionsResponse(json: unknown): WomensCompetition[] {
  const out: WomensCompetition[] = [];
  for (const b of sparqlRoot(json)) {
    const qid = qidFromUri(bstr(b, 'comp'));
    const name = bstr(b, 'compLabel');
    if (!qid || !hasRealName(name)) continue;
    const country = bstr(b, 'country');
    const candidate = { qid, name, ...(country ? { country } : {}) };
    const res = WomensCompetitionSchema.safeParse(candidate);
    if (res.success) out.push(res.data);
  }
  return out;
}

export function parseClubsResponse(json: unknown): WomensClub[] {
  const out: WomensClub[] = [];
  for (const b of sparqlRoot(json)) {
    const qid = qidFromUri(bstr(b, 'club'));
    const name = bstr(b, 'clubLabel');
    if (!qid || !hasRealName(name)) continue;
    const country = bstr(b, 'country');
    const candidate = { qid, name, ...(country ? { country } : {}) };
    const res = WomensClubSchema.safeParse(candidate);
    if (res.success) out.push(res.data);
  }
  return out;
}

export function parsePlayersResponse(json: unknown): WomensPlayer[] {
  const out: WomensPlayer[] = [];
  for (const b of sparqlRoot(json)) {
    const qid = qidFromUri(bstr(b, 'player'));
    const fullName = bstr(b, 'playerLabel');
    if (!qid || typeof fullName !== 'string' || !hasRealName(fullName)) continue;
    const country = bstr(b, 'country');
    const positionLabel = bstr(b, 'positionLabel');
    const candidate: Record<string, string> = { qid, fullName };
    if (country) candidate.country = country;
    if (positionLabel && hasRealName(positionLabel)) candidate.position = positionLabel;
    const res = WomensPlayerSchema.safeParse(candidate);
    if (res.success) out.push(res.data);
  }
  return out;
}

export function parseEdgesResponse(json: unknown): WomensEdge[] {
  const out: WomensEdge[] = [];
  for (const b of sparqlRoot(json)) {
    const playerQid = qidFromUri(bstr(b, 'player'));
    const clubQid = qidFromUri(bstr(b, 'club'));
    const year = yearFromAny(bstr(b, 'year'));
    if (!playerQid || !clubQid || year === null) continue;
    const res = WomensEdgeSchema.safeParse({ playerQid, clubQid, year });
    if (res.success) out.push(res.data);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetch (globalThis.fetch, paginação sequencial, concorrência 1, backoff)
// ---------------------------------------------------------------------------
export interface FetchWomensOptions {
  endpoint?: string;
  userAgent?: string;
  offset?: number;
  limit?: number;
  maxPages?: number;
  maxRetries?: number;
  backoffMs?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  distinct?: boolean;
  orderBy?: boolean;
  clubQids?: string[];
}

async function sparqlPage(
  opts: FetchWomensOptions,
  build: (o: {
    offset: number;
    limit: number;
    distinct: boolean;
    orderBy: boolean;
    clubQids?: string[];
  }) => string,
): Promise<BindingMap[]> {
  const {
    endpoint = WIKIDATA_SPARQL_ENDPOINT,
    userAgent = WOMENS_DEFAULT_USER_AGENT,
    offset = 0,
    limit = WOMENS_DEFAULT_LIMIT,
    maxRetries = 0,
    backoffMs = 1000,
    fetchImpl = globalThis.fetch,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    distinct = true,
    orderBy = true,
    clubQids,
  } = opts;
  const query = build({ offset, limit, distinct, orderBy, clubQids });
  const url = endpoint + '?query=' + encodeURIComponent(query) + '&format=json';
  let body: unknown = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
      });
      if (!res.ok) lastError = new Error('SPARQL HTTP ' + res.status);
      else {
        body = await res.json();
        break;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxRetries) await sleep(backoffMs * 2 ** attempt);
  }
  if (body === null)
    throw lastError instanceof Error ? lastError : new Error('SPARQL fetch falhou');
  return sparqlRoot(body);
}

function competitionsBuild(o: {
  offset: number;
  limit: number;
  distinct: boolean;
  orderBy: boolean;
}): string {
  return buildCompetitionsQuery(o);
}
function clubsBuild(o: {
  offset: number;
  limit: number;
  distinct: boolean;
  orderBy: boolean;
}): string {
  return buildClubsQuery(o);
}
function playersBuild(o: {
  offset: number;
  limit: number;
  distinct: boolean;
  orderBy: boolean;
}): string {
  return buildPlayersQuery(o);
}
function edgesBuild(o: {
  offset: number;
  limit: number;
  distinct: boolean;
  orderBy: boolean;
  clubQids?: string[];
}): string {
  return buildEdgesQuery(o);
}

export async function fetchCompetitions(
  opts: FetchWomensOptions = {},
): Promise<WomensCompetition[]> {
  const { limit = WOMENS_DEFAULT_LIMIT, maxPages = WOMENS_DEFAULT_MAX_PAGES } = opts;
  const out: WomensCompetition[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await sparqlPage(
      { ...opts, offset: (opts.offset ?? 0) + page * limit },
      competitionsBuild,
    );
    const items = parseCompetitionsResponse({ results: { bindings: rows } });
    out.push(...items);
    if (rows.length === 0) break;
  }
  return out;
}

export async function fetchClubs(opts: FetchWomensOptions = {}): Promise<WomensClub[]> {
  const { limit = WOMENS_DEFAULT_LIMIT, maxPages = WOMENS_DEFAULT_MAX_PAGES } = opts;
  const out: WomensClub[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await sparqlPage(
      { ...opts, offset: (opts.offset ?? 0) + page * limit },
      clubsBuild,
    );
    const items = parseClubsResponse({ results: { bindings: rows } });
    out.push(...items);
    if (rows.length === 0) break;
  }
  return out;
}

export async function fetchPlayers(opts: FetchWomensOptions = {}): Promise<WomensPlayer[]> {
  const { limit = WOMENS_DEFAULT_LIMIT, maxPages = WOMENS_DEFAULT_MAX_PAGES } = opts;
  const out: WomensPlayer[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await sparqlPage(
      { ...opts, offset: (opts.offset ?? 0) + page * limit },
      playersBuild,
    );
    const items = parsePlayersResponse({ results: { bindings: rows } });
    out.push(...items);
    if (rows.length === 0) break;
  }
  return out;
}

export async function fetchEdges(opts: FetchWomensOptions = {}): Promise<WomensEdge[]> {
  const { limit = WOMENS_DEFAULT_LIMIT, maxPages = WOMENS_DEFAULT_MAX_PAGES, clubQids } = opts;
  const out: WomensEdge[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await sparqlPage(
      { ...opts, offset: (opts.offset ?? 0) + page * limit, clubQids },
      edgesBuild,
    );
    const items = parseEdgesResponse({ results: { bindings: rows } });
    out.push(...items);
    if (rows.length === 0) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sync anti-órfão + idempotência + isolamento por gênero (repositório injetado)
// ---------------------------------------------------------------------------
export interface WomensProvenance {
  dataSource: typeof WOMENS_DATASOURCE;
  sourceUrl: string;
  license: typeof WOMENS_LICENSE;
  importedAt: Date;
  /** gênero (convenção documentada — sempre 'women' para este connector). */
  gender: typeof WOMENS_GENDER_VALUE;
}

export interface WomensRepository {
  findCompetitionByQid(qid: string): Promise<{ id: string } | null>;
  upsertCompetition(
    row: { qid: string; name: string; country: string | null },
    provenance: WomensProvenance,
  ): Promise<{ id: string; created: boolean }>;
  findClubByQid(qid: string): Promise<{ id: string } | null>;
  upsertClub(
    row: { qid: string; name: string; country: string | null },
    provenance: WomensProvenance,
  ): Promise<{ id: string; created: boolean }>;
  findPlayerByQid(qid: string): Promise<{ id: string } | null>;
  upsertPlayer(
    row: { qid: string; fullName: string; country: string | null; position: string | null },
    provenance: WomensProvenance,
  ): Promise<{ id: string; created: boolean }>;
  findEdgeByKey(args: {
    sourceId: string;
    targetId: string;
    relation: string;
    year: number;
  }): Promise<{ id: string } | null>;
  createEdge(args: {
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    relation: string;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export interface WomensEntityResult {
  created: string[];
  skipped: string[];
}

export interface WomensOrphan extends WomensEdge {
  reason: 'player_missing' | 'club_missing';
}

export interface WomensSyncData {
  competitions: WomensCompetition[];
  clubs: WomensClub[];
  players: WomensPlayer[];
  edges: WomensEdge[];
}

export interface WomensSyncResult {
  competitions: WomensEntityResult;
  clubs: WomensEntityResult;
  players: WomensEntityResult;
  /** Vínculos criados. */
  edgesPersisted: (WomensEdge & { edgeId: string })[];
  /** Vínculos já existentes ou duplicados no mesmo lote (idempotência). */
  edgesSkipped: (WomensEdge & { edgeId?: string })[];
  /** Vínculos com jogador/clube fora do acervo → fila de revisão, NUNCA persistidos. */
  orphans: WomensOrphan[];
  /** Registro de QIDs femininos marcados (gênero) — contrato para T425. */
  womensQids: string[];
  totalEdges: number;
}

export interface WomensSyncOptions {
  /** Base da URL de proveniência (default: https://www.wikidata.org/wiki/). */
  sourceUrlBase?: string;
  relation?: string;
}

function dedupeByQid<T extends { qid: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.qid)) continue;
    seen.add(item.qid);
    out.push(item);
  }
  return out;
}

/**
 * Aplica o sync. Para cada família:
 *   - entidades: dedup por QID, upsert idempotente com proveniência (created vs skipped),
 *     e cada QID é registrado no conjunto `womensQids` (isolamento por gênero);
 *   - vínculos: dedup por playerQid|clubQid|year; resolve jogador/clube por QID contra o
 *     acervo — ausente = ÓRFÃO (nunca persiste, pois knowledge_graph não tem FK); checa
 *     edge existente (idempotente); senão cria com proveniência + metadata.gender.
 */
export async function syncWomensFootball(
  data: WomensSyncData,
  repo: WomensRepository,
  opts: WomensSyncOptions = {},
): Promise<WomensSyncResult> {
  const relation = opts.relation ?? PLAYED_FOR_RELATION;
  const sourceUrlBase = opts.sourceUrlBase ?? 'https://www.wikidata.org/wiki/';
  const importedAt = new Date();
  const provenance = (qid: string): WomensProvenance => ({
    dataSource: WOMENS_DATASOURCE,
    sourceUrl: sourceUrlBase + qid,
    license: WOMENS_LICENSE,
    importedAt,
    gender: WOMENS_GENDER_VALUE,
  });

  const womensQids = new Set<string>();

  const competitions: WomensEntityResult = { created: [], skipped: [] };
  for (const comp of dedupeByQid(data.competitions)) {
    const p = provenance(comp.qid);
    const res = await repo.upsertCompetition(
      { qid: comp.qid, name: comp.name, country: comp.country ?? null },
      p,
    );
    if (res.created) competitions.created.push(comp.qid);
    else competitions.skipped.push(comp.qid);
    womensQids.add(comp.qid);
  }

  const clubs: WomensEntityResult = { created: [], skipped: [] };
  for (const club of dedupeByQid(data.clubs)) {
    const p = provenance(club.qid);
    const res = await repo.upsertClub(
      { qid: club.qid, name: club.name, country: club.country ?? null },
      p,
    );
    if (res.created) clubs.created.push(club.qid);
    else clubs.skipped.push(club.qid);
    womensQids.add(club.qid);
  }

  const players: WomensEntityResult = { created: [], skipped: [] };
  for (const player of dedupeByQid(data.players)) {
    const p = provenance(player.qid);
    const res = await repo.upsertPlayer(
      {
        qid: player.qid,
        fullName: player.fullName,
        country: player.country ?? null,
        position: player.position ?? null,
      },
      p,
    );
    if (res.created) players.created.push(player.qid);
    else players.skipped.push(player.qid);
    womensQids.add(player.qid);
  }

  const edgesPersisted: (WomensEdge & { edgeId: string })[] = [];
  const edgesSkipped: (WomensEdge & { edgeId?: string })[] = [];
  const orphans: WomensOrphan[] = [];
  const seen = new Set<string>();
  for (const edge of data.edges) {
    const key = womensEdgeDedupKey(edge);
    if (seen.has(key)) {
      edgesSkipped.push({ ...edge });
      continue;
    }
    seen.add(key);

    const player = await repo.findPlayerByQid(edge.playerQid);
    if (!player) {
      orphans.push({ ...edge, reason: 'player_missing' });
      continue;
    }
    const club = await repo.findClubByQid(edge.clubQid);
    if (!club) {
      orphans.push({ ...edge, reason: 'club_missing' });
      continue;
    }
    const existing = await repo.findEdgeByKey({
      sourceId: player.id,
      targetId: club.id,
      relation,
      year: edge.year,
    });
    if (existing) {
      edgesSkipped.push({ ...edge, edgeId: existing.id });
      continue;
    }
    const created = await repo.createEdge({
      sourceId: player.id,
      sourceType: 'Player',
      targetId: club.id,
      targetType: 'Club',
      relation,
      metadata: {
        gender: WOMENS_GENDER_VALUE,
        season: String(edge.year),
        year: edge.year,
        dataSource: WOMENS_DATASOURCE,
        sourceUrl: sourceUrlBase + edge.playerQid,
        license: WOMENS_LICENSE,
      },
    });
    edgesPersisted.push({ ...edge, edgeId: created.id });
    womensQids.add(edge.playerQid);
  }

  return {
    competitions,
    clubs,
    players,
    edgesPersisted,
    edgesSkipped,
    orphans,
    womensQids: [...womensQids],
    totalEdges: data.edges.length,
  };
}
