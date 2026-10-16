'use client';

import { fill } from './strings';

/**
 * T-ADMIN — controle de paginação compartilhado por Usuários, Auditoria e Catálogo.
 *
 * Desde a wave 2 a paginação é do SERVIDOR: as rotas `/admin/*` aceitam
 * `limit`/`offset` e devolvem `total`, então `totalPages`/`totalItems` vêm do
 * backend (a tela não fatia mais a lista inteira no cliente).
 *
 * A página corrente é CLAMPADA em vez de corrigida por efeito: se o filtro encolher a
 * lista, `Math.min(page, totalPages)` já devolve a página válida no mesmo render. Isso
 * evita o `setState` dentro do efeito (que a regra `react-hooks/set-state-in-effect`
 * deste projeto acusa, com razão).
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  countLabel,
  pageLabel,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  testId,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  countLabel: string;
  pageLabel: string;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  testId: string;
}) {
  const label =
    typeof Intl !== 'undefined' ? new Intl.NumberFormat().format(totalItems) : String(totalItems);

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      data-testid={`${testId}-pagination`}
    >
      <p className="text-xs text-ink-2">{fill(countLabel, { n: label })}</p>
      <div className="flex items-center gap-3">
        <p className="text-xs text-ink-2" data-testid={`${testId}-page-info`}>
          {fill(pageLabel, { page, total: totalPages })}
        </p>
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="min-h-6 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer disabled:cursor-default"
        >
          {prevLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="min-h-6 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer disabled:cursor-default"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
