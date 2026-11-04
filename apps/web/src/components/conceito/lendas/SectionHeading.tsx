import type { ReactNode } from 'react';

/**
 * Cabeçalho de seção do panteão — o "kicker" do conceito.
 *
 * O conceito desenha o nome do bloco em 12,5 px, sem caixa alta, em ocre (ou crimson em
 * Recordes). Reproduzimos a composição, mas como `h2` de verdade: o bloco tem nome
 * semântico para leitor de tela e âncora para `aria-labelledby`. O tamanho pequeno vem do
 * quadro, não de um "eyebrow" decorativo acima de outro título — aqui ele É o título da
 * seção, como o `SectionHeading` do sistema.
 */
export default function LendasSectionHeading({
  id,
  tone = 'ochre',
  children,
}: {
  id: string;
  /** O ocre é o ouro do tema escuro; o crimson marca Recordes no quadro. */
  tone?: 'ochre' | 'crimson';
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className={`text-[12.5px] leading-none font-semibold ${
        tone === 'crimson' ? 'text-primary-ink' : 'text-secondary'
      }`}
    >
      {children}
    </h2>
  );
}
