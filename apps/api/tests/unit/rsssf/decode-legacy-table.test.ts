import { describe, it, expect } from 'vitest';
import {
  decodeLegacyBytes,
  decodeLegacyTable,
  fixtureToText,
} from '../../../src/lib/rsssf/decode-legacy-table.js';
import type { FixtureFile } from '../../../src/lib/rsssf/types.js';

// T448b-2b FASE 1 — decode legacy (cp1252) + tabela. Sem rede.

describe('T448b-2b FASE 1 — decodeLegacyBytes / htmlToText', () => {
  it('decodifica cp1252 mascarado como utf-8 (acentos corretos)', () => {
    // "Atlético" em cp1252 = 41 74 6C E9 74 69 63 6F
    const bytes = Uint8Array.from([0x41, 0x74, 0x6c, 0xe9, 0x74, 0x69, 0x63, 0x6f]);
    expect(decodeLegacyBytes(bytes, 'windows-1252')).toBe('Atlético');
  });
});

describe('T448b-2b FASE 1 — decodeLegacyTable', () => {
  it('extrai posição, time, números, goalDiff e pontos', () => {
    const t = decodeLegacyTable('1.Atlético 15 10 4 1 28-9 34 Champions');
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].position).toBe(1);
    expect(t.rows[0].team).toBe('Atlético');
    expect(t.rows[0].goalDiff).toBe(19); // 28-9
    expect(t.rows[0].points).toBe(34);
  });

  it('T11 — tabela sem posição 1 emite warning malformed_table (não inventa)', () => {
    const t = decodeLegacyTable('2.Cruzeiro 10 5 3 2 20-10 18\n3.América 10 4 4 2 18-12 16');
    expect(t.warnings.some((w) => w.code === 'malformed_table')).toBe(true);
    expect(t.rows.find((r) => r.position === 1)).toBeUndefined();
  });

  it('T11 — posições duplicadas emite malformed_table', () => {
    const t = decodeLegacyTable('1.A 10 5 3 2 20-10 18\n1.B 10 5 3 2 20-10 18');
    expect(t.warnings.some((w) => w.code === 'malformed_table')).toBe(true);
  });

  it('linha com posição sem valores numéricos → malformed_row', () => {
    const t = decodeLegacyTable('1.Atlético');
    expect(t.rows).toHaveLength(0);
    expect(t.warnings.some((w) => w.code === 'malformed_row')).toBe(true);
  });

  it('fixture com rawBase64 decodifica via fixtureToText', () => {
    const b64 = Buffer.from([0x32, 0x2e, 0x41, 0x20, 0x31, 0x20, 0x38, 0x2d, 0x30]).toString(
      'base64',
    );
    const fx: FixtureFile = {
      season: 2025,
      meta: {
        sourceUrl: 'x',
        retrievedAt: 't',
        authorCredit: 'a',
        licenseText: 'l',
        expectedSeason: 2025,
        expectedCompetitionName: 'Campeonato Mineiro',
      },
      encoding: 'windows-1252',
      rawBase64: b64,
    };
    expect(fixtureToText(fx)).toContain('2.A 1 8-0');
    expect(decodeLegacyTable(fx).rows[0].team).toBe('A');
  });
});
