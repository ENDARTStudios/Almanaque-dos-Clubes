import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from '@/i18n/config';
import FavoriteButton from '@/components/FavoriteButton';
import SocialLinks from '@/components/SocialLinks';
import { CountryFlag } from '@/components/CountryFlag';
import { TrophyCup, TrophyMedal } from '@/components/icons';
import SourceNote from '@/components/SourceNote';
import { wIconsStrings } from '@/i18n/wsIcons';
import { wsCompetitionInsightsStrings, insText } from '@/i18n/wsCompetitionInsights';
import { formatCount } from '@/lib/format';

// Mapeamento do portal (Operador, 08/10 — Entrega 2): sub-abas Visão Geral |
// Edições | Clubes | Maiores Campeões sobre o overview WON da API. Honestidade:
// sem edições → "Edições em catalogação"; participantes = clubes com títulos
// catalogados (a aresta PARTICIPATED_IN não existe no grafo).

interface Competition {
  id: string;
  name: string;
  gender?: string | null;
  country?: string | null;
  type?: string | null;
  level?: number | null;
  fansCount?: number | null;
  officialSite?: string | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: (Record<string, number | null> & { updatedAt?: string }) | null;
  qid?: string | null;
  importedFrom?: string | null;
  /** T509 (W6) — foto do troféu (Wikimedia Commons). */
  trophyImageUrl?: string | null;
  /** T-24/25 — enriquecimento Wikidata (CC0): descrições pt/en/es + proveniência. */
  description?: {
    pt?: string | null;
    en?: string | null;
    es?: string | null;
    sourceUrl?: string | null;
  } | null;
  /** P571 — ano de fundação (só precisão ≥ ano). */
  inceptionYear?: number | null;
  /** P576 — dissolução (competição extinta). */
  dissolvedAt?: string | null;
}

interface SeasonRow {
  position: number;
  clubName: string;
  clubId: string | null;
  matchedName: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
}

interface PodiumClubDto {
  clubId: string | null;
  clubName: string;
}

/** T-24/25 — blocos de insights (funções puras em apps/api/.../insights.ts), ADITIVOS. */
interface CompetitionHistoryDto {
  firstEditionYear: number | null;
  lastEditionYear: number | null;
  editionsCount: number;
  editionsWithChampion: number;
  status: 'extinta' | 'vigente' | 'sem_edicao_recente';
  biggestChampion: { clubId: string; clubName: string; titles: number } | null;
  longestStreak: { clubName: string; from: number; to: number } | null;
}

interface CompetitionPodiumDto {
  champion: PodiumClubDto | null;
  runnerUp: PodiumClubDto | null;
  /** Só de tabela de LIGA — copa (fase de grupos) vem null honesto. */
  third: PodiumClubDto | null;
}

interface CompetitionTotalsDto {
  matches: number | null;
  goals: number | null;
}

interface CompetitionSeasonData {
  season: string;
  standings: SeasonRow[] | null;
  topScorer: { name: string; goals: number } | null;
  sourceUrl: string | null;
  championId: string | null;
  runnerUpId: string | null;
  champion: { id: string; name: string | null } | null;
  runnerUp: { id: string; name: string | null } | null;
  /** T-24/25 — 3º colocado quando a tabela é de liga (posições 1..N únicas). */
  third: PodiumClubDto | null;
  totalMatches: number | null;
  totalGoals: number | null;
}

interface Overview {
  editions: Array<{ year: number; champion: { id: string; name: string } }>;
  topWinners: Array<{ clubId: string; name: string; titles: number }>;
  participants: Array<{ id: string; name: string; city?: string | null; country?: string | null }>;
  totalEditions: number;
  history?: CompetitionHistoryDto | null;
  podium?: CompetitionPodiumDto | null;
  totals?: CompetitionTotalsDto | null;
}

async function getCompetition(id: string) {
  try {
    const res = await fetch(`${getApiBase()}/competitions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      data: json.data as Competition | null,
      overview: (json.overview ?? null) as Overview | null,
      seasons: (json.seasons ?? []) as CompetitionSeasonData[],
    };
  } catch {
    return null;
  }
}

/**
 * T30/T33 — histórico derivado das PARTIDAS (não do resumo de edições).
 *
 * A distinção importa: `overview.totals` soma o que está catalogado em
 * `CompetitionSeason` (19 linhas nas quatro grandes ligas); esta tabela soma 3.800 partidas
 * por liga. São números diferentes porque medem coisas diferentes, e a tela diz qual é qual.
 */
interface HistoryTableRow {
  clubId: string;
  clubName: string | null;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
interface HistoryMatchRef {
  date: string;
  season: string;
  round: string | null;
  homeClubName: string | null;
  awayClubName: string | null;
  homeScore: number;
  awayScore: number;
  margin: number;
  goals: number;
  winnerName: string | null;
  loserName: string | null;
}
interface HistoryDto {
  table: HistoryTableRow[];
  records: {
    biggestWin: HistoryMatchRef | null;
    highestScoring: HistoryMatchRef | null;
    matchesUsed: number;
    totalGoals: number;
    goalsPerMatch: number | null;
    goallessDraws: number;
  };
  champions: Array<{ season: string; clubId: string; clubName: string | null; points: number }>;
  seasons: string[];
  rounds: number;
  matchesUsed: number;
  truncated: boolean;
  pointsPerWin: number;
  pointsRuleNote: string;
}

async function getCompetitionHistory(id: string): Promise<HistoryDto | null> {
  try {
    const res = await fetch(`${getApiBase()}/competitions/${id}/history`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as HistoryDto | null;
  } catch {
    return null;
  }
}

const TABS = ['visao', 'edicoes', 'clubes', 'campeoes', 'temporadas', 'pontuacao'] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getCompetition(id);
  if (!res?.data) return { title: 'Competição não encontrada' };
  return {
    title: res.data.name,
    description: `${res.data.name} — ${res.data.country ?? 'Internacional'}`,
  };
}

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const res = await getCompetition(id);
  if (!res?.data) notFound();
  const comp = res.data;
  /* Só busca o histórico quando a aba pede: a consulta varre as partidas da competição inteira,
     e pagar isso em toda visita de qualquer aba seria desperdício. */
  const matchHistory = tabParam === 'pontuacao' ? await getCompetitionHistory(id) : null;
  const overview = res.overview;
  const seasons = res.seasons ?? [];

  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const t = dict.pages.competitionProfile;
  // T576 — sem imagem oficial do troféu, o cabeçalho usa a taça autoral e DECLARA
  // que é ilustração (o desenho nunca se apresenta como o troféu oficial).
  const ic = wIconsStrings[locale];
  // T-26 — strings dos blocos de insights (pódio/história/métricas), módulo aditivo.
  const ti = wsCompetitionInsightsStrings[locale];
  const history = overview?.history ?? null;
  const podium = overview?.podium ?? null;
  const totals = overview?.totals ?? null;
  // Descrição no locale ativo (dado CC0 do enriquecimento — sem tradução local).
  const descKey = ({ 'pt-br': 'pt', 'en-us': 'en', 'es-es': 'es' } as const)[locale];
  const descriptionText = comp.description?.[descKey]?.trim() || null;
  const descriptionSourceUrl = comp.description?.sourceUrl ?? null;
  const dissolvedYear =
    comp.dissolvedAt != null ? new Date(comp.dissolvedAt).getUTCFullYear() : null;

  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as Tab)
    : 'visao';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: comp.name,
    location: comp.country ? { '@type': 'Country', name: comp.country } : undefined,
  };

  const currentChampion = overview?.editions?.[0] ?? null;

  const tabList: Array<{ id: Tab; label: string }> = [
    { id: 'visao', label: t.tabs.overview },
    { id: 'edicoes', label: t.tabs.editions },
    { id: 'clubes', label: t.tabs.clubs },
    { id: 'campeoes', label: t.tabs.topWinners },
    // T508 (W4) — classificação por temporada (só quando há dado no acervo).
    ...(seasons.length > 0 ? [{ id: 'temporadas' as Tab, label: t.tabs.seasons }] : []),
    // T30/T33 — só aparece se a competição TEM partidas com placar: aba vazia não é opção.
    ...(matchHistory && matchHistory.matchesUsed > 0
      ? [{ id: 'pontuacao' as Tab, label: ti.tabLabel }]
      : []),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/competitions"
        className="text-sm text-primary-ink hover:underline mb-6 inline-block cursor-pointer"
      >
        &larr; {dict.pages.competitions.title}
      </Link>

      {/* Cabeçalho (Visão Geral fica no cabeçalho; demais abas abaixo) */}
      <div className="bg-background rounded-2xl p-8 shadow-md border border-border/50">
        <div className="flex items-start gap-6">
          {comp.trophyImageUrl ? (
            <span
              data-testid="competition-trophy"
              className="w-20 h-20 rounded-2xl bg-background border border-border/50 flex items-center justify-center overflow-hidden shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comp.trophyImageUrl}
                alt=""
                className="object-contain w-16 h-16"
                loading="lazy"
              />
            </span>
          ) : (
            <div
              data-testid="competition-trophy-illustration"
              className="w-20 h-20 rounded-2xl bg-primary/10 text-primary-ink flex flex-col items-center justify-center gap-0.5 shrink-0"
              aria-hidden="true"
            >
              <TrophyCup size={30} />
              <span className="font-heading font-bold text-sm leading-none">
                {comp.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
              {comp.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {comp.country ? (
                /* T579 (ITEM 19) — o país do cabeçalho vira bandeira CLICÁVEL para a listagem
                   daquele país, que é a navegação relacionada que já existe
                   (`/competitions?country=IT`). Destino real, com nome acessível por extenso no
                   idioma do usuário — não a sigla de 2 letras. */
                <CountryFlag
                  code={comp.country}
                  locale={locale}
                  basePath="/competitions"
                  destination="competitions"
                  className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs"
                />
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70">
                  {t.international}
                </span>
              )}
              {comp.gender === 'women' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-ink">
                  {dict.pages.rankings.genderWomen}
                </span>
              ) : null}
              {typeof comp.level === 'number' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/70">
                  {t.level} {comp.level}
                </span>
              ) : null}
            </div>
            {!comp.trophyImageUrl && (
              <p className="text-xs text-foreground/70 mt-3" data-testid="competition-trophy-note">
                {ic.competitionTrophy}
              </p>
            )}
            <div className="mt-3">
              <FavoriteButton
                targetType="competition"
                targetId={comp.id}
                initialCount={comp.fansCount ?? undefined}
                countLabel={t.spectators}
              />
            </div>
          </div>
        </div>
        <SocialLinks
          officialSite={comp.officialSite ?? null}
          socialLinks={comp.socialLinks ?? null}
          followersSnapshot={comp.followersSnapshot ?? null}
        />
        {tab === 'visao' ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
            {comp.country && (
              <Info
                label={t.country}
                value={
                  <CountryFlag
                    code={comp.country}
                    locale={locale}
                    basePath="/competitions"
                    destination="competitions"
                  />
                }
              />
            )}
            {comp.type && <Info label={t.type} value={comp.type} />}
            {currentChampion ? (
              <Info
                label={t.currentChampion}
                value={
                  <Link
                    href={`/clubs/${currentChampion.champion.id}`}
                    className="text-primary-ink hover:underline"
                  >
                    {currentChampion.champion.name}
                  </Link>
                }
                extra={`${t.yearShort} ${currentChampion.year}`}
              />
            ) : (
              <Info label={t.currentChampion} value={t.emCatalogacao} />
            )}
            {overview ? (
              <Info label={t.totalEditions} value={String(overview.totalEditions)} />
            ) : null}
            {comp.qid && <Info label="Wikidata" value={comp.qid} />}
          </dl>
        ) : null}
      </div>

      {/* Sub-abas (links server-side: ?tab=) */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label={t.tabsLabel}>
        {tabList.map((tb) => (
          <Link
            key={tb.id}
            href={`/competitions/${id}?tab=${tb.id}`}
            role="tab"
            aria-selected={tab === tb.id}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === tb.id
                ? 'bg-primary text-on-primary border-primary'
                : 'border-border text-foreground/70 hover:border-primary/40'
            }`}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'edicoes' ? (
          overview && overview.editions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground/5 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.year}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t.champion}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.editions.map((e) => (
                    <tr key={e.year} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{e.year}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clubs/${e.champion.id}`}
                          className="text-primary-ink hover:underline"
                        >
                          {e.champion.name}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="edicoes-empty">
              {t.editionsEmpty}
            </p>
          )
        ) : null}

        {tab === 'clubes' ? (
          overview && overview.participants.length > 0 ? (
            <>
              <p className="text-xs text-foreground/70 mb-3">{t.participantsNote}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.participants.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}`}
                    className="block bg-background rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/40 transition-colors"
                  >
                    <p className="font-heading font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-foreground/70 mt-1">
                      {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground/60" data-testid="clubes-empty">
              {t.participantsEmpty}
            </p>
          )
        ) : null}

        {tab === 'campeoes' ? (
          overview && overview.topWinners.length > 0 ? (
            <ol className="space-y-2" data-testid="top-winners">
              {overview.topWinners.map((w, i) => (
                <li
                  key={w.clubId}
                  className="flex items-center gap-4 rounded-xl border border-border p-4"
                >
                  <span className="text-lg font-heading font-bold text-primary-ink w-8 text-center">
                    {i + 1}
                  </span>
                  <Link
                    href={`/clubs/${w.clubId}`}
                    className="flex-1 text-foreground hover:text-primary-ink"
                  >
                    {w.name}
                  </Link>
                  <span className="text-sm font-semibold text-foreground/70">
                    {w.titles} {t.titles}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-foreground/60">{t.editionsEmpty}</p>
          )
        ) : null}

        {tab === 'pontuacao' ? (
          <div className="space-y-8" data-testid="competition-points">
            {matchHistory && matchHistory.matchesUsed > 0 ? (
              <>
                {/*
                  T33 — MÉTRICAS PRINCIPAIS. Cada número vem das partidas, e o rodapé diz de
                  quantas: sem isso o leitor não sabe se "3,1 gols por jogo" são 10 jogos ou 3.800.
                */}
                <section aria-labelledby="metrics-title">
                  <h2 id="metrics-title" className="text-xl font-heading font-bold mb-3">
                    {ti.metricsTitle}
                  </h2>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Info label={ti.matchesUsed} value={String(matchHistory.records.matchesUsed)} />
                    <Info label={ti.totalGoals} value={String(matchHistory.records.totalGoals)} />
                    <Info
                      label={ti.goalsPerMatch}
                      value={
                        matchHistory.records.goalsPerMatch != null
                          ? String(matchHistory.records.goalsPerMatch).replace('.', ',')
                          : '—'
                      }
                    />
                    <Info
                      label={ti.goallessDraws}
                      value={String(matchHistory.records.goallessDraws)}
                    />
                  </dl>
                </section>

                {/* T33 — RECORDES. Uma goleada e a mesma partida vista dos dois lados: o card
                    mostra o vencedor E o derrotado, em vez de repetir o jogo em dois blocos. */}
                <section aria-labelledby="records-title">
                  <h2 id="records-title" className="text-xl font-heading font-bold mb-3">
                    {ti.recordsTitle}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {matchHistory.records.biggestWin ? (
                      <div
                        className="rounded-xl border border-border p-4"
                        data-testid="record-biggest-win"
                      >
                        <p className="text-xs uppercase tracking-wide text-foreground/60">
                          {ti.biggestWin}
                        </p>
                        <p className="mt-2 font-heading font-bold text-lg">
                          {matchHistory.records.biggestWin.homeClubName ?? '—'}{' '}
                          {matchHistory.records.biggestWin.homeScore} ×{' '}
                          {matchHistory.records.biggestWin.awayScore}{' '}
                          {matchHistory.records.biggestWin.awayClubName ?? '—'}
                        </p>
                        <p className="mt-1 text-sm text-foreground/70">
                          {ti.biggestDefeatNote.replace(
                            '{club}',
                            matchHistory.records.biggestWin.loserName ?? '—',
                          )}{' '}
                          · {matchHistory.records.biggestWin.season}
                          {matchHistory.records.biggestWin.round
                            ? ` · ${ti.roundLabel} ${matchHistory.records.biggestWin.round}`
                            : ''}
                        </p>
                      </div>
                    ) : null}
                    {matchHistory.records.highestScoring ? (
                      <div
                        className="rounded-xl border border-border p-4"
                        data-testid="record-highest-scoring"
                      >
                        <p className="text-xs uppercase tracking-wide text-foreground/60">
                          {ti.highestScoring}
                        </p>
                        <p className="mt-2 font-heading font-bold text-lg">
                          {matchHistory.records.highestScoring.homeClubName ?? '—'}{' '}
                          {matchHistory.records.highestScoring.homeScore} ×{' '}
                          {matchHistory.records.highestScoring.awayScore}{' '}
                          {matchHistory.records.highestScoring.awayClubName ?? '—'}
                        </p>
                        <p className="mt-1 text-sm text-foreground/70">
                          {ti.goalsInMatch.replace(
                            '{n}',
                            String(matchHistory.records.highestScoring.goals),
                          )}{' '}
                          · {matchHistory.records.highestScoring.season}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                {/*
                  T30 — TABELA HISTÓRICA DE PONTOS CORRIDOS. A régua de pontos vai no caption
                  porque somar eras com réguas diferentes produz um total que nunca existiu.
                */}
                <section aria-labelledby="table-title">
                  <h2 id="table-title" className="text-xl font-heading font-bold mb-3">
                    {ti.tableTitle}
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <caption className="bg-foreground/5 px-4 py-2 text-left text-xs text-foreground/70">
                        {matchHistory.pointsRuleNote} {ti.tableScopeNote}
                      </caption>
                      <thead>
                        <tr className="bg-foreground/5 text-left">
                          <th scope="col" className="px-3 py-3 font-semibold">
                            #
                          </th>
                          <th scope="col" className="px-3 py-3 font-semibold">
                            {t.club}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colPlayed}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colWins}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colDraws}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colLosses}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colGoalsFor}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colGoalsAgainst}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colGoalDiff}
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            {ti.colPoints}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.table.map((row) => (
                          <tr key={row.clubId} className="border-t border-border">
                            <td className="px-3 py-2 tabular-nums text-foreground/60">
                              {row.position}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {row.clubName ? (
                                <Link href={`/clubs/${row.clubId}`} className="hover:underline">
                                  {row.clubName}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.played}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.wins}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.draws}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.losses}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.goalsFor}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.goalsAgainst}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.goalDifference > 0
                                ? `+${row.goalDifference}`
                                : row.goalDifference}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {row.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {matchHistory.truncated ? (
                    <p className="mt-2 text-xs text-foreground/60">{ti.truncatedNote}</p>
                  ) : null}
                </section>

                {/* T33 — MAIORES CAMPEÕES: campeão derivado por pontos de cada temporada. */}
                {matchHistory.champions.length > 0 ? (
                  <section aria-labelledby="champions-title">
                    <h2 id="champions-title" className="text-xl font-heading font-bold mb-3">
                      {ti.championsTitle}
                    </h2>
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {matchHistory.champions.map((c) => (
                        <li
                          key={c.season}
                          className="flex items-center justify-between px-4 py-2 text-sm"
                        >
                          <span className="font-semibold tabular-nums">{c.season}</span>
                          <span>{c.clubName ?? '—'}</span>
                          <span className="tabular-nums text-foreground/60">{c.points} pts</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            ) : (
              <p className="text-foreground/70">{ti.emptyState}</p>
            )}
          </div>
        ) : null}

        {tab === 'temporadas' ? (
          <div className="space-y-8">
            {/* T-26 — RESUMO POR EDIÇÃO: partidas/gols/artilheiro/3º quando o acervo tem.
                Tabela só entra se ao menos uma edição tem dado — sem tabela placebo. */}
            {seasons.some(
              (s) =>
                s.totalMatches != null ||
                s.totalGoals != null ||
                s.topScorer != null ||
                s.third != null,
            ) ? (
              <div
                className="overflow-x-auto rounded-xl border border-border"
                data-testid="seasons-summary"
              >
                <table className="w-full text-sm">
                  <caption className="bg-foreground/5 px-4 py-2 text-left text-xs text-foreground/70">
                    {ti.metricsNote}
                  </caption>
                  <thead>
                    <tr className="bg-foreground/5 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.season}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.matches}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.goals}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t.topScorer}
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {ti.thirdPlace}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((se) => (
                      <tr key={`summary-${se.season}`} className="border-t border-border">
                        <td className="px-4 py-3 font-semibold">{se.season}</td>
                        <td className="px-4 py-3">{se.totalMatches ?? '—'}</td>
                        <td className="px-4 py-3">{se.totalGoals ?? '—'}</td>
                        <td className="px-4 py-3">
                          {se.topScorer ? `${se.topScorer.name} (${se.topScorer.goals})` : '—'}
                        </td>
                        <td className="px-4 py-3">{se.third?.clubName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {seasons.map((se) => (
              <section key={se.season} data-testid={`season-${se.season}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3 className="text-lg font-heading font-semibold">
                    {t.season} {se.season}
                  </h3>
                  {se.topScorer ? (
                    <p className="text-sm text-foreground/70">
                      {t.topScorer}: <strong>{se.topScorer.name}</strong> ({se.topScorer.goals})
                    </p>
                  ) : null}
                </div>
                {se.champion || se.runnerUp || se.totalMatches || se.totalGoals ? (
                  <p className="mb-3 text-sm text-foreground/70">
                    {/* Em COPAS a posição 1 da tabela NÃO é o campeão — o título vem da final. */}
                    {se.champion ? (
                      <span>
                        {t.champion}:{' '}
                        <Link
                          href={`/clubs/${se.champion.id}`}
                          className="text-primary-ink hover:underline font-semibold"
                        >
                          {se.champion.name ?? se.champion.id}
                        </Link>
                      </span>
                    ) : null}
                    {se.runnerUp ? (
                      <span>
                        {se.champion ? ' · ' : ''}
                        {t.runnerUp}:{' '}
                        <Link
                          href={`/clubs/${se.runnerUp.id}`}
                          className="text-primary-ink hover:underline"
                        >
                          {se.runnerUp.name ?? se.runnerUp.id}
                        </Link>
                      </span>
                    ) : null}
                    {se.third ? (
                      <span>
                        {se.champion || se.runnerUp ? ' · ' : ''}
                        {ti.thirdPlace}:{' '}
                        {se.third.clubId ? (
                          <Link
                            href={`/clubs/${se.third.clubId}`}
                            className="text-primary-ink hover:underline"
                          >
                            {se.third.clubName}
                          </Link>
                        ) : (
                          se.third.clubName
                        )}
                      </span>
                    ) : null}
                    {se.totalMatches ? (
                      <span>
                        {se.champion || se.runnerUp ? ' · ' : ''}
                        {t.matches}: {se.totalMatches}
                      </span>
                    ) : null}
                    {se.totalGoals ? (
                      <span>
                        {se.champion || se.runnerUp || se.totalMatches ? ' · ' : ''}
                        {t.goals}: {se.totalGoals}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {se.standings && se.standings.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-foreground/5 text-left">
                          <th scope="col" className="px-3 py-2">
                            {t.pos}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.club}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.played}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.won}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.drawn}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.lost}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.goalsFor}
                          </th>
                          <th scope="col" className="px-3 py-2">
                            {t.goalsAgainst}
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            {t.points}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {se.standings.map((row) => (
                          <tr
                            key={`${se.season}-${row.position}`}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2 font-semibold">{row.position}</td>
                            <td className="px-3 py-2">
                              {row.clubId ? (
                                <Link
                                  href={`/clubs/${row.clubId}`}
                                  className="text-primary-ink hover:underline"
                                >
                                  {row.matchedName ?? row.clubName}
                                </Link>
                              ) : (
                                <span className="text-foreground/60">{row.clubName}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{row.played ?? '—'}</td>
                            <td className="px-3 py-2">{row.won ?? '—'}</td>
                            <td className="px-3 py-2">{row.drawn ?? '—'}</td>
                            <td className="px-3 py-2">{row.lost ?? '—'}</td>
                            <td className="px-3 py-2">{row.goalsFor ?? '—'}</td>
                            <td className="px-3 py-2">{row.goalsAgainst ?? '—'}</td>
                            <td className="px-3 py-2 font-semibold">{row.points ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">{t.seasonsEmpty}</p>
                )}
                {/* FONTE — rodapé da seção, abaixo da tabela de temporadas. A tabela é o
                    dado; a origem vem depois e em `SourceNote`, com o peso único do design
                    system. Antes era um link solto de 12px com cor própria. */}
                <SourceNote href={se.sourceUrl ?? null} label={t.source} detail={t.wikipedia} />
              </section>
            ))}
          </div>
        ) : null}

        {tab === 'visao' ? (
          <div className="space-y-10" data-testid="competition-insights">
            {/* PÓDIO — última edição com campeão catalogado (T510). Campeão em destaque;
                vice/3º só quando o acervo tem (copa sem 3º de liga = slot não renderiza). */}
            <section aria-labelledby="podium-title">
              <h2 id="podium-title" className="text-xl font-heading font-bold mb-3">
                {ti.podiumTitle}
              </h2>
              {podium?.champion ? (
                <div className="space-y-4" data-testid="competition-podium">
                  <article className="rounded-xl border border-primary/40 bg-primary/5 p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      {comp.trophyImageUrl ? (
                        <span className="w-16 h-16 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={comp.trophyImageUrl}
                            alt=""
                            className="object-contain w-12 h-12"
                            loading="lazy"
                          />
                        </span>
                      ) : null}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink">
                          {ti.podiumChampion}
                        </p>
                        <p className="text-2xl font-heading font-bold text-foreground mt-0.5">
                          {podium.champion.clubId ? (
                            <Link
                              href={`/clubs/${podium.champion.clubId}`}
                              className="hover:text-primary-ink"
                            >
                              {podium.champion.clubName}
                            </Link>
                          ) : (
                            podium.champion.clubName
                          )}
                        </p>
                        {history?.lastEditionYear != null ? (
                          <p className="text-xs text-foreground/70 mt-1">
                            {insText(ti.lastEdition, { year: history.lastEditionYear })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                  {podium.runnerUp || podium.third ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {podium.runnerUp ? (
                        <PodiumSlot
                          club={podium.runnerUp}
                          label={t.runnerUp}
                          medalNote={ti.medalSilver}
                          tone="silver"
                        />
                      ) : null}
                      {podium.third ? (
                        <PodiumSlot
                          club={podium.third}
                          label={ti.thirdPlace}
                          medalNote={ti.medalBronze}
                          tone="bronze"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-foreground/70" data-testid="podium-empty">
                  {ti.podiumEmpty}
                </p>
              )}
            </section>

            {/* HISTÓRIA — só o que o acervo sustenta; lacuna vira texto declarado. */}
            <section aria-labelledby="history-title">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 id="history-title" className="text-xl font-heading font-bold">
                  {ti.historyTitle}
                </h2>
                {history?.status === 'vigente' ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full bg-success-surface text-success-ink font-semibold"
                    data-testid="competition-status"
                  >
                    {ti.statusVigente}
                  </span>
                ) : null}
                {history?.status === 'extinta' ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/70"
                    data-testid="competition-status"
                  >
                    {dissolvedYear != null
                      ? insText(ti.statusExtinta, { year: dissolvedYear })
                      : ti.statusExtinta.replace(' {year}', '')}
                  </span>
                ) : null}
                {history?.status === 'sem_edicao_recente' ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/70"
                    data-testid="competition-status"
                  >
                    {ti.statusSemEdicao}
                  </span>
                ) : null}
              </div>
              {history && history.editionsCount > 0 ? (
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {history.firstEditionYear != null ? (
                    <HistoryStat label={ti.firstEdition} value={String(history.firstEditionYear)} />
                  ) : null}
                  <HistoryStat label={ti.editionsCount} value={String(history.editionsCount)} />
                  {history.biggestChampion ? (
                    <HistoryStat
                      label={ti.biggestChampion}
                      value={
                        <Link
                          href={`/clubs/${history.biggestChampion.clubId}`}
                          className="text-primary-ink hover:underline"
                        >
                          {history.biggestChampion.clubName}
                        </Link>
                      }
                      extra={`${history.biggestChampion.titles} ${t.titles}`}
                    />
                  ) : null}
                  {history.longestStreak ? (
                    <HistoryStat
                      label={ti.longestStreak}
                      value={history.longestStreak.clubName}
                      extra={`${history.longestStreak.from}–${history.longestStreak.to}`}
                    />
                  ) : null}
                </dl>
              ) : (
                <p className="text-sm text-foreground/70" data-testid="history-empty">
                  {ti.historyEmpty}
                </p>
              )}
              {descriptionText ? (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-foreground">{ti.aboutTitle}</h3>
                  <p className="measure-readable text-sm text-foreground mt-1">{descriptionText}</p>
                  <SourceNote
                    href={descriptionSourceUrl}
                    label="Wikidata"
                    detail="CC0"
                    ariaLabel={
                      locale === 'pt-br'
                        ? 'Fonte da descrição: Wikidata (CC0)'
                        : locale === 'en-us'
                          ? 'Description source: Wikidata (CC0)'
                          : 'Fuente de la descripción: Wikidata (CC0)'
                    }
                  />
                </div>
              ) : null}
            </section>

            {/* MÉTRICAS — totais SOMENTE das edições catalogadas (nota de escopo visível). */}
            {totals && (totals.matches != null || totals.goals != null) ? (
              <section aria-labelledby="metrics-title">
                <h2 id="metrics-title" className="text-xl font-heading font-bold mb-3">
                  {ti.metricsTitle}
                </h2>
                <div className="grid grid-cols-2 gap-4 max-w-md" data-testid="competition-totals">
                  {totals.matches != null ? (
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <p className="font-heading text-3xl font-bold text-primary-ink">
                        {formatCount(totals.matches, locale)}
                      </p>
                      <p className="text-sm text-foreground/70">{t.matches}</p>
                    </div>
                  ) : null}
                  {totals.goals != null ? (
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <p className="font-heading text-3xl font-bold text-primary-ink">
                        {formatCount(totals.goals, locale)}
                      </p>
                      <p className="text-sm text-foreground/70">{t.goals}</p>
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-foreground/70 mt-2">{ti.metricsNote}</p>
              </section>
            ) : null}

            <p className="text-xs text-foreground/70">{t.overviewHint}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value, extra }: { label: string; value: React.ReactNode; extra?: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/70 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">
        {value}
        {extra ? <span className="text-foreground/70"> · {extra}</span> : null}
      </p>
    </div>
  );
}

/**
 * Estatística da HISTÓRIA — mesmo molde do `Info` do cabeçalho, com valor grande.
 * Só entra quando o acervo tem o dado (chamada condicional no JSX).
 */
function HistoryStat({
  label,
  value,
  extra,
}: {
  label: string;
  value: React.ReactNode;
  extra?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4" data-testid="history-stat">
      <dt className="text-xs text-foreground/70 uppercase tracking-wider">{label}</dt>
      <dd className="font-heading text-lg font-bold text-foreground mt-0.5">
        {value}
        {extra ? (
          <span className="text-sm font-semibold text-foreground/70"> · {extra}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Slot de vice/3º do pódio — MEDALHA É ILUSTRAÇÃO AUTORAL (ícone autoral do design
 * system), nunca foto de medalha: o rótulo declara isso no próprio card. Sem clube no
 * acervo, o slot nem renderiza (chamada condicional) — não existe pódio inventado.
 */
function PodiumSlot({
  club,
  label,
  medalNote,
  tone,
}: {
  club: PodiumClubDto;
  label: string;
  medalNote: string;
  tone: 'silver' | 'bronze';
}) {
  return (
    <article
      className="rounded-xl border border-border bg-background p-4"
      data-testid={tone === 'silver' ? 'podium-runner-up' : 'podium-third'}
    >
      <div className="flex items-center gap-3">
        {/* Ícone decorativo (aria-hidden): quem nomeia o slot é o rótulo de texto. */}
        <span
          aria-hidden="true"
          className={`shrink-0 ${tone === 'silver' ? 'text-ink-2' : 'text-secondary'}`}
        >
          <TrophyMedal size={28} />
        </span>
        <div>
          <p className="text-xs text-foreground/70">{label}</p>
          <p className="font-heading font-bold text-foreground">
            {club.clubId ? (
              <Link href={`/clubs/${club.clubId}`} className="hover:text-primary-ink">
                {club.clubName}
              </Link>
            ) : (
              club.clubName
            )}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[0.6875rem] leading-snug text-ink-3">{medalNote}</p>
    </article>
  );
}
