/**
 * Cabeçalho de página do ADMIN — a mesma espinha, régua menor.
 *
 * ── POR QUE NÃO `FichaHead` ─────────────────────────────────────────────────────────────────
 * O conceito registra a decisão com estas palavras: *"Admin não é vitrine: mesmos tokens, régua
 * tipográfica menor, densidade maior"*. O `FichaHead` renderiza `text-4xl sm:text-5xl
 * lg:text-6xl` — o cabeçalho de uma página pública, dimensionado para quem chega de fora. Aplicá-lo
 * aqui deixaria o painel com título de landing page e empurraria os indicadores para baixo da
 * dobra numa tela de trabalho.
 *
 * Este componente usa `text-2xl sm:text-3xl`: um degrau abaixo do que o admin tinha antes
 * (`text-3xl sm:text-4xl`) e dois abaixo do público. A hierarquia interna do painel é feita pelos
 * KPIs e pelas tabelas, não pelo título — no admin o título é etiqueta, não manchete.
 *
 * ── O QUE ELE MANTÉM DO SISTEMA ────────────────────────────────────────────────────────────
 *   · zero eyebrow — nada acima do título (a regra vale aqui também);
 *   · `font-heading` (Barlow Condensed), que é o eixo tipográfico do produto;
 *   · `measure-readable` no subtítulo, para a linha não correr até a borda;
 *   · `tracking-[-0.01em]`, mais discreto que o `-0.02em` do título público — condensada em
 *     corpo pequeno pede menos aperto.
 *
 * ── ACESSIBILIDADE ────────────────────────────────────────────────────────────────────────
 * Um `<h1>` por página, sem pular nível. O admin tem três níveis (página → seção → item) e a
 * etiqueta de seção vem de `SectionHeading`, que aceita `as="h3"` quando já há uma seção titulada.
 */
import type { ReactNode } from 'react';

export interface AdminHeadingProps {
  /** Título da página. Sem caixa alta. */
  title: string;
  /** Linha curta de contexto. Opcional: no admin, o dado fala primeiro. */
  subtitle?: ReactNode;
  /** Contagem, estado ou filtro à direita. Ex.: "7 pendentes". */
  aside?: ReactNode;
}

export default function AdminHeading({ title, subtitle, aside }: AdminHeadingProps) {
  return (
    <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.01em] text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="measure-readable mt-1.5 text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {aside ? <div className="shrink-0 text-xs text-ink-3">{aside}</div> : null}
    </header>
  );
}
