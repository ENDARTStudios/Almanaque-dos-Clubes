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

describe('parseTopScorer — âncoras DE/FR/NL (valores REAIS de 2024-25)', () => {
  it('de: Harry Kane, 26 gols (NUNCA um clube — a tabela "Tore" por clube era aceita)', () => {
    const s = parseTopScorer(fx('wikipedia-standings-bund2425.html'));
    expect(s).not.toBeNull();
    expect(s!.name.toLowerCase()).toContain('kane');
    expect(s!.goals).toBe(26);
  });
  it('fr: Ousmane Dembélé, 21 gols', () => {
    const s = parseTopScorer(fx('wikipedia-standings-ligue1_2425.html'));
    expect(s).not.toBeNull();
    expect(s!.name.toLowerCase()).toContain('demb');
    expect(s!.goals).toBe(21);
  });
  it('nl: devolve null (a coluna de gols da tabela NL é SEM CABEÇALHO) — melhor null que errado', () => {
    // A tabela real é "Pos. | Speler | Club | Wed | (vazio) | (vazio) | Gem": a
    // coluna de gols não tem rótulo. A única tabela com "goals" é a de HAT-TRICKS
    // (minutos: "23', 48'…") → não é artilharia. Sem rótulo confiável, devolve null
    // em vez de "Ricardo Pepi" (que era o que a heurística antiga produzia).
    expect(parseTopScorer(fx('wikipedia-standings-ere2425.html'))).toBeNull();
  });
});

describe('isStandingsHeader — DE/FR/NL', () => {
  it('aceita os três cabeçalhos', () => {
    expect(isStandingsHeader(['pl.', 'verein', 'sp.', 's', 'u', 'n', 'tore', 'punkte'])).toBe(true);
    expect(isStandingsHeader(['rang', 'équipe', 'pts', 'j', 'g', 'n', 'p', 'bp', 'bc'])).toBe(true);
    expect(isStandingsHeader(['pos', 'team', 'wed', 'w', 'g', 'v', 'ptn', 'dv', 'dt'])).toBe(true);
  });
});
