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

  /**
   * Partidas de uma competição, com o rótulo da temporada — base das tarefas 30, 31 e 33.
   *
   * `take` é limitado de propósito: uma competição com 10 temporadas tem ~3.800 partidas, o que
   * é barato; mas nada impede que o acervo cresça, e uma resposta de 50 mil linhas derrubaria a
   * página. O teto é explícito e o serviço declara quando o conjunto foi truncado.
   *
   * Só partidas com placar: `homeScore`/`awayScore` não nulos. Ausência de placar não é 0×0, e
   * filtrar aqui evita que o erro se espalhe por todos os agregados.
   */
  async findMatches(
    competitionId: string,
    opts: { take?: number } = {},
  ): Promise<
    Array<{
      date: Date;
      round: string | null;
      homeClubId: string;
      awayClubId: string;
      homeScore: number | null;
      awayScore: number | null;
      seasonLabel: string | null;
    }>
  > {
    const rows = await prisma.match.findMany({
      where: {
        competitionId,
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: {
        date: true,
        round: true,
        homeClubId: true,
        awayClubId: true,
        homeScore: true,
        awayScore: true,
        season: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }],
      take: Math.min(opts.take ?? 20000, 20000),
    });
    return rows.map((m) => ({
      date: m.date,
      round: m.round,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      seasonLabel: m.season?.name ?? null,
    }));
  },

  /** Nomes dos clubes por id — a tabela precisa de rótulo legível, não de UUID. */
  async findClubNames(
    ids: string[],
  ): Promise<Map<string, { name: string; logoUrl: string | null }>> {
    if (ids.length === 0) return new Map();
    const rows = await prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, logoUrl: true },
    });
    return new Map(rows.map((c) => [c.id, { name: c.name, logoUrl: c.logoUrl }]));
  },
};
