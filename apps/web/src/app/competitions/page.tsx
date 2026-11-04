import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import FichaHead from '@/components/ficha/FichaHead';
import { CountryFlag, FlagImage } from '@/components/CountryFlag';
import DataTable from '@/components/ficha/DataTable';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import CompetitionHighlights, {
  type HighlightItem,
  type Tier,
} from '@/components/conceito/competicoes/Highlights';
import ConceptPodium from '@/components/conceito/competicoes/Podium';
import { getApiBase } from '@/lib/api-base';
import { countryLabel } from '@/lib/country-flag';
import { formatCount } from '@/lib/format';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';
import { fichaStrings } from '@/i18n/wsFicha';
import { wsConceitoCompeticoes } from '@/i18n/wsConceitoCompeticoes';

/**
 * /competitions — a ficha do acervo de competições, no conceito FICHA.
 *
 * O que mudou em relação à versão anterior (e por quê):
 *   · HEADER — o número-âncora agora é formatado com o separador do idioma e tem rótulo
 *     ("1.932 competições catalogadas"). O subtítulo funde o kicker do conceito com a frase de
 *     abertura; a página abre pelo título, sem eyebrow.
 *   · FILTROS — chips (país com bandeira, tipo, gênero) em vez de três selects + botão. Chip é
 *     destino, então o filtro é um link: funciona sem JS, é indexável e o estado ativo é visível.
 *     A lista completa de países fica num disclosure, porque são 197 e a faixa não pode virar
 *     um paredão de chips.
 *   · DESTAQUES — quatro alvos por alcance, com o troféu na cor do degrau e o número de edições
 *     que o ACERVO tem (não o número histórico ilustrativo do desenho).
 *   · PÓDIO — campeão e vice REAIS da última edição da Copa do Mundo; o 3º lugar não está na
 *     fonte e vira lacuna declarada no cartão, nunca um nome inventado.
 *   · ÍNDICE — a tabela densa de colunas declaradas substitui os cartões agrupados por degrau.
 *
 * A antiga grade de países (CountryIndex) saiu: eram 220 cartões que repetiam a filtragem por
 * país já disponível nos chips. O caminho por país continua no filtro — completo, no disclosure.
 */

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].competitions;
  return {
    title: t.title,
    description: t.description,
    openGraph: { title: `${t.title} | Almanaque dos Clubes`, description: t.description },
  };
}

interface Competition {
  id: string;
  name: string;
  country?: string | null;
  type?: string | null;
  inceptionYear?: number | null;
}

interface CompetitionCountry {
  code: string;
  name: string | null;
  competitions: number;
}

interface CompetitionOverview {
  inceptionYear: number | null;
  country: string | null;
  editions: number | null;
  podium: {
    champion: { name: string } | null;
    runnerUp: { name: string } | null;
    third: { name: string } | null;
  };
  lastEditionYear: number | null;
  competitionName: string;
}

interface CuratedCompetition {
  id: string;
  name: string;
  tier: Tier;
  country: string | null;
  /** Aparece nos quatro destaques por alcance (a curadoria do quadro). */
  highlight: boolean;
}

/**
 * CURADORIA DE ÂNCORAS — ids confirmados no banco de produção (nada inventado).
 * O índice do quadro usa seis delas; os destaques usam quatro (1 mundial, 2 continentais,
 * 1 nacional). "Competição estadual fica fora dos destaques por alcance regional" — a nota
 * da página declara isso, e o índice curado não finge cobertura total.
 */
const CURATED: CuratedCompetition[] = [
  {
    id: 'c94c3d26-c3a8-45e0-8f4b-c2bd19707688',
    name: 'FIFA World Cup',
    tier: 'mundial',
    country: null,
    highlight: true,
  },
  {
    id: '8fae6a29-79c5-43d8-81ee-4b569361926b',
    name: 'UEFA Champions League',
    tier: 'continental',
    country: null,
    highlight: true,
  },
  {
    id: '9d50e9fa-bc31-4ea8-af77-e429f451ff52',
    name: 'Copa Libertadores',
    tier: 'continental',
    country: null,
    highlight: true,
  },
  {
    id: '6a853116-a632-45a0-9def-c42bdba38604',
    name: 'Premier League',
    tier: 'nacional',
    country: 'GB',
    highlight: true,
  },
  {
    id: 'a244e261-2036-423f-bba6-f0563bea7c17',
    name: 'La Liga',
    tier: 'nacional',
    country: 'ES',
    highlight: false,
  },
  {
    id: 'd6a8bdb1-aef0-4701-a9f1-5576b201fa56',
    name: 'Campeonato Brasileiro Série A',
    tier: 'nacional',
    country: 'BR',
    highlight: false,
  },
  {
    id: 'd4b2c896-a33e-4178-98fb-ac8abe2223e1',
    name: 'Copa do Brasil',
    tier: 'nacional',
    country: 'BR',
    highlight: false,
  },
];

const HIGHLIGHTS = CURATED.filter((c) => c.highlight);

async function getCompetitions(searchParams: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  [['country'], ['type'], ['gender'], ['search']].forEach(([key]) => {
    const v = searchParams[key];
    if (v) params.set(key, v);
  });
  const offset = Math.max(parseInt(searchParams.offset ?? '0', 10) || 0, 0);
  params.set('offset', String(offset));
  params.set('limit', '50');
  try {
    const base = getApiBase();
    const res = await fetch(base + '/competitions?' + params.toString(), { cache: 'no-store' });
    // null = FALHOU. Nunca []. Ver a distinção falha ≠ vazio no ErrorState abaixo.
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getCompetitionCountries(): Promise<CompetitionCountry[]> {
  try {
    const res = await fetch(getApiBase() + '/competitions/countries', { cache: 'no-store' });
    if (!res.ok) return [];
    const j = await res.json();
    const d = j.data ?? j;
    return Array.isArray(d.countries) ? d.countries : [];
  } catch {
    return [];
  }
}

/**
 * O resumo de uma competição curada. `overview.history.editionsCount` conta só as edições que o
 * ACERVO tem — é o número que o cartão mostra, com a palavra "no acervo". Nada de copiar o
 * "23 edições" do desenho.
 */
async function getOverview(id: string): Promise<CompetitionOverview | null> {
  try {
    const res = await fetch(`${getApiBase()}/competitions/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const j: {
      data?: { name?: string; inceptionYear?: number | null; country?: string | null };
      overview?: {
        history?: { editionsCount?: number | null; lastEditionYear?: number | null };
        podium?: {
          champion?: { clubName?: string | null } | null;
          runnerUp?: { clubName?: string | null } | null;
          third?: { clubName?: string | null } | null;
        };
      };
    } = await res.json();
    return {
      competitionName: j.data?.name ?? '',
      inceptionYear: j.data?.inceptionYear ?? null,
      country: j.data?.country ?? null,
      editions: j.overview?.history?.editionsCount ?? null,
      lastEditionYear: j.overview?.history?.lastEditionYear ?? null,
      podium: {
        champion: j.overview?.podium?.champion?.clubName
          ? { name: j.overview.podium.champion.clubName }
          : null,
        runnerUp: j.overview?.podium?.runnerUp?.clubName
          ? { name: j.overview.podium.runnerUp.clubName }
          : null,
        third: j.overview?.podium?.third?.clubName
          ? { name: j.overview.podium.third.clubName }
          : null,
      },
    };
  } catch {
    return null;
  }
}

/** Preserva os filtros ativos ao trocar UM deles (e reseta a paginação). */
function hrefCom(
  sp: { [key: string]: string | undefined },
  patch: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const key of ['gender', 'type', 'country', 'search', 'view'] as const) {
    const value = key in patch ? patch[key] : sp[key];
    if (value) params.set(key, value);
  }
  return '/competitions' + (params.toString() ? `?${params.toString()}` : '');
}

function Chip({
  href,
  active,
  children,
  testId,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-8 items-center gap-2 rounded-[2px] border px-3 py-1 text-[12px] leading-none transition-colors duration-200 ${
        active
          ? 'border-foreground bg-foreground font-semibold text-background'
          : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

/** Rótulo de um grupo de filtros (10px, caixa baixa — não é eyebrow). */
function FiltroLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-16 shrink-0 pt-2 text-[10px] font-semibold leading-none text-ink-3">
      {children}
    </span>
  );
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const resultado = await getCompetitions(sp);
  const falhou = resultado === null;
  const competitions: Competition[] = resultado?.data ?? [];
  const total: number = resultado?.total ?? 0;
  const offset: number = resultado?.offset ?? 0;

  const [countries, overviews] = await Promise.all([
    getCompetitionCountries(),
    falhou
      ? Promise.resolve<Array<CompetitionOverview | null>>([])
      : Promise.all(CURATED.map((h) => getOverview(h.id))),
  ]);

  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const s = wsConceitoCompeticoes[locale];
  const c = dict.pages.competitions;

  const highlightItems: HighlightItem[] = HIGHLIGHTS.map((h) => {
    const i = CURATED.findIndex((c) => c.id === h.id);
    return {
      id: h.id,
      name: overviews[i]?.competitionName || h.name,
      tier: h.tier,
      inceptionYear: overviews[i]?.inceptionYear ?? null,
      editions: overviews[i]?.editions ?? null,
    };
  });

  // O pódio é o da competição em destaque (Copa do Mundo), com o ano REAL da última edição.
  const destaque = overviews[CURATED.findIndex((c) => c.id === HIGHLIGHTS[0].id)] ?? null;
  const editionLabel =
    destaque && destaque.lastEditionYear != null
      ? s.podiumEdition
          .replace('{name}', destaque.competitionName)
          .replace('{year}', String(destaque.lastEditionYear))
      : null;

  const paisesPorVolume = [...countries].sort((a, b) => b.competitions - a.competitions);
  // Ordem do quadro: Brasil, Portugal, Reino Unido, Espanha, Itália — os cinco primeiros.
  const CURATED_COUNTRIES = ['BR', 'PT', 'GB', 'ES', 'IT'];
  const paisPorCodigo = new Map(countries.map((pais) => [pais.code, pais]));
  const chipsDePais = CURATED_COUNTRIES.map((code) => paisPorCodigo.get(code)).filter(
    (pais): pais is CompetitionCountry => Boolean(pais),
  );
  const paisAtivoForaDoTopo =
    sp.country && !chipsDePais.some((p) => p.code === sp.country)
      ? (paisPorCodigo.get(sp.country) ?? null)
      : null;
  if (paisAtivoForaDoTopo) chipsDePais.unshift(paisAtivoForaDoTopo);

  const temFiltro = Boolean(sp.country || sp.type || sp.gender || sp.search);
  // O quadro abre no índice curado; o acervo completo aparece quando o usuário pede ou filtra.
  const verIndiceCompleto = sp.view === 'all' || temFiltro;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FichaHead
        title={c.title}
        subtitle={`${s.kicker} · ${s.subtitle}`}
        anchor={falhou || total === 0 ? undefined : formatCount(total, locale)}
        anchorLabel={s.anchorLabel}
      />

      {falhou ? (
        <ErrorState
          title={fichaStrings[locale].states.errorTitle}
          body={fichaStrings[locale].states.errorBody}
          retryLabel={fichaStrings[locale].states.retry}
          retryHref="/competitions"
        />
      ) : (
        <>
          {/* 1. FILTROS — chips, estado ativo visível, sem JS. */}
          <section aria-labelledby="comp-filtros" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="comp-filtros" className="text-[12.5px] font-semibold text-foreground">
                {s.filtersTitle}
              </h2>
              {temFiltro ? (
                <Link
                  href="/competitions"
                  data-testid="competitions-clear"
                  className="text-[11px] font-medium text-primary-ink underline decoration-dotted underline-offset-2"
                >
                  {s.clear}
                </Link>
              ) : null}
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-start gap-2">
                <FiltroLabel>{s.country}</FiltroLabel>
                <ul className="flex flex-wrap gap-2">
                  {chipsDePais.map((pais) => (
                    <li key={pais.code}>
                      <Chip
                        href={hrefCom(sp, {
                          country: sp.country === pais.code ? null : pais.code,
                        })}
                        active={sp.country === pais.code}
                        testId={`competitions-country-${pais.code}`}
                      >
                        <FlagImage code={pais.code} />
                        <span>{countryLabel(pais.code, locale) ?? pais.name ?? pais.code}</span>
                      </Chip>
                    </li>
                  ))}
                </ul>
              </div>

              {paisesPorVolume.length > 0 ? (
                <details className="sm:pl-16">
                  <summary className="inline-flex min-h-6 cursor-pointer items-center text-[11px] text-ink-3 hover:text-foreground">
                    {s.seeAllCountries.replace('{n}', String(paisesPorVolume.length))}
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {paisesPorVolume.map((pais) => (
                      <li key={pais.code}>
                        <Link
                          href={hrefCom(sp, { country: pais.code })}
                          className={`inline-flex min-h-6 items-center gap-1.5 rounded-[2px] px-1.5 py-0.5 text-[11px] ${
                            sp.country === pais.code
                              ? 'bg-foreground text-background'
                              : 'text-ink-2 hover:text-foreground'
                          }`}
                        >
                          <FlagImage code={pais.code} />
                          <span>{countryLabel(pais.code, locale) ?? pais.name ?? pais.code}</span>
                          <span className={sp.country === pais.code ? 'opacity-80' : 'text-ink-3'}>
                            {pais.competitions}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="flex flex-wrap items-start gap-2">
                <FiltroLabel>{c.filters.type}</FiltroLabel>
                <ul className="flex flex-wrap gap-2">
                  <li>
                    <Chip href={hrefCom(sp, { type: null })} active={!sp.type}>
                      {s.all}
                    </Chip>
                  </li>
                  <li>
                    <Chip href={hrefCom(sp, { type: 'LEAGUE' })} active={sp.type === 'LEAGUE'}>
                      {c.filters.league}
                    </Chip>
                  </li>
                  <li>
                    <Chip href={hrefCom(sp, { type: 'CUP' })} active={sp.type === 'CUP'}>
                      {c.filters.cup}
                    </Chip>
                  </li>
                </ul>
              </div>

              {sp.search ? (
                <div className="flex flex-wrap items-center gap-2">
                  <FiltroLabel>{s.searchPrefix}</FiltroLabel>
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-[2px] border border-foreground bg-foreground px-3 text-[12px] text-background">
                    {sp.search}
                    <Link href={hrefCom(sp, { search: null })} className="underline">
                      ×
                    </Link>
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* 2. DESTAQUES — quatro alvos por alcance, com troféu na cor do degrau. */}
          <section aria-labelledby="comp-destaques" className="mt-10">
            <h2
              id="comp-destaques"
              className="text-[12.5px] font-semibold text-[color:var(--color-secondary)]"
            >
              {s.highlightsTitle}
            </h2>
            <div className="mt-3">
              <CompetitionHighlights items={highlightItems} s={s} />
            </div>
          </section>

          {/* 3. PÓDIO da última edição do destaque mundial. */}
          {destaque?.podium.champion ? (
            <div className="mt-10">
              <ConceptPodium
                editionLabel={editionLabel}
                champion={destaque.podium.champion}
                runnerUp={destaque.podium.runnerUp}
                third={destaque.podium.third}
                s={s}
              />
            </div>
          ) : null}

          {/* 4. ÍNDICE — o quadro abre com a curadoria de âncoras; o acervo completo fica
                 atrás do link (e é o que os filtros estreitam). */}
          <section aria-labelledby="comp-indice" className="mt-10">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="comp-indice" className="text-[12.5px] font-semibold text-foreground">
                {s.indexTitle}
              </h2>
              {verIndiceCompleto ? (
                <p className="text-[11px] text-ink-3">
                  {s.indexAside.replace('{n}', formatCount(total, locale))}
                </p>
              ) : null}
            </div>

            {verIndiceCompleto ? (
              <>
                {competitions.length ? (
                  <DataTable
                    caption={s.indexTitle}
                    columns={[
                      { header: c.filters.competition, align: 'left' },
                      { header: s.country, align: 'left' },
                      { header: c.filters.type, align: 'left' },
                    ]}
                    rows={competitions.map((comp) => [
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="font-medium text-primary-ink hover:underline"
                      >
                        {comp.name}
                      </Link>,
                      comp.country ? (
                        <span key={`c-${comp.id}`} className="flex items-center gap-2">
                          <CountryFlag code={comp.country} locale={locale} />
                        </span>
                      ) : (
                        <span key={`c-${comp.id}`} className="text-ink-3">
                          {c.filters.international}
                        </span>
                      ),
                      <span key={`t-${comp.id}`} className="text-ink-2">
                        {comp.type === 'LEAGUE'
                          ? c.filters.league
                          : comp.type === 'CUP'
                            ? c.filters.cup
                            : comp.type === 'TOURNAMENT'
                              ? c.filters.tournament
                              : (comp.type ?? '—')}
                      </span>,
                    ])}
                  />
                ) : (
                  <EmptyState
                    title={fichaStrings[locale].states.emptyTitle}
                    body={fichaStrings[locale].states.emptyBody}
                  />
                )}

                {total > 50 ? (
                  <nav className="mt-6 flex justify-between" aria-label={c.paginationLabel}>
                    {offset > 0 ? (
                      <Link
                        href={pageHref(sp, Math.max(0, offset - 50))}
                        className="inline-flex min-h-10 items-center rounded-[2px] border border-border px-4 text-sm font-semibold hover:border-foreground"
                      >
                        {c.prev}
                      </Link>
                    ) : (
                      <span />
                    )}
                    {offset + 50 < total ? (
                      <Link
                        href={pageHref(sp, offset + 50)}
                        className="inline-flex min-h-10 items-center rounded-[2px] border border-border px-4 text-sm font-semibold hover:border-foreground"
                      >
                        {c.next}
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-4 text-[11px]">
                  <Link
                    href="/competitions"
                    className="text-primary-ink underline decoration-dotted underline-offset-2"
                  >
                    {s.backToCurated}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <DataTable
                  caption={s.indexTitle}
                  columns={[
                    { header: s.colCompetition, align: 'left' },
                    { header: s.colCountry, align: 'left' },
                    { header: s.colEditions, align: 'right' },
                    { header: s.colLast, align: 'right' },
                    { header: s.colReach, align: 'left' },
                  ]}
                  rows={CURATED.map((curated, i) => {
                    const o = overviews[i];
                    return [
                      <Link
                        key={`cur-${curated.id}`}
                        href={`/competitions/${curated.id}`}
                        className="font-medium text-primary-ink hover:underline"
                      >
                        {o?.competitionName || curated.name}
                      </Link>,
                      o?.country ? (
                        <span key={`cur-c-${curated.id}`} className="flex items-center gap-2">
                          <CountryFlag code={o.country} locale={locale} />
                        </span>
                      ) : curated.country ? (
                        <span key={`cur-c-${curated.id}`} className="flex items-center gap-2">
                          <CountryFlag code={curated.country} locale={locale} />
                        </span>
                      ) : (
                        <span key={`cur-c-${curated.id}`} className="text-ink-3">
                          {c.filters.international}
                        </span>
                      ),
                      <span key={`cur-e-${curated.id}`} className="num tabular-nums text-ink-2">
                        {o?.editions != null ? formatCount(o.editions, locale) : '—'}
                      </span>,
                      <span key={`cur-l-${curated.id}`} className="num tabular-nums text-ink-2">
                        {o?.lastEditionYear ?? '—'}
                      </span>,
                      <span key={`cur-r-${curated.id}`} className="text-ink-2">
                        {s.tier[curated.tier]}
                      </span>,
                    ];
                  })}
                />
                <p className="mt-3 max-w-[900px] text-[11px] leading-snug text-ink-3">
                  {s.curatedNote}{' '}
                  <Link
                    href="/competitions?view=all"
                    className="text-primary-ink underline decoration-dotted underline-offset-2"
                  >
                    {s.seeAll}
                  </Link>
                </p>
              </>
            )}
          </section>

          <p className="mt-8 max-w-[900px] text-[11px] leading-snug text-ink-3">{s.provenance}</p>
        </>
      )}
    </div>
  );
}

function pageHref(sp: { [key: string]: string | undefined }, offset: number): string {
  const params = new URLSearchParams();
  for (const key of ['gender', 'type', 'country', 'search', 'view'] as const) {
    if (sp[key]) params.set(key, sp[key] as string);
  }
  params.set('offset', String(offset));
  return '/competitions?' + params.toString();
}
