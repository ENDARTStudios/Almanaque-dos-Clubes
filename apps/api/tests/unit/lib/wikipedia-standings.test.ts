import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStandings,
  isStandingsHeader,
  splitTables,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T508 — parser da classificação (fixture REAL do Brasileirão 2024 Série A,
// HTML renderizado da Wikipedia PT — as tabelas vêm de módulos Lua, não wikitext).

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, '../../fixtures/wikipedia-standings-2024.html'), 'utf8');

describe('parseStandings (T508)', () => {
  it('extrai a classificação do Brasileirão 2024 (20 clubes, posições 1..20)', () => {
    const rows = parseStandings(fixture);
    expect(rows).toHaveLength(20);
    expect(rows.map((r) => r.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('cada linha tem clube, jogos e pontos coerentes', () => {
    const rows = parseStandings(fixture);
    const first = rows[0];
    expect(first.clubName.length).toBeGreaterThan(3);
    expect(first.played).toBeGreaterThan(0);
    expect(first.played).toBeLessThanOrEqual(38);
    // pontos ≤ 3 × jogos (regra do futebol)
    expect(first.points).not.toBeNull();
    expect(first.points as number).toBeLessThanOrEqual((first.played as number) * 3);
    // o campeão de 2024 foi o Botafogo
    expect(rows[0].clubName.toLowerCase()).toContain('botafogo');
  });

  it('retorna [] quando não há tabela de classificação', () => {
    expect(parseStandings('<table><tr><th>Foo</th></tr><tr><td>1</td></tr></table>')).toEqual([]);
    expect(parseStandings('')).toEqual([]);
  });

  it('isStandingsHeader reconhece cabeçalhos e rejeita outros', () => {
    expect(isStandingsHeader(['pos', 'equipe', 'j', 'v', 'e', 'd', 'pts'])).toBe(true);
    expect(isStandingsHeader(['equipe', 'cidade', 'estado'])).toBe(false);
    expect(isStandingsHeader(['jogador', 'gols'])).toBe(false);
  });

  it('splitTables separa tabelas de nível superior', () => {
    const html = '<table><tr><td>a</td></tr></table><p>x</p><table><tr><td>b</td></tr></table>';
    expect(splitTables(html)).toHaveLength(2);
  });
});
