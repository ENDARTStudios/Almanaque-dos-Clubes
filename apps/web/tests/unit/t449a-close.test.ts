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
  it('tem a seção do ranking 0-100 com fórmula, MinMax, escopo, limitações e atribuição', () => {
    expect(metodologia).toContain('id="ranking-piloto-inglaterra"');
    // T521 — a seção deixou de ser "piloto Inglaterra" e passou a documentar os
    // escopos publicados (competição + ano) com a fórmula real em produção.
    expect(metodologia).toContain('Ranking 0-100 (por competição e por ano)');
    // Fórmula publicada == código real (W×3×peso + D×1×peso + Títulos×50×peso).
    expect(metodologia).toContain('Vitórias × 3 × peso + Empates × 1 × peso + Títulos × 50 × peso');
    expect(metodologia).toMatch(/MinMax/);
    // Títulos SÃO incluídos (grafo WON) — a limitação antiga ("não incluídos") caiu.
    expect(metodologia).toMatch(/arestas WON/);
    expect(metodologia).toMatch(/isolada por gênero/);
    expect(metodologia).toMatch(/Amostra mínima/);
    expect(metodologia).toMatch(/RSSSF/);
    expect(metodologia).toMatch(/condicionado à atribuição adequada/);
    expect(metodologia).toMatch(/endart\.studios\+contato@gmail\.com/);
    // Honestidade: o defeito legado e a convivência de escalas ficam declarados.
    expect(metodologia).toContain('A.F.C. Liverpool');
    expect(metodologia).toMatch(/duas escalas convivem/);
    // NÃO afirmar domínio público para RSSSF.
    expect(metodologia).not.toMatch(/RSSSF[^.]*domínio público/i);
    // Fórmula antiga (divergente) NÃO deve constar.
    expect(metodologia).not.toMatch(/Vitórias×3 \+ Empates×1 \+ Gols Pró×0\.2/);
  });

  it('declara o agregado cross-division como proposto/não publicado (T449c-v2-pre C)', () => {
    expect(metodologia).toContain('id="agregado-cross-division-inglaterra"');
    expect(metodologia).toContain('Agregado cross-division');
    // T449c-v2 — agora PUBLICADO (não mais "proposto, não publicado").
    expect(metodologia).toContain('Piloto Inglaterra 2022/23 (publicado em 2026-09-27)');
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
