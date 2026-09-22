import { describe, it, expect } from 'vitest';
import {
  parseTableRows,
  parseEnglandFinalTables,
  rankDivision,
  rsssfSeasonUrl,
  RSSSF_ATTRIBUTION,
} from '../../../src/modules/etl/connectors/rsssf-tables.connector.js';

// T449a — parser de tabelas finais RSSSF (funções puras). Fixture extraída da
// página real eng2023.html (nomes COMPLETOS; sem abreviações de partidas).

const PREMIER = `
Final Table:

 1.Manchester City         38  28  5  5  94-33  89       [C]  Champions
 2.Arsenal                 38  26  6  6  88-43  84
 3.Manchester United       38  23  6  9  58-43  75
18.Leicester City          38   9  7 22  51-68  34            Relegated
19.Leeds United            38   7 10 21  48-78  31            Relegated
20.Southampton             38   6  7 25  36-73  25            Relegated
`;

describe('T449a — parseTableRows', () => {
  it('lê posição/clube/P/W/D/L/gols/pontos (nomes completos)', () => {
    const rows = parseTableRows(PREMIER);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({
      position: 1,
      club: 'Manchester City',
      played: 38,
      won: 28,
      drawn: 5,
      lost: 5,
      goalsFor: 94,
      goalsAgainst: 33,
      points: 89,
    });
    expect(rows[5]).toMatchObject({ position: 20, club: 'Southampton', points: 25 });
  });
});

describe('T449a — parseEnglandFinalTables (por divisão)', () => {
  it('separa divisões e ignora seções sem tabela', () => {
    const page = `Premier League\n${PREMIER}\nCup Tournaments\nFA Cup\n\nChampionship\n\nFinal Table:\n\n 1.Burnley  46 29 14 3 87-35 101  Promoted\n 2.Sheffield United 46 28 7 11 73-39 91\n`;
    const tables = parseEnglandFinalTables(page);
    expect(tables.map((t) => t.division)).toEqual(['Premier League', 'Championship']);
    expect(tables[0].rows).toHaveLength(6);
    expect(tables[1].rows[0]).toMatchObject({ club: 'Burnley', points: 101 });
  });
});

describe('T449a — rankDivision (MinMax 0-100, reprodutível)', () => {
  it('líder = 100, último = 0, ordenado por pontos', () => {
    const ranked = rankDivision(parseTableRows(PREMIER));
    expect(ranked[0].club).toBe('Manchester City');
    expect(ranked[0].score).toBe(100);
    expect(ranked[ranked.length - 1].club).toBe('Southampton');
    expect(ranked[ranked.length - 1].score).toBe(0);
    // reprodutibilidade
    expect(rankDivision(parseTableRows(PREMIER))).toEqual(ranked);
  });
});

describe('T449a — proveniência/atribuição', () => {
  it('URL da temporada + crédito RSSSF (atribuição obrigatória)', () => {
    expect(rsssfSeasonUrl('2023')).toBe('https://www.rsssf.org/tablese/eng2023.html');
    expect(RSSSF_ATTRIBUTION).toMatch(/RSSSF/);
  });
});
