'use client';

/**
 * Fronteira de erro de a ficha do estádio.
 *
 * Sem ela o Next mostra o boundary padrão EM INGLÊS. O retry é `reset()`, não um link: tenta
 * renderizar de novo mantendo o estado, em vez de recarregar a rota.
 */
import { useEffect } from 'react';
import { ErrorState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[estadios/[id]] falha de renderização', error);
  }, [error]);

  const t = fichaStrings['pt-br'].states;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ErrorState
        title={t.errorTitle}
        body={t.errorBody}
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
