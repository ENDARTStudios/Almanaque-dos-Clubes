import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// T449a-close — a superfície pública precisa declarar a natureza do piloto
// (Inglaterra/RSSSF/tabelas-só/sem-títulos) e creditar a RSSSF (D-rsssf-atribuicao).

const metodologia = readFileSync(
  new URL('../../src/app/metodologia/page.tsx', import.meta.url),
  'utf8',
);
const pt = readFileSync(new URL('../../src/i18n/dictionaries/pt-br.ts', import.meta.url), 'utf8');
const en = readFileSync(new URL('../../src/i18n/dictionaries/en-us.ts', import.meta.url), 'utf8');
const es = readFileSync(new URL('../../src/i18n/dictionaries/es-es.ts', import.meta.url), 'utf8');

describe('T449a-close — /metodologia', () => {
  it('tem a seção do ranking piloto com fórmula, MinMax, limitações e atribuição', () => {
    expect(metodologia).toContain('id="ranking-piloto-inglaterra"');
    expect(metodologia).toContain('Ranking 0-100 (Piloto Inglaterra)');
    // T449c-v2-pre (A) — fórmula publicada == código real (W×3 + D×1; sem GF×0.2).
    expect(metodologia).toContain('Pontos brutos = Vitórias × 3 + Empates × 1');
    expect(metodologia).toMatch(/MinMax/);
    expect(metodologia).toContain('maior saldo de gols (GF - GA)');
    expect(metodologia).toMatch(/títulos não incluídos nesta fase/);
    expect(metodologia).toMatch(/RSSSF/);
    expect(metodologia).toMatch(/condicionado à atribuição adequada/);
    expect(metodologia).toMatch(/endart\.studios@gmail\.com/);
    // NÃO afirmar domínio público para RSSSF.
    expect(metodologia).not.toMatch(/RSSSF[^.]*domínio público/i);
    // Fórmula antiga (divergente) NÃO deve constar.
    expect(metodologia).not.toMatch(/Vitórias×3 \+ Empates×1 \+ Gols Pró×0\.2/);
  });

  it('declara o agregado cross-division como proposto/não publicado (T449c-v2-pre C)', () => {
    expect(metodologia).toContain('id="agregado-cross-division-inglaterra"');
    expect(metodologia).toContain('Agregado cross-division');
    expect(metodologia).toContain('proposto, não publicado');
    expect(metodologia).toContain('L1=1.00, L2=0.85, L3=0.70, L4=0.55, L5=0.40');
    expect(metodologia).toContain('estimativa metodológica, não confronto oficial');
    expect(metodologia).toContain('Nota de consistência (2026-09-27)');
  });
});

describe('T449a-close — i18n do badge (pt/en/es)', () => {
  it('todas as locales têm pilotBadge/pilotSubtitle/pilotMethodology', () => {
    for (const d of [pt, en, es]) {
      expect(d).toMatch(/pilotBadge:/);
      expect(d).toMatch(/pilotSubtitle:/);
      expect(d).toMatch(/pilotMethodology:/);
    }
    expect(pt).toMatch(/Piloto Inglaterra · Fonte RSSSF/);
  });
});
