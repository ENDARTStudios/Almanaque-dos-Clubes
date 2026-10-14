'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

// T438 — Tabela de Rankings 0-100 (cursor-based, filtros ano/gênero/país).

interface CompetitionTier {
  id: string;
  qid: string | null;
  name: string | null;
  level: number | null;
  divisionLabel: string | null;
  tierSource: string | null;
  tierVersion: string | null;
}

interface RankingMeta {
  id: string;
  name: string;
  season: string | null;
  competitionId: string | null;
  // T449c-v1 — tier/divisão (aditivo; pode ser null).
  competition?: CompetitionTier | null;
}

interface RankingEntryRow {
  position: number | null;
  points: number | null;
  /** T522 — em ranking de jogador estes vêm nulos e playerId/playerName preenchidos. */
  clubId: string | null;
  clubName: string | null;
  playerId?: string | null;
  playerName?: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  baseMatches: number | null;
  baseTitles: number | null;
  gender: string | null;
  // T449c-v2 — presentes só na visão agregada (Pirâmide nacional).
  divisionLevel?: number | null;
  divisionLabel?: string | null;
  multiplier?: number | null;
  intraScore?: number | null;
  adjustedScore?: number | null;
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
  scope?: string | null;
  type?: string | null;
}

/** Opção do seletor de escopo: uma competição, ou o agregado geral (todos os clubes). */
interface ScopeOption {
  value: string;
  label: string;
}

const LIMIT = 25;

export default function RankingsTable() {
  const { dict } = useI18n();
  const t = dict.pages.rankings;

  const [view, setView] = useState<'division' | 'pyramid'>('division');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [competition, setCompetition] = useState('');
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [type, setType] = useState<'club' | 'player'>('club');
  const [allRankings, setAllRankings] = useState<PublishedRanking[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [meta, setMeta] = useState<RankingMeta | null>(null);
  const [rows, setRows] = useState<RankingEntryRow[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // T522 — escopos publicados do TIPO selecionado (clubes x jogadores).
  useEffect(() => {
    const seen = new Set<string>();
    const opts: ScopeOption[] = [];
    for (const r of allRankings) {
      if (r.scope) continue;
      if ((r.type ?? 'club') !== type) continue;
      const value = r.competitionId ?? 'global';
      if (seen.has(value)) continue;
      seen.add(value);
      opts.push({ value, label: r.name });
    }
    setScopes(opts);
    setCompetition('');
  }, [allRankings, type]);

  const query = useCallback(
    (cursorPos: number | null): string => {
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      if (gender) params.set('gender', gender);
      if (country) params.set('country', country);
      if (search) params.set('search', search);
      if (view === 'pyramid') params.set('scope', 'country_pyramid');
      else if (competition) params.set('competitionId', competition);
      if (view !== 'pyramid') params.set('type', type);
      params.set('limit', String(LIMIT));
      if (cursorPos !== null) params.set('cursor', String(cursorPos));
      return `/rankings/entries?${params.toString()}`;
    },
    [year, gender, country, search, view, competition, type],
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
        // T521 — escopos publicados: cada competição e o agregado geral
        // (`competitionId` nulo vira o sentinela 'global' aceito pela API).
        setAllRankings(res.data);
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
  }, [year, gender, country, view, search]);

  const hasFilters = useMemo(
    () => year !== '' || gender !== '' || country !== '',
    [year, gender, country],
  );
  // T548 — `max-w-full`: o select de competição media 428px e estourava a linha a
  // 390px (+54px de overflow) e a 320px (+124px).
  const selectClass =
    'max-w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  return (
    <div className="mt-8">
      {/* T449a-close — rótulo honesto do piloto (Inglaterra/RSSSF/tabelas-só) */}
      <div
        className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-xs"
        data-testid="ranking-pilot-badge"
      >
        <span className="font-semibold text-foreground">{t.pilotBadge}</span>
        <span className="text-foreground/60">{t.pilotSubtitle}</span>
        <Link
          href="/metodologia#ranking-piloto-inglaterra"
          className="text-primary-ink hover:underline"
        >
          {t.pilotMethodology}
        </Link>
      </div>
      <div role="tablist" aria-label={t.title} className="mb-4 flex flex-wrap gap-2">
        {(['division', 'pyramid'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            data-testid={`rankings-tab-${v}`}
            onClick={() => setView(v)}
            className={
              'rounded-lg border px-3 py-1.5 text-sm font-semibold ' +
              (view === v
                ? 'border-primary bg-primary/10 text-primary-ink'
                : 'border-border text-foreground/70 hover:bg-foreground/5')
            }
          >
            {v === 'division' ? t.viewDivision : t.viewPyramid}
          </button>
        ))}
      </div>
      {view === 'pyramid' ? (
        <p
          data-testid="pyramid-disclaimer"
          className="mb-4 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-xs text-foreground/70"
        >
          {t.pyramidDisclaimer}
        </p>
      ) : null}
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
        {view === 'division' ? (
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            <span>{t.filterType}</span>
            <select
              aria-label={t.filterType}
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as 'club' | 'player')}
            >
              <option value="club">{t.typeClubs}</option>
              <option value="player">{t.typePlayers}</option>
            </select>
          </label>
        ) : null}
        {view === 'division' && scopes.length > 0 ? (
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            <span>{t.filterCompetition}</span>
            <select
              aria-label={t.filterCompetition}
              className={selectClass}
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
            >
              <option value="">{t.all}</option>
              {scopes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          <span>{t.searchClub}</span>
          <input
            type="text"
            aria-label={t.searchClub}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => setSearch(searchInput.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(searchInput.trim());
            }}
            placeholder={t.searchClub}
            className={selectClass}
          />
        </label>
        {meta?.competition?.divisionLabel ? (
          <span
            data-testid="ranking-division-badge"
            className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground/70"
          >
            {meta.competition.divisionLabel}
          </span>
        ) : null}
        {meta ? (
          <p className="ml-auto text-xs text-foreground/70">
            {t.updated.replace('{name}', meta.name)}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger-ink py-6">
          Erro ao carregar rankings.
        </p>
      ) : rows.length === 0 && !loading ? (
        <p className="text-sm text-foreground/70 py-6">{t.empty}</p>
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
                {view === 'pyramid' ? (
                  <>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.colDivision}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.colLevel}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.colMultiplier}
                    </th>
                  </>
                ) : (
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.colBase}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.playerId ?? r.clubId}-${r.position}`}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3 font-mono">{r.position}</td>
                  <td className="px-4 py-3">
                    {r.playerId ? (
                      <Link
                        href={`/players/${r.playerId}`}
                        className="text-primary-ink hover:underline"
                      >
                        {r.playerName}
                      </Link>
                    ) : (
                      <Link href={`/clubs/${r.clubId}`} className="text-primary-ink hover:underline">
                        {r.clubName}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.points}</td>
                  {view === 'pyramid' ? (
                    <>
                      <td className="px-4 py-3">{r.divisionLabel ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{r.divisionLevel ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{r.multiplier ?? '—'}</td>
                    </>
                  ) : (
                    <td className="px-4 py-3 text-foreground/60">
                      {t.baseOf
                        // T548 — base ausente é LACUNA, não zero: "0 partidas" é um
                        // número com cara de real afirmando algo que o acervo não sabe.
                        .replace('{m}', r.baseMatches == null ? '—' : String(r.baseMatches))
                        .replace('{t}', String(r.baseTitles ?? 0))}
                    </td>
                  )}
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
        {loading ? <p className="text-sm text-foreground/70">…</p> : null}
      </div>
      {hasFilters ? null : null}
    </div>
  );
}
