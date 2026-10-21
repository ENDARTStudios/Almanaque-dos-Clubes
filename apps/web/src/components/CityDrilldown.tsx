'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useGsapStagger } from '@/hooks/useGsap';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * HIERARQUIA DE `/clubs`: país → ESTADO → cidade.
 *
 * ── ESTE COMPONENTE JÁ FOI "PAÍS → CIDADE", E A PREMISSA ENVELHECEU ───────────────────────
 * Ele pulava o nível de estado porque, quando foi escrito, `clubs.state` (STRING) cobria 1 em
 * 100 clubes — o segundo nível por estado nasceria quase todo vazio. A decisão estava certa para
 * o dado da época.
 *
 * O dado mudou: os bots A (T588), B (T589) e C (T590) levaram `Club.stateId` de **707 para
 * 2.815** clubes, em 393 estados. O nível intermediário passou a existir — e o pedido original
 * do Operador ("hierarquia de Estado e Cidade") virou possível.
 *
 * ── O QUE NÃO MUDOU: AS TRÊS REGRAS APRENDIDAS COM O OPERADOR ─────────────────────────────
 *   1. **Não esconder dado por causa de cobertura.** O limiar de 60% que eu havia posto para
 *      "evitar que lista curta passasse por acervo inteiro" foi retirado no T563: ele SUPRIMIA
 *      dado existente. O certo é mostrar e DECLARAR a cobertura ao lado do título.
 *   2. **Não cortar a lista em 12.** A lista longa é razão para organizá-la (busca local), não
 *      para ocultá-la.
 *   3. **Declarar a lacuna.** Quantos clubes não têm estado/cidade aparece sempre que houver
 *      lacuna — nunca um silêncio que o usuário interpreta como "não existe".
 *
 * ── O TERCEIRO NÍVEL SÓ ABRE ONDE TEM DADO ────────────────────────────────────────────────
 * A lista de estados traz `withCity` por estado. Ao escolher um, as cidades vêm da API filtradas
 * por aquele estado — e se o estado não tiver cidade nenhuma, a tela DIZ isso, em vez de mostrar
 * uma lista vazia sem explicação.
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

interface Estado {
  id: string;
  name: string;
  code: string;
  clubs: number;
  withCity: number;
}
interface IndiceEstados {
  country: string;
  totals: { withState: number; withoutState: number; states: number };
  states: Estado[];
}

/** Acima disso a lista ganha busca local. Não é corte — é o ponto em que procurar no olho cansa. */
const LIMIAR_BUSCA = 12;

export default function CityDrilldown({ country }: { country: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const listCidadesRef = useRef<HTMLUListElement>(null);
  const { t, locale } = useI18n();

  const [estados, setEstados] = useState<IndiceEstados | null>(null);
  const [estadoStatus, setEstadoStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const [cidades, setCidades] = useState<IndiceCidades | null>(null);
  const [cidadesStatus, setCidadesStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const [buscaEstado, setBuscaEstado] = useState('');
  const [buscaCidade, setBuscaCidade] = useState('');

  useGsapStagger(listRef, 'li');
  useGsapStagger(listCidadesRef, 'li');

  /* 1º nível: estados do país. O pai passa `key={country}`, então trocar de país REMONTA este
     componente em vez de reaproveitar estado antigo — por isso não há setState síncrono no
     corpo do efeito (dispararia render em cascata, que o lint do projeto acusa com razão). */
  useEffect(() => {
    let vivo = true;
    api
      .get<{ data: IndiceEstados }>(`/clubs/states?country=${encodeURIComponent(country)}`)
      .then((r) => {
        if (!vivo) return;
        setEstados(r.data);
        setEstadoStatus('done');
      })
      .catch(() => {
        if (vivo) setEstadoStatus('error');
      });
    return () => {
      vivo = false;
    };
  }, [country]);

  /* 2º nível: cidades DENTRO do estado escolhido. Sem estado escolhido, nada é buscado — a lista
     de cidades do país inteiro é o comportamento antigo, e ele continua disponível no nível de
     país do `/clubs` quando nenhum estado é escolhido. */
  useEffect(() => {
    if (!selecionado) {
      setCidades(null);
      setCidadesStatus('idle');
      return;
    }
    let vivo = true;
    const url = `/clubs/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(selecionado)}`;
    api
      .get<{ data: IndiceCidades }>(url)
      .then((r) => {
        if (!vivo) return;
        setCidades(r.data);
        setCidadesStatus('done');
      })
      .catch(() => {
        if (vivo) setCidadesStatus('error');
      });
    return () => {
      vivo = false;
    };
  }, [country, selecionado]);

  const listaEstados = useMemo(() => estados?.states ?? [], [estados]);
  const estadosFiltrados = useMemo(() => {
    const termo = buscaEstado.trim().toLowerCase();
    if (!termo) return listaEstados;
    return listaEstados.filter(
      (e) => e.name.toLowerCase().includes(termo) || e.code.toLowerCase().includes(termo),
    );
  }, [listaEstados, buscaEstado]);

  const listaCidades = useMemo(() => cidades?.cities ?? [], [cidades]);
  const cidadesFiltradas = useMemo(() => {
    const termo = buscaCidade.trim().toLowerCase();
    if (!termo) return listaCidades;
    return listaCidades.filter((c) => c.name.toLowerCase().includes(termo));
  }, [listaCidades, buscaCidade]);

  const nomeDoEstado = useMemo(
    () => listaEstados.find((e) => e.id === selecionado)?.name ?? '',
    [listaEstados, selecionado],
  );

  // Enquanto carrega, nada de esqueleto: este bloco é complemento, não a página.
  if (estadoStatus === 'loading') return null;

  if (estadoStatus === 'error') {
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="city-drilldown-error">
        {t('pages.byCountry.citiesLoadError')}
      </p>
    );
  }

  /* Nenhum clube do país tem estado: a hierarquia não tem primeiro nível para abrir. Declarar é
     melhor que renderizar um seletor vazio que parece quebrado. */
  if (listaEstados.length === 0) {
    const semEstado = estados?.totals.withoutState ?? 0;
    return (
      <p className="mb-6 text-sm text-ink-2" data-testid="state-drilldown-gap">
        {t('pages.byCountry.statesGapNone').replace('{n}', semEstado.toLocaleString(locale))}
      </p>
    );
  }

  const totaisEstados = estados?.totals;
  const comEstado = totaisEstados?.withState ?? 0;
  const semEstado = totaisEstados?.withoutState ?? 0;
  const totalClubes = comEstado + semEstado;
  const cobertura = totalClubes > 0 ? Math.round((comEstado / totalClubes) * 100) : 0;

  return (
    <div className="mb-6 space-y-6">
      {/* ── NÍVEL 1: ESTADOS ──────────────────────────────────────────────────────────── */}
      <section aria-label={t('pages.byCountry.statesLabel')}>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
          <h3 className="font-heading text-base font-bold" data-testid="state-drilldown-title">
            {t('pages.byCountry.statesTitle')} · {listaEstados.length.toLocaleString(locale)}
          </h3>
          {/* A lacuna, declarada e visível — o que substitui qualquer limiar de esconderijo. */}
          {semEstado > 0 ? (
            <span className="text-xs text-ink-3" data-testid="state-drilldown-partial">
              {t('pages.byCountry.statesCoverage')
                .replace('{com}', comEstado.toLocaleString(locale))
                .replace('{total}', totalClubes.toLocaleString(locale))
                .replace('{pct}', String(cobertura))}
            </span>
          ) : null}
          {listaEstados.length > LIMIAR_BUSCA ? (
            <input
              type="search"
              value={buscaEstado}
              onChange={(e) => setBuscaEstado(e.target.value)}
              placeholder={t('pages.byCountry.statesFilter')}
              aria-label={t('pages.byCountry.statesFilter')}
              data-testid="state-drilldown-filter"
              className="min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-ink-2 placeholder:opacity-100"
            />
          ) : null}
        </div>

        {estadosFiltrados.length === 0 ? (
          <p className="text-sm text-ink-2" data-testid="state-drilldown-empty">
            {t('pages.byCountry.statesEmpty')}
          </p>
        ) : (
          <ul ref={listRef} className="flex flex-wrap gap-2" data-testid="state-drilldown-list">
            {estadosFiltrados.map((e) => {
              const ativo = selecionado === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(ativo ? null : e.id)}
                    aria-pressed={ativo}
                    data-testid={`state-${e.code}`}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors duration-200 ${
                      ativo
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-border bg-surface hover:border-primary'
                    }`}
                  >
                    <span>{e.name}</span>
                    <span className={`num ${ativo ? 'opacity-80' : 'text-ink-3'}`}>
                      {e.clubs.toLocaleString(locale)} {t('pages.byCountry.clubs')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── NÍVEL 2: CIDADES DO ESTADO ESCOLHIDO ──────────────────────────────────────── */}
      {selecionado ? (
        <section
          aria-label={t('pages.byCountry.citiesLabel')}
          data-testid="cities-in-state"
          className="border-t border-border pt-4"
        >
          {cidadesStatus === 'loading' ? null : cidadesStatus === 'error' ? (
            <p className="text-sm text-ink-2">{t('pages.byCountry.citiesLoadError')}</p>
          ) : listaCidades.length === 0 ? (
            /* O estado existe, mas nenhum clube dele tem cidade: é LACUNA, não lista vazia. */
            <p className="text-sm text-ink-2" data-testid="cities-in-state-gap">
              {t('pages.byCountry.citiesInStateNone').replace('{state}', nomeDoEstado)}
            </p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                <h4 className="font-heading text-sm font-bold" data-testid="cities-in-state-title">
                  {t('pages.byCountry.citiesInState')
                    .replace('{state}', nomeDoEstado)
                    .replace('{n}', String(listaCidades.length))}
                </h4>
                {listaCidades.length > LIMIAR_BUSCA ? (
                  <input
                    type="search"
                    value={buscaCidade}
                    onChange={(e) => setBuscaCidade(e.target.value)}
                    placeholder={t('pages.byCountry.citiesFilter')}
                    aria-label={t('pages.byCountry.citiesFilter')}
                    data-testid="city-drilldown-filter"
                    className="min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-ink-2 placeholder:opacity-100"
                  />
                ) : null}
              </div>
              {cidadesFiltradas.length === 0 ? (
                <p className="text-sm text-ink-2" data-testid="city-drilldown-empty">
                  {t('pages.byCountry.citiesEmpty')}
                </p>
              ) : (
                <ul
                  ref={listCidadesRef}
                  className="flex flex-wrap gap-2"
                  data-testid="city-drilldown-list"
                >
                  {cidadesFiltradas.map((c) => (
                    <li key={c.name}>
                      <Link
                        /* O filtro `?city=` continua funcionando sozinho: o estado é contexto de
                           navegação, não pré-requisito do filtro. */
                        href={`/clubs?country=${encodeURIComponent(country)}&city=${encodeURIComponent(c.name)}`}
                        data-testid={`city-${c.name}`}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition-colors duration-200 hover:border-primary"
                      >
                        <span className="text-foreground">{c.name}</span>
                        <span className="num text-ink-3">
                          {c.clubs.toLocaleString(locale)} {t('pages.byCountry.clubs')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
