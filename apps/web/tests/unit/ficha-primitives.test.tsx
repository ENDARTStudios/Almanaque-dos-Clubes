// @vitest-environment jsdom
/**
 * Primitivas do FICHA — FichaHead, SectionHeading e Pillar.
 *
 * ── O QUE ESTES TESTES PROTEGEM ─────────────────────────────────────────────────────────────
 * Duas das três existem para PROIBIR um defeito, não para produzir algo:
 *
 *   FichaHead .... não aceita `eyebrow`. O conceito anterior abria toda página com um rótulo
 *                  pequeno em caixa alta sobre o título, que a skill bane duas vezes ("no
 *                  eyebrows", "no tiny uppercase letter-spaced labels"). Se alguém reintroduzir
 *                  um `<p>` acima do `<h1>`, este teste cai.
 *   SectionHeading é cabeçalho de seção em CAIXA BAIXA e sem tracking. Se alguém voltar a pôr
 *                  `uppercase tracking-wider`, cai.
 *
 *   Pillar ....... usa `font-heading` para o número porque ali ele é IMAGEM, não dado de tabela.
 *                  É a distinção que o sistema chama de "número grande é display, número miúdo é
 *                  texto" — e essa distinção é uma classe, fácil de perder.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import FichaHead from '@/components/ficha/FichaHead';
import SectionHeading from '@/components/ficha/SectionHeading';
import Pillar from '@/components/ficha/Pillar';

afterEach(cleanup);

describe('FichaHead', () => {
  it('abre com um h1 e nenhum rótulo acima dele', () => {
    const { container } = render(<FichaHead title="Competições" subtitle="1.932 no acervo" />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Competições');

    // Nada de eyebrow: nenhum <p> ou <span> aparece ANTES do h1 na ordem do documento.
    // `querySelector('h1, p, span, div')` não serve para provar isso — ele devolve o wrapper.
    const header = container.querySelector('header')!;
    const antesDoTitulo = Array.from(header.querySelectorAll('p, span')).filter(
      (el) =>
        // el.compareDocumentPosition(h1) com FOLLOWING significa que h1 vem depois de el
        (el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    );
    expect(antesDoTitulo).toHaveLength(0);
  });

  it('o título não está em caixa alta nem com tracking', () => {
    render(<FichaHead title="Competições" />);
    const classes = screen.getByRole('heading', { level: 1 }).className;

    expect(classes).not.toContain('uppercase');
    expect(classes).not.toContain('tracking-wid');
  });

  it('o número-âncora usa font-heading — é imagem, não dado de tabela', () => {
    render(<FichaHead title="Competições" anchor="1.932" anchorLabel="competições" />);

    const ancora = screen.getByText('1.932');
    expect(ancora.className).toContain('font-heading');
    expect(screen.getByText('competições')).toBeTruthy();
  });

  it('sem âncora não renderiza o bloco da direita', () => {
    render(<FichaHead title="Competições" />);
    expect(screen.queryByText('1.932')).toBeNull();
  });

  /**
   * O DEFEITO QUE ESTE CASO TRAVA
   * Com a API fora do ar, `/competitions` imprimia um "0" GIGANTE em vermelho como manchete da
   * página — enquanto o acervo tem 1.932 competições. O número não era zero: a consulta é que
   * não voltou. "0" como manchete não informa nada e afirma algo falso.
   * A página mostra a lacuna na área de conteúdo (ErrorState/EmptyState), que é onde ela se
   * explica; o cabeçalho não repete a ausência como se fosse dado de destaque.
   */
  it('âncora "0" NÃO vira manchete — zero não é número de destaque', () => {
    const { container } = render(
      <FichaHead title="Competições" anchor="0" anchorLabel="competições" />,
    );

    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('competições')).toBeNull();
    // só o título: nenhum bloco numérico à direita
    expect(container.querySelectorAll('header > div')).toHaveLength(1);
  });

  it('o subtítulo respeita a medida de leitura', () => {
    render(<FichaHead title="t" subtitle="Explora 1.932 competições." />);
    expect(screen.getByText('Explora 1.932 competições.').className).toContain('measure-readable');
  });
});

describe('SectionHeading', () => {
  it('é h2 por padrão e h3 quando pedido', () => {
    const a = render(<SectionHeading>Destaques</SectionHeading>);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Destaques');
    a.unmount();

    render(<SectionHeading as="h3">Mundial</SectionHeading>);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Mundial');
  });

  it('não é caixa alta nem tracking largo', () => {
    render(<SectionHeading>Destaques por alcance</SectionHeading>);
    const classes = screen.getByRole('heading', { level: 2 }).className;

    expect(classes).not.toContain('uppercase');
    expect(classes).not.toContain('tracking-');
  });

  it('aceita uma contagem à direita', () => {
    render(<SectionHeading aside="48 títulos">Honrarias</SectionHeading>);
    expect(screen.getByText('48 títulos')).toBeTruthy();
  });
});

describe('Pillar', () => {
  it('usa font-heading no número — display, não tabela', () => {
    render(<Pillar label="Títulos" value="48" note="oficiais" />);
    expect(screen.getByText('48').className).toContain('font-heading');
  });

  it('acentua UM pilar em crimson-ink, e só por opção', () => {
    const a = render(<Pillar label="Títulos" value="48" accent />);
    expect(screen.getByText('48').className).toContain('text-primary-ink');
    a.unmount();

    render(<Pillar label="Jogos" value="426" />);
    expect(screen.getByText('426').className).not.toContain('text-primary-ink');
  });

  it('mostra rótulo, valor e nota', () => {
    render(<Pillar label="Fundação" value="1895" note="há 130 anos" />);
    expect(screen.getByText('Fundação')).toBeTruthy();
    expect(screen.getByText('1895')).toBeTruthy();
    expect(screen.getByText('há 130 anos')).toBeTruthy();
  });
});
