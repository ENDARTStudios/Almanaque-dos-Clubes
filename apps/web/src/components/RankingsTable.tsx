'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

// T438 — Tabela de Rankings 0-100 (cursor-based, filtros ano/gênero/país).

interface RankingMeta {
  id: string;
  name: string;
  season: string | null;
  competitionId: string | null;
}

interface RankingEntryRow {
  position: number | null;
  points: number | null;
  clubId: string;
  clubName: string;
  country: string | null;
  state: string | null;
  city: string | null;
  baseMatches: number | null;
  baseTitles: number | null;
  gender: string | null;
}

interface EntriesResponse {
  ranking: RankingMeta | null;
  data: RankingEntryRow[];
  cursor: number | null;
}

interface PublishedRanking {
  id: string;
  name: string;
  season: string | null;
  competitionId: string | null;
}

const LIMIT = 25;

export default function RankingsTable() {
  const { dict } = useI18n();
  const t = dict.pages.rankings;

  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [meta, setMeta] = useState<RankingMeta | null>(null);
  const [rows, setRows] = useState<RankingEntryRow[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const query = useCallback(
    (cursorPos: number | null): string => {
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      if (gender) params.set('gender', gender);
      if (country) params.set('country', country);
      params.set('limit', String(LIMIT));
      if (cursorPos !== null) params.set('cursor', String(cursorPos));
      return `/rankings/entries?${params.toString()}`;
    },
    [year, gender, country],
  );

  // Anos disponíveis (rankings publicados) para o filtro.
  useEffect(() => {
    let active = true;
    api
      .get<{ data: PublishedRanking[] }>('/rankings?published=true&limit=100')
      .then((res) => {
        if (!active) return;
        const seasons = [
          ...new Set(res.data.map((r) => r.season).filter((s): s is string => !!s)),
        ].sort((a, b) => b.localeCompare(a));
        setYears(seasons);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(
    async (append: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get<EntriesResponse>(query(append ? cursor : null));
        setMeta(res.ranking);
        setRows((prev) => (append ? [...prev, ...res.data] : res.data));
        setCursor(res.cursor);
        if (!append) {
          const cs = [...new Set(res.data.map((r) => r.country).filter((c): c is string => !!c))];
          setCountries(cs.sort());
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [query, cursor],
  );

  // Recarrega na troca de filtros (sempre do início).
  useEffect(() => {
    setCursor(null);
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, gender, country]);

  const hasFilters = useMemo(
    () => year !== '' || gender !== '' || country !== '',
    [year, gender, country],
  );
  const selectClass = 'rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground';

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          <span>{t.filterYear}</span>
          <select
            aria-label={t.filterYear}
            className={selectClass}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">{t.all}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          <span>{t.filterGender}</span>
          <select
            aria-label={t.filterGender}
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">{t.all}</option>
            <option value="men">{t.genderMen}</option>
            <option value="women">{t.genderWomen}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          <span>{t.filterCountry}</span>
          <select
            aria-label={t.filterCountry}
            className={selectClass}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">{t.all}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {meta ? (
          <p className="ml-auto text-xs text-foreground/50">
            {t.updated.replace('{name}', meta.name)}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 py-6">
          Erro ao carregar rankings.
        </p>
      ) : rows.length === 0 && !loading ? (
        <p className="text-sm text-foreground/50 py-6">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-foreground/5 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.colPosition}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.colClub}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.colPoints}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.colBase}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.clubId}-${r.position}`} className="border-t border-border">
                  <td className="px-4 py-3 font-mono">{r.position}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clubs/${r.clubId}`} className="text-primary hover:underline">
                      {r.clubName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.points}</td>
                  <td className="px-4 py-3 text-foreground/60">
                    {t.baseOf
                      .replace('{m}', String(r.baseMatches ?? 0))
                      .replace('{t}', String(r.baseTitles ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        {cursor !== null && !loading ? (
          <button
            type="button"
            onClick={() => void load(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-foreground/5"
          >
            {t.loadMore}
          </button>
        ) : null}
        {loading ? <p className="text-sm text-foreground/50">…</p> : null}
      </div>
      {hasFilters ? null : null}
    </div>
  );
}
