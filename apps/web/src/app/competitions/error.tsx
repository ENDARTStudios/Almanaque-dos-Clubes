'use client';

/**
 * Fronteira de erro da área de competições.
 *
 * ── POR QUE ELA EXISTE ──────────────────────────────────────────────────────────────────────
 * Sem `error.tsx`, o Next mostra o boundary PADRÃO: uma tela em inglês dizendo "This page
 * couldn't load / Reload to try again". Num site em três idiomas isso é pior que o erro: é o
 * erro apresentado na língua errada, sem dizer o que aconteceu. A `admin/error.tsx` já corrigiu
 * isso para o admin; esta fecha a lacuna do lado público.
 *
 * ── POR QUE O RETRY É `reset()` E NÃO UM LINK ───────────────────────────────────────────────
 * O `ErrorState` em Server Component usa `retryHref` porque não tem `onClick`. Numa fronteira de
 * erro a ação certa é outra: `reset()` tenta renderizar de novo mantendo o estado que ainda está
 * em memória. Um `<a href>` recarregaria a rota inteira e perderia o que o usuário tinha feito.
 *
 * ── O QUE NÃO FAZEMOS ───────────────────────────────────────────────────────────────────────
 * Não mostramos a mensagem crua do erro. Ela é útil para quem desenvolve e ruído para quem lê —
 * e pode vazar detalhe interno. O `digest` do Next é exibido em vez disso: é o identificador que
 * liga a tela ao log, sem expor a mensagem.
 */
import { useEffect } from 'react';
import { ErrorState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';

export default function CompetitionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // o log do cliente é o único lugar onde a mensagem crua ainda serve para alguma coisa
    console.error('[competitions] falha de renderização', error);
  }, [error]);

  // O boundary roda fora do contexto de locale da página; o projeto já usa pt-br como fallback
  // nos boundaries (ver admin/error.tsx). Traduzir aqui exigiria um provider acima da fronteira,
  // que é outro trabalho — e a mensagem escolhida é curta o suficiente para não virar problema.
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
      {error.digest ? (
        <p className="mt-4 text-xs text-ink-3">
          {/* identificador para cruzar com o log — sem a mensagem interna */}
          digest: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
