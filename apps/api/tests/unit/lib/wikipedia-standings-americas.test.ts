import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseStandings,
  parseStandingsTables,
  parseChampionByLabel,
  parseSplitChampions,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T515 — competições das Américas. Fixtures REAIS de 2024. Fatos externos:
// Série B 2024 → Santos; Liga MX 2024-25 → Apertura: América, Clausura: Toluca;
// MLS 2024 → MLS Cup: LA Galaxy.

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures', f), 'utf8');

describe('liga — Série B 2024 (PT, tabela padrão)', () => {
  const html = fx('wikipedia-standings-sb2024.html');
  it('20 clubes e campeão Santos (posição 1)', () => {
    const rows = parseStandings(html);
    expect(rows).toHaveLength(20);
    expect(rows[0].clubName.toLowerCase()).toContain('santos');
    expect(rows[0].points as number).toBeGreaterThan(60);
  });
});

describe('Liga MX 2024-25 — DOIS torneios por temporada', () => {
  const html = fx('wikipedia-standings-mx2024.html');
  it('lê os dois campeões do MESMO infobox ("Apertura:"/"Clausura:")', () => {
    const s = parseSplitChampions(html);
    expect(s.apertura?.name.toLowerCase()).toContain('am');
    expect(s.clausura?.name.toLowerCase()).toContain('toluca');
  });
  it('devolve as DUAS tabelas (Apertura e Clausura), 18 clubes cada', () => {
    const tables = parseStandingsTables(html);
    expect(tables.length).toBeGreaterThanOrEqual(2);
    expect(tables[0]).toHaveLength(18);
    expect(tables[1]).toHaveLength(18);
    expect(tables[0][0].position).toBe(1);
  });
});

describe('MLS 2024 — título decidido no PLAYOFF (não na tabela)', () => {
  const html = fx('wikipedia-standings-mls2024.html');
  it('campeão vem do rótulo "MLS Cup" do infobox', () => {
    const p = parseChampionByLabel(html, 'MLS Cup');
    expect(p.champion?.toLowerCase()).toContain('galaxy');
  });
  it('com minRows=20 pega a tabela GERAL (29 clubes), não as conferências (14-15)', () => {
    const rows = parseStandings(html, { minRows: 20 });
    expect(rows).toHaveLength(29);
    // a primeira tabela (conferência Leste) tem 15 linhas — recusada pelo minRows
    expect(parseStandings(html, { minRows: 4 }).length).toBeLessThan(20);
  });
});
