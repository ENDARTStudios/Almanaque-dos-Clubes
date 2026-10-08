import { describe, it, expect } from 'vitest';
import {
  buildCarousel,
  type CarouselClub,
  type CarouselComp,
  type CarouselEdge,
} from '../../../src/modules/champions/carousel.service.js';

// WS-C-1 — regras do carrossel (determinístico; ambíguo/ausente = omitido).

const comps: CarouselComp[] = [
  { id: 'comp1', qid: 'Q100', name: 'Liga Nacional', type: 'LEAGUE', country: 'BR' },
];
const clubs: CarouselClub[] = [
  { id: 'clubA', qid: 'QA', name: 'Clube A' },
  { id: 'clubB', qid: 'QB', name: 'Clube B' },
];

function edge(sourceId: string, meta: Record<string, unknown>, targetId = 'comp1'): CarouselEdge {
  return { sourceId, sourceType: 'Club', targetId, targetType: 'Competition', metadata: meta };
}

describe('buildCarousel — flag nonFifa (auditoria 08-10)', () => {
  const viva: CarouselComp = {
    id: 'compV',
    qid: 'Q318443',
    name: 'VIVA World Cup',
    type: null,
    country: null,
  };
  it('Q318443 (VIVA World Cup) → scope.nonFifa true; QID comum → false', () => {
    const { scopes } = buildCarousel(
      [
        edge(
          'clubA',
          { year: 2006, hierarchy: 'mundial', source: 'wikidata', sourceUrl: 'u' },
          'compV',
        ),
        edge('clubB', { year: 2025, hierarchy: 'mundial', source: 'wikidata', sourceUrl: 'u' }),
      ],
      [viva, comps[0]],
      clubs,
      2026,
    );
    expect(scopes).toHaveLength(2);
    const vivaScope = scopes.find((s) => s.competition.qid === 'Q318443');
    const fifaScope = scopes.find((s) => s.competition.qid === 'Q100');
    expect(vivaScope?.nonFifa).toBe(true);
    expect(fifaScope?.nonFifa).toBe(false);
  });

  it('isNonFifaWorldCompetition: null/undefined → false', async () => {
    const { isNonFifaWorldCompetition } = await import('../../../src/lib/champions/non-fifa.js');
    expect(isNonFifaWorldCompetition(null)).toBe(false);
    expect(isNonFifaWorldCompetition(undefined)).toBe(false);
    expect(isNonFifaWorldCompetition('Q999')).toBe(false);
    expect(isNonFifaWorldCompetition('Q318443')).toBe(true);
  });
});

describe('buildCarousel', () => {
  it('um único campeão ativo por escopo → incluído', () => {
    const { scopes } = buildCarousel(
      [edge('clubA', { year: 2025, hierarchy: 'nacional', source: 'wikidata', sourceUrl: 'u' })],
      comps,
      clubs,
      2026,
    );
    expect(scopes).toHaveLength(1);
    expect(scopes[0]).toMatchObject({
      hierarchy: 'nacional',
      season: 2025,
      gender: 'men',
      confidence: 'single_active_record',
      champion: { id: 'clubA', qid: 'QA', name: 'Clube A' },
    });
  });

  it('múltiplos campeões no mesmo escopo/temporada → omitido ambíguo', () => {
    const { scopes, unavailable } = buildCarousel(
      [
        edge('clubA', { year: 2025, hierarchy: 'nacional' }),
        edge('clubB', { year: 2025, hierarchy: 'nacional' }),
      ],
      comps,
      clubs,
      2026,
    );
    expect(scopes).toHaveLength(0);
    expect(unavailable.some((u) => u.reason === 'ambiguous_multiple_champions')).toBe(true);
  });

  it('hierarquia sem aresta → omitida no_active_provenanced_champion', () => {
    const { unavailable } = buildCarousel([], comps, clubs, 2026);
    const reasons = unavailable.map((u) => u.hierarchy);
    expect(reasons).toContain('mundial');
    expect(reasons).toContain('estadual');
    expect(unavailable.every((u) => u.reason === 'no_active_provenanced_champion')).toBe(true);
  });

  it('fonte RSSSF exige atribuição; Wikidata CC0', () => {
    const rsssf = buildCarousel(
      [
        edge('clubA', {
          year: 2025,
          hierarchy: 'estadual',
          source: 'rsssf',
          sourceUrl: 'r',
          authorCredit: 'Autor X',
        }),
      ],
      comps,
      clubs,
      2026,
    ).scopes[0];
    expect(rsssf.source.type).toBe('rsssf');
    expect(rsssf.source.authorCredit).toBe('Autor X');
    expect(rsssf.source.license).toMatch(/RSSSF/);

    const wiki = buildCarousel(
      [edge('clubA', { year: 2025, hierarchy: 'nacional', source: 'wikidata' })],
      comps,
      clubs,
      2026,
    ).scopes[0];
    expect(wiki.source.license).toBe('CC0');
  });

  it('gênero isolado: masculino e feminino são escopos distintos', () => {
    const { scopes } = buildCarousel(
      [
        edge('clubA', { year: 2025, hierarchy: 'nacional', gender: 'men' }),
        edge('clubB', { year: 2025, hierarchy: 'nacional', gender: 'women' }),
      ],
      comps,
      clubs,
      2026,
    );
    expect(scopes).toHaveLength(2);
    expect(scopes.map((s) => s.gender).sort()).toEqual(['men', 'women']);
  });

  it('edição futura (ano > atual) é ignorada', () => {
    const { scopes, unavailable } = buildCarousel(
      [edge('clubA', { year: 3000, hierarchy: 'mundial' })],
      comps,
      clubs,
      2026,
    );
    expect(scopes).toHaveLength(0);
    expect(unavailable.some((u) => u.hierarchy === 'mundial')).toBe(true);
  });
});
