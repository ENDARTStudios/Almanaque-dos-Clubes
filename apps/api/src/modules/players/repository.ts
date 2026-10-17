import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { searchMatchedIds, idsInCondition } from '../../lib/search.js';

// T448b-2i — busca case/acento-insensível (translate nativo, sem extensão).
async function searchCondition(search: string | undefined) {
  if (!search) return {};
  const ids = await searchMatchedIds(prisma, 'players', ['fullName'], search);
  return idsInCondition(ids);
}
import type { Player } from '@almanaque/domain';

export interface ListPlayersParams {
  country?: string;
  position?: string;
  clubId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Contagem de jogadores por país — o índice do agrupamento da página `/players`.
 *
 * Agrupa pela coluna `country` (ISO2), que é EXATAMENTE a que `GET /players?country=XX` filtra.
 * Medido em produção: `GB=26.020 · BR=7.607 · ES=6.006 · US=2.538`. Os códigos são ISO2 e o
 * nome legível vem da tabela `Country`, a mesma que os clubes usam.
 *
 * O índice tem de ser contado pela mesma coluna do filtro — foi o que motivou o
 * `/clubs/countries` existir em separado do `/clubs/geo-stats` (lá a FK `countryId` cobre 32%
 * do acervo contra 94% da coluna). Aqui não há esse risco: só existe uma coluna de país.
 */
export interface PlayerCountryEntry {
  /** Código ISO2, o mesmo valor que `GET /players?country=XX` aceita. */
  code: string;
  /** Nome legível da tabela `Country`. Sem linha lá, o código é o rótulo. */
  name: string | null;
  players: number;
}
export interface PlayerCountryIndex {
  generatedAt: string;
  source: 'derived';
  baseQuery: string;
  totals: { countries: number; playersWithCountry: number };
  countries: PlayerCountryEntry[];
}

export const playersRepository = {
  async create(data: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    // Cast na FRONTEIRA domain→prisma: as colunas Json do perfil enriquecido
    // (T-22.3) são `unknown`/precisas no domínio e JsonValue no cliente — o
    // runtime é o mesmo documento; só a visão de tipos diverge.
    return prisma.player.create({
      data: data as unknown as Prisma.PlayerUncheckedCreateInput,
    }) as unknown as Promise<Player>;
  },

  async findMany(params: ListPlayersParams = {}): Promise<Player[]> {
    const { country, position, clubId, search, limit = 50, offset = 0 } = params;
    return prisma.player.findMany({
      where: {
        AND: [
          country ? { country } : {},
          position ? { position } : {},
          clubId ? { clubId } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
      orderBy: { fullName: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Player[]>;
  },

  async count(params: ListPlayersParams = {}): Promise<number> {
    const { country, position, clubId, search } = params;
    return prisma.player.count({
      where: {
        AND: [
          country ? { country } : {},
          position ? { position } : {},
          clubId ? { clubId } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
    });
  },

  async findById(id: string): Promise<Player | null> {
    return prisma.player.findUnique({ where: { id } }) as Promise<Player | null>;
  },

  async update(
    id: string,
    data: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Player> {
    return prisma.player.update({
      where: { id },
      data: data as Prisma.PlayerUncheckedUpdateInput,
    }) as unknown as Promise<Player>;
  },

  async remove(id: string): Promise<void> {
    await prisma.player.delete({ where: { id } });
  },

  /**
   * Índice de países para o agrupamento de `/players`.
   *
   * `groupBy(['country'])` na MESMA coluna do filtro público, com o nome legível resolvido por
   * `iso2`. Quando a tabela `Country` não tem a linha, o código vira o rótulo — melhor mostrar
   * "RS" do que esconder os jogadores daquele país.
   */
  async countryIndex(): Promise<PlayerCountryIndex> {
    const porPais = await prisma.player.groupBy({
      by: ['country'],
      where: { country: { not: null } },
      _count: { _all: true },
    });

    const codigos = porPais.map((c) => c.country).filter((c): c is string => Boolean(c));
    const nomes = await prisma.country.findMany({
      where: { iso2: { in: codigos } },
      select: { iso2: true, name: true },
    });
    const nomePorIso = new Map(nomes.map((n) => [n.iso2.toUpperCase(), n.name]));

    const countries: PlayerCountryEntry[] = porPais
      .filter((c): c is typeof c & { country: string } => Boolean(c.country))
      .map((c) => ({
        code: c.country.toUpperCase(),
        name: nomePorIso.get(c.country.toUpperCase()) ?? null,
        players: c._count._all,
      }))
      .sort((a, b) => b.players - a.players || a.code.localeCompare(b.code));

    return {
      generatedAt: new Date().toISOString(),
      source: 'derived',
      baseQuery: 'COUNT(players) GROUP BY country (coluna ISO2 do filtro público)',
      totals: {
        countries: countries.length,
        playersWithCountry: countries.reduce((s, c) => s + c.players, 0),
      },
      countries,
    };
  },
};
