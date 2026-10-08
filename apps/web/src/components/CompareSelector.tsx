'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import CompareMetrics from '@/components/CompareMetrics';
import CompareRadar from '@/components/CompareRadar';
import CompareTimeline from '@/components/CompareTimeline';
import CompareTitles from '@/components/CompareTitles';
import type { RadarMetricInput } from '@/lib/compare-radar';
import type { Dictionary } from '@/i18n/types';

// T440 — Comparadores: selector com autocomplete + resultados lado-a-lado.

export type CompareType = 'clubs' | 'players';

interface SearchItem {
  id: string;
  label: string;
  sub?: string | null;
}

interface CompareData {
  kind: 'clubs' | 'players';
  a: Record<string, unknown>;
  b: Record<string, unknown>;
  comparison: Record<string, unknown>;
}

export default function CompareSelector({
  initialType = 'clubs',
  initialA = '',
  initialB = '',
}: {
  initialType?: CompareType;
  initialA?: string;
  initialB?: string;
}) {
  const { dict } = useI18n();
  const t = dict.pages.compare;
  const router = useRouter();

  const [type, setType] = useState<CompareType>(initialType);
  const [a, setA] = useState<SearchItem | null>(
    initialA ? { id: initialA, label: initialA } : null,
  );
  const [b, setB] = useState<SearchItem | null>(
    initialB ? { id: initialB, label: initialB } : null,
  );
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [optionsA, setOptionsA] = useState<SearchItem[]>([]);
  const [optionsB, setOptionsB] = useState<SearchItem[]>([]);
  const [result, setResult] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  // T072 — carimbo do relatório impresso (evita mismatch de hidratação: só preenche pós-mount).
  const [printedAt, setPrintedAt] = useState('');
  useEffect(() => {
    setPrintedAt(new Date().toISOString().slice(0, 10));
  }, []);

  const search = useCallback(
    async (term: string, setter: (items: SearchItem[]) => void) => {
      if (term.trim().length < 2) {
        setter([]);
        return;
      }
      try {
        if (type === 'clubs') {
          const res = await api.get<{
            data: Array<{ id: string; name: string; country: string | null }>;
          }>(`/clubs?search=${encodeURIComponent(term)}&limit=8`);
          setter(res.data.map((c) => ({ id: c.id, label: c.name, sub: c.country })));
        } else {
          const res = await api.get<{
            data: Array<{ id: string; fullName: string; position: string | null }>;
          }>(`/players?search=${encodeURIComponent(term)}&limit=8`);
          setter(res.data.map((p) => ({ id: p.id, label: p.fullName, sub: p.position })));
        }
      } catch {
        setter([]);
      }
    },
    [type],
  );

  useEffect(() => {
    const h = setTimeout(() => void search(searchA, setOptionsA), 300);
    return () => clearTimeout(h);
  }, [searchA, search]);
  useEffect(() => {
    const h = setTimeout(() => void search(searchB, setOptionsB), 300);
    return () => clearTimeout(h);
  }, [searchB, search]);

  const ready = useMemo(() => a !== null && b !== null && a.id !== b.id, [a, b]);

  const runCompare = useCallback(async (): Promise<void> => {
    if (!ready || !a || !b) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await api.get<CompareData>(`/compare/${type}?ids=${a.id},${b.id}`);
      setResult(data);
      router.replace(`/compare?type=${type}&a=${a.id}&b=${b.id}`, { scroll: false });
    } catch {
      setNotFound(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [ready, a, b, type, router]);

  // Deep-link (?type&a&b): compara automaticamente no primeiro load.
  useEffect(() => {
    if (initialA && initialB && initialA !== initialB) void runCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listClass =
    'absolute z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-56 overflow-auto';
  const optClass = 'px-3 py-2 text-sm cursor-pointer hover:bg-primary/10';

  return (
    <div className="mt-8">
      <div className="no-print flex gap-2 mb-4" role="tablist" aria-label={t.title}>
        {(['clubs', 'players'] as CompareType[]).map((tp) => (
          <button
            key={tp}
            role="tab"
            aria-selected={type === tp}
            onClick={() => {
              setType(tp);
              setA(null);
              setB(null);
              setResult(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              type === tp
                ? 'bg-primary text-on-primary border-primary'
                : 'border-border text-foreground/70'
            }`}
          >
            {tp === 'clubs' ? t.typeClubs : t.typePlayers}
          </button>
        ))}
      </div>

      <div className="no-print grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        {(
          [
            {
              term: searchA,
              setTerm: setSearchA,
              sel: a,
              setSel: setA,
              opts: optionsA,
              setOpts: setOptionsA,
              ph: t.searchPlaceholderA,
              label: 'A',
            },
            {
              term: searchB,
              setTerm: setSearchB,
              sel: b,
              setSel: setB,
              opts: optionsB,
              setOpts: setOptionsB,
              ph: t.searchPlaceholderB,
              label: 'B',
            },
          ] as const
        ).map((f) => (
          <div key={f.label} className="relative">
            <label className="block text-xs text-foreground/60 mb-1" htmlFor={`cmp-${f.label}`}>
              {f.label}
            </label>
            <input
              id={`cmp-${f.label}`}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              placeholder={f.ph}
              value={f.sel ? f.sel.label : f.term}
              onChange={(e) => {
                f.setSel(null);
                f.setTerm(e.target.value);
              }}
              autoComplete="off"
            />
            {!f.sel && f.opts.length > 0 ? (
              <ul className={listClass} role="listbox" aria-label={f.ph}>
                {f.opts.map((o) => (
                  <li key={o.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className={`${optClass} w-full text-left`}
                      onClick={() => {
                        f.setSel(o);
                        f.setTerm('');
                        f.setOpts([]);
                      }}
                    >
                      {o.label}
                      {o.sub ? <span className="text-foreground/40"> · {o.sub}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          disabled={!ready || loading}
          onClick={() => void runCompare()}
          className="h-[38px] px-5 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-40"
        >
          {loading ? '…' : t.compareBtn}
        </button>
      </div>

      {notFound ? (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {t.noData}
        </p>
      ) : null}
      {!ready ? <p className="mt-6 text-sm text-foreground/50">{t.selectBoth}</p> : null}

      {result ? (
        <>
          {/* T072 — cabeçalho só impresso + botão de exportação (print → PDF do navegador). */}
          <div className="print-only" aria-hidden="true">
            <p className="text-xs mb-1">
              {dict.site.name} · {t.printTitle} · {printedAt}
            </p>
            <p className="text-lg font-semibold">
              {(result.a as { name: string }).name} vs {(result.b as { name: string }).name}
            </p>
          </div>
          <div className="no-print mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-primary/10"
            >
              {t.exportPdf}
            </button>
          </div>
        </>
      ) : null}

      {result && result.kind === 'clubs' ? (
        <div className="mt-8 space-y-10">
          <CompareRadar
            aName={(result.a as { name: string }).name}
            bName={(result.b as { name: string }).name}
            metrics={buildClubRadarMetrics(result, t)}
          />
          <CompareMetrics
            aName={(result.a as { name: string }).name}
            bName={(result.b as { name: string }).name}
            rows={[
              {
                metric: t.titlesTotal,
                a: (result.a as { titles: { total: number } }).titles.total,
                b: (result.b as { titles: { total: number } }).titles.total,
              },
              {
                metric: t.rankingPoints,
                a: (result.comparison as { rankingPoints: { a: number | null } }).rankingPoints.a,
                b: (result.comparison as { rankingPoints: { b: number | null } }).rankingPoints.b,
              },
              {
                metric: t.foundedYear,
                a: (result.a as { foundedYear: number | null }).foundedYear,
                b: (result.b as { foundedYear: number | null }).foundedYear,
              },
              {
                metric: t.stadiumCapacity,
                a:
                  (result.a as { stadium: { capacity: number | null } | null }).stadium?.capacity ??
                  null,
                b:
                  (result.b as { stadium: { capacity: number | null } | null }).stadium?.capacity ??
                  null,
              },
              {
                metric: t.matches,
                a: null,
                b: null,
                note: (result.comparison as { matches: { reason: string } }).matches.reason,
              },
            ]}
          />
          <CompareTitles
            aName={(result.a as { name: string }).name}
            bName={(result.b as { name: string }).name}
            aTitles={(result.a as { titles: Record<string, number> }).titles}
            bTitles={(result.b as { titles: Record<string, number> }).titles}
          />
          <CompareTimeline
            aName={(result.a as { name: string }).name}
            bName={(result.b as { name: string }).name}
            aHistory={
              (
                result.a as {
                  rankingHistory: Array<{ season: string | null; points: number | null }>;
                }
              ).rankingHistory
            }
            bHistory={
              (
                result.b as {
                  rankingHistory: Array<{ season: string | null; points: number | null }>;
                }
              ).rankingHistory
            }
          />
          <p className="text-xs text-foreground/40">
            <Link href="/rankings" className="underline">
              {dict.nav.rankings}
            </Link>
          </p>
        </div>
      ) : null}

      {result && result.kind === 'players' ? (
        <div className="mt-8">
          <CompareMetrics
            aName={(result.a as { name: string }).name}
            bName={(result.b as { name: string }).name}
            rows={[
              {
                metric: t.matches,
                a: null,
                b: null,
                note: (result.comparison as { note: string }).note,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

// T072 — eixos do radar de clubes. "Anos de história" = ano corrente − fundação
// (clube mais antigo ⇒ eixo maior). Fundação ausente/inválida ⇒ null (sai do
// radar; nunca vira 0 plotável). Roda só pós-fetch, client-side.
function buildClubRadarMetrics(
  result: CompareData,
  t: Dictionary['pages']['compare'],
): RadarMetricInput[] {
  interface ClubSide {
    titles: { total: number };
    foundedYear: number | null;
    stadium: { capacity: number | null } | null;
  }
  const a = result.a as unknown as ClubSide;
  const b = result.b as unknown as ClubSide;
  const cmp = result.comparison as { rankingPoints: { a: number | null; b: number | null } };
  const year = new Date().getFullYear();
  const history = (foundedYear: number | null): number | null =>
    typeof foundedYear === 'number' && foundedYear > 0 && foundedYear <= year
      ? year - foundedYear
      : null;
  return [
    { key: 'titles', label: t.titlesTotal, a: a.titles.total, b: b.titles.total },
    {
      key: 'ranking',
      label: t.rankingPoints,
      a: cmp.rankingPoints.a,
      b: cmp.rankingPoints.b,
    },
    { key: 'history', label: t.historyYears, a: history(a.foundedYear), b: history(b.foundedYear) },
    {
      key: 'stadium',
      label: t.stadiumCapacity,
      a: a.stadium?.capacity ?? null,
      b: b.stadium?.capacity ?? null,
    },
  ];
}
