// @vitest-environment jsdom
/**
 * Componentes da faixa de destaques e do pódio de /competitions no conceito FICHA.
 *
 * O que estes testes protegem (e por que não são cosméticos):
 *  · a faixa mostra o número de edições QUE O ACERVO TEM, com a declaração "no acervo" — o
 *    desenho usava "23 edições" históricas, que o banco não sustenta;
 *  · o troféu usa a cor do alcance (mundial/continental/nacional), e o rótulo em texto vem
 *    junto — cor nunca é o único portador da informação;
 *  · o pódio NÃO inventa o 3º lugar quando a fonte devolve `null`: o cartão vira lacuna
 *    declarada. Um nome inventado para "ficar igual ao desenho" é o defeito, não a correção.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CompetitionHighlights, {
  type HighlightItem,
} from '@/components/conceito/competicoes/Highlights';
import ConceptPodium from '@/components/conceito/competicoes/Podium';
import { wsConceitoCompeticoes } from '@/i18n/wsConceitoCompeticoes';

const s = wsConceitoCompeticoes['pt-br'];
afterEach(cleanup);

const ITENS: HighlightItem[] = [
  { id: 'a', name: 'FIFA World Cup', tier: 'mundial', inceptionYear: 1930, editions: 5 },
  { id: 'b', name: 'UEFA Champions League', tier: 'continental', inceptionYear: 1955, editions: 3 },
  { id: 'c', name: 'Copa Libertadores', tier: 'continental', inceptionYear: 1960, editions: null },
  { id: 'd', name: 'Copa do Brasil', tier: 'nacional', inceptionYear: null, editions: null },
];

describe('CompetitionHighlights — a faixa de alvos do conceito', () => {
  it('renderiza um alvo por competição, com link para a ficha', () => {
    render(<CompetitionHighlights items={ITENS} s={s} />);
    expect(screen.getByTestId('concept-highlights').querySelectorAll('li')).toHaveLength(4);
    expect(screen.getByTestId('concept-highlight-a').getAttribute('href')).toBe('/competitions/a');
  });

  it('mostra o número de edições NO ACERVO, e não o histórico ilustrativo', () => {
    render(<CompetitionHighlights items={ITENS} s={s} />);
    const cartao = screen.getByTestId('concept-highlight-a');
    expect(cartao.textContent).toContain('1930');
    expect(cartao.textContent).toContain('5 edições no acervo');
    // sem dado, não inventa: o cartão 'd' não tem linha de ano/edições
    expect(screen.getByTestId('concept-highlight-d').textContent).not.toContain(
      'edições no acervo',
    );
  });

  it('o troféu carrega a cor do alcance, e o alcance também está em texto', () => {
    const { container } = render(<CompetitionHighlights items={ITENS} s={s} />);
    expect(container.innerHTML).toContain('var(--color-tier-mundial)');
    expect(container.innerHTML).toContain('var(--color-tier-nacional)');
    expect(screen.getByTestId('concept-highlight-a').textContent).toContain('Mundial');
    expect(screen.getByTestId('concept-highlight-d').textContent).toContain('Nacional');
  });
});

describe('ConceptPodium — campeão, vice e o 3º lugar honesto', () => {
  it('renderiza os três lugares; o que falta vira lacuna declarada', () => {
    render(
      <ConceptPodium
        editionLabel="Copa do Mundo · 2022"
        champion={{ name: 'Seleção Argentina de Futebol' }}
        runnerUp={{ name: 'Seleção Francesa de Futebol' }}
        third={null}
        s={s}
      />,
    );
    expect(screen.getByTestId('concept-podium').textContent).toContain('Seleção Argentina');
    expect(screen.getByTestId('concept-podium').textContent).toContain('Seleção Francesa');
    expect(screen.getByTestId('concept-podium-third').textContent).toContain('não está registrado');
  });

  it('sem campeão, a seção não existe (não renderiza cartões vazios)', () => {
    const { container } = render(
      <ConceptPodium editionLabel={null} champion={null} runnerUp={null} third={null} s={s} />,
    );
    expect(container.querySelector('[data-testid="concept-podium"]')).toBeNull();
  });
});
