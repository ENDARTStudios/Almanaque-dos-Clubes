'use client';

/**
 * Fronteira de erro de a tabela de rankings.
 *
 * Sem ela o Next mostra o boundary padrão EM INGLÊS ("This page couldn't load"). Num site em
 * três idiomas isso é pior que o erro: é o erro na língua errada, sem dizer o que aconteceu.
 *
 * O retry é `reset()`, não um link: numa fronteira de erro a ação certa é tentar renderizar de
 * novo mantendo o estado em memória, não recarregar a rota.
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
    console.error('[rankings] falha de renderização', error);
  }, [error]);

  // o boundary roda fora do provider de locale; pt-br é o fallback já usado em admin/error.tsx
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
