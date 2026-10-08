import { describe, it, expect } from 'vitest';
import {
  CONTINENTAL_ANCHORS,
  NATIONAL_ANCHOR_GROUPS,
  WOMEN_ANCHORS,
  PORTAL_COUNTS,
  countryLabel,
} from '@/lib/competition-anchors';

// Mapeamento do portal (Operador, 08/10) — âncoras curadas da /competitions.
// Dados confirmados no banco de produção em 08/10 (R4: só entra o que existe).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('âncoras curadas de competições (mapeamento do portal)', () => {
  it('todo anchor tem id (uuid), qid quando marcado, nome e país válido', () => {
    const all = [
      ...CONTINENTAL_ANCHORS,
      ...NATIONAL_ANCHOR_GROUPS.flatMap((g) => g.items),
      ...WOMEN_ANCHORS,
    ];
    expect(all.length).toBeGreaterThanOrEqual(25);
    for (const c of all) {
      expect(c.id).toMatch(UUID);
      expect(c.name.length).toBeGreaterThan(2);
      if (c.qid) expect(c.qid).toMatch(/^Q\d+$/);
      expect(['men', 'women']).toContain(c.gender);
    }
  });

  it('grupos nacionais: países únicos, agrupamento correto e ≥9 países', () => {
    const countries = NATIONAL_ANCHOR_GROUPS.map((g) => g.country);
    expect(new Set(countries).size).toBe(countries.length);
    expect(countries.length).toBeGreaterThanOrEqual(9);
    for (const g of NATIONAL_ANCHOR_GROUPS) {
      for (const item of g.items) expect(item.country).toBe(g.country);
    }
    // BR tem o Copa do Brasil (Q843989) confirmado no acervo.
    const br = NATIONAL_ANCHOR_GROUPS.find((g) => g.country === 'BR');
    expect(br?.items.some((i) => i.qid === 'Q843989')).toBe(true);
  });

  it('continentais incluem Libertadores (Q184795) e UCL (Q18756)', () => {
    const qids = CONTINENTAL_ANCHORS.map((c) => c.qid);
    expect(qids).toContain('Q184795');
    expect(qids).toContain('Q18756');
  });

  it('feminino: acervo T450 presente; sem promessa de títulos (0 arestas WON hoje)', () => {
    expect(WOMEN_ANCHORS.length).toBeGreaterThanOrEqual(9);
    expect(WOMEN_ANCHORS.some((c) => c.qid === 'Q609757')).toBe(true); // Frauen-Bundesliga
    expect(PORTAL_COUNTS.womenWithTitles).toBe(0);
    expect(PORTAL_COUNTS.women).toBeGreaterThanOrEqual(WOMEN_ANCHORS.length);
  });

  it('countryLabel cobre os países dos grupos ×3 locales', () => {
    for (const g of NATIONAL_ANCHOR_GROUPS) {
      expect(countryLabel(g.country, 'pt-br')).not.toBe(g.country);
      expect(countryLabel(g.country, 'en-us')).not.toBe(g.country);
      expect(countryLabel(g.country, 'es-es')).not.toBe(g.country);
    }
    expect(countryLabel('XX', 'pt-br')).toBe('XX'); // desconhecido → ISO (honesto)
  });
});
