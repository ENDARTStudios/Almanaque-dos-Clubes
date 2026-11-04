'use client';
/**
 * Listas do quadro /map: ESTADOS (com UF) e CIDADES (com bandeira), cada linha com contagem
 * REAL e uma barra de intensidade proporcional.
 *
 * ── O QUE A BARRA É E O QUE ELA NÃO É ────────────────────────────────────────────────────────
 * A barra compara a densidade do acervo DENTRO da lista exibida (o maior valor ocupa 100%). O
 * número ao lado é o dado; a barra é leitura rápida, e por isso é aria-hidden — leitor de tela
 * recebe UF, nome e contagem, não uma porcentagem que não foi medida como porcentagem do mundo.
 *
 * ── POR QUE O BOTÃO DA LINHA SELECIONA ───────────────────────────────────────────────────────
 * O conceito desenha as linhas como lista; transformá-las em botões (com aria-pressed) é o que
 * faz o nível intermediário da hierarquia país → estado → cidade funcionar pelo teclado e pelo
 * toque, sem inventar um segundo controle. O alvo tem min-h-9 (36 px), acima do piso de 24 px.
 */
import { useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import { formatCount } from '@/lib/format';
import { CountryFlag } from '@/components/CountryFlag';
import { mapText } from '@/i18n/wsMapPage';
import type { ConceitoMapaStrings } from '@/i18n/wsConceitoMapa';
import type { CityIndexEntry, StateIndexEntry } from './types';
import { barWidth, ufFromCode } from './derive';

/** Quantas linhas o conceito desenha antes de pedir "ver todos". */
const STATE_LIMIT = 8;
/** Cidades têm linha mais baixa: cabem 6 antes do "ver todas" (o desenho mostra 5). */
const CITY_LIMIT = 6;

function IntensityBar({ count, max }: { count: number; max: number }) {
  const pct = barWidth(count, max);
  return (
    <span
      aria-hidden="true"
      data-testid="mapa-barra-intensidade"
      className="mt-1.5 block h-[2px] w-full bg-border"
    >
      <span className="block h-[2px] bg-viz-3" style={{ width: pct === 0 ? '0%' : pct + '%' }} />
    </span>
  );
}

export interface StateListProps {
  states: StateIndexEntry[];
  locale: Locale;
  s: ConceitoMapaStrings;
  selectedStateId: string | null;
  onSelect: (state: StateIndexEntry) => void;
}

export function StateList({ states, locale, s, selectedStateId, onSelect }: StateListProps) {
  const [showAll, setShowAll] = useState(false);
  const max = useMemo(() => states.reduce((acc, st) => Math.max(acc, st.clubs), 0), [states]);
  // O estado selecionado no filtro pode estar fora do top-8: nesse caso a lista abre inteira,
  // em vez de esconder a linha que o controle acabou de marcar.
  const selectedIndex = states.findIndex((state) => state.id === selectedStateId);
  const visible = showAll || selectedIndex >= STATE_LIMIT ? states : states.slice(0, STATE_LIMIT);

  return (
    <div>
      <ol className="mt-3 space-y-1" data-testid="mapa-estados-lista">
        {visible.map((state) => {
          const selected = state.id === selectedStateId;
          const uf = ufFromCode(state.code);
          return (
            <li key={state.id}>
              <button
                type="button"
                onClick={() => onSelect(state)}
                aria-pressed={selected}
                data-testid="mapa-estado-linha"
                className="flex min-h-9 w-full items-start gap-2.5 rounded-[2px] px-0.5 py-1.5 text-left transition-colors duration-200 hover:bg-surface-2"
              >
                <span
                  className={
                    'mt-0.5 inline-flex h-[18px] min-w-[30px] items-center justify-center rounded-[2px] border px-1 text-[10px] font-semibold leading-none ' +
                    (selected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-surface-2 text-ink-2')
                  }
                  data-testid="mapa-estado-uf"
                >
                  {uf}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={
                        'truncate text-[13px] text-foreground ' +
                        (selected ? 'font-semibold' : 'font-medium')
                      }
                    >
                      {state.name}
                    </span>
                    <span
                      className="shrink-0 text-[12px] tabular-nums text-ink-2"
                      data-testid="mapa-estado-contagem"
                    >
                      {formatCount(state.clubs, locale)}
                    </span>
                  </span>
                  <IntensityBar count={state.clubs} max={max} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {states.length > STATE_LIMIT ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          data-testid="mapa-estados-ver-todos"
          className="mt-2 inline-flex min-h-9 items-center text-[11px] font-medium text-primary-ink underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:decoration-solid"
        >
          {showAll
            ? s.showFewerStates
            : mapText(s.showAllStates, { n: formatCount(states.length, locale) })}
        </button>
      ) : null}
    </div>
  );
}

export interface CityListProps {
  cities: CityIndexEntry[];
  countryCode: string;
  locale: Locale;
  s: ConceitoMapaStrings;
  selectedCity: string | null;
  onSelect: (city: CityIndexEntry) => void;
}

export function CityList({
  cities,
  countryCode,
  locale,
  s,
  selectedCity,
  onSelect,
}: CityListProps) {
  const [showAll, setShowAll] = useState(false);
  const max = useMemo(() => cities.reduce((acc, c) => Math.max(acc, c.clubs), 0), [cities]);
  const selectedIndex = cities.findIndex((city) => city.name === selectedCity);
  const visible = showAll || selectedIndex >= CITY_LIMIT ? cities : cities.slice(0, CITY_LIMIT);

  return (
    <div>
      <ul className="mt-3 space-y-0.5" data-testid="mapa-cidades-lista">
        {visible.map((city) => {
          const selected = city.name === selectedCity;
          return (
            <li key={city.name}>
              <button
                type="button"
                onClick={() => onSelect(city)}
                aria-pressed={selected}
                data-testid="mapa-cidade-linha"
                className={
                  'flex min-h-8 w-full items-start gap-2 rounded-[2px] px-0.5 py-1 text-left transition-colors duration-200 hover:bg-surface-2 ' +
                  (selected ? 'bg-surface-2' : '')
                }
              >
                <span className="mt-[3px] flex w-[26px] shrink-0 items-center">
                  <CountryFlag code={countryCode} locale={locale} showName={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={
                        'truncate text-[12px] ' +
                        (selected ? 'font-semibold text-foreground' : 'font-medium text-ink-2')
                      }
                    >
                      {city.name}
                    </span>
                    <span
                      className="shrink-0 text-[11px] tabular-nums text-ink-3"
                      data-testid="mapa-cidade-contagem"
                    >
                      {mapText(s.citiesAside, { n: formatCount(city.clubs, locale) })}
                    </span>
                  </span>
                  <IntensityBar count={city.clubs} max={max} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {cities.length > CITY_LIMIT ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          data-testid="mapa-cidades-ver-todas"
          className="mt-2 inline-flex min-h-9 items-center text-[11px] font-medium text-primary-ink underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:decoration-solid"
        >
          {showAll
            ? s.showFewerCities
            : mapText(s.showAllCities, { n: formatCount(cities.length, locale) })}
        </button>
      ) : null}
    </div>
  );
}
