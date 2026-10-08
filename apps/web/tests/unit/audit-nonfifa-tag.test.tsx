// @vitest-environment jsdom
/**
 * Auditoria 08-10 (P1) — etiqueta "Não-FIFA" no carrossel de campeões.
 * Render real do ChampionsCarousel com payload da API mockado: scope.nonFifa
 * → badge visível; scope comum → sem badge.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const pt = (await import('@/i18n/dictionaries/pt-br')).default;
  return { useI18n: () => ({ locale: 'pt-br', dict: pt }) };
});
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

import { api } from '@/lib/api';
import ChampionsCarousel from '@/components/ChampionsCarousel';

vi.mock('@/i18n/wsC2', () => ({
  wsC2Strings: {
    'pt-br': {
      carousel: {
        title: 'Campeões',
        empty: 'Sem campeões',
        season: 'Temporada',
        source: 'Fonte',
      },
    },
  },
}));

function baseScope(nonFifa: boolean) {
  return {
    hierarchy: 'mundial',
    season: 2006,
    gender: 'men',
    competition: { id: 'comp-viva', qid: 'Q318443', name: 'VIVA World Cup' },
    champion: { id: 'club-sapmi', qid: null, name: 'Sápmi football team' },
    nonFifa,
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

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
});

afterEach(() => cleanup());

describe('ChampionsCarousel — etiqueta Não-FIFA (auditoria 08-10)', () => {
  it('scope.nonFifa → badge visível com o rótulo localizado', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      scopes: [baseScope(true)],
      unavailable: [],
      limitations: [],
    });
    render(<ChampionsCarousel />);
    const tag = await screen.findByTestId('champion-nonfifa-tag');
    expect(tag.textContent).toBe('Não-FIFA');
  });

  it('scope comum (FIFA) → SEM badge', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      scopes: [baseScope(false)],
      unavailable: [],
      limitations: [],
    });
    render(<ChampionsCarousel />);
    await screen.findByTestId('champion-card');
    expect(screen.queryByTestId('champion-nonfifa-tag')).toBeNull();
  });
});
