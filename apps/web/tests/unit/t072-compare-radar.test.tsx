// @vitest-environment jsdom
/**
 * T072 — Comparadores avançados: radar + export PDF.
 * (a) normalização pelo maior valor do par (líder = 100, 1 casa decimal)
 * (b) empate ⇒ ambos 100; metade do líder ⇒ 50
 * (c) dado ausente (null) em qualquer lado ⇒ eixo excluído e declarado
 * (d) zeros nos dois lados ⇒ excluído (zero não normaliza)
 * (e) componente: aria-label do radar + nota com os eixos excluídos
 * (f) botão "Exportar PDF" do /compare chama window.print()
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const pt = (await import('@/i18n/dictionaries/pt-br')).default;
  return { useI18n: () => ({ locale: 'pt-br', dict: pt }) };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '@/lib/api';
import { buildRadarData, type RadarMetricInput } from '@/lib/compare-radar';
import CompareRadar from '@/components/CompareRadar';
import CompareSelector from '@/components/CompareSelector';

const METRICS: RadarMetricInput[] = [
  { key: 'titles', label: 'Títulos', a: 12, b: 4 },
  { key: 'ranking', label: 'Pontos', a: 80, b: 80 },
  { key: 'history', label: 'Anos', a: 100, b: null },
  { key: 'stadium', label: 'Estádio', a: 40000, b: 20000 },
  { key: 'matches', label: 'Partidas', a: 0, b: 0 },
];

beforeAll(() => {
  // jsdom não tem ResizeObserver (exigido pelo ResponsiveContainer do recharts).
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
});

beforeEach(() => {
  (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
});

afterEach(() => cleanup());

describe('buildRadarData (T072)', () => {
  it('(a,b,c,d) normaliza, trata empate e exclui sem-dado declarando', () => {
    const { points, excluded } = buildRadarData(METRICS);

    expect(points.map((p) => p.key)).toEqual(['titles', 'ranking', 'stadium']);

    const titles = points[0];
    expect(titles.a).toBe(100);
    expect(titles.b).toBeCloseTo(33.3, 1);
    expect(titles.rawA).toBe(12);
    expect(titles.rawB).toBe(4);

    // Empate no máximo ⇒ ambos no topo.
    expect(points[1].a).toBe(100);
    expect(points[1].b).toBe(100);

    // Metade do líder ⇒ 50.
    expect(points.find((p) => p.key === 'stadium')?.b).toBe(50);

    expect(excluded).toEqual(['Anos', 'Partidas']);
  });

  it('retorna tudo excluído quando nenhum eixo tem par completo', () => {
    const { points, excluded } = buildRadarData([
      { key: 'x', label: 'X', a: 1, b: null },
      { key: 'y', label: 'Y', a: null, b: null },
    ]);
    expect(points).toHaveLength(0);
    expect(excluded).toEqual(['X', 'Y']);
  });
});

describe('CompareRadar (T072)', () => {
  it('(e) renderiza role=img com aria-label e declara os eixos excluídos', () => {
    render(<CompareRadar aName="Clube A" bName="Clube B" metrics={METRICS} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toBe('Visão geral (radar): Clube A vs Clube B');
    expect(screen.getByText(/Sem dado no acervo \(fora do radar\): Anos, Partidas/)).toBeTruthy();
  });

  it('(e) não renderiza radar quando nenhum eixo é plotável', () => {
    const { container } = render(
      <CompareRadar
        aName="A"
        bName="B"
        metrics={[{ key: 'matches', label: 'Partidas', a: null, b: null }]}
      />,
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('Exportar PDF (T072)', () => {
  it('(f) botão Exportar PDF do /compare chama window.print()', async () => {
    const print = vi.fn();
    (window as unknown as { print: unknown }).print = print;

    const payload = {
      kind: 'clubs',
      a: {
        name: 'Clube A',
        titles: { total: 12, mundial: 1, continental: 2, nacional: 5, estadual: 3, municipal: 1 },
        foundedYear: 1914,
        stadium: { capacity: 40000 },
        rankingHistory: [],
      },
      b: {
        name: 'Clube B',
        titles: { total: 4, mundial: 0, continental: 0, nacional: 2, estadual: 2, municipal: 0 },
        foundedYear: 1990,
        stadium: { capacity: 20000 },
        rankingHistory: [],
      },
      comparison: { rankingPoints: { a: 80, b: 60 }, matches: { reason: 'sem partidas' } },
    };
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((path: string) =>
      path.includes('/compare/clubs') ? Promise.resolve(payload) : Promise.resolve({ data: [] }),
    );

    render(<CompareSelector initialType="clubs" initialA="id-a" initialB="id-b" />);

    const btn = await screen.findByRole('button', { name: /Exportar PDF/i });
    await waitFor(() => expect(screen.getAllByText('Clube A').length).toBeGreaterThan(0));
    fireEvent.click(btn);
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe('deep-link resolve nomes (auditoria 08-10 P2)', () => {
  it('inputs mostram os NOMES dos clubes em vez do id bruto', async () => {
    const payload = {
      kind: 'clubs',
      a: {
        name: 'Clube A',
        titles: { total: 1, mundial: 1, continental: 0, nacional: 0, estadual: 0, municipal: 0 },
        foundedYear: 1914,
        stadium: null,
        rankingHistory: [],
      },
      b: {
        name: 'Clube B',
        titles: { total: 1, mundial: 0, continental: 0, nacional: 1, estadual: 0, municipal: 0 },
        foundedYear: 1990,
        stadium: null,
        rankingHistory: [],
      },
      comparison: { rankingPoints: { a: null, b: null }, matches: { reason: 'sem partidas' } },
    };
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path.includes('/compare/clubs')) return Promise.resolve(payload);
      if (path.includes('/clubs/id-a'))
        return Promise.resolve({ data: { name: 'Clube A', country: 'BR' } });
      if (path.includes('/clubs/id-b'))
        return Promise.resolve({ data: { name: 'Clube B', country: 'BR' } });
      return Promise.resolve({ data: [] });
    });

    render(<CompareSelector initialType="clubs" initialA="id-a" initialB="id-b" />);

    const inputA = (await screen.findByLabelText('A')) as HTMLInputElement;
    await waitFor(() => expect(inputA.value).toBe('Clube A'));
    const inputB = screen.getByLabelText('B') as HTMLInputElement;
    expect(inputB.value).toBe('Clube B');
  });
});
