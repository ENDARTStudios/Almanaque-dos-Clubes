import { describe, it, expect } from 'vitest';
import {
  selectCarouselSubset,
  HIERARCHY_PRIORITY,
  MAX_CARDS,
  type CarouselScope,
} from '@/lib/carousel';

// WS-C-2 — subconjunto determinístico do carrossel.

function scope(
  hierarchy: string,
  season: number,
  championId: string,
  name = championId,
): CarouselScope {
  return {
    hierarchy,
    season,
    gender: 'men',
    competition: { id: `comp-${championId}`, qid: null, name: `Comp ${championId}` },
    champion: { id: championId, qid: null, name },
    source: {
      type: 'knowledge_graph',
      sourceUrl: null,
      authorCredit: null,
      license: null,
      retrievedAt: null,
    },
    confidence: 'single_active_record',
  };
}

describe('selectCarouselSubset', () => {
  it('respeita o teto MAX_CARDS', () => {
    const many = Array.from({ length: 500 }, (_, i) => scope('nacional', 2025, `c${i}`));
    expect(selectCarouselSubset(many)).toHaveLength(MAX_CARDS);
    expect(selectCarouselSubset(many, 5)).toHaveLength(5);
  });

  it('prioriza hierarquia (mundial > continental > nacional > estadual > municipal)', () => {
    const input = [
      scope('estadual', 2025, 'e1'),
      scope('municipal', 2025, 'm1'),
      scope('mundial', 2023, 'w1'),
      scope('continental', 2025, 't1'),
      scope('nacional', 2025, 'n1'),
    ];
    const out = selectCarouselSubset(input).map((s) => s.hierarchy);
    expect(out).toEqual(['mundial', 'continental', 'nacional', 'estadual', 'municipal']);
    expect(HIERARCHY_PRIORITY[0]).toBe('mundial');
  });

  it('dentro da hierarquia: temporada desc, depois nome/id asc (total)', () => {
    const input = [
      scope('nacional', 2024, 'b'),
      scope('nacional', 2025, 'z'),
      scope('nacional', 2025, 'a'),
    ];
    const out = selectCarouselSubset(input).map((s) => `${s.season}:${s.champion.id}`);
    expect(out).toEqual(['2025:a', '2025:z', '2024:b']);
  });

  it('não muta o array de entrada', () => {
    const input = [scope('nacional', 2024, 'b'), scope('mundial', 2025, 'a')];
    const copy = [...input];
    selectCarouselSubset(input);
    expect(input).toEqual(copy);
  });
});
