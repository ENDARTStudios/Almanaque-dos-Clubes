import Link from 'next/link';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { fichaStrings } from '@/i18n/wsFicha';
import { ErrorState } from './States';

/**
 * FALHA DE ORIGEM NUMA FICHA — o estado que NÃO é 404.
 *
 * ── O DEFEITO QUE ESTE COMPONENTE CORRIGE ──────────────────────────────────────────────────
 * As seis fichas de detalhe (`/competitions/[id]`, `/clubs/[id]`, `/players/[id]`,
 * `/estadios/[id]`, `/temporadas/[id]`, `/rankings/[id]`) tratavam assim o resultado da consulta:
 *
 *     catch { return null; }            // falha de rede
 *     if (r.status === 404) return null; // registro inexistente
 *     ...
 *     if (dado === null) notFound();
 *
 * Os dois casos viravam o MESMO `null`, e a página respondia "Página não encontrada — o conteúdo
 * que você procura não existe ou foi movido". Com a API fora do ar isso é uma AFIRMAÇÃO FALSA: a
 * página não tem como saber se o registro existe — ela só sabe que não conseguiu perguntar.
 *
 * É a mesma classe do resto desta rodada (falha de rede apresentada como acervo vazio), com um
 * agravante: aqui a tela acusa o DADO de inexistente. Um 404 é cacheável por buscadores e por
 * proxies; um 404 falso é pior que um erro honesto.
 *
 * ── COMO OS DOIS CASOS PASSAM A SER DIFERENTES ────────────────────────────────────────────
 * O carregador devolve três resultados distintos:
 *
 *     valor          → existe, renderiza a ficha
 *     null           → perguntamos e a origem disse 404 → `notFound()`
 *     undefined      → NÃO conseguimos perguntar → este componente
 *
 * O retry aponta para a MESMA rota: tentar de novo é refazer a pergunta, não voltar ao índice.
 */
export interface DetailUnavailableProps {
  /** Rota a repetir no retry — normalmente a própria ficha. */
  retryHref: string;
  /** Índice de onde se veio, para não prender o visitante na tela de erro. */
  backHref?: string;
  /** Rótulo do link de volta, já no idioma. */
  backLabel?: string;
}

export default async function DetailUnavailable({
  retryHref,
  backHref,
  backLabel,
}: DetailUnavailableProps) {
  // Server Component: o locale vem do mesmo cookie das páginas.
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = fichaStrings[locale].states;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ErrorState
        title={t.errorTitle}
        body={t.errorBody}
        retryLabel={t.retry}
        retryHref={retryHref}
      />
      {backHref && backLabel ? (
        <p className="mt-6">
          <Link
            href={backHref}
            className="text-sm text-primary-ink underline decoration-dotted underline-offset-2"
          >
            &larr; {backLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
