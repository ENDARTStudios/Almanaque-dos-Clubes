import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseCupPlacements,
  parseTwoLegFinal,
} from '../../../src/lib/wikipedia/standings-parser.js';

// T516 — continentais/internacionais de CLUBES. Fixtures REAIS de 2024 (e o
// Mundial 2025, reformulado pela FIFA). Fatos externos: Sudamericana 2024 →
// Racing (vice Cruzeiro); Recopa 2024 → Fluminense (vice LDU Quito);
// Mundial 2024 → Real Madrid (vice Pachuca); Mundial 2025 → Chelsea (vice PSG).

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures', f), 'utf8');

describe('copa — Copa Sul-Americana 2024 (infobox pt)', () => {
  it('campeão Racing, vice Cruzeiro', () => {
    const p = parseCupPlacements(fx('wikipedia-standings-sud2024.html'));
    expect(p.champion?.toLowerCase()).toContain('racing');
    expect(p.runnerUp?.toLowerCase()).toContain('cruzeiro');
  });
});

describe('copa — Recopa Sul-Americana 2024 (FINAL EM DOIS JOGOS)', () => {
  it('NÃO tem rótulo "Campeão": o campeão sai do AGREGADO da caixa do confronto', () => {
    const html = fx('wikipedia-standings-rec2024.html');
    expect(parseCupPlacements(html).champion).toBeNull();
    const f = parseTwoLegFinal(html);
    expect(f).not.toBeNull();
    // LDU Quito 1 x 2 Fluminense no agregado → Fluminense campeão
    expect(f!.winner.name.toLowerCase()).toContain('fluminense');
    expect(f!.loser.name.toLowerCase()).toContain('ldu');
    expect(f!.aggregate).toEqual([1, 2]);
  });
});

describe('copa — Mundial de Clubes FIFA', () => {
  it('2024: Real Madrid campeão, Pachuca vice', () => {
    const p = parseCupPlacements(fx('wikipedia-standings-cwc2024.html'));
    expect(p.champion?.toLowerCase()).toContain('real madrid');
    expect(p.runnerUp?.toLowerCase()).toContain('pachuca');
  });
  it('2025 (formato reformulado): Chelsea campeão, PSG vice', () => {
    const p = parseCupPlacements(fx('wikipedia-standings-cwc2025.html'));
    expect(p.champion?.toLowerCase()).toContain('chelsea');
    expect(p.runnerUp?.toLowerCase()).toContain('paris');
  });
});
