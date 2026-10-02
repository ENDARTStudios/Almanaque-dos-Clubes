'use client';
/**
 * T467 — Explorador do mapa (SPA, sem reload): choropleth continente→país +
 * drill-down por LISTA clicável (estado/cidade, sem polígono) + listagem de
 * clubes abaixo (paginada, offset) + busca textual. O mapa é acessório: a
 * navegação por teclado/leitor de tela é a lista de regiões (fallback).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';

const WorldChoropleth = dynamic(() => import('./WorldChoropleth'), {
  ssr: false,
  loading: () => <div className="h-[55vh] w-full bg-slate-100 rounded-2xl animate-pulse" />,
});

interface ClubLite {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}
interface StatsState {
  id: string;
  code: string;
  name: string;
  clubs: number;
}
interface StatsCountry {
  id: string;
  iso2: string;
  name: string;
  clubs: number;
  states: StatsState[];
}
interface StatsContinent {
  code: string;
  clubs: number;
  countries: StatsCountry[];
}
export interface GeoStats {
  generatedAt: string;
  source: string;
  totals: { clubsWithCountry: number; countries: number; states: number };
  continents: StatsContinent[];
}

const CONTINENT_LABEL: Record<string, string> = {
  AF: 'África',
  AN: 'Antártida',
  AS: 'Ásia',
  EU: 'Europa',
  NA: 'América do Norte',
  OC: 'Oceania',
  SA: 'América do Sul',
  ZZ: 'Sem continente',
};
const LIMIT = 24;

export default function MapExplorer({ stats }: { stats: GeoStats }) {
  const { dict } = useI18n();
  const m = dict.mapExplorer;

  const [continent, setContinent] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);
  const [stateId, setStateId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [clubs, setClubs] = useState<ClubLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const countsByIso2 = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of stats.continents) for (const co of c.countries) map[co.iso2] = co.clubs;
    return map;
  }, [stats]);

  const activeContinent = stats.continents.find((c) => c.code === continent) ?? null;
  const activeCountry = activeContinent?.countries.find((c) => c.id === countryId) ?? null;
  const activeState = activeCountry?.states.find((s) => s.id === stateId) ?? null;

  const buildQs = useCallback(
    (offset: number) => {
      const p = new URLSearchParams();
      p.set('limit', String(LIMIT));
      p.set('offset', String(offset));
      if (stateId) p.set('stateId', stateId);
      else if (countryId) p.set('countryId', countryId);
      else if (continent) p.set('continent', continent);
      if (query.trim()) p.set('search', query.trim());
      return p.toString();
    },
    [stateId, countryId, continent, query],
  );

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const res = await api.get<{ data: ClubLite[]; total: number }>(`/clubs?${buildQs(offset)}`);
        setClubs((prev) => (offset === 0 ? res.data : [...prev, ...res.data]));
        setTotal(res.total ?? 0);
      } catch {
        if (offset === 0) {
          setClubs([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [buildQs],
  );

  // (re)carrega quando a seleção/busca muda (offset volta a 0)
  useEffect(() => {
    void load(0);
  }, [load]);

  const fitTo = activeState
    ? activeCountry
      ? [activeCountry.iso2]
      : null
    : activeCountry
      ? [activeCountry.iso2]
      : activeContinent
        ? activeContinent.countries.map((c) => c.iso2)
        : null;

  const activeLabel = activeState
    ? `${activeCountry?.name} / ${activeState.name}`
    : activeCountry
      ? activeCountry.name
      : activeContinent
        ? (CONTINENT_LABEL[activeContinent.code] ?? activeContinent.code)
        : m.world;
  const activeCount = activeState?.clubs ?? activeCountry?.clubs ?? activeContinent?.clubs ?? 0;

  return (
    <div className="space-y-6">
      {/* Fallback acessível + navegação por região (teclado/leitor de tela) */}
      <nav aria-label={m.regions} className="space-y-2">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li>
            <button
              onClick={() => {
                setContinent(null);
                setCountryId(null);
                setStateId(null);
              }}
              className="text-primary hover:underline"
            >
              {m.world}
            </button>
          </li>
          {activeContinent && (
            <li>
              /{' '}
              <button
                onClick={() => {
                  setCountryId(null);
                  setStateId(null);
                }}
                className="text-primary hover:underline"
              >
                {CONTINENT_LABEL[activeContinent.code] ?? activeContinent.code}
              </button>
            </li>
          )}
          {activeCountry && (
            <li>
              /{' '}
              <button
                onClick={() => setStateId(null)}
                className="text-primary hover:underline"
              >
                {activeCountry.name}
              </button>
            </li>
          )}
          {activeState && <li>/ {activeState.name}</li>}
        </ol>

        <ul className="flex flex-wrap gap-2" data-testid="region-list">
          {!activeContinent &&
            stats.continents.map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => setContinent(c.code)}
                  aria-label={`${CONTINENT_LABEL[c.code] ?? c.code}, ${c.clubs} ${m.clubs}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
                >
                  {CONTINENT_LABEL[c.code] ?? c.code} · {c.clubs}
                </button>
              </li>
            ))}
          {activeContinent &&
            !activeCountry &&
            activeContinent.countries.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setCountryId(c.id)}
                  aria-label={`${c.name}, ${c.clubs} ${m.clubs}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
                >
                  {c.name} · {c.clubs}
                </button>
              </li>
            ))}
          {activeCountry &&
            !activeState &&
            activeCountry.states.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setStateId(s.id)}
                  aria-label={`${s.name}, ${s.clubs} ${m.clubs}`}
                  className="rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
                >
                  {s.name} · {s.clubs}
                </button>
              </li>
            ))}
        </ul>
        <p aria-live="polite" className="text-sm text-foreground/60">
          {activeLabel} — {activeCount} {m.clubs}
        </p>
      </nav>

      <WorldChoropleth
        countsByIso2={countsByIso2}
        activeCountry={activeCountry?.iso2 ?? null}
        fitTo={fitTo}
        onSelectCountry={(iso2) => {
          const cont = stats.continents.find((c) => c.countries.some((co) => co.iso2 === iso2));
          const co = cont?.countries.find((x) => x.iso2 === iso2);
          if (cont && co) {
            setContinent(cont.code);
            setCountryId(co.id);
            setStateId(null);
          }
        }}
      />

      {/* Busca textual (tsvector existente — NÃO preditiva) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(0);
        }}
        className="flex gap-2 max-w-md"
      >
        <label htmlFor="map-search" className="sr-only">
          {m.searchLabel}
        </label>
        <input
          id="map-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.searchLabel}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm">
          {m.searchLabel}
        </button>
      </form>

      {/* Listagem dinâmica (offset, paginada) */}
      <section aria-label={m.clubs} aria-busy={loading}>
        {clubs.length === 0 && !loading ? (
          <p className="text-sm text-foreground/60">{m.noClubs}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clubs.map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-4 text-sm">
                <Link href={`/clubs/${c.id}`} className="font-semibold text-primary hover:underline">
                  {c.name}
                </Link>
                <p className="text-foreground/60">
                  {[c.city, c.country].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
        {clubs.length < total && (
          <button
            onClick={() => void load(clubs.length)}
            disabled={loading}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? m.loading : `${m.loadMore} (${clubs.length}/${total})`}
          </button>
        )}
      </section>
    </div>
  );
}
