'use client';
/**
 * WS-C-3 FASE 3 (local/off) — Tela INTERNA do mapa (não pública).
 * Consome GET /api/v1/geo/points e renderiza: controles, ATRIBUIÇÃO visível por camada,
 * clusters (Leaflet/Natural Earth local, sem tiles) e a LISTA acessível (caminho principal),
 * incluindo a lista de clubes sem localização. Não publicar/rotear/navegar até WS-C-3 FASE 4.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { buildMapViewModel, type GeoPointsResponseDto } from '@/lib/map-viewmodel';

const GeoMapCanvas = dynamic(() => import('./GeoMapCanvas'), {
  ssr: false,
  loading: () => <div className="h-[55vh] w-full rounded-2xl bg-foreground/5 animate-pulse" />,
});

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'BR', label: 'Brasil (BR)' },
  { code: 'PT', label: 'Portugal (PT)' },
  { code: 'GB', label: 'Reino Unido (GB)' },
  { code: 'SE', label: 'Suécia (SE)' },
  { code: 'US', label: 'Estados Unidos (US)' },
];

export default function GeoMapInternal() {
  const [country, setCountry] = useState('BR');
  const [data, setData] = useState<GeoPointsResponseDto | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="geo-country" className="text-sm font-medium text-foreground">
          País
        </label>
        <select
          id="geo-country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {vm && (
          <span className="text-xs text-foreground/50" aria-live="polite">
            {vm.points.length} com coordenada · {vm.withoutLocationCount} sem localização ·{' '}
            {vm.clusters.length} clusters
          </span>
        )}
      </div>

      {state === 'loading' && (
        <div className="h-[55vh] w-full rounded-2xl bg-foreground/5 animate-pulse" />
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-red-500">
          Não foi possível carregar os pontos agora.
        </p>
      )}

      {state === 'done' && vm && (
        <>
          <GeoMapCanvas clusters={vm.clusters} />

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
