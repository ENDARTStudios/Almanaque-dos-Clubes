'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { ClubCrest, PlayerPhoto } from '@/components/MediaAssets';
import { positionLabel } from '@/i18n/wsIcons';
import { wsConceitoComparar } from '@/i18n/wsConceitoComparar';
import type { Dictionary } from '@/i18n/types';
import type { RadarMetricInput } from '@/lib/compare-radar';
import CompareTitles from '@/components/CompareTitles';
import CompareTimeline from '@/components/CompareTimeline';
import CompareRadar from '@/components/CompareRadar';
import CompareRows, { type ComparacaoLinha } from '@/components/conceito/comparar/CompareRows';
import CompareDistribution from '@/components/conceito/comparar/CompareDistribution';

// T440 — comparador com autocomplete + leitura horizontal.
// Conceito FICHA: seletores viram CARTÕES; a comparação vira LINHAS (número grande A ·
// métrica · número grande B) e os gráficos ficam ao lado. Deep-link (?type&a&b), exportação
// em PDF e radar (leitura secundária) continuam funcionando.

export type CompareType = 'clubs' | 'players';

interface SearchItem {
  id: string;
  label: string;
  sub?: string | null;
}

interface ClubSide {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  foundedYear?: number | null;
  stadium?: { capacity?: number | null } | null;
  titles?: Record<string, number>;
  rankingHistory?: Array<{ season: string | null; points: number | null }>;
}

interface PlayerSide {
  id: string;
  name: string;
  position?: string | null;
  country?: string | null;
  birthDate?: string | null;
  club?: { id: string; name: string } | null;
}

interface CompareData {
  kind: 'clubs' | 'players';
  a: ClubSide & PlayerSide;
  b: ClubSide & PlayerSide;
  comparison: {
    titles?: { a: number | null; b: number | null; leader: string | null };
    foundedYear?: { a: number | null; b: number | null; leader: string | null };
    rankingPoints?: { a: number | null; b: number | null; leader: string | null };
    stadiumCapacity?: { a: number | null; b: number | null; leader: string | null };
    note?: string;
  };
}

function leaderDe(a: number | null | undefined, b: number | null | undefined): 'a' | 'b' | null {
  if (a == null || b == null || a === b) return null;
  return a > b ? 'a' : 'b';
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
  const { dict, locale } = useI18n();
  const t = dict.pages.compare;
  const c = wsConceitoComparar[locale];
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
            data: Array<{ id: string; name: string; country: string | null; city?: string | null }>;
          }>(`/clubs?search=${encodeURIComponent(term)}&limit=8`);
          setter(
            res.data.map((clube) => ({
              id: clube.id,
              label: clube.name,
              sub: [clube.city, clube.country].filter(Boolean).join(' · '),
            })),
          );
        } else {
          const res = await api.get<{
            data: Array<{
              id: string;
              fullName: string;
              position: string | null;
              country?: string | null;
            }>;
          }>(`/players?search=${encodeURIComponent(term)}&limit=8`);
          setter(
            res.data.map((p) => ({
              id: p.id,
              label: p.fullName,
              sub: [positionLabel(locale, p.position), p.country].filter(Boolean).join(' · '),
            })),
          );
        }
      } catch {
        setter([]);
      }
    },
    [type, locale],
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

  // Auditoria 08-10 (P2) — no deep-link o rótulo inicial é o id BRUTO; busca os NOMES reais.
  useEffect(() => {
    let active = true;
    const resolve = async (id: string, set: (i: SearchItem | null) => void) => {
      if (!id) return;
      try {
        const path = type === 'clubs' ? 'clubs' : 'players';
        type ItemShape = {
          name?: string;
          fullName?: string;
          country?: string | null;
          city?: string | null;
          position?: string | null;
        };
        const res = await api.get<{ data?: ItemShape }>(`/${path}/${id}`);
        const envelope = res as { data?: ItemShape } | ItemShape;
        const item: ItemShape | undefined =
          'data' in (envelope as Record<string, unknown>) && (envelope as { data?: ItemShape }).data
            ? (envelope as { data: ItemShape }).data
            : (envelope as ItemShape);
        const label = item?.name ?? item?.fullName;
        if (active && label) {
          set({ id, label, sub: item?.city ?? item?.country ?? item?.position ?? null });
        }
      } catch {
        // deep-link com id inexistente — exibe o id, não derruba a página
      }
    };
    void resolve(initialA, setA);
    void resolve(initialB, setB);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metaDe = (item: SearchItem | null, side: ClubSide & PlayerSide): string | null => {
    if (type === 'clubs') {
      const partes = [
        side.city,
        side.country,
        side.foundedYear != null ? String(side.foundedYear) : null,
      ].filter(Boolean);
      return partes.length > 0 ? partes.join(' · ') : (item?.sub ?? null);
    }
    const partes = [
      positionLabel(locale, side.position),
      side.country,
      side.birthDate ? side.birthDate.slice(0, 4) : null,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(' · ') : (item?.sub ?? null);
  };

  const linhas: ComparacaoLinha[] = result
    ? result.kind === 'clubs'
      ? (() => {
          const at = result.a.titles ?? {};
          const bt = result.b.titles ?? {};
          const cmp = result.comparison;
          return [
            {
              label: c.titlesOfficial,
              a: at.total ?? null,
              b: bt.total ?? null,
              leader: cmp.titles?.leader === 'a' ? 'a' : cmp.titles?.leader === 'b' ? 'b' : null,
            },
            {
              label: t.world,
              a: at.mundial ?? 0,
              b: bt.mundial ?? 0,
              leader: leaderDe(at.mundial, bt.mundial),
            },
            {
              label: t.continental,
              a: at.continental ?? 0,
              b: bt.continental ?? 0,
              leader: leaderDe(at.continental, bt.continental),
            },
            {
              label: t.national,
              a: at.nacional ?? 0,
              b: bt.nacional ?? 0,
              leader: leaderDe(at.nacional, bt.nacional),
            },
            {
              label: t.state,
              a: at.estadual ?? 0,
              b: bt.estadual ?? 0,
              leader: leaderDe(at.estadual, bt.estadual),
            },
            {
              label: t.municipal,
              a: at.municipal ?? 0,
              b: bt.municipal ?? 0,
              leader: leaderDe(at.municipal, bt.municipal),
            },
            {
              label: c.founded,
              a: result.a.foundedYear ?? null,
              b: result.b.foundedYear ?? null,
              leader: null,
            },
            {
              label: c.rankingPoints,
              a: cmp.rankingPoints?.a ?? null,
              b: cmp.rankingPoints?.b ?? null,
              leader: leaderDe(cmp.rankingPoints?.a, cmp.rankingPoints?.b),
            },
            {
              label: c.stadiumCapacity,
              a: result.a.stadium?.capacity ?? null,
              b: result.b.stadium?.capacity ?? null,
              leader: leaderDe(result.a.stadium?.capacity, result.b.stadium?.capacity),
            },
          ];
        })()
      : [
          { label: c.entityClub, a: result.a.club?.name ?? null, b: result.b.club?.name ?? null },
          { label: c.country, a: result.a.country ?? null, b: result.b.country ?? null },
          {
            label: c.birthYear,
            a: result.a.birthDate?.slice(0, 4) ?? null,
            b: result.b.birthDate?.slice(0, 4) ?? null,
          },
        ]
    : [];

  return (
    <div className="mt-8">
      <div className="no-print flex flex-wrap gap-2" role="tablist" aria-label={t.title}>
        {(['clubs', 'players'] as CompareType[]).map((tp) => (
          <button
            key={tp}
            type="button"
            role="tab"
            aria-selected={type === tp}
            onClick={() => {
              setType(tp);
              setA(null);
              setB(null);
              setResult(null);
            }}
            className={`inline-flex min-h-9 items-center rounded-[2px] border px-4 text-[13px] font-semibold transition-colors duration-200 ${
              type === tp
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
            }`}
          >
            {tp === 'clubs' ? t.typeClubs : t.typePlayers}
          </button>
        ))}
      </div>

      <div className="no-print mt-6 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        {[
          {
            side: 'a' as const,
            sel: a,
            setSel: setA,
            term: searchA,
            setTerm: setSearchA,
            opts: optionsA,
            setOpts: setOptionsA,
            ph: t.searchPlaceholderA,
          },
          {
            side: 'b' as const,
            sel: b,
            setSel: setB,
            term: searchB,
            setTerm: setSearchB,
            opts: optionsB,
            setOpts: setOptionsB,
            ph: t.searchPlaceholderB,
          },
        ].map((f, i) => (
          <Fragment key={f.side}>
            {i === 1 ? (
              <span aria-hidden="true" className="hidden text-center text-xl text-ink-3 sm:block">
                ×
              </span>
            ) : null}
            <div className="min-w-0">
              {f.sel ? (
                <div
                  className="flex items-center gap-4 rounded-[2px] border border-border bg-surface p-4"
                  data-testid={`compare-card-${f.side}`}
                >
                  <span className="shrink-0">
                    {type === 'clubs' ? (
                      <ClubCrest logoUrl={null} name={f.sel.label} size={56} />
                    ) : (
                      <PlayerPhoto photoUrl={null} name={f.sel.label} position={null} size={56} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-lg font-bold leading-tight text-foreground">
                      {f.sel.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-3">{f.sel.sub ?? '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      f.setSel(null);
                      setResult(null);
                    }}
                    aria-label={f.side === 'a' ? c.removeA : c.removeB}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-ink-2 transition-colors duration-200 hover:border-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <label className="sr-only" htmlFor={`cmp-${f.side}`}>
                    {f.ph}
                  </label>
                  <input
                    id={`cmp-${f.side}`}
                    className="h-12 w-full rounded-[2px] border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-ink-2 placeholder:opacity-100"
                    placeholder={f.ph}
                    value={f.term}
                    onChange={(e) => {
                      f.setSel(null);
                      f.setTerm(e.target.value);
                    }}
                    autoComplete="off"
                  />
                  {f.opts.length > 0 ? (
                    <ul
                      className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[2px] border border-border bg-surface"
                      role="listbox"
                      aria-label={f.ph}
                    >
                      {f.opts.map((o) => (
                        <li key={o.id} role="option" aria-selected={false}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-2"
                            onClick={() => {
                              f.setSel(o);
                              f.setTerm('');
                              f.setOpts([]);
                            }}
                          >
                            {o.label}
                            {o.sub ? <span className="text-ink-3"> · {o.sub}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!ready || loading}
          onClick={() => void runCompare()}
          className="inline-flex min-h-10 items-center rounded-[2px] bg-foreground px-5 text-[13px] font-semibold text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-40"
        >
          {t.compareBtn}
        </button>
        {result ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center rounded-[2px] border border-border px-4 text-[12px] font-semibold text-foreground transition-colors duration-200 hover:border-foreground"
          >
            {t.exportPdf}
          </button>
        ) : null}
      </div>

      {notFound ? (
        <p role="alert" className="mt-6 text-sm text-danger-ink">
          {t.noData}
        </p>
      ) : null}
      {!ready ? <p className="mt-4 text-[12px] text-ink-3">{t.selectBoth}</p> : null}

      {result ? (
        <div className="print-only" aria-hidden="true">
          <p className="text-xs mb-1">
            {dict.site.name} · {t.printTitle} · {printedAt}
          </p>
          <p className="text-lg font-semibold">
            {result.a.name} vs {result.b.name}
          </p>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 border-b border-border pb-4">
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-bold text-foreground">
                {result.a.name}
              </p>
              <p className="text-[11px] text-ink-3">{metaDe(a, result.a) ?? '—'}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate font-heading text-lg font-bold text-foreground">
                {result.b.name}
              </p>
              <p className="text-[11px] text-ink-3">{metaDe(b, result.b) ?? '—'}</p>
            </div>
          </div>

          <CompareRows rows={linhas} locale={locale} label={t.title} />

          {result.kind === 'clubs' ? (
            <>
              <p className="mt-3 text-[11px] leading-snug text-ink-3">{c.noMatchData}</p>
              <section aria-label={c.chartsTitle} className="mt-8">
                <h2 className="text-[12.5px] font-semibold text-foreground">{c.chartsTitle}</h2>
                <div className="mt-4 grid gap-8 lg:grid-cols-3">
                  <CompareTitles
                    aName={result.a.name}
                    bName={result.b.name}
                    aTitles={(result.a.titles ?? {}) as Record<string, number>}
                    bTitles={(result.b.titles ?? {}) as Record<string, number>}
                  />
                  <CompareDistribution
                    aName={result.a.name}
                    bName={result.b.name}
                    aTitles={(result.a.titles ?? {}) as Record<string, number>}
                    bTitles={(result.b.titles ?? {}) as Record<string, number>}
                  />
                  <CompareTimeline
                    aName={result.a.name}
                    bName={result.b.name}
                    aHistory={result.a.rankingHistory ?? []}
                    bHistory={result.b.rankingHistory ?? []}
                  />
                </div>
              </section>

              <details className="mt-8 border-t border-border pt-3">
                <summary className="cursor-pointer text-[11px] text-ink-3">{c.radarToggle}</summary>
                <div className="mt-4">
                  <CompareRadar
                    aName={result.a.name}
                    bName={result.b.name}
                    metrics={buildClubRadarMetrics(result, t)}
                  />
                </div>
              </details>

              <p className="mt-6 text-[11px] leading-snug text-ink-3">
                {c.provenance}{' '}
                <Link
                  href="/rankings"
                  className="text-primary-ink underline decoration-dotted underline-offset-2"
                >
                  {dict.nav.rankings}
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-4 text-[11px] leading-snug text-ink-3">
              {result.comparison.note ?? c.playerNote}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

// T072 — eixos do radar de clubes. "Anos de história" = ano corrente − fundação
// (clube mais antigo ⇒ eixo maior). Fundação ausente/inválida ⇒ null (sai do radar; nunca 0).
function buildClubRadarMetrics(
  result: CompareData,
  t: Dictionary['pages']['compare'],
): RadarMetricInput[] {
  const a = result.a;
  const b = result.b;
  const cmp = result.comparison;
  const year = new Date().getFullYear();
  const history = (foundedYear: number | null | undefined): number | null =>
    typeof foundedYear === 'number' && foundedYear > 0 && foundedYear <= year
      ? year - foundedYear
      : null;
  return [
    { key: 'titles', label: t.titlesTotal, a: a.titles?.total ?? null, b: b.titles?.total ?? null },
    {
      key: 'ranking',
      label: t.rankingPoints,
      a: cmp.rankingPoints?.a ?? null,
      b: cmp.rankingPoints?.b ?? null,
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
