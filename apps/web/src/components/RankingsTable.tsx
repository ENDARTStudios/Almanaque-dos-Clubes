'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
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
  // T549 — `max-w-full` sozinho era inócuo: o `<label>` é item de `flex flex-wrap` com
  // `min-width: auto`, então o select de competição (rótulo longo = 428px) esticava o pai e
  // o `max-width: 100%` resolvia contra os próprios 428px (overflow de +54px a 390px e
  // +124px a 320px). A correção é `min-w-0` no label (deixa encolher) + `w-full` no select.
  const selectClass =
    'w-full max-w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

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
        <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
          <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
          <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
        <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
        <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
        <label className="flex min-w-0 flex-col gap-1 text-sm text-foreground/70">
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
        <p role="alert" className="py-6 text-sm text-danger-ink">
          Erro ao carregar rankings.
        </p>
      ) : rows.length === 0 && !loading ? (
        <p className="py-6 text-sm text-ink-2">{t.empty}</p>
      ) : (
        /* As colunas são DECLARADAS (ver `ui/DataTable`), e não montadas à mão como antes.
           O ganho concreto: `numeric` aplica `.num` (Barlow Condensed + numeral tabular) e
           alinha à direita. Antes, os números usavam `font-mono` alinhado à ESQUERDA, então
           `100` e `9` começavam no mesmo x e a coluna não se lia de cima a baixo — que é a
           única razão de existir uma coluna de número. */
        <DataTable
          caption={t.title}
          dense
          rows={rows}
          rowKey={(r) => `${r.playerId ?? r.clubId}-${r.position}`}
          columns={[
            {
              key: 'position',
              label: t.colPosition,
              numeric: true,
              cellClass: 'text-ink-2',
              cell: (r) => r.position ?? '—',
            },
            {
              key: 'club',
              label: t.colClub,
              cell: (r) =>
                r.playerId ? (
                  <Link
                    href={`/players/${r.playerId}`}
                    className="text-primary-ink hover:underline"
                  >
                    {r.playerName}
                  </Link>
                ) : r.clubId ? (
                  <Link href={`/clubs/${r.clubId}`} className="text-primary-ink hover:underline">
                    {r.clubName}
                  </Link>
                ) : (
                  (r.clubName ?? r.playerName ?? '—')
                ),
            },
            {
              key: 'points',
              label: t.colPoints,
              numeric: true,
              cellClass: 'font-semibold text-foreground',
              cell: (r) => r.points ?? '—',
            },
            ...(view === 'pyramid'
              ? [
                  {
                    key: 'division',
                    label: t.colDivision,
                    cell: (r: RankingEntryRow) => r.divisionLabel ?? '—',
                  },
                  {
                    key: 'level',
                    label: t.colLevel,
                    numeric: true,
                    cellClass: 'text-ink-2',
                    cell: (r: RankingEntryRow) => r.divisionLevel ?? '—',
                  },
                  {
                    key: 'multiplier',
                    label: t.colMultiplier,
                    numeric: true,
                    cellClass: 'text-ink-2',
                    cell: (r: RankingEntryRow) => r.multiplier ?? '—',
                  },
                ]
              : [
                  {
                    key: 'base',
                    label: t.colBase,
                    // Esta célula é uma FRASE, não uma coluna de número: "com base em 58
                    // partidas / 0 títulos". Quebrá-la em duas colunas deixaria os números
                    // alinhados mas perderia o sentido — "58" sozinho não diz se são partidas
                    // ou títulos. Então ela fica como está e apenas ganha numeral tabular, para
                    // os dígitos não mudarem de largura de uma linha para outra.
                    cellClass: 'text-ink-2',
                    cell: (r: RankingEntryRow) => (
                      <span className="[font-variant-numeric:tabular-nums]">
                        {t.baseOf
                          // T548 — base ausente é LACUNA, não zero: "0 partidas" é um número
                          // com cara de real afirmando algo que o acervo não sabe.
                          .replace('{m}', r.baseMatches == null ? '—' : String(r.baseMatches))
                          .replace('{t}', String(r.baseTitles ?? 0))}
                      </span>
                    ),
                  },
                ]),
          ]}
        />
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
