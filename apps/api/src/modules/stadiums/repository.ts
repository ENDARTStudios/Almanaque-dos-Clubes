import { prisma } from '../../config/prisma.js';

/**
 * ESTÁDIOS — leitura.
 *
 * O modelo `Stadium` existe desde a migration `20260905_stadiums_postgis`, com geografia
 * normalizada (Country/State/City), capacidade, piso, QID do Wikidata e vínculo com o clube
 * mandante. O que NÃO existia era uma rota: 84 estádios no banco e nenhuma superfície pública
 * para lê-los.
 *
 * ── POR QUE SÓ LEITURA ────────────────────────────────────────────────────────────────────
 * Escrita de estádio passa por ETL e por curadoria (`importedFrom`, `qid`, `sourceUrl`), não por
 * API pública. Abrir POST/PUT aqui criaria um segundo caminho de ingestão, sem as travas de
 * proveniência que o pipeline tem.
 */
export interface StadiumRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  latitude: number | null;
  longitude: number | null;
  clubId: string | null;
  clubName: string | null;
  sourceUrl: string | null;
}

export interface ListStadiumsParams {
  search?: string;
  country?: string;
  clubId?: string;
  limit?: number;
  offset?: number;
}

/** O select é explícito: `location` é PostGIS (Unsupported) e não serializa em JSON. */
const SELECT = {
  id: true,
  name: true,
  city: true,
  state: true,
  country: true,
  capacity: true,
  surface: true,
  latitude: true,
  longitude: true,
  clubId: true,
  sourceUrl: true,
  club: { select: { name: true } },
} as const;

type Bruto = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  latitude: number | null;
  longitude: number | null;
  clubId: string | null;
  sourceUrl: string | null;
  club: { name: string } | null;
};

function achatar(r: Bruto): StadiumRow {
  const { club, ...resto } = r;
  return { ...resto, clubName: club?.name ?? null };
}

function onde(params: ListStadiumsParams) {
  const { search, country, clubId } = params;
  return {
    AND: [
      search ? { name: { contains: search, mode: 'insensitive' as const } } : {},
      country ? { country } : {},
      clubId ? { clubId } : {},
    ],
  };
}

export const stadiumsRepository = {
  async findMany(params: ListStadiumsParams = {}): Promise<StadiumRow[]> {
    const { limit = 50, offset = 0 } = params;
    const linhas = (await prisma.stadium.findMany({
      where: onde(params),
      select: SELECT,
      /*
        Capacidade decrescente, com NULL no FIM.
        `nulls: 'last'` não é enfeite: no Postgres o NULL é tratado como o MAIOR valor, então em
        `DESC` ele sobe para o topo. Sem isso, o estádio sem capacidade cadastrada encabeça a
        lista — e a lista é ordenada justamente por capacidade. O teste de integração pegou isto;
        o typecheck não tinha como.
      */
      orderBy: [{ capacity: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take: Math.min(limit, 100),
      skip: offset,
    })) as Bruto[];
    return linhas.map(achatar);
  },

  async count(params: ListStadiumsParams = {}): Promise<number> {
    return prisma.stadium.count({ where: onde(params) });
  },

  async findById(id: string): Promise<StadiumRow | null> {
    const r = (await prisma.stadium.findUnique({ where: { id }, select: SELECT })) as Bruto | null;
    return r ? achatar(r) : null;
  },

  /** Países que TÊM estádio — o filtro só oferece o que devolve resultado. */
  async countries(): Promise<Array<{ code: string; count: number }>> {
    const grupos = await prisma.stadium.groupBy({
      by: ['country'],
      where: { country: { not: null } },
      _count: { _all: true },
    });
    return grupos
      .filter((g): g is typeof g & { country: string } => Boolean(g.country))
      .map((g) => ({ code: g.country, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  },
};
