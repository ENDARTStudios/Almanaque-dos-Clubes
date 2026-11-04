'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { EmptyState } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';
import { wsC2Strings } from '@/i18n/wsC2';
import { wsConceitoBusca } from '@/i18n/wsConceitoBusca';

// WS-C-2 — busca global tipada sobre GET /api/v1/search/global.
// Homônimos vêm separados da API (identidade = QID); não colapsamos por nome.
//
// Conceito FICHA: a página de busca é uma LISTA AGRUPADA POR TIPO — nome, metadado e o tipo
// (em ocre) na mesma linha. O filtro de tipo continua existindo (chips) porque a API devolve a
// distribuição completa do termo, mas o modo padrão é "todos os grupos", como no quadro.
// Cidade/estádio não são tipos da busca global da API: os grupos NÃO aparecem, em vez de
// inventarmos uma seção vazia.

interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}
interface SearchResult {
  type: 'club' | 'competition' | 'player';
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  country: string | null;
  city?: string | null;
  score: number;
  sourceUrl: string | null;
  attribution?: GeoAttribution | null;
}
interface SearchResponse {
  query: string;
  normalizedQuery: string;
  type: 'all' | 'club' | 'competition' | 'player';
  results: SearchResult[];
  pagination: { limit: number; offset: number; total: number };
  /** T561 — distribuição completa do termo por tipo (independente do filtro ativo). */
  counts?: { all: number; club: number; competition: number; player: number };
  limitations: string[];
}

type Tipo = SearchResult['type'];

const TYPES: Array<'all' | Tipo> = ['all', 'club', 'player', 'competition'];
/** Ordem dos grupos no quadro: clubes → jogadores → competições. */
const GROUP_ORDER: Tipo[] = ['club', 'player', 'competition'];

function hrefDoResultado(r: SearchResult): string {
  return r.type === 'club'
    ? `/clubs/${r.id}`
    : r.type === 'player'
      ? `/players/${r.id}`
      : `/competitions/${r.id}`;
}

export default function GlobalSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useI18n();
  const s = wsC2Strings[locale].search;
  const c = wsConceitoBusca[locale];

  const initialQ = params.get('q') ?? '';
  const initialType = (params.get('type') as SearchResponse['type'] | null) ?? 'all';
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState<SearchResponse['type']>(
    type_valid(initialType) ? initialType : 'all',
  );
  const [gender, setGender] = useState<'men' | 'women' | null>(
    params.get('gender') === 'women' ? 'women' : null,
  );
  const [data, setData] = useState<SearchResponse | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (query: string, t: SearchResponse['type'], g: 'men' | 'women' | null) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setData(null);
        setState('idle');
        return;
      }
      setState('loading');
      try {
        const url = `/search/global?q=${encodeURIComponent(trimmed)}&type=${t}${
          g ? `&gender=${g}` : ''
        }&limit=20`;
        const res = await api.get<SearchResponse>(url);
        setData(res);
        setState('done');
      } catch {
        setState('error');
      }
    },
    [],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void run(q, type, gender);
      const usp = new URLSearchParams();
      if (q.trim()) usp.set('q', q.trim());
      if (type !== 'all') usp.set('type', type);
      if (gender) usp.set('gender', gender);
      const qs = usp.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, type, gender, run, router]);

  const labelDoTipo = (t: Tipo) => c.groups[t];
  const singular = (t: Tipo) => c.typeSingular[t];

  const resultados: SearchResult[] = data?.results ?? [];
  const grupos =
    type === 'all'
      ? GROUP_ORDER.filter((t) => {
          const n = data?.counts ? data.counts[t] : resultados.filter((r) => r.type === t).length;
          return n > 0;
        })
      : GROUP_ORDER.filter((t) => t === type);

  return (
    <div className="w-full">
      {/* 1. CAMPO — o elemento mais largo da página, como no quadro. */}
      <div className="relative mt-2">
        <label htmlFor="global-search-input" className="sr-only">
          {c.title}
        </label>
        <input
          id="global-search-input"
          type="search"
          role="combobox"
          aria-expanded={state === 'done'}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.placeholder}
          className="h-14 w-full rounded-[2px] border border-foreground bg-surface px-4 pr-12 text-[18px] text-foreground placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label={c.clear}
            data-testid="search-clear"
            className="absolute top-1/2 right-3 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border text-ink-2 transition-colors duration-200 hover:border-foreground hover:text-foreground"
          >
            ×
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">{c.subtitle}</p>

      {/* 2. FILTRO DE TIPO — funcionalidade preservada, em chips do conceito. */}
      <div
        className="mt-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label={c.filterLabel}
      >
        {TYPES.map((t) => {
          const ativo = type === t;
          const n = data?.counts?.[t];
          return (
            <button
              key={t}
              type="button"
              aria-pressed={ativo}
              onClick={() => setType(t)}
              data-testid={`search-type-${t}`}
              className={`inline-flex min-h-8 items-center gap-2 rounded-[2px] border px-3 text-[12px] leading-none transition-colors duration-200 ${
                ativo
                  ? 'border-foreground bg-foreground font-semibold text-background'
                  : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? c.allTypes : labelDoTipo(t)}
              {n != null ? <span className="num text-[11px] opacity-80">{n}</span> : null}
            </button>
          );
        })}
        <label className="ml-1 inline-flex min-h-8 items-center gap-2 rounded-[2px] border border-border bg-surface px-2 text-[11px] text-ink-2">
          <span className="sr-only">{c.gender}</span>
          <select
            aria-label={c.gender}
            value={gender ?? ''}
            onChange={(e) => setGender(e.target.value === '' ? null : 'women')}
            data-testid="search-gender"
            className="bg-transparent text-[11px] text-ink-2 focus:outline-none"
          >
            <option value="">
              {c.gender}: {c.allTypes}
            </option>
            <option value="women">{c.women}</option>
          </select>
        </label>
      </div>

      {/* 3. RESULTADOS — agrupados por tipo, com contagem no cabeçalho de cada grupo. */}
      <div id="global-search-results" aria-live="polite" className="mt-8">
        {state === 'loading' && <p className="text-sm text-ink-2">{s.loading}</p>}
        {state === 'error' && (
          <p role="alert" className="text-sm text-danger-ink" data-testid="search-error">
            {s.error}
          </p>
        )}
        {state === 'idle' && null}
        {state === 'done' && data ? (
          resultados.length === 0 ? (
            <div data-testid="search-empty">
              <EmptyState title={s.empty} body={fichaStrings[locale].states.emptyBody} />
            </div>
          ) : (
            <div className="space-y-8">
              {grupos.map((grupo) => {
                const doGrupo = resultados.filter((r) => r.type === grupo);
                const n = data.counts ? data.counts[grupo] : doGrupo.length;
                if (doGrupo.length === 0) return null;
                return (
                  <section key={grupo} data-testid={`search-group-${grupo}`}>
                    <h2 className="text-[12.5px] font-semibold text-foreground">
                      {labelDoTipo(grupo)} · {n}
                    </h2>
                    <ul className="mt-2 list-none p-0">
                      {doGrupo.map((r) => (
                        <li
                          key={`${r.type}-${r.id}`}
                          className="border-b border-border"
                          data-testid={`search-result-${r.type}`}
                        >
                          <Link
                            href={hrefDoResultado(r)}
                            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 py-3 transition-colors duration-200 hover:bg-surface-2 sm:grid-cols-[1.2fr_1fr_auto]"
                          >
                            <span className="font-medium text-foreground">{r.name}</span>
                            <span className="text-[11px] leading-tight text-ink-3">
                              {r.subtitle ??
                                ([r.city, r.country].filter(Boolean).join(' · ') || '—')}
                            </span>
                            <span className="text-[10px] font-semibold text-secondary">
                              {singular(r.type)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )
        ) : null}
        {state === 'done' && data ? (
          <div className="mt-8 border-t border-border pt-3">
            <p className="text-[11px] leading-snug text-ink-3">{c.note}</p>
            {data.limitations.length > 0 ? (
              <p className="mt-1 text-[11px] leading-snug text-ink-3">{data.limitations[0]}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function type_valid(v: unknown): v is 'all' | 'club' | 'competition' | 'player' {
  return v === 'all' || v === 'club' || v === 'competition' || v === 'player';
}
