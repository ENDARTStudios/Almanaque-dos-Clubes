'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useGsapStagger } from '@/hooks/useGsap';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * SEGUNDO NÍVEL DO AGRUPAMENTO DE `/clubs` — cidades DENTRO do país escolhido.
 *
 * Por que "país → cidade" e não "país → estado", que era o pedido original: o campo `state` está
 * preenchido em **1 de 100** clubes (medido), então o segundo nível por estado nasceria quase
 * todo vazio. Cidade é o que existe.
 *
 * E AQUI ESTÁ A PARTE QUE IMPORTA — a cobertura de cidade é DESIGUAL, e foi medida antes de
 * escrever isto:
 *
 *   por país (125 medidos) ....... apenas 16 têm cidade em >=60% dos clubes
 *   por acervo ................... 23% dos clubes estão em país com >=60%
 *   os 4 maiores ................. SE 26% · BR 33% · PT 35% · AU 24%
 *   os melhores .................. DE 93% · NL 76% · GR 75% · GB 67%
 *
 * Agrupar por cidade às cegas mostraria "Salvador (4)" num país de 817 clubes, e o usuário
 * concluiria que só há clubes em Salvador — quando o que falta é o DADO. Dois comportamentos,
 * escolhidos pelo número, não por gosto:
 *
 *   cobertura >= 60%  → lista as cidades (o segundo nível ajuda de verdade)
 *   cobertura <  60%  → NÃO lista; DECLARA quantos clubes não têm cidade, e mantém a lista
 *                       completa logo abaixo, sem alegar um agrupamento que o dado não sustenta
 *
 * O limiar é 60% porque abaixo disso a maioria dos clubes cai no balde "sem cidade" e a lista
 * passa a enganar mais do que informa. É uma escolha declarada, não um número medido.
 */

/** Abaixo disto, a lista de cidades engana mais do que informa. Escolha declarada. */
const COBERTURA_MINIMA = 0.6;

interface Cidade {
  name: string;
  clubs: number;
}
interface IndiceCidades {
  country: string;
  totals: { withCity: number; withoutCity: number; cities: number };
  cities: Cidade[];
}

export default function CityDrilldown({ country }: { country: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { t } = useI18n();
  const [indice, setIndice] = useState<IndiceCidades | null>(null);
  const [estado, setEstado] = useState<'loading' | 'done' | 'error'>('loading');
  const [todas, setTodas] = useState(false);
  useGsapStagger(listRef, 'li');

  useEffect(() => {
    let vivo = true;
    /* Sem `setEstado('loading')` no corpo do efeito.
     *
     * O estado inicial já é `loading`, e o pai passa `key={country}` — então trocar de país
     * REMONTA este componente em vez de reaproveitar estado antigo. Um `setState` síncrono aqui
     * dispararia render em cascata, que é o que o lint do projeto acusa (com razão); a correção
     * é a `key` no pai, não silenciar a regra. */
    api
      .get<{ data: IndiceCidades }>(`/clubs/cities?country=${encodeURIComponent(country)}`)
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
  }, [country]);

  const cidades = useMemo(() => indice?.cities ?? [], [indice]);
  const visiveis = todas ? cidades : cidades.slice(0, 12);

  const totais = indice?.totals;
  const comCidade = totais?.withCity ?? 0;
  const semCidade = totais?.withoutCity ?? 0;
  const cobertura = comCidade + semCidade > 0 ? comCidade / (comCidade + semCidade) : 0;
  const sustenta = cobertura >= COBERTURA_MINIMA;

  // Enquanto carrega, nada de esqueleto: o segundo nível é complemento, não a página.
  if (estado === 'loading') return null;

  if (estado === 'error') {
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="city-drilldown-error">
        {t('pages.byCountry.citiesLoadError')}
      </p>
    );
  }

  /* COBERTURA INSUFICIENTE: declara a lacuna e NÃO lista cidades.
     Listar aqui seria pior que não listar — o usuário leria uma lista curta como se fosse o
     acervo do país. A lista completa de clubes fica logo abaixo, sem agrupamento alegado. */
  if (!sustenta) {
    const texto =
      comCidade > 0
        ? t('pages.byCountry.citiesGapPartial')
            .replace('{com}', comCidade.toLocaleString('pt-BR'))
            .replace('{total}', (comCidade + semCidade).toLocaleString('pt-BR'))
        : t('pages.byCountry.citiesGapNone').replace('{n}', semCidade.toLocaleString('pt-BR'));
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="city-drilldown-gap">
        {texto}
      </p>
    );
  }

  return (
    <section className="mb-6" aria-label={t('pages.byCountry.citiesLabel')}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h3 className="font-heading text-base font-bold" data-testid="city-drilldown-title">
          {t('pages.byCountry.citiesTitle')} · {cidades.length.toLocaleString('pt-BR')}
        </h3>
        {semCidade > 0 ? (
          // Mesmo com cobertura boa, o que falta é dito. Nunca "0 sem cidade" escondido.
          <span className="text-xs text-ink-3" data-testid="city-drilldown-partial">
            {t('pages.byCountry.citiesPartial').replace('{n}', semCidade.toLocaleString('pt-BR'))}
          </span>
        ) : null}
      </div>

      <ul ref={listRef} className="flex flex-wrap gap-2" data-testid="city-drilldown-list">
        {visiveis.map((c) => (
          <li key={c.name}>
            <Link
              href={`/clubs?country=${encodeURIComponent(country)}&city=${encodeURIComponent(c.name)}`}
              data-testid={`city-${c.name}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition-colors duration-200 hover:border-primary"
            >
              <span className="text-foreground">{c.name}</span>
              {/* Contagem rotulada: "12 clubes", não "12". */}
              <span className="num text-ink-3">
                {c.clubs.toLocaleString('pt-BR')} {t('pages.byCountry.clubs')}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!todas && cidades.length > 12 ? (
        <button
          type="button"
          onClick={() => setTodas(true)}
          className="mt-2 min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary"
          data-testid="city-drilldown-show-all"
        >
          {t('pages.byCountry.citiesShowAll').replace('{n}', String(cidades.length))}
        </button>
      ) : null}
    </section>
  );
}
