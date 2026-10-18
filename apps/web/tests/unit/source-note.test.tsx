// @vitest-environment jsdom
/**
 * SourceNote — o contrato de HIERARQUIA da proveniência.
 *
 * ── A REGRA QUE ESTE TESTE PROTEGE (do Operador, 2026-10) ─────────────────────────────────
 * "Na maioria das informações do site se destaca a fonte de verificação, ela é importante, mas é
 * secundária. O usuário não quer ver fonte de dados, ele quer ver os dados."
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * O defeito estava espalhado por 22 arquivos, cada um com seu tamanho e sua cor: 11px num, 12px em
 * outro, `uppercase` num terceiro, `font-semibold` num quarto, `border-l-2` na cor da marca num
 * quinto. A inversão de hierarquia não foi uma decisão — foi acúmulo. Um componente único resolve
 * o acúmulo; este teste impede que o componente único ganhe, aos poucos, o destaque que ele existe
 * para negar.
 *
 * As asserções são sobre CLASSES, e isso é deliberado: o alvo é o TETO de peso visual. Uma futura
 * refatoração de layout pode mudar margem ou ordem sem quebrar nada aqui. Mas `uppercase`,
 * `font-semibold` e borda de acento são exatamente o que faz um metadado parecer manchete.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SourceNote from '@/components/SourceNote';

afterEach(cleanup);

/** Classes que dariam ao metadado o volume que pertence ao dado. */
const PROIBIDAS = [
  { classe: 'uppercase', por: 'caixa alta grita' },
  { classe: 'font-semibold', por: 'peso de título num metadado' },
  { classe: 'font-bold', por: 'peso de título num metadado' },
  { classe: 'border-l', por: 'barra de acento transforma detalhe em citação' },
  { classe: 'bg-', por: 'fundo próprio cria um bloco que disputa com o dado' },
];

describe('SourceNote — a fonte não compete com o dado', () => {
  it('(a) NENHUMA classe de destaque — nem caixa alta, nem peso, nem borda, nem fundo', () => {
    render(<SourceNote href="https://wikidata.org" label="Wikidata" detail="CC0" />);
    const el = screen.getByText(/Wikidata/).closest('p');
    expect(el).not.toBeNull();
    const classes = el!.className;
    for (const p of PROIBIDAS) {
      expect(classes, `${p.classe}: ${p.por}`).not.toContain(p.classe);
    }
  });

  it('(b) usa o peso único do design system: 11px e `text-ink-3`', () => {
    render(<SourceNote href="https://wikidata.org" label="Wikidata" />);
    const el = screen.getByText(/Wikidata/).closest('p');
    expect(el!.className).toContain('text-[0.6875rem]');
    expect(el!.className).toContain('text-ink-3');
  });

  it('(c) a fonte continua VERIFICÁVEL — link real, não tooltip nem texto morto', () => {
    render(<SourceNote href="https://example.org/fonte" label="RSSSF" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.org/fonte');
    expect(link.getAttribute('target')).toBe('_blank');
    // `noopener noreferrer`: o link abre em outra aba e não entrega `window.opener`.
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('(d) NÃO duplica o rótulo: "Fonte" não vira "Fonte: Fonte"', () => {
    /* O DEFEITO REAL que esta asserção trava: o componente trazia um `sr-only "Fonte: "` fixo, e
       neste projeto o rótulo visível do link JÁ é a palavra "Fonte" (padrão de copy da casa). Quatro
       dos cinco usos renderizavam "Fonte: Fonte" — e o teste anterior, que só olhava classes e
       `href`, passou por cima disso. Texto renderizado é parte do contrato. */
    const { container } = render(<SourceNote href="https://x.test" label="Fonte" />);
    const texto = container.textContent ?? '';
    expect(texto).toBe('Fonte');
    expect(texto).not.toMatch(/Fonte:\s*Fonte/);
  });

  it('(e) prefixo acessível é opt-in, para quando o rótulo é NOME PRÓPRIO', () => {
    /* "Wikidata" sozinho não diz que é a origem do dado — aí o prefixo serve. */
    const { container } = render(
      <SourceNote href="https://wikidata.org" label="Wikidata" prefixoAcessivel="Fonte: " />,
    );
    expect(container.textContent).toContain('Fonte:');
    expect(container.textContent).toContain('Wikidata');
    // E continua sr-only: não aparece visualmente.
    expect(container.querySelector('.sr-only')?.textContent).toBe('Fonte: ');
  });

  it('(f) sem URL ainda declara a proveniência (texto vale, não some)', () => {
    render(<SourceNote label="Acervo interno" />);
    expect(screen.getByText(/Acervo interno/)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('(g) `detail` é opcional e não vira outro bloco de destaque', () => {
    render(<SourceNote href="https://x.test" label="Wikidata" detail="CC0" />);
    const texto = screen.getByText(/Wikidata/).closest('p')!.textContent ?? '';
    expect(texto).toContain('CC0');
  });
});
