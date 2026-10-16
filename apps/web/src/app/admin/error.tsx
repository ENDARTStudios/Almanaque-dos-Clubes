'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * T572 — FRONTEIRA DE ERRO DA ÁREA DE ADMINISTRAÇÃO.
 *
 * POR QUE ESTA PÁGINA EXISTE
 *   O Operador viu uma TELA PRETA em `/admin/observability`: "This page couldn't load / Reload to
 *   try again, or go back". Esse é o boundary PADRÃO do Next, e ele é ruim por dois motivos:
 *
 *   1. **Em inglês, num site em português.** O resto da interface é traduzido; a tela de falha não.
 *   2. **Não diz nada.** "Não foi possível carregar" não distingue "a API caiu" de "a tela tem um
 *      defeito", e não deixa rastro para quem for consertar. Foi por isso que a causa real — um
 *      `TypeError` no render dos alertas — levou tempo para ser encontrada: a tela não dizia nem
 *      que tinha sido um erro de renderização.
 *
 * O QUE ESTA VERSÃO FAZ DIFERENTE
 *   - Fala português e diz em que ÁREA o erro aconteceu.
 *   - Mostra o `digest`, que é o identificador que correlaciona com o log do servidor — sem ele, o
 *     relato de erro não é investigável.
 *   - Dá o caminho de volta (`/admin`) em vez de só "recarregar", que repete a falha quando a
 *     causa é determinística (que é o caso de um erro de render).
 *   - Manda o erro para o console do navegador de forma explícita, porque o `useEffect` do Next
 *     não garante que ele apareça.
 *
 * O que NÃO faz: engolir o erro. Ele continua subindo para o log; aqui só melhoramos a resposta ao
 * usuário.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // `digest` é o que liga esta tela ao log do servidor. Sem imprimir, o identificador morre aqui.
    console.error('[admin] erro de renderização:', error.digest ?? '(sem digest)', error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        className="rounded-2xl border border-danger-ink/40 bg-danger-surface p-6"
        role="alert"
        data-testid="admin-error"
      >
        <h1 className="font-heading text-xl font-bold text-danger-ink">
          Não foi possível abrir esta ferramenta
        </h1>
        <p className="mt-2 text-sm text-foreground">
          A área de administração encontrou um erro ao renderizar esta página. O restante do painel
          continua funcionando.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-2">
            Referência para o suporte: <span className="text-foreground">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors duration-200"
            data-testid="admin-error-retry"
          >
            Tentar de novo
          </button>
          {/* Recarregar repete a falha quando a causa é determinística — que é o caso de um erro
              de renderização. O caminho de volta é a saída confiável. */}
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary"
          >
            Voltar à administração
          </Link>
        </div>
      </div>
    </div>
  );
}
