import type { ReactNode } from 'react';

/**
 * AuthShell — a casca das telas de entrada, como componente do SISTEMA.
 *
 * ── POR QUE ESTE COMPONENTE EXISTE, E NÃO SÓ CLASSE CSS ───────────────────────────────────
 * As quatro telas de auth usavam `auth-card__*` — um card desenhado em CSS próprio. O desenho
 * estava certo desde o redesenho, mas morava fora do sistema: nenhuma dessas rotas importava
 * `@/components/ficha/`, então o medidor (`ficha:status`) as contava como "fora", e com razão —
 * o card era uma ilha. Ilha que ninguém reusa e ninguém testa é dívida, mesmo quando é bonita.
 *
 * Aqui a casca passa a ser um componente com contrato: título, subtítulo, corpo e rodapé. As
 * quatro telas consomem a MESMA peça, o teste é único e a mudança de desenho acontece em um
 * lugar.
 *
 * ── POR QUE COLUNA ÚNICA ──────────────────────────────────────────────────────────────────
 * A versão anterior era um card de duas metades (herói + formulário) com troca animada por
 * `<input type=checkbox>` + seletor `~`. O screenshot da tela em execução mostrou três
 * problemas, nenhum de gosto:
 *
 *   1. VAZIO — a altura era dimensionada pelo CADASTRO; no login sobravam ~240px de retângulo
 *      vazio abaixo do botão;
 *   2. VERSALETE — o CTA era `text-transform: uppercase`: "ENTRAR";
 *   3. LANDING — metade da tela vendia ao lado de um formulário. Entrar é TAREFA: quem chega ali
 *      já decidiu.
 *
 * ── A RÉGUA ───────────────────────────────────────────────────────────────────────────────
 * `text-3xl` (1.875rem) em `font-heading`, alinhado à esquerda, caixa baixa. NÃO usa `FichaHead`
 * porque `FichaHead` é cabeçalho de PÁGINA (`lg:text-6xl`) e aqui o título é de CARD — a mesma
 * distinção que separa `AdminHeading` de `FichaHead`.
 *
 * ── ACESSIBILIDADE ────────────────────────────────────────────────────────────────────────
 * Um `<h1>` por página, por construção: cada tela renderiza UM shell. Sem eyebrow acima do
 * título, sem caixa alta, subtítulo em `text-ink-2` (6,97:1 sobre o papel) e não em
 * `foreground/70` (4,13:1, reprova em AA).
 */
export interface AuthShellProps {
  /** Título da tela. Sem caixa alta. */
  title: string;
  /** Linha curta de contexto abaixo do título. */
  subtitle?: string;
  /** O formulário. */
  children: ReactNode;
  /**
   * Rodapé separado por divisória — o link para a outra tela de auth, ou "voltar ao login".
   * Fica fora do cartão de conteúdo para não competir com o botão de envio.
   */
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      data-testid="auth-shell"
      className="w-full max-w-[26rem] rounded-2xl border border-border bg-surface p-7 sm:p-8"
    >
      <h1 className="font-heading text-3xl leading-[1.1] font-bold tracking-[-0.01em] text-foreground">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 mb-7 text-sm leading-relaxed text-ink-2">{subtitle}</p> : null}

      {children}

      {footer ? (
        <div className="mt-6 border-t border-border pt-4 text-center text-[0.8125rem] text-ink-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
