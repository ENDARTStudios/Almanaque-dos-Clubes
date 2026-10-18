'use client';
/**
 * WS-C-3 FASE 3/4 — Tela INTERNA do mapa (não pública).
 * Consome GET /api/v1/geo/points e renderiza: controles, ATRIBUIÇÃO visível por camada
 * e a LISTA acessível (caminho principal), incluindo a lista de clubes sem localização.
 * Interação (despacho do Operador 10-04): o PAÍS pode ser escolhido no select
 * (todos os países com acervo, via /clubs/geo-stats) OU clicando no país no mapa;
 * os clubes são pontos individuais clicáveis (nome + link) no canvas.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { buildMapViewModel, groupByState, type GeoPointsResponseDto } from '@/lib/map-viewmodel';
import { CountryFlag } from '@/components/CountryFlag';
import { countryLabel } from '@/lib/country-flag';
import { mapPageStrings, mapText } from '@/i18n/wsMapPage';
import { useI18n } from '@/i18n/Provider';

const GeoMapCanvas = dynamic(() => import('./GeoMapCanvas'), {
  ssr: false,
  loading: () => <div className="h-[55vh] w-full animate-pulse rounded-2xl bg-muted" />,
});

/**
 * Fallback do select enquanto `/clubs/geo-stats` não carrega (ou falha).
 *
 * Só código e contagem: o NOME que aparece no seletor vem do ICU pelo ISO2
 * (`countryLabel`), no idioma do usuário. Antes esta lista carregava nome em português
 * ("Brasil") e a lista da API trazia o nome em INGLÊS ("Brazil"), na mesma tela — o nome
 * do país é dado, e a tradução não pertence à tabela `countries` nem a uma lista local.
 */
const FALLBACK_COUNTRIES: Array<{ code: string; clubs: number }> = [
  { code: 'BR', clubs: 200 },
  { code: 'PT', clubs: 0 },
  { code: 'GB', clubs: 0 },
  { code: 'SE', clubs: 0 },
  { code: 'US', clubs: 0 },
];

interface GeoStatsCountry {
  iso2: string;
  name: string;
  clubs: number;
}

interface GeoStatsResponse {
  data: {
    continents: Array<{ countries: GeoStatsCountry[] }>;
  };
}

export default function GeoMapInternal() {
  const { locale } = useI18n();
  const s = mapPageStrings[locale];
  const [country, setCountry] = useState('BR');
  // T450 — toggle de clubes femininos (gender=women no /geo/points).
  const [onlyWomen, setOnlyWomen] = useState(false);
  const [data, setData] = useState<GeoPointsResponseDto | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [countries, setCountries] =
    useState<Array<{ code: string; clubs: number }>>(FALLBACK_COUNTRIES);

  /**
   * Nome do país para EXIBIR: ICU pelo ISO2, no idioma do usuário (`countryLabel`), com a
   * sigla como piso. O `name` que a API manda é referência em inglês e não entra na tela.
   */
  const nomeDoPais = (code: string) => countryLabel(code, locale) ?? code;

  // Catálogo de países com acervo (uma vez por mount). Ordena por clubes desc.
  useEffect(() => {
    let active = true;
    api
      .get<GeoStatsResponse>('/clubs/geo-stats')
      .then((res) => {
        if (!active) return;
        const list = res.data.continents
          .flatMap((c) => c.countries)
          .map((c) => ({ code: c.iso2.toUpperCase(), clubs: c.clubs }))
          // Desempate pela SIGLA, e não pelo nome: o rótulo visível muda com o idioma, e a
          // ordem da lista não deve depender do locale no meio de um efeito de mount.
          .sort((a, b) => b.clubs - a.clubs || a.code.localeCompare(b.code));
        if (list.length > 0) setCountries(list);
      })
      .catch(() => {
        /* mantém o fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async (): Promise<void> => {
      setState('loading');
      try {
        const res = await api.get<GeoPointsResponseDto>(
          `/geo/points?country=${encodeURIComponent(country)}${onlyWomen ? '&gender=women' : ''}&limit=200`,
        );
        if (active) {
          setData(res);
          setState('done');
        }
      } catch {
        if (active) setState('error');
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [country, onlyWomen]);

  const vm = useMemo(() => (data ? buildMapViewModel(data) : null), [data]);

  // T-26D — clubes agrupados POR ESTADO (ordem alfabética do idioma ativo; sem estado
  // por último, como lacuna declarada). A bandeira vem do State (API); sem bandeira,
  // a sigla ISO 3166-2 — e sem ambos, só o nome do grupo.
  const stateGroups = useMemo(() => (vm ? groupByState(vm.points, locale) : []), [vm, locale]);

  // O país selecionado SEMPRE aparece no select — mesmo sem acervo (0 clubes).
  const options = useMemo(() => {
    const up = country.toUpperCase();
    if (countries.some((c) => c.code === up)) return countries;
    return [{ code: up, clubs: 0 }, ...countries];
  }, [countries, country]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="geo-country" className="text-sm font-medium text-foreground">
          {s.countryLabel}
        </label>
        {/* T579c — a BANDEIRA do país selecionado, colada no seletor (é a única tela em que o
            país aparecia sem bandeira). Fica FORA do `<option>` de propósito: `<option>` não
            aceita `<img>`, e emoji de bandeira degrada para as duas letras regionais no
            Windows. Ela é decorativa (`alt=""` + `aria-hidden` no próprio `<img>`) porque quem
            nomeia o país é o texto da opção ("Brasil (BR) · 605"), que muda com o `<select>`. */}
        <span className="inline-flex items-center gap-2">
          <CountryFlag code={country} locale={locale} showName={false} />
          <select
            id="geo-country"
            value={country.toUpperCase()}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-xs"
          >
            {options.map((c) => (
              <option key={c.code} value={c.code}>
                {nomeDoPais(c.code)} ({c.code}) · {c.clubs.toLocaleString(locale)}
              </option>
            ))}
          </select>
        </span>
        <label className="flex items-center gap-2 text-sm text-foreground/70" htmlFor="geo-women">
          <input
            id="geo-women"
            type="checkbox"
            checked={onlyWomen}
            onChange={(e) => setOnlyWomen(e.target.checked)}
            data-testid="geo-women-toggle"
            className="h-6 w-6 shrink-0"
          />
          {s.womenToggle}
        </label>
        {vm && (
          <span className="text-xs text-foreground/70" aria-live="polite">
            {mapText(s.withCoordinates, {
              n: vm.points.length,
              m: vm.withoutLocationCount,
            })}
          </span>
        )}
      </div>

      <p className="text-xs text-foreground/70">{s.hint}</p>

      {/* O canvas NÃO desmonta durante o loading de outro país: desmontá-lo
          matava o mapa com a animação de zoom do fitBounds em voo
          (_onZoomTransitionEnd em mapa removido) e reconstruía tudo a cada
          troca. Dados antigos permanecem visíveis até os novos chegarem. */}
      {state === 'loading' && !vm && (
        <div className="h-[55vh] w-full rounded-2xl bg-foreground/5 animate-pulse" />
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-danger-ink">
          {s.loadError}
        </p>
      )}

      {vm && (
        <>
          <GeoMapCanvas
            points={vm.points.map((p) => ({
              id: p.id,
              name: p.name,
              subtitle: p.subtitle,
              lat: p.lat,
              lng: p.lng,
            }))}
            selectedCountry={country}
            onCountrySelect={setCountry}
          />

          <section
            aria-label={s.sourcesAria}
            className="rounded-xl border border-border/60 p-4 text-xs text-foreground/70"
          >
            <h2 className="text-sm font-semibold text-foreground mb-2">{s.sourcesTitle}</h2>
            <ul className="space-y-1">
              <li>{s.tiles}</li>
              <li>{s.vector}</li>
              {vm.attributionsBySource.map((a) => (
                <li key={a.source}>
                  {a.label} — {a.license}
                </li>
              ))}
              <li>{s.wikidata}</li>
            </ul>
          </section>

          <section aria-label={s.listAria} data-testid="geo-list">
            <h2 className="text-lg font-heading font-semibold mb-2">
              {s.listTitle}
              {/* T579 (ITEM 19) — BANDEIRA do país selecionado, clicável para a lista de
                  clubes daquele país (`/clubs?country=BR`, filtro existente). O nome do país
                  vem do ICU no idioma do usuário — e não do `name` do `/clubs/geo-stats`,
                  que vem em inglês. Código sem região conhecida cai para a sigla em texto. */}
              <CountryFlag
                code={country}
                locale={locale}
                basePath="/clubs"
                destination="clubs"
                showName
                className="ml-2 align-middle font-normal"
              />
            </h2>
            {vm.points.length === 0 ? (
              <p className="text-sm text-foreground/70">{s.noPoints}</p>
            ) : (
              <div className="space-y-8" data-testid="geo-state-groups">
                {stateGroups.map((g) => (
                  <section key={g.key} aria-label={g.name ?? s.noStateGroup}>
                    {/* Cabeçalho SEMÂNTICO do grupo: bandeira do estado (decorativa — o
                        nome vem do texto), sigla quando não há bandeira (gap honesto) e
                        contagem de clubes. `h3` sob o `h2` da lista — sem pular nível. */}
                    <h3 className="flex flex-wrap items-center gap-2 border-b border-border pb-2 mb-1">
                      {g.flagUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={g.flagUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-auto max-w-8 object-contain rounded-sm border border-border/50"
                          loading="lazy"
                          data-testid="geo-state-flag"
                        />
                      ) : g.code ? (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/70 font-semibold"
                          data-testid="geo-state-code"
                        >
                          {g.code}
                        </span>
                      ) : null}
                      <span className="font-heading font-semibold text-foreground">
                        {g.name ?? s.noStateGroup}
                      </span>
                      <span className="text-xs text-foreground/70">
                        {mapText(s.stateClubsCount, { n: g.clubs.length })}
                      </span>
                    </h3>
                    <ul className="divide-y divide-border/50">
                      {g.clubs.map((p) => (
                        <li key={p.id} className="py-2" data-testid="geo-list-item">
                          <p className="text-sm font-medium text-foreground">
                            {p.name}
                            {p.qid ? <span className="text-foreground/70"> · {p.qid}</span> : null}
                          </p>
                          <p className="text-xs text-foreground/70">{p.subtitle ?? '—'}</p>
                          {p.attribution ? (
                            <span
                              className="text-[11px] text-foreground/70"
                              data-testid="geo-item-attribution"
                            >
                              {p.attribution.geo}
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

          <section aria-label={s.noLocationAria} data-testid="geo-without-location">
            <h2 className="text-lg font-heading font-semibold mb-2">{s.noLocationTitle}</h2>
            <p className="text-sm text-foreground/60">
              {vm.withoutLocationCount > 0
                ? mapText(s.noLocationGap, { n: vm.withoutLocationCount })
                : s.noLocationNone}
            </p>
          </section>

          <p className="text-[11px] text-foreground/70">{vm.limitations.join(' · ')}</p>
        </>
      )}
    </div>
  );
}
