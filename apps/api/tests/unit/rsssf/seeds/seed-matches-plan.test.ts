/**
 * T527 — regressão do PLANO de ingestão (não do parser).
 *
 * O parser já resolvia o ano com `spillAfter` (testado em match-parser.test.ts),
 * mas o `buildPlan` NÃO repassava a opção — e a temporada Covid do BR 2020 foi
 * gravada em produção com jan/fev de 2021 datados como jan/fev de 2020. Este
 * teste tranca a passagem da opção no ponto onde o defeito estava.
 */
import { describe, expect, it } from 'vitest';
import { buildPlan, SOURCES } from '../../../../src/scripts/seed-matches-rsssf.js';
import type { ClubCandidate } from '../../../../src/lib/rsssf/team-resolver.js';
import type { RsssfMatch } from '../../../../src/lib/rsssf/match-parser.js';

const club = (id: string, name: string): ClubCandidate => ({
  id,
  name,
  country: 'BR',
  state: null,
  gender: 'men',
  qid: null,
  city: null,
});

const match = (month: number, day: number, home: string, away: string): RsssfMatch => ({
  round: '1',
  dateRaw: `Aug ${day}`,
  month,
  day,
  homeName: home,
  awayName: away,
  homeGoals: 1,
  awayGoals: 0,
  scorers: null,
  extraTime: false,
  sourceNote: null,
});

describe('buildPlan T527 — spillAfter da temporada Covid', () => {
  it('jan/fev pertencem ao ano SEGUINTE quando a temporada declara spillAfter', () => {
    const source = SOURCES.br!;
    // A temporada Covid do BR é a de 2020 (rotulada '2020', com spillAfter).
    const season = source.seasons.find((s) => s.label === '2020')!;
    expect(season.spillAfter).toBe(5);

    const report = buildPlan(
      [match(8, 8, 'Fortaleza', 'Athletico/PR'), match(2, 25, 'São Paulo', 'Flamengo')],
      {
        source,
        season,
        competitionId: 'comp-1',
        seasonId: 'season-2020',
        globalPool: [
          club('c1', 'Fortaleza E.C.'),
          club('c2', 'Club Athletico Paranaense'),
          club('c3', 'São Paulo FC'),
          club('c4', 'Clube de Regatas do Flamengo'),
        ],
        competitionName: 'Campeonato Brasileiro Série A',
      },
    );

    expect(report.plan.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
      '2020-08-08', // agosto continua na temporada de 2020
      '2021-02-25', // fevereiro vaza para 2021 (o defeito gravava 2020-02-25)
    ]);
    expect(report.plan[1]!.dedupKey).toContain('2021-02-25');
  });
});
