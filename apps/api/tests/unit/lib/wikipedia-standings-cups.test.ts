import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  clubFromCell,
  parseStandings,
  parseTopScorer,
  parseCupPlacements,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T514 — COPA europeia. Fixtures REAIS de 2024-25 (fase de liga de 36 times) e
// 2023-24 (8 grupos de 4). Fatos externos: UCL 2024-25 → PSG; UEL 2024-25 →
// Tottenham; Primeira Liga 2023-24 → Sporting CP.

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures', f), 'utf8');

describe('copa — UCL 2024-25 (FASE DE LIGA, sem coluna de grupo)', () => {
  const html = fx('wikipedia-standings-ucl2024.html');
  it('campeão/vice vêm do infobox ("Champions"/"Runners-up" — plurais)', () => {
    const p = parseCupPlacements(html);
    expect(p.champion?.toLowerCase()).toContain('paris');
    expect(p.runnerUp?.toLowerCase()).toContain('inter');
  });
  it('a fase de liga tem 36 clubes (tabela SEM coluna "Grp")', () => {
    const rows = parseStandings(html, { minRows: 8 });
    expect(rows).toHaveLength(36);
    expect(rows[0].position).toBe(1);
  });
  it('não há tabela combinada com "Grp" (o formato mudou) — o fallback é que resolve', () => {
    expect(parseStandings(html, { requireGroup: true, minRows: 8 })).toHaveLength(0);
  });
  it('artilheiro (Top goalscorers)', () => {
    const s = parseTopScorer(html);
    expect(s).not.toBeNull();
    expect(s!.goals).toBeGreaterThan(8);
  });
});

describe('copa — UCL 2023-24 (8 grupos de 4: NÃO inventar classificação)', () => {
  it('não devolve classificação (as tabelas têm 4 linhas cada)', () => {
    const html = fx('wikipedia-standings-ucl2023.html');
    expect(parseStandings(html, { minRows: 8 })).toHaveLength(0);
    expect(parseStandings(html, { requireGroup: true, minRows: 8 })).toHaveLength(0);
  });
  it('mas o campeão/vice vêm do infobox', () => {
    const p = parseCupPlacements(fx('wikipedia-standings-ucl2023.html'));
    expect(p.champion?.toLowerCase()).toContain('real madrid');
  });
});

describe('copa — UEL 2024-25', () => {
  const html = fx('wikipedia-standings-uel2024.html');
  it('campeão Tottenham, fase de liga com 36 clubes', () => {
    const p = parseCupPlacements(html);
    expect(p.champion?.toLowerCase()).toContain('tottenham');
    expect(parseStandings(html, { minRows: 8 })).toHaveLength(36);
  });
});

describe('liga — Primeira Liga 2023-24 (PT)', () => {
  const html = fx('wikipedia-standings-pl2024.html');
  it('campeão Sporting CP e 18 clubes', () => {
    const rows = parseStandings(html);
    expect(rows.length).toBeGreaterThanOrEqual(18);
    expect(rows[0].clubName.toLowerCase()).toContain('sporting');
  });
});

describe('clubFromCell — namespaces que NÃO são artigo', () => {
  it('ignora link de TEMPLATE (Predefinição:) e fica com o clube', () => {
    // forma real da Primeira Liga 2021-22: o link do template tem o texto MAIOR
    const cell =
      '<a href="/wiki/Predefinição:Futebol_B-SAD">Predefinição:Futebol B-SAD</a>' +
      '<a href="/wiki/Belenenses_SAD">B-SAD</a>';
    const { name, article } = clubFromCell(cell);
    expect(name).toBe('B-SAD');
    expect(article).toBe('Belenenses SAD');
  });
});
