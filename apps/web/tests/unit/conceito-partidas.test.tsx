// @vitest-environment jsdom
/**
 * /matches no conceito FICHA — lista de confrontos e caixa de estatística da página.
 *
 * O que estes testes protegem:
 *  · a linha é um confronto legível (data/rodada, clubes e placar com a conjunção lida por
 *    leitor de tela no lugar do "×"), e a ação "ver partida" é um link com nome acessível;
 *  · placar ausente NÃO vira 0×0: a célula declara a lacuna;
 *  · a estatística da página só conta partidas COM placar e declara o recorte — não vende a
 *    página como se fosse o acervo inteiro.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MatchList from '@/components/conceito/partidas/MatchList';
import PageStats, { computePageStats } from '@/components/conceito/partidas/PageStats';
import type { MatchRowData } from '@/components/conceito/partidas/types';
import { wsConceitoPartidas } from '@/i18n/wsConceitoPartidas';

const s = wsConceitoPartidas['pt-br'];
afterEach(cleanup);

const COM_PLACAR: MatchRowData = {
  id: 'm1',
  date: '2024-08-09T00:00:00.000Z',
  round: 'Rodada 1',
  homeScore: 1,
  awayScore: 1,
  homeClub: { id: 'c1', name: 'Leicester City', logoUrl: null },
  awayClub: { id: 'c2', name: 'Tottenham', logoUrl: null },
  competition: { id: 'k1', name: 'Premier League' },
  season: { id: 's1', name: '2024-25' },
};

const GOLEADA: MatchRowData = {
  ...COM_PLACAR,
  id: 'm2',
  homeScore: 5,
  awayScore: 0,
  homeClub: { id: 'c3', name: 'Casa FC' },
  awayClub: { id: 'c4', name: 'Fora FC' },
};

const SEM_PLACAR: MatchRowData = {
  ...COM_PLACAR,
  id: 'm3',
  homeScore: null,
  awayScore: null,
};

function renderLista(rows: MatchRowData[]) {
  return render(
    <MatchList
      rows={rows}
      locale="pt-br"
      openLabel={s.open}
      scoreJoiner="a"
      noScore="sem placar na fonte"
      dataLabel="Partidas"
    />,
  );
}

describe('MatchList — o confronto em linha', () => {
  it('mostra data, rodada, clubes e placar; o link leva à ficha da partida', () => {
    renderLista([COM_PLACAR]);
    expect(screen.getByTestId('conceito-partida-row').textContent).toContain('Leicester City');
    expect(screen.getByTestId('conceito-partida-row').textContent).toContain('09/08/2024');
    expect(screen.getByTestId('conceito-partida-row').textContent).toContain('Rodada 1');
    const link = screen.getByRole('link', { name: /ver partida/i });
    expect(link.getAttribute('href')).toBe('/matches/m1');
  });

  it('placar ausente vira lacuna declarada, nunca 0×0', () => {
    renderLista([SEM_PLACAR]);
    const linha = screen.getByTestId('conceito-partida-row');
    expect(linha.textContent).toContain('sem placar na fonte');
    expect(linha.textContent).not.toContain('0×0');
  });

  it('o confronto mantém a ordem casa · placar · visitante', () => {
    renderLista([GOLEADA]);
    const texto = screen.getByTestId('conceito-partida-row').textContent ?? '';
    expect(texto.indexOf('Casa FC')).toBeLessThan(texto.indexOf('5'));
    expect(texto.indexOf('5')).toBeLessThan(texto.indexOf('Fora FC'));
  });
});

describe('PageStats — estatística do recorte carregado', () => {
  it('só conta partidas com placar e declara o recorte', () => {
    const v = computePageStats([COM_PLACAR, GOLEADA, SEM_PLACAR]);
    expect(v.matches).toBe(2);
    expect(v.goals).toBe(1 + 1 + 5 + 0);
    expect(v.average).toBe(3.5);
    expect(v.biggest?.margin).toBe(5);
  });

  it('sem nenhuma partida com placar, a caixa não é renderizada', () => {
    const { container } = render(<PageStats rows={[SEM_PLACAR]} s={s} />);
    expect(container.querySelector('[data-testid="conceito-partidas-stats"]')).toBeNull();
  });

  it('mostra os números e a nota do recorte', () => {
    render(<PageStats rows={[COM_PLACAR, GOLEADA]} s={s} />);
    const caixa = screen.getByTestId('conceito-partidas-stats');
    expect(caixa.textContent).toContain('Partidas com placar');
    expect(caixa.textContent).toContain('Gols');
    expect(caixa.textContent).toContain('apenas com as partidas com placar desta página');
  });
});
