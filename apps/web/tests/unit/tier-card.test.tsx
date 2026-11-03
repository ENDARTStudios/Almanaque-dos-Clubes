// @vitest-environment jsdom
/**
 * TierCard — a hierarquia de alcance vive na FORMA.
 *
 * ── O QUE ESTE TESTE PROTEGE ────────────────────────────────────────────────────────────────
 * A skill do Taste bane "rows of identical cards": todo card igual significa que nenhum é
 * destaque. A resposta do sistema é o degrau se ler pelo TAMANHO DO ALVO e pela BORDA, não pela
 * matiz — porque matiz não sobrevive a uma impressão em preto e branco nem a daltonismo.
 *
 * O risco concreto: as bordas e as taças são classes e tamanhos num mapa `ESTILO`. Se alguém
 * trocar `border-2` por `border` no mundial, ou apagar a taça do continental num refactor de
 * classe, a hierarquia some e nada avisa — não há portão que meça "este card parece mais
 * importante que aquele".
 *
 * Então o teste fixa a regra: mundial tem borda de 2px E taça; nacional não tem taça nenhuma.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import TierCard from '@/components/ficha/TierCard';

afterEach(cleanup);

const base = { name: 'Copa Libertadores', meta: 'BR', tierLabel: 'Continental' };

describe('TierCard', () => {
  it('mundial tem borda de 2px e taça — o degrau mais alto se lê pelo alvo', () => {
    const { container } = render(<TierCard tier="mundial" {...base} />);
    const card = container.firstElementChild!;

    expect(card.className).toContain('border-2');
    // a taça é um svg dentro do card
    expect(card.querySelector('svg')).toBeTruthy();
  });

  it('continental tem fio de 1px e taça menor', () => {
    const { container } = render(<TierCard tier="continentalTop" {...base} />);
    const card = container.firstElementChild!;

    expect(card.className).not.toContain('border-2');
    const svg = card.querySelector('svg');
    expect(svg).toBeTruthy();
    // a taça do continental é menor que a do mundial (52 no mundial)
    expect(Number(svg!.getAttribute('width'))).toBeLessThan(52);
  });

  it('nacional não tem taça — a diferenciação é a ausência da forma', () => {
    const { container } = render(<TierCard tier="nacional" {...base} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('com href vira link; sem href NÃO finge ser clicável', () => {
    const comLink = render(<TierCard tier="mundial" {...base} href="/competitions/x" />);
    expect(screen.getByRole('link')).toBeTruthy();
    comLink.unmount();

    render(<TierCard tier="mundial" {...base} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('mostra nome, apoio e o rótulo do alcance', () => {
    render(<TierCard tier="mundial" {...base} />);
    expect(screen.getByText('Copa Libertadores')).toBeTruthy();
    expect(screen.getByText('BR')).toBeTruthy();
    expect(screen.getByText('Continental')).toBeTruthy();
  });
});
