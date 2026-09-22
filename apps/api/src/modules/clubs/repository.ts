/**
 * Camada de repositório — isolamento das chamadas Prisma.
 * Facilita mocks em testes e troca futura de ORM.
 */
import { prisma } from '../../config/prisma.js';
import type { Club } from '@almanaque/domain';
import { hierarchyOfEdge } from '../etl/won-edges.service.js';
import { isWomensCompetition, type RankHierarchy } from '../rankings/ranking-algorithm.service.js';

export interface ListClubsParams {
  country?: string;
  hasCoordinates?: boolean;
  city?: string;
  status?: string;
  search?: string;
  /** T467 — filtros pela hierarquia geo (T466): continente/país/estado/cidade. */
  continent?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  limit?: number;
  offset?: number;
}

export interface GeoStatsState {
  id: string;
  code: string;
  name: string;
  clubs: number;
}
export interface GeoStatsCountry {
  id: string;
  iso2: string;
  name: string;
  clubs: number;
  states: GeoStatsState[];
}
export interface GeoStatsContinent {
  code: string; // AF/AN/AS/EU/NA/OC/SA ou 'ZZ' (países sem continente — vazio-honesto)
  clubs: number;
  countries: GeoStatsCountry[];
}
export interface GeoStats {
  generatedAt: string;
  source: 'derived'; // derivado do banco (não é fonte de terceiro)
  baseQuery: string;
  totals: {
    clubsWithCountry: number;
    countries: number;
    states: number;
  };
  continents: GeoStatsContinent[];
}

export const clubsRepository = {
  async create(data: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    return prisma.club.create({ data: data as any }) as Promise<Club>;
  },

  async findMany(params: ListClubsParams = {}): Promise<Club[]> {
    const {
      country,
      city,
      status,
      search,
      hasCoordinates,
      continent,
      countryId,
      stateId,
      cityId,
      limit = 50,
      offset = 0,
    } = params;

    return prisma.club.findMany({
      where: {
        deletedAt: null,
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
          // T467 — 'ZZ' = bucket dos países sem continente (continent NULL).
          continent ? { countryRef: { continent: continent === 'ZZ' ? null : continent } } : {},
          countryId ? { countryId } : {},
          stateId ? { stateId } : {},
          cityId ? { cityId } : {},
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { fullName: { contains: search } },
                  { shortName: { contains: search } },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Club[]>;
  },

  async count(params: ListClubsParams = {}): Promise<number> {
    const { country, city, status, search, hasCoordinates, continent, countryId, stateId, cityId } =
      params;
    return prisma.club.count({
      where: {
        deletedAt: null,
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
          // T467 — 'ZZ' = bucket dos países sem continente (continent NULL).
          continent ? { countryRef: { continent: continent === 'ZZ' ? null : continent } } : {},
          countryId ? { countryId } : {},
          stateId ? { stateId } : {},
          cityId ? { cityId } : {},
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { fullName: { contains: search } },
                  { shortName: { contains: search } },
                ],
              }
            : {},
        ],
      },
    });
  },

  async findById(id: string): Promise<Club | null> {
    // T449EN — exclui soft-deleted (ruído) do detalhe/perfil.
    return prisma.club.findFirst({ where: { id, deletedAt: null } }) as Promise<Club | null>;
  },

  /**
   * T466 — Geografia resolvida do clube (contrato consumido pelo mapa T467).
   * Retorna a hierarquia normalizada (país/estado/cidade) + coordenadas do clube;
   * campos nulos = dado ausente (honesto, sem invenção).
   */
  async findGeoById(id: string): Promise<ClubGeoView | null> {
    const club = await prisma.club.findFirst({
      where: { id, deletedAt: null },
      select: {
        latitude: true,
        longitude: true,
        countryRef: { select: { id: true, iso2: true, name: true, continent: true } },
        stateRef: { select: { id: true, code: true, name: true } },
        cityRef: { select: { id: true, qid: true, name: true, latitude: true, longitude: true } },
      },
    });
    if (!club) return null;
    return {
      country: club.countryRef,
      state: club.stateRef,
      city: club.cityRef,
      coordinates: { latitude: club.latitude, longitude: club.longitude },
    };
  },

  async existsByName(name: string, country?: string): Promise<boolean> {
    const count = await prisma.club.count({
      where: { name, country: country ?? null },
    });
    return count > 0;
  },

  /**
   * T448 — Galeria de honra: arestas WON do clube no KnowledgeGraph.
   * Hierarquia lida do metadata congelado na escrita (fallback: derivação do
   * ranking — mesma função). Sem fonte auditável na aresta → sourceUrl null.
   */
  async listTitlesByClub(clubId: string): Promise<ClubTitleView[]> {
    const edges = await prisma.knowledgeGraph.findMany({
      where: {
        relation: 'WON',
        OR: [
          { sourceId: clubId, sourceType: 'Club' },
          { targetId: clubId, targetType: 'Club' },
        ],
      },
      select: {
        sourceId: true,
        sourceType: true,
        targetId: true,
        targetType: true,
        metadata: true,
      },
    });

    const compIds = [
      ...new Set(
        edges
          .filter((e) => e.sourceType === 'Competition' || e.targetType === 'Competition')
          .map((e) => (e.sourceType === 'Competition' ? e.sourceId : e.targetId)),
      ),
    ];
    const comps = compIds.length
      ? await prisma.competition.findMany({
          where: { id: { in: compIds } },
          select: { id: true, qid: true, name: true, type: true, country: true },
        })
      : [];
    const compById = new Map(comps.map((c) => [c.id, c]));

    const titles = edges.map((e) => {
      const clubIsSource = e.sourceType === 'Club';
      const comp = compById.get(clubIsSource ? e.targetId : e.sourceId) ?? null;
      const meta = (e.metadata as Record<string, unknown> | null) ?? {};
      const isWomen = meta.gender === 'women' || (comp ? isWomensCompetition(comp) : false);
      return {
        year: typeof meta.year === 'number' ? meta.year : null,
        season: typeof meta.season === 'string' ? meta.season : null,
        competition: comp ? { id: comp.id, name: comp.name } : null,
        hierarchy: hierarchyOfEdge(e.metadata, comp),
        gender: isWomen ? ('women' as const) : ('men' as const),
        sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
      };
    });

    return titles.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
  },

  /**
   * T467 — Agregação auditável por região (derivada do banco, não de fonte de
   * terceiro): COUNT real de clubes por continente → país → estado. Países sem
   * `continent` caem no bucket honesto 'ZZ' (vazio-honesto, não inventamos).
   */
  async geoStats(): Promise<GeoStats> {
    const [byCountry, byState] = await Promise.all([
      prisma.club.groupBy({
        by: ['countryId'],
        where: { countryId: { not: null }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.club.groupBy({
        by: ['stateId'],
        where: { stateId: { not: null }, deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const countryIds = byCountry.map((c) => c.countryId as string).filter(Boolean);
    const stateIds = byState.map((s) => s.stateId as string).filter(Boolean);
    const [countries, states] = await Promise.all([
      prisma.country.findMany({
        where: { id: { in: countryIds } },
        select: { id: true, iso2: true, name: true, continent: true },
      }),
      prisma.state.findMany({
        where: { id: { in: stateIds } },
        select: { id: true, code: true, name: true, countryId: true },
      }),
    ]);

    const countryById = new Map(countries.map((c) => [c.id, c]));
    const countryClubCount = new Map(byCountry.map((c) => [c.countryId as string, c._count._all]));

    // estados agrupados por país
    const statesByCountry = new Map<string, GeoStatsState[]>();
    for (const s of states) {
      const n = byState.find((b) => b.stateId === s.id)?._count._all ?? 0;
      const arr = statesByCountry.get(s.countryId) ?? [];
      arr.push({ id: s.id, code: s.code, name: s.name, clubs: n });
      statesByCountry.set(s.countryId, arr);
    }

    const continentsMap = new Map<string, GeoStatsContinent>();
    for (const [cid, clubs] of countryClubCount) {
      const co = countryById.get(cid);
      if (!co) continue;
      const code = co.continent ?? 'ZZ';
      const cont = continentsMap.get(code) ?? { code, clubs: 0, countries: [] };
      cont.clubs += clubs;
      cont.countries.push({
        id: cid,
        iso2: co.iso2,
        name: co.name,
        clubs,
        states: (statesByCountry.get(cid) ?? []).sort((a, b) => b.clubs - a.clubs),
      });
      continentsMap.set(code, cont);
    }

    const continents = [...continentsMap.values()]
      .map((c) => ({ ...c, countries: c.countries.sort((a, b) => b.clubs - a.clubs) }))
      .sort((a, b) => b.clubs - a.clubs);

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(clubs) GROUP BY country/state (hierarquia T466)',
      totals: {
        clubsWithCountry: [...countryClubCount.values()].reduce((s, n) => s + n, 0),
        countries: countries.length,
        states: states.length,
      },
      continents,
    };
  },
};

export interface ClubGeoView {
  country: { id: string; iso2: string; name: string; continent: string | null } | null;
  state: { id: string; code: string; name: string } | null;
  city: {
    id: string;
    qid: string | null;
    name: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  coordinates: { latitude: number | null; longitude: number | null };
}

export interface ClubTitleView {
  year: number | null;
  season: string | null;
  competition: { id: string; name: string | null } | null;
  hierarchy: RankHierarchy;
  gender: 'men' | 'women';
  sourceUrl: string | null;
}
