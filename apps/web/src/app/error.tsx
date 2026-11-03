'use client';

/**
 * Fronteira de erro da RAIZ — uma para todas as rotas que não têm a sua.
 *
 * ── O QUE ISTO RESOLVE, E POR QUE UM ARQUIVO SÓ ─────────────────────────────────────────────
 * Antes existiam 10 `error.tsx` para 50 rotas. Nas outras 40, uma falha de renderização caía no
 * boundary PADRÃO do Next: uma tela que diz "This page couldn't load / Reload to try again" —
 * em INGLÊS, num site de três idiomas, e sem dizer o que aconteceu.
 *
 * Criar 40 arquivos repetidos seria a solução errada: 40 cópias da mesma tela, 40 lugares para
 * corrigir o mesmo texto. O Next já resolve isso por herança de segmento — `app/error.tsx` cobre
 * todas as rotas abaixo dele que não definirem o próprio. As que têm boundary próprio (admin,
 * competições, clubes, jogadores, lendas, mapa, partidas, rankings) continuam usando o seu, que
 * é mais específico.
 *
 * ── POR QUE AQUI O LOCALE VEM DO PROVIDER, E NÃO DE UM FALLBACK ─────────────────────────────
 * `app/error.tsx` substitui os `children` do layout, mas é renderizado DENTRO dele — então o
 * `I18nProvider` está acima e `useI18n()` funciona. Nos boundaries de rota eu usei pt-br porque
 * lá essa garantia não estava verificada; aqui está, e a tela de erro respeita o idioma do
 * usuário.
 *
 * ── POR QUE O RETRY É `reset()` ────────────────────────────────────────────────────────────
 * Numa fronteira de erro a ação certa é tentar renderizar de novo MANTENDO o estado em memória.
 * Um link recarregaria a rota e perderia o que o usuário tinha feito antes da falha.
 */
import { useEffect } from 'react';
import { useI18n } from '@/i18n/Provider';
import { ErrorState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useI18n();
  const t = fichaStrings[locale].states;

  useEffect(() => {
    // a mensagem crua só serve para quem desenvolve; o usuário recebe o digest
    console.error('[app] falha de renderização', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        title={t.errorTitle}
        body={t.errorBody}
        retryLabel={t.retry}
        retryAction={
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg border border-foreground bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-200 hover:opacity-90"
          >
            {t.retry}
          </button>
        }
      />
      {error.digest ? (
        <p className="mt-4 text-xs text-ink-3">
          {/* identificador para cruzar com o log do servidor; a mensagem interna fica fora */}
          digest: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
