/**
 * T438 — Testes unitários do ciclo de cálculo de rankings.
 *
 * Cobre os pontos pedidos pela spec T438 que o arquivo de integração
 * (ranking-algorithm.test.ts) não cobre: diferenciação numérica de pesos
 * (Mundial 5.0 × Municipal 1.0), edge cases do buildClubRanking (0 jogos,
 * clube único, todos empates) e o parse de argumentos do CLI
 * calculate-rankings.
 */
import { describe, it, expect } from 'vitest';
import {
  computeClubPoints,
  buildClubRanking,
  HIERARCHY_WEIGHTS,
  type RankingAlgorithmRepo,
  type AlgoMatch,
  type AlgoTitle,
  type CompetitionRef,
} from '../../../src/modules/rankings/ranking-algorithm.service.js';
import { parseCalculateArgs } from '../../../src/scripts/calculate-rankings.js';

const MUNDIAL = (): CompetitionRef => ({
  id: 'comp-mundial',
  qid: null,
  name: 'FIFA Club World Cup',
  type: 'CUP',
  country: null,
});
const MUNICIPAL = (): CompetitionRef => ({
  id: 'comp-municipal',
  qid: null,
  name: 'Copa Municipal da Cidade',
  type: 'CUP',
  country: 'BR',
});

function match(opts: {
  id: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  comp: CompetitionRef | null;
}): AlgoMatch {
  return {
    id: opts.id,
    homeClubId: opts.home,
    awayClubId: opts.away,
    homeScore: opts.hs,
    awayScore: opts.as,
    date: new Date('2023-08-01T00:00:00Z'),
    seasonName: '2023',
    competition: opts.comp,
    importedFrom: 'rsssf',
    sourceUrl: 'https://example.org/match',
    license: 'CC BY-SA',
  };
}

describe('T438 — pesos por hierarquia (numéricos)', () => {
  it('pesos registrados: Mundial 5.0 → Municipal 1.0', () => {
    expect(HIERARCHY_WEIGHTS.mundial).toBe(5.0);
    expect(HIERARCHY_WEIGHTS.continental).toBe(4.0);
    expect(HIERARCHY_WEIGHTS.nacional).toBe(3.0);
    expect(HIERARCHY_WEIGHTS.estadual).toBe(2.0);
    expect(HIERARCHY_WEIGHTS.municipal).toBe(1.0);
  });

  it('mesma vitória vale 5× mais em competição mundial que municipal', () => {
    // Pesos injetados: isola a escala numérica do computeClubPoints (o
    // resolveHierarchy por keyword/default já é coberto nos testes de integração).
    const mundial = computeClubPoints({
      clubId: 'A',
      matches: [match({ id: 'm1', home: 'A', away: 'B', hs: 1, as: 0, comp: MUNDIAL() })],
      titles: [],
      hierarchyWeightFn: () => HIERARCHY_WEIGHTS.mundial,
    });
    const municipal = computeClubPoints({
      clubId: 'A',
      matches: [match({ id: 'm2', home: 'A', away: 'B', hs: 1, as: 0, comp: MUNICIPAL() })],
      titles: [],
      hierarchyWeightFn: () => HIERARCHY_WEIGHTS.municipal,
    });
    expect(mundial.points).toBe(3 * 5.0);
    expect(municipal.points).toBe(3 * 1.0);
    expect(mundial.points / municipal.points).toBe(5);
  });
});

describe('T438 — edge cases do buildClubRanking (repositório fake)', () => {
  const emptyRepo: RankingAlgorithmRepo = {
    async loadSeasonData() {
      return { season: '2023', matches: [], titles: [] };
    },
    async loadPlayerSeasonStats() {
      return [];
    },
  };

  it('0 jogos e 0 títulos → nenhum registro (nada a ranquear)', async () => {
    const r = await buildClubRanking(emptyRepo, { season: '2023' });
    expect(r.rows).toEqual([]);
    expect(r.rankedCount).toBe(0);
    expect(r.excludedCount).toBe(0);
  });

  it('clube único qualificado → posição 1 (MinMax de valor único = 0, comportamento documentado)', async () => {
    const repo: RankingAlgorithmRepo = {
      async loadSeasonData() {
        const titles: AlgoTitle[] = [
          {
            id: 't1',
            clubId: 'solo',
            competition: MUNDIAL(),
            year: 2023,
            gender: null,
            importedFrom: 'rsssf',
            sourceUrl: 'https://example.org/t',
            license: 'CC BY-SA',
          },
        ];
        return { season: '2023', matches: [], titles };
      },
      async loadPlayerSeasonStats() {
        return [];
      },
    };
    const r = await buildClubRanking(repo, { season: '2023' });
    expect(r.rankedCount).toBe(1);
    const row = r.rows.find((row) => row.clubId === 'solo')!;
    expect(row.position).toBe(1);
    // MinMax de um único valor → 0 (intervalo degenerado; documentado no
    // RANKING-ALGORITHM.md — publicar 100 fabricaria uma escala).
    expect(row.points).toBe(0);
    expect(row.rawPoints).toBe(50 * 5.0);
  });

  it('todos empates → pontos brutos iguais → normalização 0 para todos', async () => {
    const repo: RankingAlgorithmRepo = {
      async loadSeasonData() {
        const matches: AlgoMatch[] = [
          match({ id: 'd1', home: 'A', away: 'B', hs: 0, as: 0, comp: MUNICIPAL() }),
          match({ id: 'd2', home: 'B', away: 'A', hs: 1, as: 1, comp: MUNICIPAL() }),
          match({ id: 'd3', home: 'A', away: 'B', hs: 2, as: 2, comp: MUNICIPAL() }),
          match({ id: 'd4', home: 'B', away: 'A', hs: 3, as: 3, comp: MUNICIPAL() }),
          match({ id: 'd5', home: 'A', away: 'B', hs: 0, as: 0, comp: MUNICIPAL() }),
        ];
        return { season: '2023', matches, titles: [] };
      },
      async loadPlayerSeasonStats() {
        return [];
      },
    };
    const r = await buildClubRanking(repo, { season: '2023' });
    const ranked = r.rows.filter((row) => row.points !== null);
    expect(ranked.length).toBe(2);
    // empates×1×peso iguais para os dois → MinMax degenerado → 0
    expect(ranked.every((row) => row.points === 0)).toBe(true);
    expect(ranked.every((row) => row.draws === 5)).toBe(true);
  });
});

describe('T438 — parseCalculateArgs (CLI)', () => {
  it('default: ano UTC corrente, sem competição, ambos os gêneros', () => {
    const args = parseCalculateArgs([]);
    expect(args.year).toBe(String(new Date().getUTCFullYear()));
    expect(args.competitionId).toBeNull();
    expect(args.gender).toBeNull();
  });

  it('aceita --year, --competition e --gender', () => {
    const args = parseCalculateArgs([
      '--year',
      '2023',
      '--competition',
      'abc',
      '--gender',
      'women',
    ]);
    expect(args).toEqual({ year: '2023', competitionId: 'abc', gender: 'women' });
  });

  it('rejeita ano não-YYYY e gender inválido', () => {
    expect(() => parseCalculateArgs(['--year', '23'])).toThrow(/--year inválido/);
    expect(() => parseCalculateArgs(['--gender', 'x'])).toThrow(/--gender inválido/);
  });
});
