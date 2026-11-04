'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsConceitoRankings } from '@/i18n/wsConceitoRankings';
import { countryName } from '@/lib/country-flag';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';
import { fichaStrings } from '@/i18n/wsFicha';
import RankingsTable, { type RankingRowData, type RankingsView } from './RankingsTable';
import CriteriaNote from './CriteriaNote';

/**
 * ÍNDICE DE RANKINGS no conceito FICHA.
 *
 * ── O QUE MUDOU, E O QUE NÃO MUDOU ──────────────────────────────────────────────────────────
 * A tabela antiga (`RankingsTable` + `ui/DataTable`) fazia o trabalho de dados: filtros por
 * ano/tipo/competição/gênero/país/busca, duas réguas (divisão e pirâmide) e paginação por
 * cursor. Toda essa LÓGICA foi preservada aqui, chamada por chamada — o que mudou é a
 * COMPOSIÇÃO: cabeçalho da ficha no servidor (FichaHead), tabela densa do conceito, bloco de
 * critério em `surface-2` e procedência no pé.
 *
 * ── POR QUE O "CARREGAR MAIS" CONTINUA ─────────────────────────────────────────────────────
 * A paginação do endpoint é por CURSOR (última posição recebida), não por offset de URL: um
 * `?page=2` não existe no contrato público. Preservar o cursor preserva a única paginação que o
 * dado suporta.
 *
 * ── O QUE O DESENHO PEDE E O DADO NÃO TEM ──────────────────────────────────────────────────
 * "Var." (variação) e "Últ. 5" (forma) não existem em `/rankings/entries`. A tabela troca as
 * duas por Títulos (`baseTitles`) e Base auditável (`baseMatches`), que são reais. Nenhum
 * número é ilustrativo.
 */
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
  competition?: CompetitionTier | null;
}

interface EntriesResponse {
  ranking: RankingMeta | null;
  data: RankingRowData[];
  cursor: number | null;
  /** FACET de países calculado pela API sobre o recorte inteiro (T579 · item 21). */
  countries?: string[];
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

/** Campo de formulário no raio do conceito (2px) — `.field` usa 8px. */
const FIELD_CLASS =
  'min-h-9 w-full max-w-full rounded-[2px] border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-ink-2 placeholder:opacity-100';
const LABEL_CLASS = 'flex min-w-0 flex-col gap-1 text-[11px] font-medium text-ink-3';
const FIELD_LABEL = `${LABEL_CLASS} sm:w-[160px]`;

export default function RankingsIndex() {
  const { locale } = useI18n();
  const s = wsConceitoRankings[locale];
  const states = fichaStrings[locale].states;

  const [view, setView] = useState<RankingsView>('division');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [competition, setCompetition] = useState('');
  const [type, setType] = useState<'club' | 'player'>('club');
  const [allRankings, setAllRankings] = useState<PublishedRanking[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [meta, setMeta] = useState<RankingMeta | null>(null);
  const [rows, setRows] = useState<RankingRowData[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Escopos publicados do TIPO selecionado (clubes x jogadores).
  // Escopos publicados do TIPO selecionado (clubes x jogadores). É dado DERIVADO da lista
  // publicada — `useMemo`, não estado: uma cópia em estado só criaria um render extra.
  const scopes = useMemo<ScopeOption[]>(() => {
    const seen = new Set<string>();
    const options: ScopeOption[] = [];
    for (const r of allRankings) {
      if (r.scope) continue;
      if ((r.type ?? 'club') !== type) continue;
      const value = r.competitionId ?? 'global';
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: r.name });
    }
    return options;
  }, [allRankings, type]);

  const buildQuery = useCallback(
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
          ...new Set(res.data.map((r) => r.season).filter((value): value is string => !!value)),
        ].sort((a, b) => b.localeCompare(a));
        setYears(seasons);
        setAllRankings(res.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(
    async (cursorPos: number | null, append: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get<EntriesResponse>(buildQuery(cursorPos));
        setMeta(res.ranking);
        setRows((prev) => (append ? [...prev, ...res.data] : res.data));
        setCursor(res.cursor);
        if (!append) {
          /*
           * T579 (item 21) — o filtro de país NÃO sai das linhas da página (que no recorte padrão
           * têm um país só): sai do FACET que a API calcula sobre o recorte inteiro. O fallback
           * para as linhas existe apenas para uma API antiga, sem o campo.
           */
          const doFacet = res.countries ?? [];
          const cs = doFacet.length
            ? doFacet
            : [...new Set(res.data.map((r) => r.country).filter((c): c is string => !!c))];
          setCountries(cs);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery],
  );

  // Recarrega do início quando QUALQUER filtro que molda a consulta muda.
  useEffect(() => {
    void load(null, false);
  }, [load]);

  const countryOptions = useMemo(
    () =>
      countries
        .map((code) => ({ code, label: countryName(code, locale) ?? code }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [countries, locale],
  );

  const hasFilters =
    year !== '' ||
    gender !== '' ||
    country !== '' ||
    search !== '' ||
    competition !== '' ||
    view !== 'division' ||
    type !== 'club';

  const clearFilters = () => {
    setYear('');
    setGender('');
    setCountry('');
    setSearchInput('');
    setSearch('');
    setCompetition('');
    setType('club');
    setView('division');
  };

  const clearButton = hasFilters ? (
    <button
      type="button"
      onClick={clearFilters}
      data-testid="rankings-clear"
      className="inline-flex min-h-9 items-center rounded-[2px] border border-border bg-surface px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-foreground"
    >
      {s.clear}
    </button>
  ) : null;

  return (
    <div className="mt-6">
      {/* 1. FILTROS — estreitam o recorte. O conceito não desenha filtros porque o quadro é a
             composição ideal; a funcionalidade da página real continua inteira aqui, no mesmo
             vocabulário visual (raio 2px, borda de 1px, campo em `surface`). */}
      <section aria-labelledby="rankings-filters-title" data-testid="rankings-filters">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="rankings-filters-title"
            className="text-[12.5px] font-semibold leading-tight text-foreground"
          >
            {s.filtersTitle}
          </h2>
          <div role="tablist" aria-label={s.filtersTitle} className="flex flex-wrap gap-2">
            {(['division', 'pyramid'] as const).map((value) => {
              const active = view === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`rankings-tab-${value}`}
                  onClick={() => setView(value)}
                  className={`inline-flex min-h-9 items-center rounded-[2px] border px-3 text-sm font-semibold transition-colors duration-200 ${
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {value === 'division' ? s.viewDivision : s.viewPyramid}
                </button>
              );
            })}
          </div>
        </div>

        {view === 'pyramid' ? (
          <p
            data-testid="pyramid-disclaimer"
            className="mt-3 max-w-[92ch] rounded-[2px] border border-border bg-surface-2 px-3 py-2 text-[11px] leading-snug text-ink-2"
          >
            {s.pyramidDisclaimer}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
          <label className={FIELD_LABEL}>
            <span>{s.filterYear}</span>
            <select
              aria-label={s.filterYear}
              className={FIELD_CLASS}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">{s.all}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          {view === 'division' ? (
            <label className={FIELD_LABEL}>
              <span>{s.filterType}</span>
              <select
                aria-label={s.filterType}
                className={FIELD_CLASS}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as 'club' | 'player');
                  // Trocar de régua invalida o escopo escolhido (o ranking pertence ao outro tipo).
                  setCompetition('');
                }}
              >
                <option value="club">{s.typeClubs}</option>
                <option value="player">{s.typePlayers}</option>
              </select>
            </label>
          ) : null}

          {view === 'division' && scopes.length > 0 ? (
            <label className={`${LABEL_CLASS} sm:w-[220px]`}>
              <span>{s.filterCompetition}</span>
              <select
                aria-label={s.filterCompetition}
                className={FIELD_CLASS}
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              >
                <option value="">{s.all}</option>
                {scopes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className={FIELD_LABEL}>
            <span>{s.filterGender}</span>
            <select
              aria-label={s.filterGender}
              className={FIELD_CLASS}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">{s.all}</option>
              <option value="men">{s.men}</option>
              <option value="women">{s.women}</option>
            </select>
          </label>

          <label className={FIELD_LABEL}>
            <span>{s.filterCountry}</span>
            <select
              aria-label={s.filterCountry}
              className={FIELD_CLASS}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">{s.all}</option>
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label === option.code ? option.code : `${option.label} (${option.code})`}
                </option>
              ))}
            </select>
          </label>

          <label className={`${LABEL_CLASS} col-span-2 sm:col-span-1 sm:w-[210px]`}>
            <span>{s.searchClub}</span>
            <input
              type="text"
              aria-label={s.searchClub}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={() => setSearch(searchInput.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearch(searchInput.trim());
              }}
              placeholder={s.searchClub}
              className={FIELD_CLASS}
            />
          </label>

          <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
            <button
              type="button"
              onClick={() => setSearch(searchInput.trim())}
              className="inline-flex min-h-9 w-full items-center justify-center rounded-[2px] border border-foreground bg-foreground px-4 text-sm font-semibold text-background transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-on-primary sm:w-auto"
            >
              {s.search}
            </button>
            {clearButton}
          </div>
        </div>

        {meta ? (
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-[11px] leading-tight text-ink-3">
            <p>{s.currentRanking.replace('{name}', meta.name)}</p>
            {meta.competition?.divisionLabel ? (
              <span
                data-testid="ranking-division-badge"
                className="inline-flex min-h-6 items-center rounded-[2px] border border-border bg-surface px-2 text-[11px] font-semibold text-ink-2"
              >
                {meta.competition.divisionLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* 2. A TABELA — o produto. Estado de erro, vazio e carregando continuam existindo (o
             conceito não os desenha, mas dado ausente é lacuna declarada, nunca tela em branco). */}
      <div className="mt-6" aria-busy={loading}>
        {error ? (
          <ErrorState
            title={states.errorTitle}
            body={states.errorBody}
            retryLabel={states.retry}
            retryAction={
              <button
                type="button"
                onClick={() => void load(null, false)}
                className="inline-flex min-h-9 items-center rounded-[2px] border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-foreground"
              >
                {states.retry}
              </button>
            }
          />
        ) : loading && rows.length === 0 ? (
          <p role="status" className="py-8 text-sm text-ink-3">
            {s.loading}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState title={s.emptyTitle} body={s.emptyBody} action={clearButton} />
        ) : (
          <RankingsTable rows={rows} locale={locale} view={view} s={s} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {cursor !== null && !loading && rows.length > 0 ? (
          <button
            type="button"
            onClick={() => void load(cursor, true)}
            data-testid="rankings-load-more"
            className="inline-flex min-h-9 items-center rounded-[2px] border border-foreground bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-on-primary"
          >
            {s.loadMore}
          </button>
        ) : null}
        {loading && rows.length > 0 ? (
          <p role="status" className="text-sm text-ink-3">
            {s.loading}
          </p>
        ) : null}
      </div>

      {/* 3. O CRITÉRIO — o que separa ranking de opinião (bloco `surface-2` do conceito). */}
      <CriteriaNote s={s} />

      {/* 4. PROCEDÊNCIA — no PÉ, abaixo do dado, sem caixa, sem caixa alta, 11px. */}
      <div className="mt-6">
        <SourceNote
          label={s.provenanceLead}
          detail={s.provenanceBody}
          data-testid="ranking-pilot-badge"
        />
        <p className="text-[0.6875rem] leading-snug">
          <Link
            href="/metodologia#ranking-piloto-inglaterra"
            className="text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {s.provenanceLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
