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
  limit?: number;
  offset?: number;
}

export const clubsRepository = {
  async create(data: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    return prisma.club.create({ data: data as any }) as Promise<Club>;
  },

  async findMany(params: ListClubsParams = {}): Promise<Club[]> {
    const { country, city, status, search, hasCoordinates, limit = 50, offset = 0 } = params;

    return prisma.club.findMany({
      where: {
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
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
    const { country, city, status, search, hasCoordinates } = params;
    return prisma.club.count({
      where: {
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
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
    return prisma.club.findUnique({ where: { id } }) as Promise<Club | null>;
  },

  /**
   * T466 — Geografia resolvida do clube (contrato consumido pelo mapa T467).
   * Retorna a hierarquia normalizada (país/estado/cidade) + coordenadas do clube;
   * campos nulos = dado ausente (honesto, sem invenção).
   */
  async findGeoById(id: string): Promise<ClubGeoView | null> {
    const club = await prisma.club.findUnique({
      where: { id },
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
