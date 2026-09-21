/**
 * T448 — Serviço de ingestão de arestas WON (conquistas) no KnowledgeGraph.
 *
 * Fluxo: candidatos do conector (edição→mãe+vencedor+ano) → resolver clube e
 * competição-mãe POR QID contra o acervo → dedup (competitionId, year, clubId,
 * WON) → upsert idempotente com proveniência POR ARESTA (sourceUrl = EDIÇÃO).
 *
 * Regras do dispatch T448:
 *  - vencedor ausente no acervo → ÓRFÃO (nunca persiste; KG não tem FK);
 *  - mãe ausente no acervo → GAP: aresta NÃO gravada, contagem por hierarquia
 *    (input do T448b; NUNCA semear a mãe aqui);
 *  - re-run com dado estável → zero escritas (idempotência provada); metadata
 *    divergente (ex.: resolveHierarchy evoluiu) → atualiza metadata da aresta
 *    existente (re-deriva sem duplicar — mitigação de staleness documentada);
 *  - hierarquia/gênero congelados na escrita (carrossel lê, não re-deriva).
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  WIKIDATA_SPARQL_ENDPOINT,
  WON_PAGE_LIMIT,
  WON_RELATION,
  WON_USER_AGENT,
  WON_WINDOW_YEARS,
  buildMotherLabelsQuery,
  buildWonEdgeMetadata,
  buildWonEdgesQuery,
  enrichWithMotherLabels,
  isKnownHierarchy,
  parseWonEdgesResponse,
  wonEdgeDedupKey,
  type WonEdgeCandidate,
  type WonEdgeMetadata,
} from './connectors/wikidata-won-edges.connector.js';
import {
  RANKING_HIERARCHIES,
  resolveHierarchy,
  type RankHierarchy,
} from '../rankings/ranking-algorithm.service.js';
import { fetchWithRetry, type Fetcher } from '../../lib/http-resilience.js';

// ---------------------------------------------------------------------------
// Contrato de repositório (injetável para TDD com mock; default = Prisma)
// ---------------------------------------------------------------------------

export interface CompetitionRefFull {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}

export interface WonEdgeRepo {
  findClubByQid(qid: string): Promise<{ id: string } | null>;
  findCompetitionByQid(qid: string): Promise<CompetitionRefFull | null>;
  /** Aresta WON existente do par (clube, competição) num dado ano — null se inexistente. */
  findWonEdge(args: {
    clubId: string;
    competitionId: string;
    year: number;
  }): Promise<{ id: string; metadata: unknown } | null>;
  createWonEdge(args: {
    clubId: string;
    competitionId: string;
    metadata: WonEdgeMetadata;
  }): Promise<{ id: string }>;
  updateWonEdgeMetadata(id: string, metadata: WonEdgeMetadata): Promise<void>;
}

export function createPrismaWonEdgeRepo(prisma: PrismaClient): WonEdgeRepo {
  return {
    async findClubByQid(qid) {
      return prisma.club.findUnique({ where: { qid }, select: { id: true } });
    },
    async findCompetitionByQid(qid) {
      return prisma.competition.findUnique({
        where: { qid },
        select: { id: true, qid: true, name: true, type: true, country: true },
      });
    },
    async findWonEdge({ clubId, competitionId, year }) {
      const edges = await prisma.knowledgeGraph.findMany({
        where: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: WON_RELATION,
        },
        select: { id: true, metadata: true },
      });
      return (
        edges.find((e) => {
          const meta = (e.metadata as Record<string, unknown> | null) ?? {};
          return Number(meta.year) === year;
        }) ?? null
      );
    },
    async createWonEdge({ clubId, competitionId, metadata }) {
      return prisma.knowledgeGraph.create({
        data: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: WON_RELATION,
          // WonEdgeMetadata é um objeto JSON plano; o input do Prisma exige o
          // tipo recursivo InputJsonObject (cast seguro por construção).
          metadata: metadata as unknown as Prisma.InputJsonObject,
        },
        select: { id: true },
      });
    },
    async updateWonEdgeMetadata(id, metadata) {
      await prisma.knowledgeGraph.update({
        where: { id },
        data: { metadata: metadata as unknown as Prisma.InputJsonObject },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Sync (lógica pura sobre o repo injetável)
// ---------------------------------------------------------------------------

export interface WonEdgeCreated {
  clubQid: string;
  motherQid: string;
  editionQid: string;
  year: number;
  hierarchy: RankHierarchy;
  gender: 'men' | 'women';
  sourceUrl: string;
  edgeId: string;
}

export interface WonEdgeGap {
  motherQid: string;
  motherName: string;
  year: number;
  hierarchy: RankHierarchy;
}

export interface WonEdgeOrphan {
  winnerQid: string;
  motherQid: string;
  year: number;
  reason: 'club_missing';
}

export interface WonEdgeSyncCounts {
  created: number;
  skipped: number;
  updated: number;
  duplicatesInBatch: number;
}

export interface WonEdgeSyncResult {
  counts: WonEdgeSyncCounts;
  byHierarchy: Record<RankHierarchy, WonEdgeSyncCounts>;
  created: WonEdgeCreated[];
  gaps: WonEdgeGap[];
  gapByHierarchy: Record<RankHierarchy, number>;
  orphans: WonEdgeOrphan[];
  totalCandidates: number;
}

function emptyCounts(): WonEdgeSyncCounts {
  return { created: 0, skipped: 0, updated: 0, duplicatesInBatch: 0 };
}

function emptyHierarchyMap<T>(value: () => T): Record<RankHierarchy, T> {
  return Object.fromEntries(RANKING_HIERARCHIES.map((h) => [h, value()])) as Record<
    RankHierarchy,
    T
  >;
}

/**
 * Aplica o sync. Dedup em lote por (mãe, ano, vencedor) — QIDs; dedup no banco
 * por (competitionId, year, clubId, WON). Nunca grava órfão nem gap.
 */
export async function syncWonEdges(
  candidates: WonEdgeCandidate[],
  repo: WonEdgeRepo,
  opts: { importedAt?: Date } = {},
): Promise<WonEdgeSyncResult> {
  const importedAt = opts.importedAt ?? new Date();
  const counts = emptyCounts();
  const byHierarchy = emptyHierarchyMap(emptyCounts);
  const gapByHierarchy = emptyHierarchyMap(() => 0);
  const gaps: WonEdgeGap[] = [];
  const orphans: WonEdgeOrphan[] = [];
  const createdRows: WonEdgeCreated[] = [];
  const seen = new Set<string>();
  let duplicatesInBatch = 0;

  for (const candidate of candidates) {
    const key = wonEdgeDedupKey(candidate);
    if (seen.has(key)) {
      duplicatesInBatch += 1;
      continue;
    }
    seen.add(key);

    const club = await repo.findClubByQid(candidate.winnerQid);
    if (!club) {
      orphans.push({
        winnerQid: candidate.winnerQid,
        motherQid: candidate.motherQid,
        year: candidate.year,
        reason: 'club_missing',
      });
      continue;
    }

    const mother = await repo.findCompetitionByQid(candidate.motherQid);
    if (!mother) {
      const meta = buildWonEdgeMetadata({ candidate, importedAt });
      gaps.push({
        motherQid: candidate.motherQid,
        motherName: candidate.motherName,
        year: candidate.year,
        hierarchy: meta.hierarchy,
      });
      gapByHierarchy[meta.hierarchy] += 1;
      continue;
    }

    const metadata = buildWonEdgeMetadata({ candidate, motherRef: mother, importedAt });
    const existing = await repo.findWonEdge({
      clubId: club.id,
      competitionId: mother.id,
      year: candidate.year,
    });
    if (existing) {
      // Idempotência: mesmo ano + mesma fonte → skip; metadata divergente →
      // atualiza (re-deriva sem duplicar).
      const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
      const sameData =
        prev.hierarchy === metadata.hierarchy &&
        prev.gender === metadata.gender &&
        prev.sourceUrl === metadata.sourceUrl &&
        prev.editionQid === metadata.editionQid;
      if (sameData) {
        counts.skipped += 1;
        byHierarchy[metadata.hierarchy].skipped += 1;
      } else {
        await repo.updateWonEdgeMetadata(existing.id, metadata);
        counts.updated += 1;
        byHierarchy[metadata.hierarchy].updated += 1;
      }
      continue;
    }

    const created = await repo.createWonEdge({
      clubId: club.id,
      competitionId: mother.id,
      metadata,
    });
    counts.created += 1;
    byHierarchy[metadata.hierarchy].created += 1;
    createdRows.push({
      clubQid: candidate.winnerQid,
      motherQid: candidate.motherQid,
      editionQid: candidate.editionQid,
      year: candidate.year,
      hierarchy: metadata.hierarchy,
      gender: metadata.gender,
      sourceUrl: metadata.sourceUrl,
      edgeId: created.id,
    });
  }

  counts.duplicatesInBatch = duplicatesInBatch;
  return {
    counts,
    byHierarchy,
    created: createdRows,
    gaps,
    gapByHierarchy,
    orphans,
    totalCandidates: candidates.length,
  };
}

/** Hierarquia de uma aresta WON lida do banco: metadata.hierarchy (congelada) com fallback na derivação. */
export function hierarchyOfEdge(
  metadata: unknown,
  comp: {
    qid: string | null;
    name: string | null;
    type: string | null;
    country: string | null;
  } | null,
): RankHierarchy {
  const meta = (metadata as Record<string, unknown> | null) ?? {};
  if (isKnownHierarchy(meta.hierarchy)) return meta.hierarchy;
  return resolveHierarchy(comp);
}

/**
 * Uma edição = um ano (T448): temporada que atravessa o ano (ex. 2022-23,
 * com P580=2022 e P585/P582=2023) volta 2× na UNION e viraria DOIS títulos
 * na dedup (mãe,ano,clube). Colapsa para o ano INICIAL (convenção: a
 * "temporada 2022-23" é a temporada de 2022).
 */
export function collapseEditionYears(candidates: WonEdgeCandidate[]): WonEdgeCandidate[] {
  const yearByEdition = new Map<string, number>();
  for (const c of candidates) {
    const prev = yearByEdition.get(c.editionQid);
    yearByEdition.set(c.editionQid, prev === undefined ? c.year : Math.min(prev, c.year));
  }
  return candidates.map((c) => ({
    ...c,
    year: yearByEdition.get(c.editionQid) ?? c.year,
  }));
}

// ---------------------------------------------------------------------------
// Fetch paginado (rede injetável para teste; default = fetchWithRetry)
// ---------------------------------------------------------------------------

export interface WonFetchStats {
  windows: number;
  rows: number;
  invalid: number;
  withoutLabel: number;
  /** Janelas que bateram no LIMIT (possível truncamento — reportado, nunca silenciado). */
  truncatedWindows: Array<{ minYear: number; maxYear: number; rows: number }>;
}

export interface WonFetchResult {
  candidates: WonEdgeCandidate[];
  stats: WonFetchStats;
}

// T448 — VALUES-bounded em GET: acima de ~4k chars de URL o endpoint responde
// 431 (medido: chunk 500 → 7.735 chars → 431; chunk 250 → 3.985 → 200).
const DEFAULT_LABELS_CHUNK = 200;
const DEFAULT_WINDOW_SLEEP_MS = 2000; // rate-limit conservador do endpoint (T426)

export interface FetchWonCandidatesOptions {
  minYear?: number;
  maxYear?: number;
  timeoutMs?: number;
  windowSleepMs?: number;
  /** Injeção para testes (mock de rede). */
  fetcher?: Fetcher;
  /** Injeção do sleep (testes rápidos). */
  sleepFn?: (ms: number) => Promise<void>;
}

function sparqlUrl(query: string): string {
  return `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
}

async function sparqlFetch(query: string, opts: FetchWonCandidatesOptions): Promise<unknown> {
  const res = await fetchWithRetry(
    sparqlUrl(query),
    { headers: { 'user-agent': WON_USER_AGENT, Accept: 'application/sparql-results+json' } },
    {
      timeoutMs: opts.timeoutMs ?? 90_000,
      label: 'ingest-won-edges',
      retryDelaysMs: [2000, 5000, 10000],
    },
  );
  return (await res.json()) as unknown;
}

/** Busca TODAS as edições com vencedor no intervalo de anos, em janelas de WON_WINDOW_YEARS anos. */
export async function fetchWonCandidates(
  opts: FetchWonCandidatesOptions = {},
): Promise<WonFetchResult> {
  const sleep = opts.sleepFn ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const minYear = opts.minYear ?? 1870;
  const maxYear = opts.maxYear ?? new Date().getFullYear();
  const stats: WonFetchStats = {
    windows: 0,
    rows: 0,
    invalid: 0,
    withoutLabel: 0,
    truncatedWindows: [],
  };
  const rows = [];
  const motherQids = new Set<string>();

  for (let start = minYear; start <= maxYear; start += WON_WINDOW_YEARS) {
    const window = { minYear: start, maxYear: Math.min(start + WON_WINDOW_YEARS - 1, maxYear) };
    const json = await sparqlFetch(buildWonEdgesQuery(window), opts);
    const parsed = parseWonEdgesResponse(json);
    stats.windows += 1;
    stats.rows += parsed.rows.length;
    stats.invalid += parsed.invalid;
    if (parsed.rows.length >= WON_PAGE_LIMIT) {
      stats.truncatedWindows.push({ ...window, rows: parsed.rows.length });
    }
    for (const r of parsed.rows) motherQids.add(r.motherQid);
    rows.push(...parsed.rows);
    if (window.maxYear < maxYear) await sleep(opts.windowSleepMs ?? DEFAULT_WINDOW_SLEEP_MS);
  }

  // Labels das mães em lotes VALUES-bounded (consulta barata; sem label na query pesada).
  const labels = new Map<string, string>();
  const qids = [...motherQids];
  for (let i = 0; i < qids.length; i += DEFAULT_LABELS_CHUNK) {
    const chunk = qids.slice(i, i + DEFAULT_LABELS_CHUNK);
    const json = await sparqlFetch(buildMotherLabelsQuery(chunk), opts);
    const bindings =
      (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })?.results
        ?.bindings ?? [];
    for (const b of bindings) {
      const qid = b.mother?.value?.split('/').pop();
      const label = b.motherLabel?.value;
      if (qid && label) labels.set(qid, label);
    }
    await sleep(opts.windowSleepMs ?? DEFAULT_WINDOW_SLEEP_MS);
  }

  const enriched = enrichWithMotherLabels(rows, labels);
  stats.withoutLabel = enriched.withoutLabel;

  const collapsed = collapseEditionYears(enriched.candidates);

  // Dedup em lote: (mãe, ano, vencedor) — a mesma linha pode voltar em janelas
  // vizinhas (datas P580/P582 cruzando o limite) ou duplicada no mesmo window.
  const seen = new Set<string>();
  const candidates = collapsed.filter((c) => {
    const key = wonEdgeDedupKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { candidates, stats };
}
