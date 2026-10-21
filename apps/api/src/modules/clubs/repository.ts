/**
 * Camada de repositório — isolamento das chamadas Prisma.
 * Facilita mocks em testes e troca futura de ORM.
 */
import { prisma } from '../../config/prisma.js';
import type { Club } from '@almanaque/domain';
import { hierarchyOfEdge } from '../etl/won-edges.service.js';
import { isWomensCompetition, type RankHierarchy } from '../rankings/ranking-algorithm.service.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import { searchMatchedIds, idsInCondition } from '../../lib/search.js';
import {
  geoAttributionForMetadata,
  type GeoAttribution,
} from '../../lib/geocoding/geo-attribution.js';

/**
 * T448b-2i — condição de busca case/acento-insensível. O matching roda em SQL
 * nativo (translate+lower, sem extensão) e entra no where como ids; os demais
 * filtros/paginação continuam Prisma puro.
 */
async function searchCondition(
  search: string | undefined,
): Promise<{ id: { in: string[] } } | Record<string, never>> {
  if (!search) return {};
  const ids = await searchMatchedIds(prisma, 'clubs', ['name', 'fullName', 'shortName'], search, {
    softDeleteCol: 'deletedAt',
  });
  return idsInCondition(ids);
}

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

/**
 * Contagem de clubes por PAÍS para o índice de agrupamento da página `/clubs`.
 *
 * Por que existe separado do `geoStats`: os dois parecem a mesma coisa e NÃO são.
 *
 *   `geoStats` agrupa por `countryId` — a chave estrangeira para a tabela `Country`.
 *   O FILTRO público (`GET /clubs?country=BR`) filtra pela coluna `country` (string ISO2).
 *
 * Medido em produção: `countryId` está preenchido em **3.829** clubes dos 12.003 (32%),
 * enquanto `country` (ISO2) está preenchido em **96%**. Usar o `geoStats` para montar o índice
 * daria números que não batem com o que o clique do usuário devolve — o índice diria "Brasil:
 * 605" e a lista mostraria 817. Índice que mente sobre o próprio acervo é pior que índice
 * nenhum, então a contagem aqui é feita pela MESMA coluna que o filtro usa.
 */
/**
 * Cidades de UM país, para o segundo nível do agrupamento de `/clubs` (país → cidade).
 *
 * POR QUE ESTE ENDPOINT DEVOLVE `semCidade` E NÃO SÓ A LISTA
 *
 * O campo `city` tem cobertura DESIGUAL, e isso foi medido antes de escrever isto — não estimado:
 *
 *   por país (125 países medidos):  apenas 16 têm cidade em >=60% dos clubes
 *   por acervo:                     apenas 2.410 de 10.660 clubes (23%) estão em país com >=60%
 *   os 4 maiores países:            SE 26% · BR 33% · PT 35% · AU 24%
 *
 * Ou seja: agrupar por cidade entrega um segundo nível BOM para uma minoria dos países e RUIM
 * para a maioria. Se o endpoint devolvesse só a lista de cidades, a tela mostraria "Salvador (4)"
 * num país de 817 clubes e o usuário concluiria que só existem clubes em Salvador — quando o que
 * falta é o DADO, não o clube. `semCidade` existe para a tela poder DECLARAR a lacuna em vez de
 * escondê-la, que é a mesma regra do `total: null` no subtítulo de `/clubs` (T548).
 */
/**
 * T3 — ÍNDICE DE ESTADOS para o agrupamento de `/clubs`.
 *
 * Existe porque a premissa do `CityDrilldown` envelheceu: ele nasceu quando `stateId` estava em
 * 1 de 100 clubes, e por isso pulava o nível de estado. Os bots A/B/C (T588/T589/T590) levaram
 * `stateId` a 2.815 clubes, e o nível intermediário passou a existir de verdade.
 *
 * `withCity` por estado não é enfeite: é o que permite a tela decidir, com número, se o
 * terceiro nível (cidade) tem dado suficiente — em vez de assumir que tem.
 */
export interface StateIndexEntry {
  /** id de `states` — o valor do filtro `?state=`. */
  id: string;
  name: string;
  /** Código ISO 3166-2, ex.: `BR-SP`. */
  code: string;
  clubs: number;
  /** Clubes deste estado que também têm `city` — mede se dá para abrir o 3º nível. */
  withCity: number;
}
export interface StateIndex {
  generatedAt: string;
  source: 'derived';
  baseQuery: string;
  country: string;
  totals: {
    withState: number;
    withoutState: number;
    states: number;
  };
  states: StateIndexEntry[];
}

export interface CityIndexEntry {
  /** Nome da cidade exatamente como está em `clubs.city` — é o valor do filtro `?city=`. */
  name: string;
  clubs: number;
}
export interface CityIndex {
  generatedAt: string;
  source: 'derived';
  baseQuery: string;
  country: string;
  totals: {
    /** Clubes do país que TÊM cidade preenchida. */
    withCity: number;
    /** Clubes do país SEM cidade: a lacuna, declarada para o consumidor decidir o que fazer. */
    withoutCity: number;
    cities: number;
  };
  cities: CityIndexEntry[];
}

export interface CountryIndexEntry {
  /** Código ISO2, exatamente como vem em `clubs.country`. É o valor do filtro. */
  code: string;
  /** Nome legível, quando a tabela `Country` tem a linha. Sem ela, o código é o rótulo. */
  name: string | null;
  clubs: number;
}
export interface CountryIndex {
  generatedAt: string;
  source: 'derived';
  baseQuery: string;
  totals: { countries: number; clubsWithCountry: number };
  countries: CountryIndexEntry[];
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

    const searchCond = await searchCondition(search);

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
          searchCond,
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
    const searchCond = await searchCondition(search);
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
          searchCond,
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
        metadata: true,
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
      // WS-D M1a-3 — atribuição ODbL quando a coordenada vier de OSM/Nominatim (null p/ Wikidata).
      attribution: geoAttributionForMetadata(club.metadata),
    };
  },

  /**
   * T448b-2f — candidatos ativos do mesmo país para validação CONTEXTUAL de
   * unicidade (homônimos por state/city permitidos; duplicata exata bloqueada).
   */
  async listActiveForDedup(
    country: string | null,
  ): Promise<Array<{ id: string; name: string; state: string | null; city: string | null }>> {
    return prisma.club.findMany({
      where: { country: country ?? null, deletedAt: null },
      select: { id: true, name: true, state: true, city: true },
    });
  },

  /**
   * T448 — Galeria de honra: arestas WON do clube no KnowledgeGraph.
   * Hierarquia lida do metadata congelado na escrita (fallback: derivação do
   * ranking — mesma função). Sem fonte auditável na aresta → sourceUrl null.
   */
  async listTitlesByClub(clubId: string): Promise<ClubTitleView[]> {
    const rawEdges = await prisma.knowledgeGraph.findMany({
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
    // T448b-2b FASE 2 — exclui arestas soft-deletadas (metadata.deletedAt).
    const edges = excludeSoftDeleted(rawEdges);

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
        competitionQid: comp?.qid ?? null,
        hierarchy: hierarchyOfEdge(e.metadata, comp),
        gender: isWomen ? ('women' as const) : ('men' as const),
        sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
        source: typeof meta.dataSource === 'string' ? meta.dataSource : null,
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

  /**
   * Cidades de um país — o segundo nível do agrupamento (país → cidade).
   *
   * Agrupa por `city` (a coluna que `?city=` filtra) DENTRO de um país, e conta também os clubes
   * sem cidade. A contagem de `withoutCity` não é enfeite: é o que permite a tela declarar a
   * lacuna em vez de mostrar uma lista curta como se fosse o acervo inteiro. Ver `CityIndex`.
   *
   * `mode: 'insensitive'` não se aplica a groupBy, então a chave é o texto como está. Duas
   * grafias da mesma cidade ("São Paulo" e "Sao Paulo") viram duas entradas — preferi isso a
   * normalizar por conta própria e juntar cidades que talvez não sejam a mesma.
   */
  /**
   * T3 — ÍNDICE DE ESTADOS do país: quantos clubes cada estado tem, e quantos deles têm cidade.
   *
   * Conta pela FK `stateId` — a MESMA coluna que o filtro `?state=` usa. Contar por outra coluna
   * produziria um índice cujos números não batem com o resultado do clique, defeito que o
   * `countryIndex` já documenta ter evitado.
   *
   * `withoutState` é devolvido de propósito: a tela precisa poder DECLARAR quantos clubes não
   * têm estado, em vez de fingir que o país inteiro está coberto.
   */
  async stateIndex(country: string): Promise<StateIndex> {
    const iso = country.toUpperCase();
    const [porEstado, semEstado] = await Promise.all([
      prisma.club.groupBy({
        by: ['stateId'],
        where: { country: iso, stateId: { not: null }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.club.count({ where: { country: iso, stateId: null, deletedAt: null } }),
    ]);

    const ids = porEstado.map((e) => e.stateId).filter((v): v is string => Boolean(v));
    /* `withCity` por estado: uma consulta agregada, não N consultas — um `groupBy` por estado
       seria 1 + 393 idas ao banco para montar um índice. */
    const comCidade = await prisma.club.groupBy({
      by: ['stateId'],
      where: { country: iso, stateId: { in: ids }, city: { not: null }, deletedAt: null },
      _count: { _all: true },
    });
    const cidadePorEstado = new Map(comCidade.map((c) => [c.stateId as string, c._count._all]));

    const estados = await prisma.state.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, code: true },
    });
    const meta = new Map(estados.map((e) => [e.id, e]));

    const states: StateIndexEntry[] = porEstado
      .filter((e) => e.stateId && meta.has(e.stateId))
      .map((e) => {
        const m = meta.get(e.stateId as string)!;
        return {
          id: m.id,
          name: m.name,
          code: m.code,
          clubs: e._count._all,
          withCity: cidadePorEstado.get(m.id) ?? 0,
        };
      })
      .sort((a, b) => b.clubs - a.clubs || a.name.localeCompare(b.name));

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(clubs) GROUP BY "stateId" WHERE country = $1 (coluna do filtro público)',
      country: iso,
      totals: {
        withState: states.reduce((acc, e) => acc + e.clubs, 0),
        withoutState: semEstado,
        states: states.length,
      },
      states,
    };
  },

  async cityIndex(country: string, stateId?: string): Promise<CityIndex> {
    const iso = country.toUpperCase();
    /* `stateId` opcional: o terceiro nível da hierarquia (cidade) só faz sentido DENTRO de um
       estado. Sem ele, devolve o país inteiro — comportamento anterior, preservado. */
    const filtroEstado = stateId ? { stateId } : {};
    const [porCidade, semCidade] = await Promise.all([
      prisma.club.groupBy({
        by: ['city'],
        where: { country: iso, city: { not: null }, deletedAt: null, ...filtroEstado },
        _count: { _all: true },
      }),
      prisma.club.count({
        where: { country: iso, city: null, deletedAt: null, ...filtroEstado },
      }),
    ]);

    const cities: CityIndexEntry[] = porCidade
      .filter((c): c is typeof c & { city: string } => Boolean(c.city))
      .map((c) => ({ name: c.city, clubs: c._count._all }))
      .sort((a, b) => b.clubs - a.clubs || a.name.localeCompare(b.name));

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(clubs) GROUP BY city WHERE country = $1 (coluna do filtro público)',
      country: iso,
      totals: {
        withCity: cities.reduce((s, c) => s + c.clubs, 0),
        withoutCity: semCidade,
        cities: cities.length,
      },
      cities,
    };
  },

  /**
   * Índice de países pela coluna `country` (ISO2) — a MESMA que o filtro público usa.
   *
   * Ver o comentário de `CountryIndex` sobre por que isto não é o `geoStats`: agrupar por
   * `countryId` (FK, 32% preenchido) daria um índice cujos números não batem com o que o
   * clique devolve (a coluna string está em 96%). O usuário veria "Brasil: 605" e a lista
   * mostraria 817 clubes.
   *
   * O nome legível vem da tabela `Country` por `iso2`. Quando não há linha lá, o próprio
   * código é o rótulo — melhor mostrar "BR" do que esconder 9% do acervo.
   */
  async countryIndex(): Promise<CountryIndex> {
    const porPais = await prisma.club.groupBy({
      by: ['country'],
      where: { country: { not: null }, deletedAt: null },
      _count: { _all: true },
    });

    const codigos = porPais.map((c) => c.country).filter((c): c is string => Boolean(c));
    const nomes = await prisma.country.findMany({
      where: { iso2: { in: codigos } },
      select: { iso2: true, name: true },
    });
    const nomePorIso = new Map(nomes.map((n) => [n.iso2.toUpperCase(), n.name]));

    const countries: CountryIndexEntry[] = porPais
      .filter((c): c is typeof c & { country: string } => Boolean(c.country))
      .map((c) => ({
        code: c.country.toUpperCase(),
        name: nomePorIso.get(c.country.toUpperCase()) ?? null,
        clubs: c._count._all,
      }))
      .sort((a, b) => b.clubs - a.clubs || a.code.localeCompare(b.code));

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(clubs) GROUP BY country (coluna ISO2 do filtro público)',
      totals: {
        countries: countries.length,
        clubsWithCountry: countries.reduce((s, c) => s + c.clubs, 0),
      },
      countries,
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
  /** WS-D M1a-3 — atribuição ODbL quando a coordenada vem de OSM/Nominatim; null p/ Wikidata. */
  attribution: GeoAttribution | null;
}

export interface ClubTitleView {
  year: number | null;
  season: string | null;
  competition: { id: string; name: string | null } | null;
  /** WS-C-5 — identidade e fonte da competição (aditivo; timeline consome). */
  competitionQid: string | null;
  hierarchy: RankHierarchy;
  gender: 'men' | 'women';
  sourceUrl: string | null;
  /** dataSource congelado na escrita da aresta (ex.: 'wikidata', 'rsssf'). */
  source: string | null;
}
