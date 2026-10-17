import { CreatePlayerSchema, NotFoundError, type Player } from '@almanaque/domain';
import {
  playersRepository,
  type ListPlayersParams,
  type PlayerCountryIndex,
} from './repository.js';
import { prisma } from '../../config/prisma.js';

/**
 * Idade em anos completos a partir de `birthDate` — DERIVADA, nunca armazenada
 * (armazenada ela envelhece mal: a cada dia seria dado errado no banco). Sem
 * data de nascimento (ou data implausível) = null — a UI declara o gap.
 */
export function ageFromBirthDate(
  birthDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const antesDoAniversario =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (antesDoAniversario) age -= 1;
  // Guarda de plausibilidade: futuro devolve null (idade negativa); 130+ é
  // sinal de data errada na fonte, não de longevidade.
  if (age < 0 || age >= 130) return null;
  return age;
}

export const playersService = {
  async create(input: unknown): Promise<Player> {
    const parsed = CreatePlayerSchema.parse(input);
    return playersRepository.create({
      fullName: parsed.fullName,
      shortName: parsed.shortName ?? null,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
      country: parsed.country ?? null,
      position: parsed.position ?? null,
      clubId: parsed.clubId ?? null,
      qid: parsed.qid ?? null,
      importedFrom: parsed.importedFrom ?? null,
      importedAt: null,
    });
  },

  async list(
    params: ListPlayersParams,
  ): Promise<{ data: Player[]; total: number; limit: number; offset: number }> {
    const [data, total] = await Promise.all([
      playersRepository.findMany(params),
      playersRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },

  /**
   * T-22.3 — a resposta inclui `age` DERIVADO de birthDate (nunca armazenado).
   * As colunas novas do perfil (nickname/heightCm/preferredFoot/individualAwards)
   * fluem no spread: o `findUnique` do repositório não tem `select`, logo pega
   * todas as colunas — aditivo, nenhum contrato existente muda.
   */
  async getById(id: string): Promise<Player & { age: number | null }> {
    const player = await playersRepository.findById(id);
    if (!player) throw new NotFoundError('Jogador', id);
    return { ...player, age: ageFromBirthDate(player.birthDate) };
  },

  /**
   * Índice de países para o AGRUPAMENTO da página `/players`.
   *
   * Contado pela mesma coluna que `list({ country })` filtra (`country`, ISO2), então o número
   * do índice é o número que o clique devolve — é exatamente o cuidado que motivou o
   * `/clubs/countries` existir em separado do `/clubs/geo-stats`, onde a FK cobre 32% do acervo
   * contra 94% da coluna.
   */
  async countryIndex(): Promise<PlayerCountryIndex> {
    return playersRepository.countryIndex();
  },

  async update(id: string, input: unknown): Promise<Player> {
    const existing = await playersRepository.findById(id);
    if (!existing) throw new NotFoundError('Jogador', id);
    const parsed = CreatePlayerSchema.partial().parse(input);
    return playersRepository.update(id, {
      fullName: parsed.fullName ?? existing.fullName,
      shortName: parsed.shortName ?? existing.shortName,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : existing.birthDate,
      country: parsed.country ?? existing.country,
      position: parsed.position ?? existing.position,
      clubId: parsed.clubId ?? existing.clubId,
    });
  },

  async remove(id: string): Promise<void> {
    const existing = await playersRepository.findById(id);
    if (!existing) throw new NotFoundError('Jogador', id);
    await playersRepository.remove(id);
  },

  /**
   * Mapeamento do portal (Entrega 3) — carreira/conquistas/clubes derivados
   * das arestas do grafo (PLAYED_FOR → clubes/carreira; WON com source=player
   * → conquistas). Aditivo ao getById — nenhum contrato existente muda.
   * Honestidade: sem arestas ⇒ arrays vazios ("Em catalogação" na UI).
   *
   * v2 (T-22.3): linhas de carreira ganham endYear/apps/goals quando o metadata
   * traz (gravação do bot enrich-player-profiles); `metrics` soma os totais;
   * `individualAwards` vem da coluna do jogador (proveniência por item),
   * ordenado por ano desc. Sem dado ⇒ null/vazio — nunca inventa.
   */
  async getProfileExtras(id: string): Promise<{
    currentClub: { id: string; name: string } | null;
    career: Array<{
      year: number;
      endYear: number | null;
      apps: number | null;
      goals: number | null;
      clubId: string;
      clubName: string;
    }>;
    achievements: Array<{ competitionId: string; competitionName: string; year: number | null }>;
    clubs: Array<{ id: string; name: string; country: string | null }>;
    metrics: { totalApps: number; totalGoals: number; titlesCount: number; awardsCount: number };
    individualAwards: Array<{
      qid: string;
      label: string;
      year: number | null;
      sourceUrl: string | null;
    }>;
  }> {
    const player = await this.getById(id); // 404 honesto se o jogador não existe
    const edges = await prisma.knowledgeGraph.findMany({
      where: { sourceId: id, sourceType: 'Player', relation: { in: ['PLAYED_FOR', 'WON'] } },
      select: { relation: true, targetId: true, targetType: true, metadata: true },
    });

    const playedFor = edges.filter((e) => e.relation === 'PLAYED_FOR');
    const clubIds = [...new Set(playedFor.map((e) => e.targetId))];
    const clubs = clubIds.length
      ? await prisma.club.findMany({
          where: { id: { in: clubIds }, deletedAt: null },
          select: { id: true, name: true, country: true },
        })
      : [];
    const clubById = new Map(clubs.map((c) => [c.id, c]));

    // Número só entra se for número plausível (coluna errada na fonte vira null,
    // não vira estatística) — mesma guarda do bot que grava o metadata.
    const numero = (v: unknown, max: number): number | null =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;

    // Carreira: só arestas com ano no metadata; sem ano não há ordem real —
    // o clube entra na lista de clubes, não na tabela de carreira.
    type CareerRow = {
      year: number;
      endYear: number | null;
      apps: number | null;
      goals: number | null;
      clubId: string;
      clubName: string;
    };
    const career: CareerRow[] = [];
    const latestByClub = new Map<string, number>();
    let totalApps = 0;
    let totalGoals = 0;
    for (const e of playedFor) {
      const club = clubById.get(e.targetId);
      if (!club) continue;
      const meta = (e.metadata as Record<string, unknown> | null) ?? {};
      const year = numero(meta.year, new Date().getUTCFullYear() + 1);
      const endYear = numero(meta.endYear, new Date().getUTCFullYear() + 1);
      const apps = numero(meta.apps, 2000);
      const goals = numero(meta.goals, 1000);
      if (year != null)
        career.push({ year, endYear, apps, goals, clubId: e.targetId, clubName: club.name });
      if (apps != null) totalApps += apps;
      if (goals != null) totalGoals += goals;
      const prev = latestByClub.get(e.targetId);
      if (year != null && (prev == null || year > prev)) latestByClub.set(e.targetId, year);
    }
    career.sort((a, b) => b.year - a.year);

    // Clube atual: o do ano mais recente na carreira; se nenhuma aresta tem ano
    // e só existe um clube, esse é o atual (honesto). Caso contrário, null.
    let currentClub: { id: string; name: string } | null = null;
    if (career.length > 0) {
      const latest = career[0];
      currentClub = { id: latest.clubId, name: latest.clubName };
    } else if (clubs.length === 1) {
      currentClub = { id: clubs[0].id, name: clubs[0].name };
    }

    // Conquistas: WON com source=player → target Competition.
    const wonEdges = edges.filter((e) => e.relation === 'WON' && e.targetType === 'Competition');
    const compIds = [...new Set(wonEdges.map((e) => e.targetId))];
    const comps = compIds.length
      ? await prisma.competition.findMany({
          where: { id: { in: compIds }, deletedAt: null },
          select: { id: true, name: true },
        })
      : [];
    const compById = new Map(comps.map((c) => [c.id, c]));
    const achievements = wonEdges
      .map((e) => {
        const comp = compById.get(e.targetId);
        if (!comp) return null;
        const meta = (e.metadata as Record<string, unknown> | null) ?? {};
        const year = typeof meta.year === 'number' ? meta.year : null;
        return { competitionId: comp.id, competitionName: comp.name, year };
      })
      .filter((a): a is NonNullable<typeof a> => !!a)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

    // Prêmios individuais: coluna do jogador ([{qid,label,year,sourceUrl}]); itens
    // malformados são descartados (proveniência incompleta não vira prêmio).
    const rawAwards = Array.isArray(player.individualAwards)
      ? (player.individualAwards as Array<Record<string, unknown>>)
      : [];
    const individualAwards = rawAwards
      .filter((a) => typeof a?.qid === 'string' && typeof a?.label === 'string')
      .map((a) => ({
        qid: a.qid as string,
        label: a.label as string,
        year: typeof a.year === 'number' ? a.year : null,
        sourceUrl: typeof a.sourceUrl === 'string' ? a.sourceUrl : null,
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

    return {
      currentClub,
      career,
      achievements,
      clubs: clubs.map((c) => ({ id: c.id, name: c.name, country: c.country })),
      metrics: {
        totalApps,
        totalGoals,
        titlesCount: achievements.length,
        awardsCount: individualAwards.length,
      },
      individualAwards,
    };
  },
};
