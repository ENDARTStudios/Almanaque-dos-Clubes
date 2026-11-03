/**
 * FICHA — os três estados que nenhuma das 22 telas do conceito tinha.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────────────────────
 * A varredura do conceito achou a maior lacuna estrutural do sistema: **vazio, erro e carregando
 * não existiam em tela nenhuma**. Num acervo com 23% de cobertura de estado, "vazio" é o estado
 * mais frequente — e sem desenho ele vira um retângulo em branco que parece defeito.
 *
 * ── A REGRA QUE GOVERNA OS TRÊS ─────────────────────────────────────────────────────────────
 * "Empty-honesto": dado ausente vira lacuna DECLARADA, nunca número ou nome inventado. Por isso
 * o vazio deste sistema não diz "nenhum resultado" — ele diz POR QUE está vazio e o que isso
 * significa sobre o acervo. É a diferença entre uma lista vazia e uma lista honesta.
 *
 * ── ACESSIBILIDADE ──────────────────────────────────────────────────────────────────────────
 *  · `role="status"` no vazio e no carregando: o leitor de tela anuncia quando o conteúdo muda.
 *  · `role="alert"` no erro: interrompe, porque erro exige decisão do usuário.
 *  · O esqueleto de carregamento tem `aria-hidden` e um texto `sr-only` — barras cinzas não são
 *    conteúdo, e um leitor de tela não deve lê-las.
 */

export interface EmptyStateProps {
  /** Título curto. Diz o que está vazio, não "ops". */
  title: string;
  /** Por que está vazio e o que isso significa sobre o acervo. */
  body: string;
  /** Ação opcional (limpar filtro, trocar de recorte). */
  action?: React.ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-border bg-muted px-5 py-8 text-center"
    >
      <p className="font-heading text-lg font-semibold text-foreground">{title}</p>
      <p className="measure-readable mx-auto mt-2 text-sm text-ink-2">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  body: string;
  /** Rótulo do botão de tentar de novo, já traduzido. */
  retryLabel: string;
  /** Server Component não tem onClick: o retry é um link para a mesma rota. */
  retryHref?: string;
  /**
   * Ação de retry para CLIENT Components (error boundary). Numa fronteira de erro a ação certa é
   * `reset()`, que tenta renderizar de novo — não recarregar a rota. Passar o link ali perderia o
   * estado que ainda está em memória.
   */
  retryAction?: React.ReactNode;
}

export function ErrorState({ title, body, retryLabel, retryHref, retryAction }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-danger-surface px-5 py-6">
      <p className="font-heading text-lg font-semibold text-danger-ink">{title}</p>
      <p className="measure-readable mt-2 text-sm text-ink-2">{body}</p>
      {retryAction ? <div className="mt-4">{retryAction}</div> : null}
      {retryHref ? (
        <a
          href={retryHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary/60"
        >
          {retryLabel}
        </a>
      ) : null}
    </div>
  );
}

export interface SkeletonFichaProps {
  /** Quantas linhas desenhar. O padrão é 6 — o tamanho de uma tabela curta. */
  rows?: number;
  /** Texto para leitor de tela. Diz o que está sendo carregado. */
  label: string;
}

export function SkeletonFicha({ rows = 6, label }: SkeletonFichaProps) {
  return (
    <div>
      <span className="sr-only" role="status">
        {label}
      </span>
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded bg-surface-2"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
