'use client';

/**
 * Fronteira de erro da ficha da competição.
 *
 * Mesma razão da fronteira do índice: sem ela o Next mostra o boundary padrão em inglês. Aqui o
 * risco é maior porque esta página consulta a API em várias abas — uma falha parcial derrubaria a
 * ficha inteira sem explicar nada.
 */
import { useEffect } from 'react';
import { ErrorState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';

export default function CompetitionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[competitions/id] falha de renderização', error);
  }, [error]);

  const t = fichaStrings['pt-br'].states;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ErrorState
        title={t.crashTitle}
        body={t.crashBody}
        retryLabel={t.retry}
        retryAction={
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary/60"
          >
            {t.retry}
          </button>
        }
      />
      {error.digest ? <p className="mt-4 text-xs text-ink-3">digest: {error.digest}</p> : null}
    </div>
  );
}
