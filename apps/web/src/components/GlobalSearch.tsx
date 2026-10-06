'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsC2Strings } from '@/i18n/wsC2';

// WS-C-2 — busca global tipada sobre GET /api/v1/search/global.
// Homônimos vêm separados da API (identidade = QID); não colapsamos por nome.

interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}
interface SearchResult {
  type: 'club' | 'competition';
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
  type: 'all' | 'club' | 'competition';
  results: SearchResult[];
  pagination: { limit: number; offset: number; total: number };
  limitations: string[];
}

const TYPES: Array<'all' | 'club' | 'competition'> = ['all', 'club', 'competition'];

export default function GlobalSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useI18n();
  const s = wsC2Strings[locale].search;

  const initialQ = params.get('q') ?? '';
  const initialType = (params.get('type') as SearchResponse['type'] | null) ?? 'all';
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState<SearchResponse['type']>(
    type_valid(initialType) ? initialType : 'all',
  );
  // T450 — filtro de gênero ('women' mostra só clubes/competições femininas).
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

  const typeLabel = (t: SearchResponse['type']) =>
    t === 'club' ? s.typeClub : t === 'competition' ? s.typeCompetition : s.typeAll;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <label htmlFor="global-search-input" className="sr-only">
        {s.placeholder}
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
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
          className="flex-1 px-4 py-3 bg-white border border-border rounded-xl text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        />
        <div
          role="group"
          aria-label={s.title}
          className="flex gap-1 rounded-xl border border-border p-1"
        >
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                type === t
                  ? 'bg-primary text-on-primary'
                  : 'text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
        {/* T450 — filtro de gênero (feminino) */}
        <select
          aria-label="Gênero"
          value={gender ?? ''}
          onChange={(e) => setGender(e.target.value === '' ? null : (e.target.value as 'women'))}
          data-testid="search-gender"
          className="rounded-xl border border-border px-3 py-2 text-sm bg-white"
        >
          <option value="">Gênero: todos</option>
          <option value="women">Feminino</option>
        </select>
      </div>

      <div id="global-search-results" aria-live="polite" className="mt-6">
        {state === 'loading' && <p className="text-sm text-foreground/50">{s.loading}</p>}
        {state === 'error' && (
          <p className="text-sm text-red-500" data-testid="search-error">
            {s.error}
          </p>
        )}
        {state === 'idle' && null}
        {state === 'done' && data && (
          <>
            <p className="text-xs text-foreground/40 mb-3">
              {s.total.replace('{n}', String(data.pagination.total))}
            </p>
            {data.results.length === 0 ? (
              <p className="text-sm text-foreground/50" data-testid="search-empty">
                {s.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.results.map((r) => (
                  <li
                    key={`${r.type}-${r.id}`}
                    className="py-3"
                    data-testid={`search-result-${r.type}`}
                  >
                    <Link
                      href={r.type === 'club' ? `/clubs/${r.id}` : `/competitions/${r.id}`}
                      className="block group"
                    >
                      <span className="text-xs uppercase tracking-wider text-primary/80">
                        {typeLabel(r.type)}
                      </span>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {r.name}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {r.subtitle ?? '—'}
                        {r.qid ? ` · ${r.qid}` : ''}
                      </p>
                      {r.attribution ? (
                        <span className="text-[11px] text-foreground/40">{r.attribution.geo}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-foreground/40 mt-4">{s.limitations}</p>
          </>
        )}
      </div>
    </div>
  );
}

function type_valid(v: unknown): v is 'all' | 'club' | 'competition' {
  return v === 'all' || v === 'club' || v === 'competition';
}
