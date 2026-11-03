// @vitest-environment jsdom
/**
 * A abertura FICHA da home — o que o conceito apresentou e a home não tinha.
 *
 * O defeito que estes testes travam é específico: o site tinha os tokens e os componentes do
 * sistema FICHA, mas a PRIMEIRA TELA continuava sendo a composição do conceito anterior. Quem
 * abria o site via uma home que não se parecia com o quadro `home` apresentado.
 *
 * O que é verificado aqui:
 *  (a) a manchete em duas linhas, com a segunda em crimson (a assinatura do conceito);
 *  (b) a faixa de cinco números com o rótulo de CADA um (número solto é adivinhação);
 *  (c) as seis portas de entrada apontam para rotas que existem;
 *  (d) LENDAS NÃO INVENTA NÚMERO: o conceito usava "1.284" ilustrativo; a implementação omite
 *      a contagem porque a API não publica uma — "não sabemos" não vira contador;
 *  (e) origem fora do ar vira "—" (lacuna declarada), nunca 0 — 0 seria uma afirmação falsa.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const pt = (await import('@/i18n/dictionaries/pt-br')).default;
  const ler = (chave: string): string =>
    chave.split('.').reduce<unknown>((acc, parte) => {
      if (acc && typeof acc === 'object' && parte in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[parte];
      }
      return chave;
    }, pt) as string;
  return { useI18n: () => ({ locale: 'pt-br' as const, dict: pt, t: ler }) };
});

vi.mock('@/hooks/useGsap', () => ({ useGsapFadeIn: () => {}, useGsapStagger: () => {} }));

import HomeFicha, { type HomeTotals } from '@/components/HomeFicha';

const TOTAIS: HomeTotals = {
  clubs: 12003,
  players: 105211,
  competitions: 1932,
  matches: 17265,
  rankings: 72,
  countries: 220,
};

afterEach(cleanup);

describe('HomeFicha — a abertura do conceito', () => {
  it('(a) a manchete tem as duas linhas do conceito, e a segunda é o acento', () => {
    const { container } = render(<HomeFicha totals={TOTAIS} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('A História do Futebol');
    expect(h1.textContent).toContain('num Só Lugar');
    const acento = h1.querySelector('.text-primary');
    expect(acento?.textContent).toBe('num Só Lugar');
    // o globo é a ilustração do conceito; existe e é decorativo
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('(b) a faixa mostra os cinco totais, cada um com o seu rótulo', () => {
    render(<HomeFicha totals={TOTAIS} />);
    expect(screen.getByTestId('home-stat-clubs').textContent).toBe('12.003');
    expect(screen.getByTestId('home-stat-players').textContent).toBe('105.211');
    expect(screen.getByTestId('home-stat-competitions').textContent).toBe('1.932');
    expect(screen.getByTestId('home-stat-matches').textContent).toBe('17.265');
    expect(screen.getByTestId('home-stat-rankings').textContent).toBe('72');
    const faixa = screen.getByTestId('home-stats');
    for (const rotulo of ['Clubes', 'Jogadores', 'Competições', 'Partidas', 'Rankings']) {
      expect(faixa.textContent).toContain(rotulo);
    }
  });

  it('(c) as seis portas levam a rotas que existem', () => {
    render(<HomeFicha totals={TOTAIS} />);
    const esperado: [string, string][] = [
      ['clubs', '/clubs'],
      ['competitions', '/competitions'],
      ['players', '/players'],
      ['rankings', '/rankings'],
      ['legends', '/legends'],
      ['map', '/map'],
    ];
    for (const [key, href] of esperado) {
      const link = screen.getByTestId(`home-porta-${key}`);
      expect(link.getAttribute('href')).toBe(href);
    }
  });

  it('(d) Lendas não inventa contagem — declara a nota no lugar do número', () => {
    const { container } = render(<HomeFicha totals={TOTAIS} />);
    expect(container.textContent).not.toContain('1.284');
    expect(screen.getByTestId('home-porta-legends').textContent).toContain('clubes e jogadores');
  });

  it('(e) origem fora do ar vira lacuna declarada ("—"), nunca zero', () => {
    render(
      <HomeFicha
        totals={{
          clubs: null,
          players: null,
          competitions: null,
          matches: null,
          rankings: null,
          countries: null,
        }}
      />,
    );
    expect(screen.getByTestId('home-stat-clubs').textContent).toBe('—');
    expect(screen.getByTestId('home-stat-matches').textContent).toBe('—');
    expect(screen.getByTestId('home-porta-legends')).toBeTruthy();
    expect(screen.getByTestId('home-stats').textContent).not.toContain('0');
  });

  it('a procedência diz de onde vêm os totais e que falha é lacuna', () => {
    const { container } = render(<HomeFicha totals={TOTAIS} />);
    expect(container.textContent).toContain('Totais reais do acervo');
    expect(container.textContent).toContain('lacuna declarada');
  });
});
