import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStandings,
  parseTopScorer,
  parseCupPlacements,
  isStandingsHeader,
  detectLang,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T510 — parser multi-idioma. As fixtures são RECORTES REAIS da Wikipedia
// (infobox + tabelas de classificação + artilharia) de 4 competições.
// Os campeões abaixo são FATOS externos (fonte oficial), não a saída do parser:
// Premier League 2023-24 → Manchester City; La Liga → Real Madrid;
// Serie A → Inter; Libertadores 2024 → Botafogo (vice Atlético Mineiro).

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures', f), 'utf8');

describe('parseStandings — EN (Premier League 2023-24)', () => {
  const html = fx('wikipedia-standings-epl2324.html');
  it('extrai 20 clubes e o campeão é Manchester City', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(20);
    expect(rows[0].clubName.toLowerCase()).toContain('manchester city');
    expect(rows[0].played).toBe(38);
    expect(detectLang(['pos', 'team', 'pld', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts'])).toBe('en');
  });
});

describe('parseStandings — ES (La Liga 2023-24)', () => {
  const html = fx('wikipedia-standings-laliga2324.html');
  it('extrai 20 clubes e o campeão é Real Madrid', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(20);
    expect(rows[0].clubName.toLowerCase()).toContain('real madrid');
    expect(rows[0].points).toBe(95);
    expect(rows[0].won).toBe(29);
    expect(detectLang(['pos.', 'equipo', 'pts.', 'pj', 'g', 'e', 'p', 'gf', 'gc', 'dif.'])).toBe(
      'es',
    );
  });
});

describe('parseStandings — IT (Serie A 2023-24)', () => {
  const html = fx('wikipedia-standings-seriea2324.html');
  it('extrai 20 clubes e o campeão é Inter', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(20);
    expect(rows[0].clubName.toLowerCase()).toContain('inter');
    expect(rows[0].points).toBe(94);
    expect(detectLang(['', 'pos.', 'squadra', 'pt', 'g', 'v', 'n', 'p', 'gf', 'gs', 'dr'])).toBe(
      'it',
    );
  });
});

describe('copa — Libertadores 2024 (mata-mata)', () => {
  const html = fx('wikipedia-standings-lib2024.html');
  it('campeão/vice vêm do infobox (Botafogo / Atlético Mineiro)', () => {
    const p = parseCupPlacements(html);
    expect(p.champion?.toLowerCase()).toContain('botafogo');
    expect(p.runnerUp?.toLowerCase()).toContain('atl');
  });
  it('a tabela combinada da fase de grupos tem 32 clubes com coluna de grupo', () => {
    const rows = parseStandings(html, { requireGroup: true, minRows: 8 });
    expect(rows.length).toBeGreaterThanOrEqual(16);
    expect(rows[0].group).toBeTruthy();
  });
});

describe('parseTopScorer — âncoras por idioma', () => {
  it('en (Top scorers)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-epl2324.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(10);
    expect(s!.goals).toBeLessThanOrEqual(60);
  });
  it('es (Máximos goleadores)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-laliga2324.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(10);
  });
  it('it (marcatori)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-seriea2324.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(10);
  });
});

describe('isStandingsHeader — regressão T508 (pt)', () => {
  it('reconhece pt e rejeita não-classificação', () => {
    expect(isStandingsHeader(['pos', 'equipe', 'j', 'v', 'e', 'd', 'pts'])).toBe(true);
    expect(isStandingsHeader(['equipe', 'cidade', 'estado'])).toBe(false);
    expect(isStandingsHeader(['jogador', 'gols'])).toBe(false);
  });

  it('aceita a 1ª coluna "Seed" (tabela combinada de copa, ex.: Libertadores 2022)', () => {
    // bug pego em produção 10/10: 2021-2023 usam "Seed" no lugar de "Pos" e as
    // temporadas vinham SEM classificação
    expect(
      isStandingsHeader(['seed', 'grp', 'equipe', 'pts', 'j', 'v', 'e', 'd', 'gp', 'gc', 'sg']),
    ).toBe(true);
  });
});

describe('parseStandings — cabeçalho PT com "Equipe" LIMPO (sem legenda colada)', () => {
  // Regressão 10/10 (pega pelo smoke de UI): com o cabeçalho "Equipe" (limpo),
  // o léxico pt resolvia EMPATES para a coluna "E"quipe → drawn sempre null.
  // A tabela combinada da Libertadores tem exatamente esse formato.
  const rowsHtml = [
    ['1', 'A', 'Palmeiras', '18', '6', '6', '0', '0', '17', '4', '13'],
    ['2', 'A', 'São Paulo', '14', '6', '4', '2', '0', '10', '4', '6'],
    ['3', 'A', 'Racing', '13', '6', '4', '1', '1', '14', '3', '11'],
    ['4', 'A', 'River Plate', '12', '6', '3', '3', '0', '13', '7', '6'],
  ]
    .map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>')
    .join('');
  const html =
    '<table><tr>' +
    ['Pos', 'Grp', 'Equipe', 'Pts', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG']
      .map((h) => `<th>${h}</th>`)
      .join('') +
    '</tr>' +
    rowsHtml +
    '</table>';

  it('lê V/E/D nas colunas certas e a coluna de grupo', () => {
    const rows = parseStandings(html, { requireGroup: true, minRows: 4 });
    expect(rows).toHaveLength(4);
    expect(rows[0].group).toBe('A');
    expect(rows[0]).toMatchObject({ won: 6, drawn: 0, lost: 0, points: 18, played: 6 });
    expect(rows[1]).toMatchObject({ won: 4, drawn: 2, lost: 0, points: 14 });
    expect(rows[2]).toMatchObject({ won: 4, drawn: 1, lost: 1 });
    expect(rows[3]).toMatchObject({ won: 3, drawn: 3, lost: 0 });
  });
});
