import { describe, it, expect } from 'vitest';
import { resolveHierarchy } from '../../../src/modules/rankings/ranking-algorithm.service.js';

// T448b-2 (a) — reclassificação: 'continental' por NOME só com country nulo
// (confederação). Ligas nacionais homônimas deixam de ser continentais.
describe('T448b-2 — resolveHierarchy escopado por confederação', () => {
  it('confederação (country nulo) com keyword continental → continental', () => {
    expect(resolveHierarchy({ name: 'UEFA Champions League', country: null })).toBe('continental');
    expect(resolveHierarchy({ name: 'Copa Libertadores', country: null })).toBe('continental');
  });

  it('liga nacional homônima (country não-nulo) NÃO é continental', () => {
    expect(resolveHierarchy({ name: 'VFF Champions League', country: 'VU', type: 'LEAGUE' })).toBe(
      'nacional',
    );
    expect(
      resolveHierarchy({ name: 'Afghanistan Champions League', country: 'AF', type: 'LEAGUE' }),
    ).toBe('nacional');
  });

  it('mundial continua independente de country', () => {
    expect(resolveHierarchy({ name: 'Copa do Mundo', country: null })).toBe('mundial');
  });
});
