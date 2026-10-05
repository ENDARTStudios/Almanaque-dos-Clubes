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
import { buildMapViewModel, type GeoPointsResponseDto } from '@/lib/map-viewmodel';

const GeoMapCanvas = dynamic(() => import('./GeoMapCanvas'), {
  ssr: false,
  loading: () => <div className="h-[55vh] w-full rounded-2xl bg-foreground/5 animate-pulse" />,
});

/** Fallback do select enquanto /clubs/geo-stats não carrega (ou falha). */
const FALLBACK_COUNTRIES: Array<{ code: string; name: string; clubs: number }> = [
  { code: 'BR', name: 'Brasil', clubs: 200 },
  { code: 'PT', name: 'Portugal', clubs: 0 },
  { code: 'GB', name: 'United Kingdom', clubs: 0 },
  { code: 'SE', name: 'Sweden', clubs: 0 },
  { code: 'US', name: 'Estados Unidos', clubs: 0 },
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
  const [country, setCountry] = useState('BR');
  const [data, setData] = useState<GeoPointsResponseDto | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [countries, setCountries] = useState<Array<{ code: string; name: string; clubs: number }>>(
    FALLBACK_COUNTRIES,
  );

  // Catálogo de países com acervo (uma vez por mount). Ordena por clubes desc.
  useEffect(() => {
    let active = true;
    api
      .get<GeoStatsResponse>('/clubs/geo-stats')
      .then((res) => {
        if (!active) return;
        const list = res.data.continents
          .flatMap((c) => c.countries)
          .map((c) => ({ code: c.iso2.toUpperCase(), name: c.name, clubs: c.clubs }))
          .sort((a, b) => b.clubs - a.clubs || a.name.localeCompare(b.name));
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
          `/geo/points?country=${encodeURIComponent(country)}&limit=200`,
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
  }, [country]);

  const vm = useMemo(() => (data ? buildMapViewModel(data) : null), [data]);

  // O país selecionado SEMPRE aparece no select — mesmo sem acervo (0 clubes).
  const options = useMemo(() => {
    const up = country.toUpperCase();
    if (countries.some((c) => c.code === up)) return countries;
    return [{ code: up, name: up, clubs: 0 }, ...countries];
  }, [countries, country]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="geo-country" className="text-sm font-medium text-foreground">
          País
        </label>
        <select
          id="geo-country"
          value={country.toUpperCase()}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-xs"
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code}) · {c.clubs}
            </option>
          ))}
        </select>
        {vm && (
          <span className="text-xs text-foreground/50" aria-live="polite">
            {vm.points.length} com coordenada · {vm.withoutLocationCount} sem localização
          </span>
        )}
      </div>

      <p className="text-xs text-foreground/50">
        Clique em um país no mapa para selecioná-lo e aproximar · clique em um ponto para ver o
        clube · botões +/− ou duplo clique para zoom.
      </p>

      {/* O canvas NÃO desmonta durante o loading de outro país: desmontá-lo
          matava o mapa com a animação de zoom do fitBounds em voo
          (_onZoomTransitionEnd em mapa removido) e reconstruía tudo a cada
          troca. Dados antigos permanecem visíveis até os novos chegarem. */}
      {state === 'loading' && !vm && (
        <div className="h-[55vh] w-full rounded-2xl bg-foreground/5 animate-pulse" />
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-red-500">
          Não foi possível carregar os pontos agora.
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
            aria-label="Atribuição das fontes"
            className="rounded-xl border border-border/60 p-4 text-xs text-foreground/70"
          >
            <h2 className="text-sm font-semibold text-foreground mb-2">Fontes deste mapa</h2>
            <ul className="space-y-1">
              <li>Base cartográfica: Natural Earth (domínio público)</li>
              {vm.attributionsBySource.map((a) => (
                <li key={a.source}>
                  {a.label} — {a.license}
                </li>
              ))}
              <li>Wikidata — CC0 (identidade/atributos)</li>
            </ul>
          </section>

          <section aria-label="Clubes com coordenada" data-testid="geo-list">
            <h2 className="text-lg font-heading font-semibold mb-2">
              Clubes com coordenada (lista)
            </h2>
            {vm.points.length === 0 ? (
              <p className="text-sm text-foreground/50">
                Nenhum clube com coordenada para este país.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {vm.points.map((p) => (
                  <li key={p.id} className="py-2" data-testid="geo-list-item">
                    <p className="text-sm font-medium text-foreground">
                      {p.name}
                      {p.qid ? <span className="text-foreground/40"> · {p.qid}</span> : null}
                    </p>
                    <p className="text-xs text-foreground/50">{p.subtitle ?? '—'}</p>
                    {p.attribution ? (
                      <span
                        className="text-[11px] text-foreground/40"
                        data-testid="geo-item-attribution"
                      >
                        {p.attribution.geo}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Clubes sem localização" data-testid="geo-without-location">
            <h2 className="text-lg font-heading font-semibold mb-2">Sem localização</h2>
            <p className="text-sm text-foreground/60">
              {vm.withoutLocationCount > 0
                ? `${vm.withoutLocationCount} clube(s) sem coordenada no acervo para este país — não são plotados (vazio-honesto).`
                : 'Nenhum clube sem coordenada para este país.'}
            </p>
          </section>

          <p className="text-[11px] text-foreground/40">{vm.limitations.join(' · ')}</p>
        </>
      )}
    </div>
  );
}
