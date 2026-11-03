/**
 * FICHA — cabeçalho de página do sistema.
 *
 * ── O QUE ELE PROÍBE, E POR QUÊ ──────────────────────────────────────────────────────────────
 * O conceito anterior abria TODA página com um rótulo pequeno em caixa alta sobre o título (o
 * "eyebrow"). A skill `design-taste-frontend` proíbe duas coisas que ele era ao mesmo tempo:
 *
 *   "No eyebrows. No small label above a heading, no pill badge above the headline."
 *   "No tiny uppercase letter-spaced labels."
 *
 * Então este componente não aceita `eyebrow`. A informação que estava nele desce para o
 * `subtitle`, que é onde o leitor procura o contexto — e a página passa a abrir pelo TÍTULO.
 *
 * ── O NÚMERO-ÂNCORA ──────────────────────────────────────────────────────────────────────────
 * O número grande à direita é imagem, não dado de tabela: usa `font-heading` (Barlow Condensed)
 * porque em Barlow comum ele brigaria com os números das tabelas. É a distinção que o conceito
 * chama de "número grande é display, número miúdo é texto".
 */
import type { ReactNode } from 'react';

export interface FichaHeadProps {
  /** Título da página. Um h1, sem caixa alta. */
  title: string;
  /** Linha de contexto abaixo do título. Absorve o que antes era o eyebrow. */
  subtitle?: ReactNode;
  /** Número de destaque à direita. Sem ele, o cabeçalho fica só com título e subtítulo. */
  anchor?: string;
  /** Rótulo do número-âncora, em caixa baixa e sem tracking. */
  anchorLabel?: string;
  /** `dark` inverte os tokens para a faixa escura (só o panteão usa). */
  dark?: boolean;
  /** Ações à direita do título (filtros, botão). */
  actions?: ReactNode;
}

export default function FichaHead({
  title,
  subtitle,
  anchor,
  anchorLabel,
  dark = false,
  actions,
}: FichaHeadProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <h1
          className={`font-heading text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl lg:text-6xl ${
            dark ? 'text-foreground' : 'text-foreground'
          }`}
        >
          {title}
        </h1>
        {subtitle ? <p className="measure-readable mt-4 text-base text-ink-2">{subtitle}</p> : null}
        {actions ? <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>

      {anchor ? (
        <div className="shrink-0 text-right">
          {/* imagem, não dado de tabela: por isso font-heading */}
          <div className="font-heading text-5xl font-bold leading-none tracking-[-0.03em] text-primary-ink sm:text-6xl lg:text-7xl">
            {anchor}
          </div>
          {anchorLabel ? <div className="mt-1 text-xs text-ink-3">{anchorLabel}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
