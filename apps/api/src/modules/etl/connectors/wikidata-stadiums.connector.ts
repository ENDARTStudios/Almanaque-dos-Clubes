/**
 * WS-D / T423 — Connector de estádios via Wikidata (classe Q483110 = stadium).
 *
 * Fonte: Wikidata (CC0). Itens com wdt:P31/wdt:P279* wd:Q483110 (stadium ou subtipo);
 * extrai capacidade (P1083), coordenadas (P625 -> POINT(lon lat)), cidade (P131, via label),
 * país (P17 -> P297, código ISO alpha-2) e o clube ocupante (P466 = occupant).
 *
 * Este módulo é PURA (sem rede de teste, sem Prisma): só constrói a consulta, busca via
 * globalThis.fetch (mockável), valida o payload externo com Zod (lat em [-90,90],
 * lon em [-180,180], capacidade int >= 0) e faz o sync *anti-órfão* + idempotente (dedup por QID),
 * resolvendo o clube por Club.qid contra um repositório injetado — nunca cria um estádio
 * apontando para um clube que não exista no acervo. Estádio SEM clube associado é persistido com
 * clubId = null; estádio COM clube não-casado vai para a fila de revisão (não persiste).
 *
 * Uso no seed: scripts/seed-stadiums.ts (dry-run default; --apply grava).
 */
import { z } from 'zod';

export const STADIUMS_DATASOURCE = 'wikidata' as const;

/** Base canônica da URL de proveniência (T428: campo sourceUrl obrigatório). */
export const WIKIDATA_ITEM_URL_BASE = 'https://www.wikidata.org/wiki/' as const;
export const STADIUMS_LICENSE = 'CC0' as const;
export const STADIUM_CLASS_QID = 'Q483110' as const;
export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql' as const;
export const STADIUMS_DEFAULT_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata stadiums ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const STADIUMS_DEFAULT_LIMIT = 500;
export const STADIUMS_DEFAULT_MAX_PAGES = 1;

// ---------------------------------------------------------------------------
// Zod — validação de todo payload externo
// ---------------------------------------------------------------------------

/** Entrada de estádio já destilada. Latitude/longitude/capacidade são opcionais (o Wikidata tem
 * muitos estádios sem P1083/P625); quando presentes são validadas por faixa. */
export const StadiumEntrySchema = z.object({
  qid: z.string().regex(/^Q\d+$/, 'qid deve ser um Q-ID (ex.: Q483110)'),
  name: z.string().min(1, 'nome do estádio obrigatório'),
  latitude: z.number().min(-90, 'lat < -90').max(90, 'lat > 90').nullable().optional(),
  longitude: z.number().min(-180, 'lon < -180').max(180, 'lon > 180').nullable().optional(),
  capacity: z
    .number()
    .int('capacity deve ser inteiro')
    .nonnegative('capacity >= 0')
    .nullable()
    .optional(),
  city: z.string().nullable().optional(),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, 'country deve ser ISO 3166-1 alpha-2')
    .nullable()
    .optional(),
  surface: z.string().nullable().optional(),
  clubQid: z
    .string()
    .regex(/^Q\d+$/, 'clubQid deve ser um Q-ID')
    .nullable()
    .optional(),
});
export type StadiumEntry = z.infer<typeof StadiumEntrySchema>;

/**
 * Chave de dedup estável: o QID do estádio (identificador natural do item Wikidata e base da
 * idempotência). Rodar o ingest 2x não duplica.
 */
export function stadiumsDedupKey(entry: Pick<StadiumEntry, 'qid'>): string {
  return entry.qid;
}

// ---------------------------------------------------------------------------
// SPARQL
// ---------------------------------------------------------------------------

export interface BuildStadiumsQueryOptions {
  /** Restringe os estádios aos clubes já presentes no acervo (por QID, via P466/occupant). */
  clubQids?: string[];
  offset?: number;
  limit?: number;
  /** SELECT DISTINCT (default true). Use false para amostragem barata (dry-run). */
  distinct?: boolean;
  /** ORDER BY ?stadium (default true) — necessário p/ paginação estável. */
  orderBy?: boolean;
}

/**
 * Monta a consulta SPARQL dos estádios (P31/P279* de Q483110). Coordenadas retornadas como
 * ?point (wktLiteral "POINT(lon lat)") — o parse (com regex) acontece em parseStadiums.
 * O VALUES ?club {...} (opcional) filtra pelos QIDs de clube do acervo e evita varrer todos os
 * estádios do mundo; sem VALUES, consulta genérica (dry-run com distinct:false/orderBy:false).
 */
export function buildStadiumsQuery(opts: BuildStadiumsQueryOptions = {}): string {
  const {
    clubQids = [],
    offset = 0,
    limit = STADIUMS_DEFAULT_LIMIT,
    distinct = true,
    orderBy = true,
  } = opts;

  const clubValues =
    clubQids.length > 0
      ? '  VALUES ?club { ' + clubQids.map((q) => 'wd:' + q).join(' ') + ' }\n'
      : '';

  // Com clubQids, o VALUES precisa CONSTRAIR o P466 (não pode ficar num OPTIONAL: um vínculo
  // OPTIONAL com ?club desligado casa com TODOS os valores de um VALUES, produzindo associações
  // espúrias de clube para estádios SEM P466). Sem clubQids, P466 fica opcional.
  const clubPattern =
    clubQids.length > 0
      ? '  ?stadium wdt:P466 ?club .\n' + clubValues
      : '  OPTIONAL { ?stadium wdt:P466 ?club . }\n';

  const select = distinct
    ? 'SELECT DISTINCT ?stadium ?stadiumLabel ?capacity ?point ?cityLabel ?countryCode ?club'
    : 'SELECT ?stadium ?stadiumLabel ?capacity ?point ?cityLabel ?countryCode ?club';
  const order = orderBy ? 'ORDER BY ?stadium\n' : '';

  return (
    select +
    ' WHERE {\n' +
    '  ?stadium wdt:P31/wdt:P279* wd:Q483110 .\n' +
    '  OPTIONAL { ?stadium wdt:P1083 ?capacity . }\n' +
    '  OPTIONAL { ?stadium wdt:P625 ?point . }\n' +
    '  OPTIONAL {\n' +
    '    ?stadium wdt:P131 ?city .\n' +
    '    SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". ?city rdfs:label ?cityLabel }\n' +
    '  }\n' +
    '  OPTIONAL {\n' +
    '    ?stadium wdt:P17 ?country .\n' +
    '    ?country wdt:P297 ?countryCode .\n' +
    '  }\n' +
    clubPattern +
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". ?stadium rdfs:label ?stadiumLabel }\n' +
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

/** Converte uma wktLiteral "POINT(lon lat)" (ou "Point(lon lat)") em { lat, lon }. */
export function parseCoordinates(point: string | undefined): { lat: number; lon: number } | null {
  if (!point) return null;
  const m = /^\s*point\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)\s*$/i.exec(point);
  if (!m) return null;
  const lon = Number.parseFloat(m[1]);
  const lat = Number.parseFloat(m[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { lat, lon };
}

/**
 * Valida e destila o corpo JSON de uma resposta SPARQL de estádios.
 * Bindings que violam StadiumEntrySchema (QID malformado, coords fora de faixa, etc.) são descartados.
 */
export function parseStadiums(json: unknown): StadiumEntry[] {
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
  const entries: StadiumEntry[] = [];
  for (const b of bindings) {
    const qid = qidFromUri(b.stadium?.value);
    if (!qid) continue;
    const name = b.stadiumLabel?.value ?? '';
    const coords = parseCoordinates(b.point?.value);
    const rawCapacity = b.capacity?.value ? Number.parseInt(b.capacity.value, 10) : NaN;
    const capacity = Number.isFinite(rawCapacity) ? rawCapacity : null;
    const city = b.cityLabel?.value ?? null;
    const rawCountry = b.countryCode?.value ?? null;
    const country =
      rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;
    const clubQid = b.club?.value ? qidFromUri(b.club.value) : null;

    const candidate = {
      qid,
      name,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
      capacity,
      city,
      country,
      surface: null,
      clubQid,
    } satisfies StadiumEntry;
    const check = StadiumEntrySchema.safeParse(candidate);
    if (check.success) entries.push(check.data);
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Fetch (usa globalThis.fetch, paginação sequencial — concorrência 1 — com backoff)
// ---------------------------------------------------------------------------

export interface FetchStadiumsOptions {
  endpoint?: string;
  userAgent?: string;
  clubQids?: string[];
  offset?: number;
  limit?: number;
  /** Nº máximo de páginas a buscar (default 1 — evita loop infinito p/ testes). */
  maxPages?: number;
  maxRetries?: number;
  backoffMs?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  distinct?: boolean;
  orderBy?: boolean;
}

/**
 * Busca estádios paginando o endpoint. Concorrência 1 (páginas sequenciais) e backoff simples
 * (retry + espera exponencial) em erro HTTP/rede. Retorna os estádios destilados e validados.
 */
export async function fetchStadiums(opts: FetchStadiumsOptions = {}): Promise<StadiumEntry[]> {
  const {
    endpoint = WIKIDATA_SPARQL_ENDPOINT,
    userAgent = STADIUMS_DEFAULT_USER_AGENT,
    clubQids,
    offset = 0,
    limit = STADIUMS_DEFAULT_LIMIT,
    maxPages = STADIUMS_DEFAULT_MAX_PAGES,
    maxRetries = 0,
    backoffMs = 1000,
    fetchImpl = globalThis.fetch,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    distinct = true,
    orderBy = true,
  } = opts;

  const entries: StadiumEntry[] = [];
  for (let page = 0; page < maxPages; page++) {
    const query = buildStadiumsQuery({
      clubQids,
      offset: offset + page * limit,
      limit,
      distinct,
      orderBy,
    });
    const url = endpoint + '?query=' + encodeURIComponent(query) + '&format=json';

    let body: unknown = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetchImpl(url, {
          headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
        });
        if (!res.ok) {
          lastError = new Error('SPARQL HTTP ' + res.status);
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

    const pageEntries = parseStadiums(body);
    entries.push(...pageEntries);
    if (pageEntries.length === 0) break;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Sync anti-órfão + idempotência (repositório injetado; teste usa memória)
// ---------------------------------------------------------------------------

export interface StadiumCreateInput {
  name: string;
  qid: string;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  surface?: string | null;
  clubId?: string | null;
  importedFrom: string;
  importedAt: Date;
  /** URL canônica do item na fonte (T428: proveniência auditável). */
  sourceUrl?: string | null;
}

export interface StadiumsRepository {
  /** Resolve um clube pelo QID. null = não está no acervo (não vincular o estádio). */
  findClubByQid(qid: string): Promise<{ id: string } | null>;
  /** Verifica existência de estádio por QID (idempotência). */
  findStadiumByQid(qid: string): Promise<{ id: string } | null>;
  /** Persiste um estádio. */
  createStadium(args: StadiumCreateInput): Promise<{ id: string }>;
}

export interface StadiumsSyncItem extends StadiumEntry {
  stadiumId?: string;
}

export interface StadiumsOrphan extends StadiumEntry {
  reason: 'club_missing';
}

export interface StadiumsSyncResult {
  /** Estádios criados (não existiam). */
  persisted: StadiumsSyncItem[];
  /** Estádios já presentes ou duplicados no mesmo lote (idempotência). */
  skipped: StadiumsSyncItem[];
  /** Estádios cujo clube associado NÃO está no acervo → fila de revisão, NUNCA persistidos. */
  orphans: StadiumsOrphan[];
  /** Total de entradas recebidas. */
  total: number;
}

export interface StadiumsSyncOptions {
  /** Base da URL de proveniência (default: https://www.wikidata.org/wiki/). */
  sourceUrlBase?: string;
  importedFrom?: string;
  license?: string;
  /** Relógio injetável para importedAt (testes). */
  now?: () => Date;
}

/**
 * Aplica o sync com dedup key = QID. Para cada entrada:
 *  - descarta duplicados do mesmo lote (Set de dedup key);
 *  - resolve o clube por QID → ausente = ÓRFÃO (revisão), nunca persiste; sem clube → clubId null;
 *  - checa estádio existente por QID → idempotente (skipped, não duplica);
 *  - senão cria o estádio com proveniência obrigatória (importedFrom/importedAt).
 */
export async function syncStadiums(
  entries: StadiumEntry[],
  repo: StadiumsRepository,
  opts: StadiumsSyncOptions = {},
): Promise<StadiumsSyncResult> {
  const importedFrom = opts.importedFrom ?? STADIUMS_DATASOURCE;
  const sourceUrlBase = opts.sourceUrlBase ?? WIKIDATA_ITEM_URL_BASE;
  const now = opts.now ?? (() => new Date());

  const seen = new Set<string>();
  const persisted: StadiumsSyncItem[] = [];
  const skipped: StadiumsSyncItem[] = [];
  const orphans: StadiumsOrphan[] = [];

  for (const entry of entries) {
    const key = stadiumsDedupKey(entry);
    if (seen.has(key)) {
      skipped.push({ ...entry });
      continue;
    }
    seen.add(key);

    let clubId: string | null = null;
    if (entry.clubQid) {
      const club = await repo.findClubByQid(entry.clubQid);
      if (!club) {
        orphans.push({ ...entry, reason: 'club_missing' });
        continue;
      }
      clubId = club.id;
    }

    const existing = await repo.findStadiumByQid(entry.qid);
    if (existing) {
      skipped.push({ ...entry, stadiumId: existing.id });
      continue;
    }

    const created = await repo.createStadium({
      name: entry.name,
      qid: entry.qid,
      latitude: entry.latitude ?? null,
      longitude: entry.longitude ?? null,
      capacity: entry.capacity ?? null,
      city: entry.city ?? null,
      state: null,
      country: entry.country ?? null,
      surface: entry.surface ?? null,
      clubId,
      importedFrom,
      importedAt: now(),
      sourceUrl: sourceUrlBase + entry.qid,
    });
    persisted.push({ ...entry, stadiumId: created.id });
  }

  return { persisted, skipped, orphans, total: entries.length };
}
