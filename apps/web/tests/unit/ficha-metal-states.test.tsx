// @vitest-environment jsdom
/**
 * Metal e States — a forma do pódio e os três estados que faltavam.
 *
 * ── POR QUE ESTES DOIS JUNTOS ───────────────────────────────────────────────────────────────
 * São os componentes cujo comportamento errado PARECE funcionar:
 *
 *   Metal ..... a cor do objeto e a do texto são diferentes de propósito (o ouro vivo reprova em
 *               AA como texto e passa como preenchimento). Se alguém "consertar" isso usando o
 *               metal vivo no texto, a tela fica mais bonita e menos legível — e nenhum portão
 *               pega, porque o portão mede contraste de CLASSES DE TEXTO do Tailwind, não de
 *               um `fill` dentro de SVG.
 *
 *   States .... um vazio sem `role="status"` não anuncia nada ao leitor de tela, e ninguém vê
 *               isso testando na mão. Um erro sem `role="alert"` idem. E o esqueleto de
 *               carregamento, se não for `aria-hidden`, faz o leitor de tela ler barras cinzas
 *               como se fossem conteúdo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { Medal, Trophy, METAL_INK_CLASS } from '@/components/ficha/Metal';
import { EmptyState, ErrorState, SkeletonFicha } from '@/components/ficha/States';

afterEach(cleanup);

describe('Medal', () => {
  it('a FORMA distingue a colocação: ouro tem anel, prata é vazada, bronze é menor', () => {
    const ouro = render(<Medal metal="ouro" place={1} />);
    const cOuro = ouro.container.querySelectorAll('circle');
    expect(cOuro).toHaveLength(2); // anel externo + disco
    ouro.unmount();

    const prata = render(<Medal metal="prata" place={2} />);
    const cPrata = prata.container.querySelectorAll('circle');
    expect(cPrata).toHaveLength(1);
    expect(cPrata[0].getAttribute('fill')).toBe('none'); // vazada
    prata.unmount();

    const bronze = render(<Medal metal="bronze" place={3} />);
    const cBronze = bronze.container.querySelectorAll('circle');
    expect(cBronze).toHaveLength(1);
    expect(cBronze[0].getAttribute('fill')).not.toBe('none');
  });

  it('usa o metal vivo como PREENCHIMENTO e o escuro como TRAÇO', () => {
    const { container } = render(<Medal metal="ouro" place={1} />);
    const circulos = Array.from(container.querySelectorAll('circle'));

    // o disco é preenchido com o metal vivo (--color-metal-ouro), não com o ink
    const disco = circulos.find((c) => c.getAttribute('fill') !== 'none')!;
    expect(disco.getAttribute('fill')).toContain('metal-ouro');

    // o traço é o ink, que é o que passa AA em texto
    expect(disco.getAttribute('stroke')).toContain('metal-ouro-ink');
  });

  it('é decorativo: aria-hidden, sem role="img"', () => {
    const { container } = render(<Medal metal="ouro" place={1} />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('expõe as classes de texto AA por metal', () => {
    expect(METAL_INK_CLASS.ouro).toContain('metal-ouro-ink');
    expect(METAL_INK_CLASS.prata).toContain('metal-prata-ink');
    expect(METAL_INK_CLASS.bronze).toContain('metal-bronze-ink');
  });
});

describe('Trophy', () => {
  it('é sempre ouro e decorativo', () => {
    const { container } = render(<Trophy size={40} />);
    const svg = container.querySelector('svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.innerHTML).toContain('metal-ouro');
  });

  it('escala com o tamanho pedido', () => {
    const { container } = render(<Trophy size={52} />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('52');
  });
});

describe('EmptyState', () => {
  it('anuncia como status — um vazio silencioso não existe para o leitor de tela', () => {
    render(<EmptyState title="Nada aqui" body="A lacuna é declarada." />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('diz POR QUE está vazio, não só que está vazio', () => {
    render(
      <EmptyState
        title="Nada aqui ainda"
        body="O acervo não tem dado para este recorte. Não preenchemos com exemplo."
      />,
    );
    expect(screen.getByText('Nada aqui ainda')).toBeTruthy();
    expect(screen.getByText(/Não preenchemos com exemplo/)).toBeTruthy();
  });

  it('aceita uma ação de saída', () => {
    render(<EmptyState title="t" body="b" action={<button>Limpar filtros</button>} />);
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('anuncia como alert — erro exige decisão do usuário', () => {
    render(<ErrorState title="Falhou" body="A origem não respondeu." retryLabel="Tentar" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('o retry é um link, não um botão morto — Server Component não tem onClick', () => {
    render(
      <ErrorState title="Falhou" body="b" retryLabel="Tentar de novo" retryHref="/competitions" />,
    );
    const link = screen.getByRole('link', { name: 'Tentar de novo' });
    expect(link.getAttribute('href')).toBe('/competitions');
  });

  it('sem retryHref não renderiza botão que não faz nada', () => {
    render(<ErrorState title="Falhou" body="b" retryLabel="Tentar" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('SkeletonFicha', () => {
  it('as barras são decorativas e o rótulo é o único texto lido', () => {
    const { container } = render(<SkeletonFicha rows={3} label="Carregando competições" />);

    // o anúncio existe
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Carregando competições')).toBeTruthy();

    // as barras estão escondidas do leitor de tela
    const barras = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(barras.length).toBe(3);
  });
});
