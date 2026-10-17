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
  const { t, locale } = useI18n();
  const [indice, setIndice] = useState<IndiceCidades | null>(null);
  const [estado, setEstado] = useState<'loading' | 'done' | 'error'>('loading');
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
  /* T563 — o corte de 12 saiu. Com 268 cidades na Alemanha e 268 no Brasil (medido), mostrar 12
     e esconder 256 atrás de um botão é esconder o dado que o Operador pediu para ver. A lista é
     longa, o que é uma RAZÃO para organizá-la (busca local), não para ocultá-la. */
  const [busca, setBusca] = useState('');
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cidades;
    return cidades.filter((c) => c.name.toLowerCase().includes(termo));
  }, [cidades, busca]);

  const totais = indice?.totals;
  const comCidade = totais?.withCity ?? 0;
  const semCidade = totais?.withoutCity ?? 0;
  const totalClubes = comCidade + semCidade;
  const cobertura = totalClubes > 0 ? Math.round((comCidade / totalClubes) * 100) : 0;

  // Enquanto carrega, nada de esqueleto: o segundo nível é complemento, não a página.
  if (estado === 'loading') return null;

  if (estado === 'error') {
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="city-drilldown-error">
        {t('pages.byCountry.citiesLoadError')}
      </p>
    );
  }

  /* T563 — o LIMIAR DE 60% SAIU, e a história dele importa.
   *
   * Eu o havia posto para evitar que uma lista curta de cidades passasse por acervo inteiro: num
   * país com 26% de cobertura, "Estocolmo (12)" ao lado de 903 clubes sugere que só existem clubes
   * ali. A intenção era honesta; o efeito foi SUPRIMIR DADO EXISTENTE. O Operador relatou
   * exatamente isso: "apenas algumas cidades aparecem ao clicar no país".
   *
   * E ele está certo. Esconder 268 cidades brasileiras porque a cobertura é 48% é pior que o
   * problema que eu tentava evitar: o usuário perde a navegação por cidade inteira, e a lacuna
   * continua lá, apenas invisível. O certo é MOSTRAR e DECLARAR — a cobertura vai numa linha ao
   * lado do título, então o usuário sabe que a lista não é o acervo completo e não precisa
   * concluir nada sozinho.
   *
   * A diferença entre "declarar a lacuna escondendo" e "declarar a lacuna mostrando" é a
   * diferença entre uma página honesta e uma página inútil. */
  if (cidades.length === 0) {
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="city-drilldown-gap">
        {t('pages.byCountry.citiesGapNone').replace('{n}', semCidade.toLocaleString(locale))}
      </p>
    );
  }

  return (
    <section className="mb-6" aria-label={t('pages.byCountry.citiesLabel')}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h3 className="font-heading text-base font-bold" data-testid="city-drilldown-title">
          {t('pages.byCountry.citiesTitle')} · {cidades.length.toLocaleString(locale)}
        </h3>
        {/* A LACUNA, declarada e visível — o que substitui o limiar. */}
        {semCidade > 0 ? (
          <span className="text-xs text-ink-3" data-testid="city-drilldown-partial">
            {t('pages.byCountry.citiesCoverage')
              .replace('{com}', comCidade.toLocaleString(locale))
              .replace('{total}', totalClubes.toLocaleString(locale))
              .replace('{pct}', String(cobertura))}
          </span>
        ) : null}
        {cidades.length > 12 ? (
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('pages.byCountry.citiesFilter')}
            aria-label={t('pages.byCountry.citiesFilter')}
            data-testid="city-drilldown-filter"
            className="min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-ink-2 placeholder:opacity-100"
          />
        ) : null}
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-ink-2" data-testid="city-drilldown-empty">
          {t('pages.byCountry.citiesEmpty')}
        </p>
      ) : (
        <ul ref={listRef} className="flex flex-wrap gap-2" data-testid="city-drilldown-list">
          {filtradas.map((c) => (
            <li key={c.name}>
              <Link
                href={`/clubs?country=${encodeURIComponent(country)}&city=${encodeURIComponent(c.name)}`}
                data-testid={`city-${c.name}`}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition-colors duration-200 hover:border-primary"
              >
                <span className="text-foreground">{c.name}</span>
                {/* Contagem rotulada: "12 clubes", não "12". */}
                <span className="num text-ink-3">
                  {c.clubs.toLocaleString(locale)} {t('pages.byCountry.clubs')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
