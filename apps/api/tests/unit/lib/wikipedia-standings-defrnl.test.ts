import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStandings,
  parseTopScorer,
  isStandingsHeader,
  detectLang,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T513 — léxicos DE/FR/NL. Fixtures REAIS da temporada 2024-25; os campeões
// abaixo são FATOS externos: Bundesliga → Bayern München; Ligue 1 → Paris
// Saint-Germain; Eredivisie → PSV.

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures', f), 'utf8');

describe('parseStandings — DE (Bundesliga 2024/25)', () => {
  const html = fx('wikipedia-standings-bund2425.html');
  it('extrai 18 clubes, campeão Bayern e gols da coluna ÚNICA "Tore"', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(18);
    expect(rows[0].clubName.toLowerCase()).toContain('bayern');
    expect(rows[0].points).toBeGreaterThan(70);
    expect(rows[0].played).toBe(34);
    // "Tore" = "99:32" numa coluna só → precisa SPLITAR em pró/contra
    expect(rows[0].goalsFor).toBeGreaterThan(rows[0].goalsAgainst as number);
    expect(rows[0].goalsFor).toBeGreaterThan(80);
    expect(detectLang(['pl.', 'verein', 'sp.', 's', 'u', 'n', 'tore', 'diff.', 'punkte'])).toBe(
      'de',
    );
  });
});

describe('parseStandings — FR (Ligue 1 2024-2025)', () => {
  const html = fx('wikipedia-standings-ligue1_2425.html');
  it('extrai 18 clubes e o campeão é Paris Saint-Germain', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(18);
    expect(rows[0].clubName.toLowerCase()).toContain('paris');
    expect(rows[0].points).toBe(84);
    expect(rows[0].played).toBe(34);
    expect(rows[0].won).toBe(26);
    expect(rows[0].drawn).toBe(6);
    expect(rows[0].lost).toBe(2);
    expect(rows[0].goalsFor).toBe(92);
    expect(rows[0].goalsAgainst).toBe(35);
    expect(detectLang(['rang', 'équipe', 'pts', 'j', 'g', 'n', 'p', 'bp', 'bc', 'diff'])).toBe(
      'fr',
    );
  });
});

describe('parseStandings — NL (Eredivisie 2024/25)', () => {
  const html = fx('wikipedia-standings-ere2425.html');
  it('extrai 18 clubes e o campeão é PSV', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(18);
    expect(rows[0].clubName.toLowerCase()).toContain('psv');
    expect(rows[0].played).toBe(34);
    expect(rows[0].points as number).toBeGreaterThan(75);
    expect(detectLang(['pos', 'team', 'wed', 'w', 'g', 'v', 'ptn', 'dv', 'dt'])).toBe('nl');
  });
});

describe('parseTopScorer — âncoras DE/FR/NL', () => {
  it('de (Torschützenkönig)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-bund2425.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(15);
  });
  it('fr (Meilleurs buteurs)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-ligue1_2425.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(15);
  });
  it('nl (Topscorers)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-ere2425.html'));
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(15);
  });
});

describe('isStandingsHeader — DE/FR/NL', () => {
  it('aceita os três cabeçalhos', () => {
    expect(isStandingsHeader(['pl.', 'verein', 'sp.', 's', 'u', 'n', 'tore', 'punkte'])).toBe(true);
    expect(isStandingsHeader(['rang', 'équipe', 'pts', 'j', 'g', 'n', 'p', 'bp', 'bc'])).toBe(true);
    expect(isStandingsHeader(['pos', 'team', 'wed', 'w', 'g', 'v', 'ptn', 'dv', 'dt'])).toBe(true);
  });
});
