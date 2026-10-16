import { prisma } from '../../config/prisma.js';
import { searchMatchedIds, idsInCondition } from '../../lib/search.js';

// T448b-2i — busca case/acento-insensível (translate nativo, sem extensão).
async function searchCondition(search: string | undefined) {
  if (!search) return {};
  const ids = await searchMatchedIds(prisma, 'competitions', ['name'], search);
  return idsInCondition(ids);
}
import type { Competition } from '@almanaque/domain';

export interface ListCompetitionsParams {
  country?: string;
  type?: string;
  gender?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Entrada do índice de países das competições. */
export interface CompetitionCountryEntry {
  /** Código ISO2, o mesmo valor que `?country=` aceita. */
  code: string;
  /** Nome legível da tabela `Country`. Sem linha lá, o código é o rótulo. */
  name: string | null;
  competitions: number;
}
export interface CompetitionCountryIndex {
  generatedAt: string;
  source: 'derived';
  baseQuery: string;
  totals: { countries: number; withCountry: number };
  countries: CompetitionCountryEntry[];
}

export const competitionsRepository = {
  async create(data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Competition> {
    return prisma.competition.create({ data: data as any }) as Promise<Competition>;
  },

  async findMany(params: ListCompetitionsParams = {}): Promise<Competition[]> {
    const { country, type, gender, search, limit = 50, offset = 0 } = params;
    return prisma.competition.findMany({
      where: {
        AND: [
          country ? { country } : {},
          type ? { type: type as any } : {},
          gender ? { gender } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
      orderBy: { name: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Competition[]>;
  },

  async count(params: ListCompetitionsParams = {}): Promise<number> {
    const { country, type, gender, search } = params;
    return prisma.competition.count({
      where: {
        AND: [
          country ? { country } : {},
          type ? { type: type as any } : {},
          gender ? { gender } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
    });
  },

  /**
   * T577 — ÍNDICE DE PAÍSES das competições, para reorganizar `/competitions`.
   *
   * Por que existe: a página organizava 1.932 competições em seis grupos de "âncoras" curadas
   * (continental, três blocos nacionais, feminino, seleções) mais um grid com TODAS. Isso não é
   * organização — é uma lista de atalhos em cima de outra lista, sem hierarquia.
   *
   * O eixo que o DADO sustenta foi medido antes de projetar (amostra de 500):
   *   country .... 92%  (84 países distintos)   <- o eixo principal
   *   gender ..... 100%
   *   type ....... 54%  (LEAGUE 213 · CUP 59 · nulo 228)
   *   level ...... 2%                            <- inútil, não vira filtro
   *
   * Conta pela MESMA coluna que o filtro `?country=` usa, pela mesma razão do `/clubs/countries`:
   * índice que conta por coluna diferente da que o clique filtra mente sobre o próprio acervo.
   */
  async countryIndex(): Promise<CompetitionCountryIndex> {
    const porPais = await prisma.competition.groupBy({
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

    const countries: CompetitionCountryEntry[] = porPais
      .filter((c): c is typeof c & { country: string } => Boolean(c.country))
      .map((c) => ({
        code: c.country.toUpperCase(),
        name: nomePorIso.get(c.country.toUpperCase()) ?? null,
        competitions: c._count._all,
      }))
      .sort((a, b) => b.competitions - a.competitions || a.code.localeCompare(b.code));

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(competitions) GROUP BY country (coluna ISO2 do filtro público)',
      totals: {
        countries: countries.length,
        withCountry: countries.reduce((s, c) => s + c.competitions, 0),
      },
      countries,
    };
  },

  async findById(id: string): Promise<Competition | null> {
    return prisma.competition.findUnique({ where: { id } }) as Promise<Competition | null>;
  },

  async update(
    id: string,
    data: Partial<Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Competition> {
    return prisma.competition.update({ where: { id }, data: data as any }) as Promise<Competition>;
  },

  async remove(id: string): Promise<void> {
    await prisma.competition.delete({ where: { id } });
  },
};
