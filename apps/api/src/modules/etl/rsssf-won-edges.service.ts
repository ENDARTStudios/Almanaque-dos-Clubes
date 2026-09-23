/**
 * T448b-2b FASE 2 — Writer de arestas WON estaduais (fonte RSSSF).
 *
 * Reutiliza a MESMA convenção do T448 para `knowledge_graph`:
 *   sourceId=clubId (Club) → targetId=competitionId (Competition), relation='WON',
 *   ano em `metadata.year` (dedup factual = clube|competição|ano|WON).
 *
 * R1: idempotência por (clubId, competitionId, year). Mesma conquista em URL
 *     diferente NÃO duplica; só enriquece `metadata`. O hash da URL NÃO é chave.
 * R3: sem hard delete; `metadata.deletedAt` (soft-delete lógico) preparado aqui.
 * R4: `authorCredit`+`licenseText` revalidados — ausência bloqueia (não grava).
 * Ponte de identidade: competição-mãe ausente → upsert idempotente por `qid`
 *     (país BR, type LEAGUE, proveniência RSSSF); clube ausente por qid → tenta
 *     por NOME EXATO (sem fuzzy); se achar, vincula o qid; senão FAIL-FAST.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import type { WonCandidate } from '../../lib/rsssf/types.js';
import { RSSSF_LICENSE } from './connectors/rsssf-tables.connector.js';

export const RSSSF_WON_DATASOURCE = 'rsssf' as const;

/** Metadados da aresta RSSSF. Mantém as chaves que os leitores usam
 * (year/season/hierarchy/gender/sourceUrl) + proveniência/atribuição. */
export interface RsssfWonMetadata {
  year: number;
  season: string;
  hierarchy: 'estadual' | 'nacional' | 'continental' | 'mundial' | 'municipal';
  gender: 'men' | 'women' | 'unknown';
  dataSource: typeof RSSSF_WON_DATASOURCE;
  source: typeof RSSSF_WON_DATASOURCE;
  sourceUrl: string;
  license: string;
  authorCredit: string;
  licenseText: string;
  attributionRequired: true;
  editionQid: null;
  parserVersion: string;
  pageChampionPhrase: string | null;
  tablePosition: number | null;
  sourcePageUrlHash: string;
  externalId: string;
  importedAt: string;
}

export function buildRsssfWonMetadata(c: WonCandidate, importedAt: Date): RsssfWonMetadata {
  return {
    year: c.seasonYear,
    season: String(c.seasonYear),
    hierarchy: c.hierarchy,
    gender: c.gender,
    dataSource: RSSSF_WON_DATASOURCE,
    source: RSSSF_WON_DATASOURCE,
    sourceUrl: c.sourceUrl,
    license: RSSSF_LICENSE,
    authorCredit: c.authorCredit,
    licenseText: c.licenseText,
    attributionRequired: true,
    editionQid: null,
    parserVersion: c.metadataExtras.parserVersion,
    pageChampionPhrase: c.metadataExtras.pageChampionPhrase,
    tablePosition: c.metadataExtras.tablePosition,
    sourcePageUrlHash: c.metadataExtras.sourcePageUrlHash,
    externalId: c.externalId,
    importedAt: importedAt.toISOString(),
  };
}

export interface ClubRef {
  id: string;
  qid: string | null;
  name: string;
  deletedAt: Date | null;
}

export interface CreateCompetitionInput {
  name: string;
  country: string;
  type: 'LEAGUE';
  qid: string;
  importedFrom: 'rsssf';
  sourceUrl: string;
}

export interface RsssfWonRepo {
  findClubByQid(qid: string): Promise<ClubRef | null>;
  findClubsByName(name: string): Promise<ClubRef[]>;
  setClubQid(id: string, qid: string): Promise<void>;
  findCompetitionByQid(qid: string): Promise<{ id: string } | null>;
  createCompetition(input: CreateCompetitionInput): Promise<{ id: string }>;
  findWonEdge(args: {
    clubId: string;
    competitionId: string;
    year: number;
  }): Promise<{ id: string; metadata: unknown } | null>;
  createWonEdge(args: {
    clubId: string;
    competitionId: string;
    metadata: RsssfWonMetadata;
  }): Promise<{ id: string }>;
  updateWonEdgeMetadata(id: string, metadata: RsssfWonMetadata): Promise<void>;
}

export function createPrismaRsssfWonRepo(prisma: PrismaClient): RsssfWonRepo {
  return {
    findClubByQid: (qid) =>
      prisma.club.findUnique({
        where: { qid },
        select: { id: true, qid: true, name: true, deletedAt: true },
      }),
    findClubsByName: (name) =>
      prisma.club.findMany({
        where: { OR: [{ name }, { fullName: name }] },
        select: { id: true, qid: true, name: true, deletedAt: true },
      }),
    setClubQid: async (id, qid) => {
      await prisma.club.update({ where: { id }, data: { qid } });
    },
    findCompetitionByQid: (qid) =>
      prisma.competition.findUnique({ where: { qid }, select: { id: true } }),
    createCompetition: (input) =>
      prisma.competition.create({
        data: {
          name: input.name,
          country: input.country,
          type: input.type,
          qid: input.qid,
          importedFrom: input.importedFrom,
          importedAt: new Date(),
          sourceUrl: input.sourceUrl,
        },
        select: { id: true },
      }),
    findWonEdge: async ({ clubId, competitionId, year }) => {
      const edges = await prisma.knowledgeGraph.findMany({
        where: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: 'WON',
        },
        select: { id: true, metadata: true },
      });
      return (
        edges.find((e) => Number((e.metadata as Record<string, unknown> | null)?.year) === year) ??
        null
      );
    },
    createWonEdge: ({ clubId, competitionId, metadata }) =>
      prisma.knowledgeGraph.create({
        data: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: competitionId,
          targetType: 'Competition',
          relation: 'WON',
          metadata: metadata as unknown as Prisma.InputJsonObject,
        },
        select: { id: true },
      }),
    updateWonEdgeMetadata: async (id, metadata) => {
      await prisma.knowledgeGraph.update({
        where: { id },
        data: { metadata: metadata as unknown as Prisma.InputJsonObject },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Sync (puro sobre o repo injetável)
// ---------------------------------------------------------------------------

export interface RsssfWonCounts {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  attributionMissing: number;
  duplicatesInBatch: number;
}

export interface RsssfWonCreated {
  clubQid: string;
  clubName: string;
  competitionQid: string;
  year: number;
  edgeId: string;
}

export interface RsssfWonFailure {
  clubQid: string;
  reason: 'attribution_missing' | 'club_missing' | 'ambiguous_club' | 'club_inactive';
}

export interface RsssfWonSyncResult {
  counts: RsssfWonCounts;
  created: RsssfWonCreated[];
  failures: RsssfWonFailure[];
  competitionsCreated: Array<{ qid: string; name: string }>;
  clubsLinked: Array<{ id: string; qid: string }>;
  totalCandidates: number;
}

export async function syncRsssfWonEdges(
  candidates: WonCandidate[],
  repo: RsssfWonRepo,
  opts: { importedAt?: Date } = {},
): Promise<RsssfWonSyncResult> {
  const importedAt = opts.importedAt ?? new Date();
  const counts: RsssfWonCounts = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    attributionMissing: 0,
    duplicatesInBatch: 0,
  };
  const created: RsssfWonCreated[] = [];
  const failures: RsssfWonFailure[] = [];
  const competitionsCreated: Array<{ qid: string; name: string }> = [];
  const clubsLinked: Array<{ id: string; qid: string }> = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (seen.has(c.dedupKey)) {
      counts.duplicatesInBatch += 1;
      continue;
    }
    seen.add(c.dedupKey);

    // R4 — revalidação de atribuição (bloqueia, nunca grava sem crédito).
    if (!c.authorCredit?.trim() || !c.licenseText?.trim()) {
      counts.attributionMissing += 1;
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'attribution_missing' });
      continue;
    }

    // Ponte de identidade — clube.
    let club = await repo.findClubByQid(c.clubQid);
    if (!club) {
      const byName = await repo.findClubsByName(c.clubName);
      if (byName.length === 1) {
        club = byName[0];
        if (!club.qid) {
          await repo.setClubQid(club.id, c.clubQid);
          clubsLinked.push({ id: club.id, qid: c.clubQid });
          club = { ...club, qid: c.clubQid };
        }
      } else if (byName.length > 1) {
        counts.failed += 1;
        failures.push({ clubQid: c.clubQid, reason: 'ambiguous_club' });
        continue;
      }
    }
    if (!club) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'club_missing' });
      continue;
    }
    if (club.deletedAt) {
      counts.failed += 1;
      failures.push({ clubQid: c.clubQid, reason: 'club_inactive' });
      continue;
    }

    // Ponte de identidade — competição-mãe (upsert idempotente por qid).
    let comp = await repo.findCompetitionByQid(c.competitionQid);
    if (!comp) {
      comp = await repo.createCompetition({
        name: c.competitionName,
        country: 'BR',
        type: 'LEAGUE',
        qid: c.competitionQid,
        importedFrom: 'rsssf',
        sourceUrl: c.sourceUrl,
      });
      competitionsCreated.push({ qid: c.competitionQid, name: c.competitionName });
    }

    const metadata = buildRsssfWonMetadata(c, importedAt);
    const existing = await repo.findWonEdge({
      clubId: club.id,
      competitionId: comp.id,
      year: c.seasonYear,
    });
    if (existing) {
      const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
      const sameData =
        prev.sourceUrl === metadata.sourceUrl &&
        prev.authorCredit === metadata.authorCredit &&
        prev.hierarchy === metadata.hierarchy &&
        prev.gender === metadata.gender &&
        prev.externalId === metadata.externalId;
      if (sameData) {
        counts.skipped += 1;
      } else {
        await repo.updateWonEdgeMetadata(existing.id, metadata);
        counts.updated += 1;
      }
      continue;
    }

    const row = await repo.createWonEdge({ clubId: club.id, competitionId: comp.id, metadata });
    counts.created += 1;
    created.push({
      clubQid: c.clubQid,
      clubName: c.clubName,
      competitionQid: c.competitionQid,
      year: c.seasonYear,
      edgeId: row.id,
    });
  }

  return {
    counts,
    created,
    failures,
    competitionsCreated,
    clubsLinked,
    totalCandidates: candidates.length,
  };
}
