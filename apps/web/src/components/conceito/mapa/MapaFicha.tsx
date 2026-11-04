'use client';
/**
 * /map — o quadro "mapa" do conceito FICHA.
 *
 * ── O QUE MUDA EM RELAÇÃO À VERSÃO ANTERIOR ──────────────────────────────────────────────────
 * A página era um cabeçalho de ficha + um bloco único (seletor de país, canvas e uma lista longa).
 * O conceito pede: filtros em TRÊS níveis, mapa grande à esquerda e uma coluna de ÍNDICE à direita
 * com barras de intensidade (estados e cidades), legenda de densidade e procedência no pé. O canvas
 * é o MESMO componente (GeoMapCanvas, via MapaPanel): clique no país, zoom, teclado e atribuição
 * continuam. A lista de clubes com coordenada — caminho acessível principal — continua abaixo,
 * com os mesmos data-testid.
 *
 * ── AS DUAS UNIDADES DE CONTAGEM (e por que elas não se misturam) ────────────────────────────
 * O índice lateral (GET /clubs/states, /clubs/cities) conta o ACERVO INTEIRO pelas colunas do
 * filtro público — inclusive clubes sem coordenada. O mapa e a lista de clubes usam
 * GET /geo/points, que só devolve clube COM coordenada (e no máximo os 500 do recorte). Por isso
 * há duas contagens na tela, cada uma com sua nota; somar as duas seria inventar um número que
 * nenhuma consulta devolve.
 *
 * ── HONESTIDADE GEOGRÁFICA ───────────────────────────────────────────────────────────────────
 * · país sem clube não aparece no catálogo (a lacuna é declarada, não preenchida);
 * · estado é filtrado por stateCode (FK canônica) e cidade por city — nunca por nome solto;
 * · sem coordenada, o clube não é plotado: entra no contador de "sem localização";
 * · os índices que falham viram erro declarado com "tentar de novo" — nunca lista vazia fingindo
 *   que o acervo não tem dado.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoMapa } from '@/i18n/wsConceitoMapa';
import { mapPageStrings, mapText } from '@/i18n/wsMapPage';
import { fichaStrings } from '@/i18n/wsFicha';
import { countryLabel } from '@/lib/country-flag';
import { formatCount } from '@/lib/format';
import { EmptyState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import { CountryFlag } from '@/components/CountryFlag';
import { buildMapViewModel, groupByState, type GeoPointsResponseDto } from '@/lib/map-viewmodel';
import MapFilters from './Filters';
import MapaPanel from './MapaPanel';
import { CityList, StateList } from './RegionList';
import { filterGeoFeatures, withSelectedCountry } from './derive';
import type { CityIndex, CountryIndex, CountryOption, StateIndex, StateIndexEntry } from './types';

type LoadState = 'loading' | 'done' | 'error';

/** Recorte padrão da tela: o país que a versão anterior abria. */
const DEFAULT_COUNTRY = 'BR';
/** Teto do /geo/points (GEO_MAX_LIMIT = 500). Acima disso o servidor cortaria em silêncio. */
const POINTS_LIMIT = 500;
/** Opacidades da legenda de densidade — classes literais (o Tailwind não gera classe dinâmica). */
const DENSITY_STEPS = ['opacity-90', 'opacity-70', 'opacity-50', 'opacity-30', 'opacity-20'];

export default function MapaFicha() {
  const { locale } = useI18n();
  const s = wsConceitoMapa[locale];
  const m = mapPageStrings[locale];
  const statesCopy = fichaStrings[locale].states;

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [onlyWomen, setOnlyWomen] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [data, setData] = useState<GeoPointsResponseDto | null>(null);
  const [pointsState, setPointsState] = useState<LoadState>('loading');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [statesIdx, setStatesIdx] = useState<StateIndex | null>(null);
  const [statesState, setStatesState] = useState<LoadState>('loading');
  const [citiesIdx, setCitiesIdx] = useState<CityIndex | null>(null);
  const [citiesState, setCitiesState] = useState<LoadState>('loading');

  // Catálogo de países do acervo (uma vez). Sem fallback com contagem inventada: enquanto não
  // carrega, o seletor mostra só o país selecionado, sem número.
  useEffect(() => {
    let active = true;
    api
      .get<{ data: CountryIndex }>('/clubs/countries')
      .then((res) => {
        if (!active) return;
        const list = (res.data?.countries ?? []).map((c) => ({
          code: c.code.toUpperCase(),
          clubs: c.clubs,
        }));
        setCountries(list);
      })
      .catch(() => {
        /* mantém só o selecionado — a lacuna é declarada no vazio/erro do índice */
      });
    return () => {
      active = false;
    };
  }, []);

  // Pontos do mapa (só clubes com coordenada). O canvas NÃO desmonta durante o loading de outro
  // país: desmontá-lo matava o mapa com o fitBounds em voo e reconstruía tudo a cada troca.
  useEffect(() => {
    let active = true;
    setPointsState('loading');
    const query = new URLSearchParams({ country, limit: String(POINTS_LIMIT) });
    if (onlyWomen) query.set('gender', 'women');
    api
      .get<GeoPointsResponseDto>('/geo/points?' + query.toString())
      .then((res) => {
        if (!active) return;
        setData(res);
        setPointsState('done');
      })
      .catch(() => {
        if (active) setPointsState('error');
      });
    return () => {
      active = false;
    };
  }, [country, onlyWomen, retryKey]);

  // Índice de ESTADOS do país (acervo inteiro, coluna do filtro público).
  useEffect(() => {
    let active = true;
    setStatesState('loading');
    // Limpa o índice do país anterior: um número de outro recorte com o título novo seria
    // resposta errada com aparência de certa (o mesmo defeito que o repo já documentou).
    setStatesIdx(null);
    api
      .get<{ data: StateIndex }>('/clubs/states?country=' + encodeURIComponent(country))
      .then((res) => {
        if (!active) return;
        setStatesIdx(res.data ?? null);
        setStatesState('done');
      })
      .catch(() => {
        if (!active) return;
        setStatesIdx(null);
        setStatesState('error');
      });
    return () => {
      active = false;
    };
  }, [country, retryKey]);

  // Índice de CIDADES do recorte: país inteiro quando não há estado, ou o estado selecionado.
  useEffect(() => {
    let active = true;
    setCitiesState('loading');
    // Limpa as cidades do recorte anterior (país ou estado): idem acima.
    setCitiesIdx(null);
    const query = new URLSearchParams({ country });
    if (selectedStateId) query.set('state', selectedStateId);
    api
      .get<{ data: CityIndex }>('/clubs/cities?' + query.toString())
      .then((res) => {
        if (!active) return;
        setCitiesIdx(res.data ?? null);
        setCitiesState('done');
      })
      .catch(() => {
        if (!active) return;
        setCitiesIdx(null);
        setCitiesState('error');
      });
    return () => {
      active = false;
    };
  }, [country, selectedStateId, retryKey]);

  const states = statesIdx?.states ?? [];
  const cities = citiesIdx?.cities ?? [];
  const selectedState: StateIndexEntry | null =
    states.find((state) => state.id === selectedStateId) ?? null;
  const stateCode = selectedState?.code ?? null;
  const hasRecorte = Boolean(selectedStateId || selectedCity);

  const countryName = countryLabel(country, locale) ?? country.toUpperCase();
  const countryOptions = useMemo(
    () => withSelectedCountry(countries, country),
    [countries, country],
  );

  // Modelo do recorte INTEIRO (para o contador do país) e do recorte FILTRADO (mapa + lista).
  // Sem useMemo manual: o React Compiler já memoiza, e memo manual sobre um objeto derivado de
  // estado (data) fazia o compilador pular a otimização do componente inteiro.
  const fullVm = data ? buildMapViewModel(data) : null;
  const filteredData = hasRecorte
    ? data
      ? {
          ...data,
          features: filterGeoFeatures(data.features, { stateCode, city: selectedCity }),
        }
      : null
    : data;
  const vm = hasRecorte && filteredData ? buildMapViewModel(filteredData) : fullVm;
  const stateGroups = vm ? groupByState(vm.points, locale) : [];

  const changeCountry = (code: string) => {
    setCountry(code.toUpperCase());
    setSelectedStateId(null);
    setSelectedCity(null);
  };
  const changeState = (id: string) => {
    setSelectedStateId(id === '' ? null : id);
    setSelectedCity(null);
  };
  const changeCity = (name: string) => {
    setSelectedCity(name === '' ? null : name);
  };
  const retry = () => setRetryKey((key) => key + 1);

  const statesHeading = statesIdx
    ? mapText(s.statesHeading, {
        n: formatCount(statesIdx.totals.states, locale),
        country: countryName,
      })
    : '';
  const citiesHeading = citiesIdx
    ? selectedState
      ? mapText(s.citiesHeadingState, {
          state: selectedState.name,
          n: formatCount(citiesIdx.totals.cities, locale),
        })
      : mapText(s.citiesHeadingCountry, {
          country: countryName,
          n: formatCount(citiesIdx.totals.cities, locale),
        })
    : '';

  return (
    <div className="mt-8">
      <MapFilters
        locale={locale}
        s={s}
        country={country}
        countryOptions={countryOptions}
        onCountry={changeCountry}
        states={states}
        statesLoaded={statesState === 'done'}
        selectedStateId={selectedStateId}
        onState={changeState}
        cities={cities}
        citiesLoaded={citiesState === 'done'}
        selectedCity={selectedCity}
        onCity={changeCity}
        onlyWomen={onlyWomen}
        onWomen={setOnlyWomen}
        womenLabel={m.womenToggle}
      />
      <p className="mt-2 max-w-[92ch] text-[11px] leading-snug text-ink-3">{m.hint}</p>

      <div
        className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
        aria-busy={pointsState === 'loading'}
      >
        {/* 1. MAPA — grande, à esquerda; a legenda de densidade fecha o bloco. */}
        <div className="min-w-0" data-testid="mapa-bloco">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[12.5px] font-semibold leading-tight text-foreground">
              {s.mapTitle}
            </h2>
            {fullVm ? (
              <p className="text-[11px] leading-tight text-ink-3 tabular-nums" aria-live="polite">
                {hasRecorte && vm
                  ? mapText(s.recorteCoordinates, {
                      n: formatCount(vm.points.length, locale),
                      m: formatCount(fullVm.points.length, locale),
                    })
                  : mapText(m.withCoordinates, {
                      n: formatCount(fullVm.points.length, locale),
                      m: formatCount(fullVm.withoutLocationCount, locale),
                    })}
              </p>
            ) : null}
          </div>

          {/* Falha do /geo/points: erro declarado, com retry — nunca "0 clubes". */}
          {pointsState === 'error' ? (
            <p
              role="alert"
              className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger-ink"
            >
              {m.loadError}
              <button
                type="button"
                onClick={retry}
                data-testid="mapa-pontos-retry"
                className="inline-flex min-h-9 items-center rounded-[2px] border border-border bg-surface px-3 text-[12px] font-semibold text-foreground transition-colors duration-200 hover:border-foreground"
              >
                {s.retry}
              </button>
            </p>
          ) : null}

          {!vm && pointsState === 'loading' ? (
            <div className="mt-3 h-[55vh] w-full animate-pulse bg-surface-2" aria-hidden="true" />
          ) : null}

          {vm ? (
            <>
              <div className="mt-3">
                <MapaPanel
                  points={vm.points.map((p) => ({
                    id: p.id,
                    name: p.name,
                    subtitle: p.subtitle,
                    lat: p.lat,
                    lng: p.lng,
                  }))}
                  selectedCountry={country}
                  onCountrySelect={changeCountry}
                />
              </div>
              <p className="sr-only">{s.mapAria}</p>

              {/* A contagem do recorte filtrado é diferente da contagem do país: quando o
                  filtro esvazia o mapa, a lacuna é declarada em vez de o canvas fingir vazio. */}
              {vm.points.length === 0 && fullVm && fullVm.points.length > 0 ? (
                <p role="status" className="mt-2 text-[11px] leading-snug text-ink-3">
                  {s.clubFilterEmptyTitle}
                </p>
              ) : null}

              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-3"
                data-testid="mapa-legenda"
                role="group"
                aria-label={s.legendAria}
              >
                <p className="text-[11px] leading-none text-ink-3">{s.densityTitle}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] leading-none text-ink-3">{s.densityLess}</span>
                  <span aria-hidden="true" className="flex items-center gap-1">
                    {DENSITY_STEPS.map((classe) => (
                      <span key={classe} className={'h-3 w-[22px] bg-viz-3 ' + classe} />
                    ))}
                  </span>
                  <span className="text-[11px] leading-none text-ink-3">{s.densityMore}</span>
                </div>
              </div>
              <p className="mt-2 max-w-[92ch] text-[11px] leading-snug text-ink-3">
                {s.densityNote} {s.archiveIndexNote}
                {onlyWomen ? ' ' + s.archiveIndexNoteWomen : ''}
              </p>
              <p className="mt-1 max-w-[92ch] text-[11px] leading-snug text-ink-3">
                {mapText(s.pointsCapNote, { n: formatCount(POINTS_LIMIT, locale) })}
              </p>
            </>
          ) : null}
        </div>

        {/* 2. ÍNDICE — a coluna do conceito: estados e cidades com contagem real e barra. */}
        <aside className="min-w-0" data-testid="mapa-indice" aria-label={s.indexAria}>
          {statesState === 'error' ? (
            <div role="alert">
              <p className="text-sm text-danger-ink">{s.statesError}</p>
              <button
                type="button"
                onClick={retry}
                data-testid="mapa-indice-retry"
                className="mt-2 inline-flex min-h-9 items-center rounded-[2px] border border-border bg-surface px-3 text-[12px] font-semibold text-foreground transition-colors duration-200 hover:border-foreground"
              >
                {s.retry}
              </button>
            </div>
          ) : statesState === 'loading' && !statesIdx ? (
            <p role="status" className="text-sm text-ink-3">
              {s.statesLoading}
            </p>
          ) : statesIdx && statesIdx.totals.states === 0 ? (
            <EmptyState title={s.statesEmptyTitle} body={s.statesEmptyBody} />
          ) : statesIdx ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  className="text-[12.5px] font-semibold leading-tight text-foreground"
                  data-testid="mapa-estados-titulo"
                >
                  {statesHeading}
                </h2>
                <p className="text-[11px] leading-tight text-ink-3 tabular-nums">
                  {mapText(s.statesAside, {
                    n: formatCount(statesIdx.totals.withState, locale),
                  })}
                </p>
              </div>
              <StateList
                states={states}
                locale={locale}
                s={s}
                selectedStateId={selectedStateId}
                onSelect={(state) => changeState(selectedStateId === state.id ? '' : state.id)}
              />
              {statesIdx.totals.withoutState > 0 ? (
                <p className="mt-2 text-[11px] leading-snug text-ink-3">
                  {mapText(s.withoutStateGap, {
                    n: formatCount(statesIdx.totals.withoutState, locale),
                  })}
                </p>
              ) : null}
            </>
          ) : null}

          <div className="mt-6 border-t-2 border-foreground pt-4">
            {citiesState === 'error' ? (
              <p role="alert" className="text-sm text-danger-ink">
                {s.citiesError}
              </p>
            ) : citiesState === 'loading' && !citiesIdx ? (
              <p role="status" className="text-sm text-ink-3">
                {s.citiesLoading}
              </p>
            ) : citiesIdx && citiesIdx.totals.cities === 0 ? (
              <EmptyState title={s.citiesEmptyTitle} body={s.citiesEmptyBody} />
            ) : citiesIdx ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    className="text-[12.5px] font-semibold leading-tight text-primary-ink"
                    data-testid="mapa-cidades-titulo"
                  >
                    {citiesHeading}
                  </h2>
                  <p className="text-[11px] leading-tight text-ink-3 tabular-nums">
                    {mapText(s.citiesAside, {
                      n: formatCount(citiesIdx.totals.withCity, locale),
                    })}
                  </p>
                </div>
                <CityList
                  cities={cities}
                  countryCode={country}
                  locale={locale}
                  s={s}
                  selectedCity={selectedCity}
                  onSelect={(city) => changeCity(selectedCity === city.name ? '' : city.name)}
                />
                {citiesIdx.totals.withoutCity > 0 ? (
                  <p className="mt-2 text-[11px] leading-snug text-ink-3">
                    {mapText(s.withoutCityGap, {
                      n: formatCount(citiesIdx.totals.withoutCity, locale),
                    })}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </aside>
      </div>

      {/* 3. LISTA DE CLUBES COM COORDENADA — o caminho acessível principal (preservado). */}
      <section aria-label={m.listAria} data-testid="geo-list" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
          <h2 className="text-[12.5px] font-semibold leading-tight text-foreground">
            {m.listTitle}
            <CountryFlag
              code={country}
              locale={locale}
              basePath="/clubs"
              destination="clubs"
              showName
              className="ml-2 align-middle font-normal"
            />
          </h2>
          {hasRecorte ? (
            <p className="text-[11px] leading-snug text-ink-3">{s.clubListFilterNote}</p>
          ) : null}
        </div>

        {!vm ? (
          pointsState === 'loading' ? (
            <p role="status" className="py-6 text-sm text-ink-3">
              {statesCopy.loading}
            </p>
          ) : null
        ) : vm.points.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={hasRecorte ? s.clubFilterEmptyTitle : m.noPoints}
              body={hasRecorte ? s.clubFilterEmptyBody : statesCopy.emptyBody}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-8" data-testid="geo-state-groups">
            {stateGroups.map((group) => (
              <section key={group.key} aria-label={group.name ?? m.noStateGroup}>
                <h3 className="mb-1 flex flex-wrap items-center gap-2 border-b border-border pb-2">
                  {group.flagUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={group.flagUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-auto max-w-8 rounded-[2px] border border-border object-contain"
                      loading="lazy"
                      data-testid="geo-state-flag"
                    />
                  ) : group.code ? (
                    <span
                      className="rounded-[2px] bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-ink-2"
                      data-testid="geo-state-code"
                    >
                      {group.code}
                    </span>
                  ) : null}
                  <span className="text-[13px] font-semibold text-foreground">
                    {group.name ?? m.noStateGroup}
                  </span>
                  <span className="text-[11px] text-ink-3 tabular-nums">
                    {mapText(m.stateClubsCount, { n: formatCount(group.clubs.length, locale) })}
                  </span>
                </h3>
                <ul className="divide-y divide-border">
                  {group.clubs.map((point) => (
                    <li key={point.id} className="py-2" data-testid="geo-list-item">
                      <p className="text-sm font-medium text-foreground">
                        {point.name}
                        {point.qid ? <span className="text-ink-3"> · {point.qid}</span> : null}
                      </p>
                      <p className="text-[11px] text-ink-3">{point.subtitle ?? '—'}</p>
                      {point.attribution ? (
                        <span className="text-[11px] text-ink-3" data-testid="geo-item-attribution">
                          {point.attribution.geo}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* 4. SEM LOCALIZAÇÃO — a lacuna declarada de quem não entra no mapa (preservado). */}
      {vm ? (
        <section aria-label={m.noLocationAria} data-testid="geo-without-location" className="mt-8">
          <h2 className="text-[12.5px] font-semibold leading-tight text-foreground">
            {m.noLocationTitle}
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-ink-3">
            {vm.withoutLocationCount > 0
              ? mapText(m.noLocationGap, {
                  n: formatCount(vm.withoutLocationCount, locale),
                })
              : m.noLocationNone}
          </p>
        </section>
      ) : null}

      {/* 5. FONTES DESTE MAPA — atribuição por camada (ODbL), obrigatória e visível. */}
      {vm ? (
        <section aria-label={m.sourcesAria} className="mt-8 border-t border-border pt-3">
          <h2 className="text-[12.5px] font-semibold leading-tight text-foreground">
            {m.sourcesTitle}
          </h2>
          <ul className="mt-2 space-y-1 text-[11px] leading-snug text-ink-3">
            <li>{m.tiles}</li>
            <li>{m.vector}</li>
            {vm.attributionsBySource.map((attribution) => (
              <li key={attribution.source}>
                {attribution.label} — {attribution.license}
              </li>
            ))}
            <li>{m.wikidata}</li>
          </ul>
        </section>
      ) : null}

      {/* 6. PÉ — lacuna declarada (conceito) + limitações geradas pela API (dado auditável). */}
      <div className="mt-6 space-y-1 text-[11px] leading-snug text-ink-3">
        <p className="max-w-[92ch]">{s.gapNote}</p>
        {vm && vm.limitations.length > 0 ? (
          <p className="max-w-[92ch]">{vm.limitations.join(' · ')}</p>
        ) : null}
        <SourceNote label={s.sourceNote} data-testid="mapa-source-note" className="max-w-[92ch]" />
      </div>
    </div>
  );
}
