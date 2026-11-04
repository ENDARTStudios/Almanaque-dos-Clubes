// @vitest-environment jsdom
/**
 * /rankings/[id] no conceito FICHA — a caixa do critério.
 *
 * O que protege: a régua aparece aberta abaixo da tabela e o link da metodologia existe.
 * Sem a caixa, a posição é uma afirmação sem lastro — o defeito que o conceito chama de
 * "ranking de opinião".
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CriteriaBox from '@/components/conceito/ranking-detalhe/CriteriaBox';
import { wsConceitoRankingDetalhe } from '@/i18n/wsConceitoRankingDetalhe';

afterEach(cleanup);
const s = wsConceitoRankingDetalhe['pt-br'];

describe('CriteriaBox', () => {
  it('mostra a régua e a metodologia', () => {
    render(<CriteriaBox s={s} />);
    const caixa = screen.getByTestId('conceito-ranking-criteria');
    expect(caixa.textContent).toContain('Como a pontuação é calculada');
    expect(caixa.textContent).toContain('vitórias');
    const link = screen.getByRole('link', { name: /metodologia/i });
    expect(link.getAttribute('href')).toBe('/metodologia#ranking-piloto-inglaterra');
  });
});
