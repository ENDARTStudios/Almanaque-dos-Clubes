'use client';
/**
 * Filtros de três níveis do quadro /map: PAÍS (com bandeira), ESTADO (com UF) e CIDADE.
 *
 * ── O QUE MUDOU EM RELAÇÃO AO SELETOR ANTIGO ─────────────────────────────────────────────────
 * O controle antigo era um único select de país com a bandeira ao lado. O conceito pede três
 * níveis no mesmo vocabulário visual (caixa de 1 px, raio 2 px, rótulo dentro da caixa) — e os
 * três existem porque os três têm dado real (GET /clubs/countries, /clubs/states, /clubs/cities).
 * A bandeira do país continua vindo do asset próprio do acervo (nada de emoji): dentro de um
 * <option> ela não cabe, então ela fica no cabeçalho do controle, como no desenho.
 *
 * O estado não usa bandeira: no Brasil o acervo identifica o estado pela UF (ISO 3166-2), e a
 * nota do pé declara isso. Cidade sem índice carregado mantém o controle desabilitado — nunca
 * uma lista inventada.
 */
import type { Locale } from '@/i18n/config';
import { formatCount } from '@/lib/format';
import { countryLabel } from '@/lib/country-flag';
import { CountryFlag } from '@/components/CountryFlag';
import { mapText } from '@/i18n/wsMapPage';
import type { ConceitoMapaStrings } from '@/i18n/wsConceitoMapa';
import type { CityIndexEntry, CountryOption, StateIndexEntry } from './types';
import { ufFromCode } from './derive';

const FIELD_CLASS = 'flex min-w-0 flex-col rounded-[2px] border border-border bg-surface px-3 py-2';
const LABEL_CLASS = 'text-[10px] font-semibold leading-none text-ink-3';
const SELECT_CLASS =
  'mt-1 min-h-7 w-full border-0 bg-transparent p-0 text-[14px] text-foreground focus:outline-none disabled:text-ink-3';

export interface MapFiltersProps {
  locale: Locale;
  s: ConceitoMapaStrings;
  country: string;
  countryOptions: CountryOption[];
  onCountry: (code: string) => void;
  states: StateIndexEntry[];
  statesLoaded: boolean;
  selectedStateId: string | null;
  onState: (id: string) => void;
  cities: CityIndexEntry[];
  citiesLoaded: boolean;
  selectedCity: string | null;
  onCity: (name: string) => void;
  onlyWomen: boolean;
  onWomen: (value: boolean) => void;
  womenLabel: string;
}

export default function MapFilters({
  locale,
  s,
  country,
  countryOptions,
  onCountry,
  states,
  statesLoaded,
  selectedStateId,
  onState,
  cities,
  citiesLoaded,
  selectedCity,
  onCity,
  onlyWomen,
  onWomen,
  womenLabel,
}: MapFiltersProps) {
  const selectedState = states.find((state) => state.id === selectedStateId) ?? null;
  const uf = selectedState ? ufFromCode(selectedState.code) : '—';

  return (
    <div data-testid="mapa-filtros" role="group" aria-label={s.filtersLegend}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={FIELD_CLASS}>
          <span className={LABEL_CLASS}>{s.countryLabel}</span>
          <span className="mt-1 flex items-center gap-2">
            {/* Decorativa: quem informa o país é o texto da opção. */}
            <CountryFlag code={country} locale={locale} showName={false} />
            <select
              id="mapa-filtro-pais"
              data-testid="mapa-filtro-pais"
              aria-label={s.countryLabel}
              className={SELECT_CLASS}
              value={country.toUpperCase()}
              onChange={(e) => onCountry(e.target.value.toUpperCase())}
            >
              {countryOptions.map((option) => {
                const label = countryLabel(option.code, locale) ?? option.code;
                return (
                  <option key={option.code} value={option.code}>
                    {option.clubs === null
                      ? mapText(s.countryOptionNoCount, { country: label, code: option.code })
                      : mapText(s.countryOption, {
                          country: label,
                          code: option.code,
                          n: formatCount(option.clubs, locale),
                        })}
                  </option>
                );
              })}
            </select>
          </span>
        </label>

        <label className={FIELD_CLASS}>
          <span className={LABEL_CLASS}>{s.stateLabel}</span>
          <span className="mt-1 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-[18px] min-w-[30px] shrink-0 items-center justify-center rounded-[2px] border border-border bg-surface-2 px-1 text-[10px] font-semibold leading-none text-ink-2"
              data-testid="mapa-filtro-estado-uf"
            >
              {uf}
            </span>
            <select
              id="mapa-filtro-estado"
              data-testid="mapa-filtro-estado"
              aria-label={s.stateLabel}
              className={SELECT_CLASS}
              value={selectedStateId ?? ''}
              disabled={!statesLoaded || states.length === 0}
              onChange={(e) => onState(e.target.value)}
            >
              <option value="">
                {states.length === 0 && statesLoaded ? s.statesUnavailable : s.allStates}
              </option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {mapText(s.stateOption, {
                    uf: ufFromCode(state.code),
                    name: state.name,
                    n: formatCount(state.clubs, locale),
                  })}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className={FIELD_CLASS}>
          <span className={LABEL_CLASS}>{s.cityLabel}</span>
          <span className="mt-1 flex items-center gap-2">
            <CountryFlag code={country} locale={locale} showName={false} />
            <select
              id="mapa-filtro-cidade"
              data-testid="mapa-filtro-cidade"
              aria-label={s.cityLabel}
              className={SELECT_CLASS}
              value={selectedCity ?? ''}
              disabled={!citiesLoaded || cities.length === 0}
              onChange={(e) => onCity(e.target.value)}
            >
              <option value="">
                {cities.length === 0 && citiesLoaded ? s.citiesUnavailable : s.allCities}
              </option>
              {cities.map((city) => (
                <option key={city.name} value={city.name}>
                  {mapText(s.cityOption, {
                    name: city.name,
                    n: formatCount(city.clubs, locale),
                  })}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      {/* O recorte de gênero não está na faixa de filtros do quadro; ele fica em um
          disclosure para não competir com os três níveis. O teste e o data-testid continuam. */}
      <details className="mt-2">
        <summary className="inline-flex min-h-6 cursor-pointer items-center text-[11px] text-ink-3">
          {s.advancedFilters}
        </summary>
        <div className="mt-2">
          <label
            className="inline-flex min-h-9 items-center gap-2 text-[12px] text-ink-2"
            htmlFor="geo-women"
          >
            <input
              id="geo-women"
              type="checkbox"
              checked={onlyWomen}
              onChange={(e) => onWomen(e.target.checked)}
              data-testid="geo-women-toggle"
              className="h-5 w-5 shrink-0"
            />
            {womenLabel}
          </label>
        </div>
      </details>
    </div>
  );
}
