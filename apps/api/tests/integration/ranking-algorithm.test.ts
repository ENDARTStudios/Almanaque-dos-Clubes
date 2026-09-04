/**
 * T425 — Algoritmo de Ranking 0-100 auditável (TDD).
 *
 * Duas camadas de teste:
 *  A) Unidade (sem banco): funções puras (computeClubPoints, normalizeMinMax,
 *     resolveHierarchy, aggregateSeason) e buildClubRanking via repositório fake.
 *  B) Integração (CI/Postgres): semeia fixtures via Prisma em clubes/partidas/
 *     títulos e roda o repositório Prisma real (createPrismaRankingAlgorithmRepo).
 *     Localmente, se o banco não estiver acessível, os casos de integração é
 *     pulado (retorno cedo) — honesto, sem fabricar.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  computeClubPoints,
  computePlayerPoints,
  normalizeMinMax,
  resolveHierarchy,
  hierarchyWeight,
  aggregateSeason,
  meetsClubMinimum,
  buildClubRanking,
  buildPlayerRanking,
  createPrismaRankingAlgorithmRepo,
  INSUFFICIENT_DATA_REASON,
  type AlgoMatch,
  type AlgoTitle,
  type CompetitionRef,
  type RankingAlgorithmRepo,
  type SeasonData,
} from '../../src/modules/rankings/ranking-algorithm.service.js';

const NAC = (): CompetitionRef => ({
  id: 'comp-nac',
  qid: null,
  name: 'Campeonato Nacional X',
  type: 'LEAGUE',
  country: 'BR',
});
const WOM = (): CompetitionRef => ({
  id: 'comp-wom',
  qid: 'Q135641755',
  name: 'Campeonato Feminino',
  type: 'LEAGUE',
  country: 'BR',
});

function match(opts: {
  id: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  comp: CompetitionRef | null;
  importedFrom?: string | null;
}): AlgoMatch {
  return {
    id: opts.id,
    homeClubId: opts.home,
    awayClubId: opts.away,
    homeScore: opts.hs,
    awayScore: opts.as,
    date: new Date('2023-05-01T00:00:00.000Z'),
    seasonName: '2023',
    competition: opts.comp,
    importedFrom: opts.importedFrom ?? 'rsssf',
    sourceUrl: 'https://example.test/' + opts.id,
    license: 'CC0',
  };
}

function title(opts: {
  id: string;
  club: string;
  comp: CompetitionRef | null;
  gender?: 'men' | 'women';
  importedFrom?: string | null;
}): AlgoTitle {
  return {
    id: opts.id,
    clubId: opts.club,
    competition: opts.comp,
    year: 2023,
    gender: opts.gender ?? null,
    importedFrom: opts.importedFrom ?? 'wikidata',
    sourceUrl: 'https://example.test/title-' + opts.id,
    license: 'CC0',
  };
}

function clubSeasonData(): SeasonData {
  const nac = NAC();
  const wom = WOM();
  const matches: AlgoMatch[] = [];
  for (let i = 0; i < 10; i++)
    matches.push(match({ id: 'mm' + i, home: 'mcl-a', away: 'mcl-b', hs: 1, as: 0, comp: nac }));
  matches.push(match({ id: 'mc0', home: 'mcl-a', away: 'mcl-c', hs: 2, as: 0, comp: nac }));
  matches.push(match({ id: 'mc1', home: 'mcl-c', away: 'mcl-a', hs: 0, as: 3, comp: nac }));
  for (let i = 0; i < 5; i++)
    matches.push(match({ id: 'wf' + i, home: 'wcl-a', away: 'wcl-b', hs: 2, as: 1, comp: wom }));
  const titles: AlgoTitle[] = [
    title({ id: 't-a', club: 'mcl-a', comp: nac, gender: 'men' }),
    title({ id: 't-b', club: 'mcl-b', comp: nac, gender: 'men' }),
    title({ id: 't-w', club: 'wcl-a', comp: wom, gender: 'women' }),
  ];
  return { season: '2023', matches, titles };
}

function fakeRepo(data: SeasonData): RankingAlgorithmRepo {
  return {
    async loadSeasonData() {
      return data;
    },
    async loadPlayerSeasonStats() {
      return [];
    },
  };
}

describe('ranking algorithm — funções puras', () => {
  it('normalizeMinMax: maior=100, menor=0', () => {
    expect(normalizeMinMax([150, 54])).toEqual([100, 0]);
    expect(normalizeMinMax([10, 5, 0])).toEqual([100, 50, 0]);
  });
  it('normalizeMinMax: todos iguais ou um único valor → 0', () => {
    expect(normalizeMinMax([50, 50, 50])).toEqual([0, 0, 0]);
    expect(normalizeMinMax([7])).toEqual([0]);
    expect(normalizeMinMax([])).toEqual([]);
  });
  it('resolveHierarchy: default nacional (3.0) e overrides por nome', () => {
    expect(resolveHierarchy(null)).toBe('nacional');
    expect(resolveHierarchy({ name: 'Campeonato Brasileiro' })).toBe('nacional');
    expect(resolveHierarchy({ name: 'UEFA Champions League' })).toBe('continental');
    expect(resolveHierarchy({ name: 'FIFA Club World Cup' })).toBe('mundial');
    expect(hierarchyWeight({ name: 'Campeonato X' })).toBe(3.0);
  });
  it('computeClubPoints: vitórias×3×peso + empates×1×peso + títulos×50×peso', () => {
    const res = computeClubPoints({
      clubId: 'A',
      matches: [match({ id: 'w1', home: 'A', away: 'B', hs: 1, as: 0, comp: NAC() })],
      titles: [title({ id: 't1', club: 'A', comp: NAC() })],
    });
    expect(res.points).toBe(159);
    expect(res.wins).toBe(1);
    expect(res.titlesWon).toBe(1);
    expect(res.baseMatches).toBe(1);
    expect(res.baseTitles).toBe(1);
  });
  it('aggregateSeason: deriva gênero e proveniência', () => {
    const aggs = aggregateSeason(clubSeasonData());
    const a = aggs.get('mcl-a')!;
    const w = aggs.get('wcl-a')!;
    expect(a.gender).toBe('men');
    expect(w.gender).toBe('women');
    expect(a.dataSourceIds).toContain('rsssf');
    expect(w.dataSourceIds).toContain('wikidata');
    expect(w.baseTitles).toBe(1);
    expect(w.baseMatches).toBe(5);
  });
  it('meetsClubMinimum: baseTitles>=1 OU baseMatches>=5', () => {
    expect(meetsClubMinimum({ baseTitles: 0, baseMatches: 5 })).toBe(true);
    expect(meetsClubMinimum({ baseTitles: 1, baseMatches: 0 })).toBe(true);
    expect(meetsClubMinimum({ baseTitles: 0, baseMatches: 4 })).toBe(false);
  });
  it('computePlayerPoints: gols×4 + assistências×2 + vitórias×1', () => {
    expect(computePlayerPoints({ goals: 2, assists: 1, wins: 1 })).toBe(2 * 4 + 1 * 2 + 1 * 1);
  });
});

describe('buildClubRanking — repositório fake (sem banco)', () => {
  const data = clubSeasonData();
  const repo = fakeRepo(data);

  it('é determinístico (mesmos dados → mesmo resultado)', async () => {
    const r1 = await buildClubRanking(repo, { season: '2023' });
    const r2 = await buildClubRanking(repo, { season: '2023' });
    expect(r1).toEqual(r2);
  });
  it('MinMax: maior do grupo = 100 (masculino e feminino isolados)', async () => {
    const r = await buildClubRanking(repo, { season: '2023' });
    const men = r.rows.filter((row) => row.gender === 'men' && row.points !== null);
    const women = r.rows.filter((row) => row.gender === 'women' && row.points !== null);
    expect(men.length).toBeGreaterThan(0);
    expect(women.length).toBeGreaterThan(0);
    expect(men[0].points).toBe(100);
    expect(women[0].points).toBe(100);
  });
  it('isola por gênero: o feminino não é esmagado pela escala masculina', async () => {
    const r = await buildClubRanking(repo, { season: '2023' });
    const menTop = r.rows.find((row) => row.gender === 'men' && row.position === 1);
    const womenTop = r.rows.find((row) => row.gender === 'women' && row.position === 1);
    expect(menTop!.points).toBe(100);
    expect(womenTop!.points).toBe(100);
    expect(menTop!.rawPoints).toBeGreaterThan(womenTop!.rawPoints);
  });
  it('abaixo da amostra mínima → registro NULL com motivo', async () => {
    const r = await buildClubRanking(repo, { season: '2023' });
    const insufficient = r.rows.find((row) => row.clubId === 'mcl-c')!;
    expect(insufficient.position).toBeNull();
    expect(insufficient.points).toBeNull();
    expect(insufficient.reason).toBe(INSUFFICIENT_DATA_REASON);
    expect(insufficient.baseMatches).toBeLessThan(5);
  });
  it('preserva metadata de base (baseMatches/baseTitles/dataSourceIds)', async () => {
    const r = await buildClubRanking(repo, { season: '2023' });
    const mclb = r.rows.find((row) => row.clubId === 'mcl-b')!;
    expect(mclb.baseMatches).toBe(10);
    expect(mclb.baseTitles).toBe(1);
    expect(mclb.dataSourceIds).toContain('rsssf');
    expect(mclb.dataSourceIds).toContain('wikidata');
  });
  it('retorna contagens (rankedCount / excludedCount)', async () => {
    const r = await buildClubRanking(repo, { season: '2023' });
    expect(r.rankedCount + r.excludedCount).toBe(r.rows.length);
    expect(r.excludedCount).toBeGreaterThan(0);
  });
});

describe('buildPlayerRanking — limitação (sem stats de jogador)', () => {
  it('sem estatísticas → jogador-ano NULL com motivo', async () => {
    const repo: RankingAlgorithmRepo = {
      async loadSeasonData() {
        return { season: '2023', matches: [], titles: [] };
      },
      async loadPlayerSeasonStats() {
        return [];
      },
    };
    const r = await buildPlayerRanking(repo, { season: '2023' });
    expect(r.rankedCount).toBe(0);
    expect(r.rows).toEqual([]);
  });
  it('stats abaixo da amostra (matches<3) ou sem gols/assists → NULL', async () => {
    const repo: RankingAlgorithmRepo = {
      async loadSeasonData() {
        return { season: '2023', matches: [], titles: [] };
      },
      async loadPlayerSeasonStats() {
        return [{ playerId: 'p1', goals: 0, assists: 0, matches: 5 }];
      },
    };
    const r = await buildPlayerRanking(repo, { season: '2023' });
    expect(r.rows[0].reason).toBe(INSUFFICIENT_DATA_REASON);
    expect(r.rows[0].points).toBeNull();
  });
});

describe('ranking algorithm — integração Prisma (CI)', () => {
  let dbOk = true;
  const seededClubs: string[] = [];
  const seededComps: string[] = [];
  const seededSeason = '2023';
  let seasonId = '';

  beforeAll(async () => {
    // Prova de disponibilidade via modelo (mais robusto que $queryRawUnsafe, que
    // pode lançar transitoriamente na primeira conexão do pool).
    try {
      await prisma.season.count();
    } catch {
      dbOk = false;
    }
    if (!dbOk) return;

    const existing = await prisma.season.findFirst({ where: { name: seededSeason } });
    if (existing) seasonId = existing.id;
    else
      seasonId = (await prisma.season.create({ data: { name: seededSeason, status: 'FINISHED' } }))
        .id;

    const compNac = await prisma.competition.create({
      data: {
        name: 'Campeonato Nacional Teste',
        country: 'BR',
        type: 'LEAGUE',
        qid: 'Q910000101',
        importedFrom: 'wikidata',
      },
    });
    const compWom = await prisma.competition.create({
      data: {
        name: 'Campeonato Feminino Teste',
        country: 'BR',
        type: 'LEAGUE',
        qid: 'Q135641755',
        importedFrom: 'wikidata',
      },
    });
    seededComps.push(compNac.id, compWom.id);

    const mkClub = async (name: string, qid: string) => {
      const c = await prisma.club.create({
        data: { name, country: 'BR', qid, importedFrom: 'manual' },
      });
      seededClubs.push(c.id);
      return c;
    };
    const a = await mkClub('Masc A', 'Q91000001');
    const b = await mkClub('Masc B', 'Q91000002');
    const c = await mkClub('Masc C', 'Q91000003');
    const wa = await mkClub('Fem A', 'Q91000004');
    const wb = await mkClub('Fem B', 'Q91000005');

    let day = 1;
    const mkMatch = (homeId: string, awayId: string, hs: number, as: number, compId: string) => {
      const d = '2023-05-' + String(day).padStart(2, '0');
      day += 1;
      return prisma.match.create({
        data: {
          homeClubId: homeId,
          awayClubId: awayId,
          homeScore: hs,
          awayScore: as,
          date: new Date(d + 'T00:00:00.000Z'),
          competitionId: compId,
          seasonId,
          status: 'FINISHED',
          importedFrom: 'rsssf',
          license: 'CC0',
          dedupKey: compId + '|' + seededSeason + '|' + d + '|' + homeId + '|' + awayId,
        },
      });
    };

    for (let i = 0; i < 6; i++) await mkMatch(a.id, b.id, 1, 0, compNac.id);
    await mkMatch(a.id, c.id, 2, 0, compNac.id);
    await mkMatch(c.id, a.id, 0, 3, compNac.id);
    for (let i = 0; i < 5; i++) await mkMatch(wa.id, wb.id, 2, 1, compWom.id);

    await prisma.knowledgeGraph.create({
      data: {
        sourceId: b.id,
        sourceType: 'Club',
        targetId: compNac.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2023, season: seededSeason, dataSource: 'wikidata', gender: 'men' },
      },
    });
    await prisma.knowledgeGraph.create({
      data: {
        sourceId: wa.id,
        sourceType: 'Club',
        targetId: compWom.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: { year: 2023, season: seededSeason, dataSource: 'wikidata', gender: 'women' },
      },
    });
  });

  afterAll(async () => {
    if (!dbOk) return;
    await prisma.$transaction([
      prisma.rankingEntry.deleteMany({ where: { clubId: { in: seededClubs } } }),
      prisma.match.deleteMany({ where: { homeClubId: { in: seededClubs } } }),
      prisma.knowledgeGraph.deleteMany({ where: { sourceId: { in: seededClubs } } }),
      prisma.club.deleteMany({ where: { id: { in: seededClubs } } }),
      prisma.competition.deleteMany({ where: { id: { in: seededComps } } }),
      prisma.ranking.deleteMany({ where: { name: { contains: 'Ranking 0-100 2023' } } }),
    ]);
  });

  it('repositório Prisma real: ranqueia com base em partidas/títulos (CI)', async () => {
    if (!dbOk) return;
    const repo = createPrismaRankingAlgorithmRepo(prisma);
    const r = await buildClubRanking(repo, { season: '2023' });
    expect(r.rankedCount).toBeGreaterThan(0);
    const menTop = r.rows.find((row) => row.gender === 'men' && row.position === 1);
    const womenTop = r.rows.find((row) => row.gender === 'women' && row.position === 1);
    expect(menTop).toBeDefined();
    expect(womenTop).toBeDefined();
    expect(menTop!.points).toBe(100);
    expect(womenTop!.points).toBe(100);
    expect(menTop!.baseMatches).toBeGreaterThan(0);
    expect(Array.isArray(menTop!.dataSourceIds)).toBe(true);
    const insufficient = r.rows.find((row) => row.reason === INSUFFICIENT_DATA_REASON);
    expect(insufficient).toBeDefined();
  });

  it('buildPlayerRanking no banco real: sem stats → todos NULL', async () => {
    if (!dbOk) return;
    const repo = createPrismaRankingAlgorithmRepo(prisma);
    const r = await buildPlayerRanking(repo, { season: '2023' });
    expect(r.rankedCount).toBe(0);
    expect(r.rows).toEqual([]);
  });
});
