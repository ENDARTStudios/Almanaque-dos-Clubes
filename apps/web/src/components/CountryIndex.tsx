'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useGsapStagger } from '@/hooks/useGsap';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * ÍNDICE DE PAÍSES — o agrupamento de `/clubs` e `/players`.
 *
 * O que o Operador pediu: "na sessão Clubes, os clubes devem estar separados por país"; "na
 * sessão Jogadores, devem estar separados por país".
 *
 * Por que um ÍNDICE e não listas por país na mesma página: o acervo tem 12.003 clubes e 105.211
 * jogadores. Renderizar tudo agrupado seriam dezenas de milhares de nós — a página não abre. O
 * índice mostra os países com a contagem REAL, e o clique filtra pela API (que já aceita
 * `?country=`), devolvendo uma lista paginada. A separação por país acontece na navegação, que
 * é o que ela precisa ser num acervo deste tamanho.
 *
 * Três decisões que vieram de medição, não de gosto:
 *
 * 1. **A contagem vem de um endpoint próprio (`/clubs/countries`, `/players/countries`), contado
 *    pela MESMA coluna que o filtro usa.** No caso dos clubes isso foi obrigatório: o
 *    `/clubs/geo-stats` agrupa pela FK `countryId` (3.829 clubes, 32%) enquanto o filtro usa a
 *    coluna `country` (11.290, 94%). Usar o `geo-stats` daria "Brasil: 605" e o clique devolveria
 *    817. **Índice que mente sobre o próprio acervo é pior que índice nenhum.**
 *
 * 2. **A contagem aparece ROTULADA.** "817 clubes", nunca "817" solto — a mesma regra do
 *    conceito para todo número da plataforma.
 *
 * 3. **Ordenado por tamanho, não alfabético.** Com 220 países, ordem alfabética enterra os que
 *    têm acervo. Quem tem mais vem primeiro.
 */

interface PaisEntry {
  code: string;
  name: string | null;
  clubs?: number;
  players?: number;
  competitions?: number;
}

interface Indice {
  generatedAt: string;
  source: string;
  totals: { countries: number } & Record<string, number>;
  countries: PaisEntry[];
}

/** Quantos países mostrar antes de "ver todos" — a lista inteira são 220. */
const INICIAL = 24;

export default function CountryIndex({
  /** Rota base: `/clubs`, `/players` ou `/competitions`. */
  basePath,
  /** Endpoint do índice. */
  endpoint,
  /**
   * Qual contagem rotular. Tem de casar com a chave que o endpoint devolve: `/clubs/countries`
   * usa `clubs`, `/players/countries` usa `players` e `/competitions/countries` usa
   * `competitions`. O tipo é fechado de propósito — um nome errado aqui daria `0` em todo cartão,
   * e o usuário leria como acervo vazio.
   */
  campo,
  /** Rótulo do número, já no idioma. Ex.: "clubes". */
  rotulo,
  /** País selecionado hoje (`?country=`), se houver. */
  selecionado,
}: {
  basePath: string;
  endpoint: string;
  campo: 'clubs' | 'players' | 'competitions';
  rotulo: string;
  selecionado?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const { t } = useI18n();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [estado, setEstado] = useState<'loading' | 'done' | 'error'>('loading');
  const [todos, setTodos] = useState(false);
  const [busca, setBusca] = useState('');
  useGsapStagger(listRef, 'li');

  useEffect(() => {
    let vivo = true;
    api
      .get<{ data: Indice }>(endpoint)
      .then((r) => {
        if (!vivo) return;
        setIndice(r.data);
        setEstado('done');
      })
      .catch(() => {
        if (vivo) setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [endpoint]);

  const paises = indice?.countries ?? [];

  /** Filtro local por nome/código. Com 220 países, rolar não é navegação. */
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return paises;
    return paises.filter(
      (p) => p.code.toLowerCase().includes(termo) || (p.name ?? '').toLowerCase().includes(termo),
    );
  }, [paises, busca]);

  const visiveis = todos || busca.trim() ? filtrados : filtrados.slice(0, INICIAL);

  if (estado === 'error') {
    // Falha declarada, não silenciada: a lista continua utilizável abaixo do índice.
    return (
      <p className="mb-8 text-sm text-ink-2" data-testid="country-index-error">
        {t('pages.byCountry.error')}
      </p>
    );
  }

  if (estado === 'loading') {
    return (
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    );
  }

  const totalPaises = indice?.totals?.countries ?? paises.length;

  return (
    <section className="mb-8" aria-label={rotulo}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="font-heading text-lg font-bold" data-testid="country-index-title">
          {/* Contagem ROTULADA: "24 países", nunca "24" solto — a regra do conceito. */}
          {t('pages.byCountry.title')} · {totalPaises.toLocaleString('pt-BR')}
        </h2>
        {/* Busca local: com 220 países a lista é longa demais para rolar. */}
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('pages.byCountry.filterPlaceholder')}
          aria-label={t('pages.byCountry.filterLabel')}
          data-testid="country-index-filter"
          className="min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-ink-2 placeholder:opacity-100"
        />
        {selecionado ? (
          <Link
            href={basePath}
            className="text-sm text-primary-ink underline decoration-dotted underline-offset-2"
            data-testid="country-index-clear"
          >
            {/* Voltar à lista completa é uma ação explícita, não um estado escondido. */}
            {t('pages.byCountry.clear')}
          </Link>
        ) : null}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-ink-2" data-testid="country-index-empty">
          {t('pages.byCountry.empty')}
        </p>
      ) : (
        <ul ref={listRef} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visiveis.map((p) => {
            const ativo = selecionado?.toUpperCase() === p.code;
            const n = p[campo] ?? 0;
            return (
              <li key={p.code}>
                <Link
                  href={`${basePath}?country=${encodeURIComponent(p.code)}`}
                  aria-current={ativo ? 'true' : undefined}
                  data-testid={`country-${p.code}`}
                  className={`flex min-h-16 items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors duration-200 ${
                    ativo
                      ? 'border-primary bg-surface-2'
                      : 'border-border bg-surface hover:border-primary'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {/* Nome legível quando existe; o código é o rótulo quando não. Esconder
                          o país porque a tabela `Country` não tem a linha seria perder acervo. */}
                      {p.name ?? p.code}
                    </span>
                    <span className="num block text-[0.6875rem] uppercase tracking-wider text-ink-3">
                      {p.code}
                    </span>
                  </span>
                  <span className="num shrink-0 text-right text-lg text-foreground">
                    {n.toLocaleString('pt-BR')}
                    <span className="mt-0.5 block text-[0.625rem] font-normal normal-case tracking-normal text-ink-3">
                      {rotulo}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!todos && !busca.trim() && filtrados.length > INICIAL ? (
        <button
          type="button"
          onClick={() => setTodos(true)}
          className="mt-3 min-h-9 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary"
          data-testid="country-index-show-all"
        >
          {t('pages.byCountry.showAll').replace('{n}', String(filtrados.length))}
        </button>
      ) : null}
    </section>
  );
}
