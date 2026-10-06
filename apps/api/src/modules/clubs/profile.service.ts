/**
 * WS-C-1 — Perfil consolidado de clube (READ-ONLY, API-only).
 *
 * Monta o perfil usando SOMENTE dados existentes no acervo: clube + geo (com atribuição
 * ODbL quando vier de OSM/Nominatim), proveniência, títulos (KG WON), rankings e
 * competições relacionadas. Nunca inventa história/elenco/estádio/uniformes/hino — o que
 * não existe vira `null`/`available:false` e é declarado em `gaps`.
 *
 * O mapeamento é PURO (`buildProfile`) para testes; o fetch fica no repositório/serviço.
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { clubsRepository, type ClubGeoView, type ClubTitleView } from './repository.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import {
  geoAttributionForMetadata,
  type GeoAttribution,
} from '../../lib/geocoding/geo-attribution.js';

const PROFILE_TTL_SECONDS = 300;

export interface ProfileGeo {
  latitude: number | null;
  longitude: number | null;
  coordSource: string | null;
  coordPrecision: string | null;
  attribution: GeoAttribution | null;
}

export interface ProfileProvenance {
  source: 'wikidata' | 'rsssf' | 'seed' | null;
  sourceUrl: string | null;
  importedFrom: string | null;
  retrievedAt: string | null;
}

export interface ProfileSection<T> {
  available: boolean;
  items: T[];
  limitations: string[];
}

export interface ProfileTitleItem {
  year: number | null;
  season: string | null;
  competition: { id: string; name: string | null } | null;
  hierarchy: string;
  gender: 'men' | 'women';
  sourceUrl: string | null;
}

export interface ProfileRankingItem {
  rankingId: string;
  rankingName: string;
  scope: string | null;
  season: string | null;
  competitionId: string | null;
  competitionName: string | null;
  position: number | null;
  points: number | null;
  publishedAt: string | null;
}

export interface ProfileCompetitionItem {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}

export interface ProfileRelatedEdge {
  relation: string;
  direction: 'source' | 'target';
  otherId: string;
  otherType: string;
  sourceUrl: string | null;
}

export interface ClubProfile {
  id: string;
  qid: string | null;
  name: string;
  fullName: string | null;
  shortName: string | null;
  status: string;
  country: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  /** T450 — 'men' | 'women' | 'mixed' (default 'men' para o acervo existente). */
  gender: 'men' | 'women' | 'mixed';
  geo: ProfileGeo;
  provenance: ProfileProvenance;
  titles: ProfileSection<ProfileTitleItem>;
  rankings: ProfileSection<ProfileRankingItem>;
  competitions: ProfileSection<ProfileCompetitionItem>;
  related: ProfileSection<ProfileRelatedEdge>;
  gaps: string[];
}

/** Gaps permanentes do acervo atual (dados que simplesmente não existem ainda). */
export const PROFILE_GAPS = [
  'history_not_available',
  'squad_not_available',
  'stadium_not_available',
  'kits_not_available',
  'anthem_not_available',
  'matches_not_available',
] as const;

export interface ProfileClubInput {
  id: string;
  qid: string | null;
  name: string;
  /** T450 — 'men' | 'women' | 'mixed' (default 'men'). */
  gender?: string;
  fullName: string | null;
  shortName: string | null;
  status: string;
  country: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
  metadata: unknown;
}

export function deriveProvenance(club: {
  sourceUrl: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
}): ProfileProvenance {
  const from = (club.importedFrom ?? '').toLowerCase();
  const source: ProfileProvenance['source'] = from.includes('rsssf')
    ? 'rsssf'
    : from.includes('seed')
      ? 'seed'
      : from.includes('wikidata')
        ? 'wikidata'
        : null;
  return {
    source,
    sourceUrl: club.sourceUrl,
    importedFrom: club.importedFrom,
    retrievedAt: club.importedAt ? new Date(club.importedAt).toISOString() : null,
  };
}

export function buildGeo(
  club: { latitude: number | null; longitude: number | null; metadata: unknown },
  geoView: ClubGeoView | null,
): ProfileGeo {
  const meta = (club.metadata as Record<string, unknown> | null) ?? {};
  const coordSource = typeof meta.coordSource === 'string' ? meta.coordSource : null;
  const coordPrecision = typeof meta.coordPrecision === 'string' ? meta.coordPrecision : null;
  return {
    latitude: geoView?.coordinates.latitude ?? club.latitude,
    longitude: geoView?.coordinates.longitude ?? club.longitude,
    coordSource,
    coordPrecision,
    attribution: geoAttributionForMetadata(club.metadata),
  };
}

export function buildTitlesSection(items: ClubTitleView[]): ProfileSection<ProfileTitleItem> {
  const mapped: ProfileTitleItem[] = items.map((t) => ({
    year: t.year,
    season: t.season,
    competition: t.competition,
    hierarchy: t.hierarchy,
    gender: t.gender,
    sourceUrl: t.sourceUrl,
  }));
  return {
    available: mapped.length > 0,
    items: mapped,
    limitations: mapped.length === 0 ? ['no_provenanced_titles'] : [],
  };
}

export function buildProfile(
  club: ProfileClubInput,
  geoView: ClubGeoView | null,
  titles: ClubTitleView[],
  rankings: ProfileRankingItem[],
  competitions: ProfileCompetitionItem[],
  related: ProfileRelatedEdge[],
): ClubProfile {
  return {
    id: club.id,
    qid: club.qid,
    name: club.name,
    fullName: club.fullName,
    shortName: club.shortName,
    status: club.status,
    country: club.country,
    state: club.state,
    city: club.city,
    foundedYear: club.foundedYear,
    gender: (club.gender as 'men' | 'women' | 'mixed' | undefined) ?? 'men',
    geo: buildGeo(club, geoView),
    provenance: deriveProvenance(club),
    titles: buildTitlesSection(titles),
    rankings: {
      available: rankings.length > 0,
      items: rankings,
      limitations: rankings.length === 0 ? ['no_published_ranking'] : [],
    },
    competitions: {
      available: competitions.length > 0,
      items: competitions,
      limitations: competitions.length === 0 ? ['no_related_competition'] : [],
    },
    related: {
      available: related.length > 0,
      items: related,
      limitations: related.length === 0 ? ['no_related_edges'] : [],
    },
    gaps: [...PROFILE_GAPS],
  };
}

async function loadRelatedEdges(clubId: string): Promise<ProfileRelatedEdge[]> {
  const raw = await prisma.knowledgeGraph.findMany({
    where: {
      OR: [
        { sourceId: clubId, sourceType: 'Club' },
        { targetId: clubId, targetType: 'Club' },
      ],
    },
    select: {
      relation: true,
      sourceId: true,
      sourceType: true,
      targetId: true,
      targetType: true,
      metadata: true,
    },
  });
  return excludeSoftDeleted(raw)
    .filter((e) => !(e.sourceId === clubId && e.targetId === clubId))
    .map((e) => {
      const isSource = e.sourceId === clubId && e.sourceType === 'Club';
      const meta = (e.metadata as Record<string, unknown> | null) ?? {};
      return {
        relation: e.relation,
        direction: (isSource ? 'source' : 'target') as 'source' | 'target',
        otherId: isSource ? e.targetId : e.sourceId,
        otherType: isSource ? e.targetType : e.sourceType,
        sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
      };
    });
}

export async function loadRankings(clubId: string): Promise<ProfileRankingItem[]> {
  const entries = await prisma.rankingEntry.findMany({
    where: { clubId, ranking: { publishedAt: { not: null } } },
    select: {
      position: true,
      points: true,
      ranking: {
        select: {
          id: true,
          name: true,
          scope: true,
          season: true,
          competitionId: true,
          publishedAt: true,
          competition: { select: { name: true } },
        },
      },
    },
    orderBy: [{ ranking: { publishedAt: 'desc' } }],
    take: 50,
  });
  return entries.map((e) => ({
    rankingId: e.ranking.id,
    rankingName: e.ranking.name,
    scope: e.ranking.scope,
    season: e.ranking.season,
    competitionId: e.ranking.competitionId,
    competitionName: e.ranking.competition?.name ?? null,
    position: e.position,
    points: e.points,
    publishedAt: e.ranking.publishedAt ? new Date(e.ranking.publishedAt).toISOString() : null,
  }));
}

export async function getClubProfile(id: string): Promise<ClubProfile | null> {
  return cache.remember(`clubs:profile:${id}`, PROFILE_TTL_SECONDS, async () => {
    const club = await prisma.club.findFirst({ where: { id, deletedAt: null } });
    if (!club) return null;

    const [geoView, titles] = await Promise.all([
      clubsRepository.findGeoById(id),
      clubsRepository.listTitlesByClub(id),
    ]);
    const rankings = await loadRankings(id);

    const compIds = new Set<string>();
    for (const t of titles) if (t.competition?.id) compIds.add(t.competition.id);
    for (const r of rankings) if (r.competitionId) compIds.add(r.competitionId);
    const competitions = compIds.size
      ? (
          await prisma.competition.findMany({
            where: { id: { in: [...compIds] }, deletedAt: null },
            select: { id: true, qid: true, name: true, type: true, country: true },
          })
        ).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      : [];

    const related = await loadRelatedEdges(id);

    const input: ProfileClubInput = {
      id: club.id,
      gender: club.gender,
      qid: club.qid,
      name: club.name,
      fullName: club.fullName,
      shortName: club.shortName,
      status: club.status,
      country: club.country,
      state: club.state,
      city: club.city,
      foundedYear: club.foundedYear,
      latitude: club.latitude,
      longitude: club.longitude,
      sourceUrl: club.sourceUrl,
      importedFrom: club.importedFrom,
      importedAt: club.importedAt,
      metadata: club.metadata,
    };
    return buildProfile(input, geoView, titles, rankings, competitions, related);
  });
}
