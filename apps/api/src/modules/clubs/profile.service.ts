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
import { favoritesService } from '../favorites/service.js';
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
  /** WS-C-13 — site oficial/redes + snapshot estático de seguidores (T493). */
  website: string | null;
  officialSite: string | null;
  socialLinks: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot: (Record<string, number | null> & { updatedAt?: string }) | null;
  /** WS-C-12 — ❤ contagem pública de favoritantes. */
  fansCount: number;
  /** T450 wave 8 — infobox Wikipedia PT (fonte padrão substituta do Wikidata). */
  infobox: Record<string, string> | null;
  /** T502 — mídia visual: escudo (P154) e estádio (P115/P625/P1083/P18). */
  media: ClubMediaFields;
  /**
   * T507 (W5) — texto editorial da Wikipedia por idioma (CC-BY-SA).
   * Shape: { pt?: {extract, description, sourceUrl}, en?: {...}, es?: {...}, license }
   */
  editorial: Record<string, unknown> | null;
}

/** T502 (W1) — mídia do clube exposta no perfil público. */
export interface ClubMediaFields {
  logoUrl: string | null;
  teamColors: string[] | null;
  kind: string;
  federation: string | null;
  stadium: {
    name: string | null;
    image: string | null;
    capacity: number | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
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
  /** WS-C-13 — expostos no perfil p/ a página pública (T493 despacho itens 1-3). */
  website?: string | null;
  officialSite?: string | null;
  socialLinks?: unknown;
  followersSnapshot?: unknown;
  /** WS-C-12 — ❤ contagem pública de favoritantes. */
  fansCount?: number | null;
  /** T502 — mídia visual (opcional; ausente ⇒ null honestamente). */
  logoUrl?: string | null;
  teamColors?: unknown;
  kind?: string | null;
  federation?: string | null;
  stadiumName?: string | null;
  stadiumImage?: string | null;
  stadiumCapacity?: number | null;
  stadiumLat?: number | null;
  stadiumLng?: number | null;
  editorialText?: unknown;
}

const INFOBOX_KEYS = [
  'estadio',
  'capacidade',
  'alcunhas',
  'mascote',
  'presidente',
  'treinador',
  'local',
  'liga',
] as const;

/** T507 (W5) — bloco editorial (null quando não há texto na fonte). */
export function editorialFromMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const hasAny = ['pt', 'en', 'es'].some((l) => o[l] != null);
  return hasAny ? o : null;
}

/** T502 (W1) — monta o bloco de mídia do perfil (tudo null quando ausente). */
function buildMediaFromClub(club: {
  logoUrl?: string | null;
  teamColors?: unknown;
  kind?: string | null;
  federation?: string | null;
  stadiumName?: string | null;
  stadiumImage?: string | null;
  stadiumCapacity?: number | null;
  stadiumLat?: number | null;
  stadiumLng?: number | null;
}): ClubMediaFields {
  const colors = Array.isArray(club.teamColors)
    ? (club.teamColors as unknown[]).filter((c): c is string => typeof c === 'string')
    : null;
  const hasStadium =
    club.stadiumName != null ||
    club.stadiumImage != null ||
    club.stadiumCapacity != null ||
    club.stadiumLat != null;
  return {
    logoUrl: club.logoUrl ?? null,
    teamColors: colors && colors.length > 0 ? colors : null,
    kind: club.kind ?? 'club',
    federation: club.federation ?? null,
    stadium: hasStadium
      ? {
          name: club.stadiumName ?? null,
          image: club.stadiumImage ?? null,
          capacity: club.stadiumCapacity ?? null,
          latitude: club.stadiumLat ?? null,
          longitude: club.stadiumLng ?? null,
        }
      : null,
  };
}

/** T450 wave 8 — extrai o bloco metadata.infobox (Wikipedia PT) p/ o perfil. */
export function infoboxFromMetadata(metadata: unknown): Record<string, string> | null {
  const meta = (metadata as Record<string, unknown> | null) ?? {};
  const infobox = meta.infobox as Record<string, unknown> | null;
  if (!infobox || typeof infobox !== 'object') return null;
  const out: Record<string, string> = {};
  for (const key of INFOBOX_KEYS) {
    const v = infobox[key];
    if (typeof v === 'string' && v.trim()) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
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
    website: club.website ?? null,
    officialSite: club.officialSite ?? null,
    socialLinks: (club.socialLinks ?? null) as ClubProfile['socialLinks'],
    followersSnapshot: (club.followersSnapshot ?? null) as ClubProfile['followersSnapshot'],
    fansCount: club.fansCount ?? 0,
    infobox: infoboxFromMetadata(club.metadata),
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
    // T502 (W1) — mídia visual (escudo/estádio); null honesto quando ausente.
    media: buildMediaFromClub(club),
    // T507 (W5) — texto editorial por idioma (null honesto quando ausente).
    editorial: editorialFromMetadata(club.editorialText),
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

    const [geoView, titles, fansCount] = await Promise.all([
      clubsRepository.findGeoById(id),
      clubsRepository.listTitlesByClub(id),
      favoritesService.countTarget('club', id),
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
      logoUrl: club.logoUrl ?? null,
      teamColors: club.teamColors ?? null,
      kind: club.kind ?? 'club',
      federation: club.federation ?? null,
      stadiumName: club.stadiumName ?? null,
      stadiumImage: club.stadiumImage ?? null,
      stadiumCapacity: club.stadiumCapacity ?? null,
      stadiumLat: club.stadiumLat ?? null,
      stadiumLng: club.stadiumLng ?? null,
      editorialText: club.editorialText ?? null,
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
      website: club.website,
      socialLinks: club.socialLinks,
      followersSnapshot: club.followersSnapshot,
      fansCount,
    };
    return buildProfile(input, geoView, titles, rankings, competitions, related);
  });
}
