import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import FavoriteButton from '@/components/FavoriteButton';
import SocialLinks from '@/components/SocialLinks';
import { CountryFlag } from '@/components/CountryFlag';
import CompetitionPodium from '@/components/ficha/CompetitionPodium';
import Pillar from '@/components/ficha/Pillar';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState } from '@/components/ficha/States';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import TabelaFicha from '@/components/conceito/competicao/TabelaFicha';
import TabelaClassificacao from '@/components/conceito/competicao/TabelaClassificacao';
import Criterios from '@/components/conceito/competicao/Criterios';
import CompeticaoHeader from '@/components/conceito/competicao/CompeticaoHeader';
import Procedencia from '@/components/conceito/competicao/Procedencia';
import {
  latestSeasonWithStandings,
  normalizeHistoryTable,
  normalizeStandings,
  roundsFromStandings,
} from '@/components/conceito/competicao/derive';
import { fichaStrings } from '@/i18n/wsFicha';
import SourceNote from '@/components/SourceNote';
import { wIconsStrings } from '@/i18n/wsIcons';
import { wsCompetitionInsightsStrings, insText } from '@/i18n/wsCompetitionInsights';
import { PositionChart } from '@/components/PositionChart';
import { formatCount } from '@/lib/format';
import { countryLabel } from '@/lib/country-flag';
import { conceitoCompeticaoStrings, fillCompeticao } from '@/i18n/wsConceitoCompeticao';

// Mapeamento do portal (Operador, 08/10 — Entrega 2): sub-abas Visão Geral |
// Edições | Clubes | Maiores Campeões sobre o overview WON da API. Honestidade:
// sem edições → "Edições em catalogação"; participantes = clubes com títulos
// catalogados (a aresta PARTICIPATED_IN não existe no grafo).
//
// CONCEITO FICHA (quadro design/concept/app/tabela.png): o cabeçalho abre com kicker
// ("Competição · país"), h1 display e um número-âncora; a apresentação da TABELA DE
// CLASSIFICAÇÃO segue a tabela densa do quadro (9px de cabeçalho, zebra, número à direita com
// numeral tabular, fio de 2px sob o cabeçalho). Todas as abas e funcionalidades anteriores
// continuam existindo — o que mudou é a composição, não o dado.

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
    // 404 explícito = não existe. Qualquer outra falha = NÃO SABEMOS (undefined), e a página
    // não pode transformar "não sabemos" em "não existe".
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const json = await res.json();
    return {
      data: json.data as Competition | null,
      overview: (json.overview ?? null) as Overview | null,
      seasons: (json.seasons ?? []) as CompetitionSeasonData[],
    };
  } catch {
    return undefined;
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

interface RoundTableRow {
  clubId: string;
  clubName: string | null;
  position: number;
  points: number;
  positionChange: number | null;
}
interface SeasonRoundsDto {
  season: string;
  rounds: Array<{
    round: string;
    roundNumber: number | null;
    matchesInRound: number;
    table: RoundTableRow[];
  }>;
  matchesUsed: number;
}

/**
 * T31 — evolução rodada a rodada de UMA temporada.
 *
 * `season` é obrigatório no endpoint e a função devolve null sem ele: pedir "as rodadas"
 * sem dizer de que ano traria a resposta errada, e a página prefere não desenhar a inventar.
 */
async function getSeasonRounds(id: string, season: string): Promise<SeasonRoundsDto | null> {
  try {
    const url = `${getApiBase()}/competitions/${id}/rounds?season=${encodeURIComponent(season)}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as SeasonRoundsDto | null;
  } catch {
    return null;
  }
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
  searchParams: Promise<{ tab?: string; season?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam, season: seasonParam } = await searchParams;
  const res = await getCompetition(id);
  // `undefined` = não conseguimos perguntar; `null`/data ausente = a origem disse que não há.
  if (res === undefined)
    return (
      <DetailUnavailable
        retryHref={`/competitions/${id}`}
        backHref="/competitions"
        backLabel="Competições"
      />
    );
  if (!res?.data) notFound();
  const comp = res.data;
  /* Só busca o histórico quando a aba pede: a consulta varre as partidas da competição inteira,
     e pagar isso em toda visita de qualquer aba seria desperdício. */
  const matchHistory = tabParam === 'pontuacao' ? await getCompetitionHistory(id) : null;
  /* Temporada: a pedida na URL, ou a MAIS RECENTE do acervo. Sem esse padrão a aba abriria
     vazia até o usuário escolher — e a primeira pergunta de quem chega é "como foi o último
     campeonato?", não "escolha um ano". */
  const temporadaEscolhida =
    seasonParam ?? (matchHistory?.seasons.at(-1) as string | undefined) ?? null;
  const seasonRounds =
    tabParam === 'pontuacao' && temporadaEscolhida
      ? await getSeasonRounds(id, temporadaEscolhida)
      : null;
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
  // Conceito FICHA — strings aditivas da composição (kicker, âncora, tabela densa, critérios).
  const tc = conceitoCompeticaoStrings[locale];
  const history = overview?.history ?? null;
  const podium = overview?.podium ?? null;
  const totals = overview?.totals ?? null;
  // Descrição no locale ativo (dado CC0 do enriquecimento — sem tradução local).
  const descKey = ({ 'pt-br': 'pt', 'en-us': 'en', 'es-es': 'es' } as const)[locale];
  const descriptionText = comp.description?.[descKey]?.trim() || null;
  const descriptionSourceUrl = comp.description?.sourceUrl ?? null;
  const dissolvedYear =
    comp.dissolvedAt != null ? new Date(comp.dissolvedAt).getUTCFullYear() : null;

  // O quadro abre na CLASSIFICAÇÃO (tabela.png), não na visão geral. Quando a competição tem
  // tabela catalogada, "temporadas" é a composição primária; as outras abas continuam a um
  // clique, com todo o conteúdo antigo preservado.
  const temTabela = seasons.some((se) => (se.standings?.length ?? 0) > 0);
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as Tab)
    : temTabela
      ? 'temporadas'
      : 'visao';

  /*
   * CABEÇALHO — a âncora do quadro é "38 / RODADAS · 2024-25". O 38 sai da última temporada
   * com tabela catalogada (maior nº de jogos por clube); sem tabela, cai para as edições
   * catalogadas. Sem nenhuma das duas não há âncora: número não verificado não vira manchete.
   */
  const tabelaRecente = latestSeasonWithStandings(seasons);
  const rodadas = tabelaRecente ? roundsFromStandings(tabelaRecente.standings) : 0;
  const anchorValue =
    rodadas > 0
      ? formatCount(rodadas, locale)
      : overview && overview.totalEditions > 0
        ? formatCount(overview.totalEditions, locale)
        : undefined;
  const anchorLabel =
    anchorValue == null
      ? undefined
      : rodadas > 0 && tabelaRecente
        ? fillCompeticao(tc.head.anchorRounds, { season: tabelaRecente.season })
        : tc.head.anchorEditions;
  /* Kicker do conceito: "Competição · país". Sem país, o kicker fica só "Competição" e o
     metadado "internacional" aparece no chip da identificação — sem repetir a palavra. */
  const countryText = countryLabel(comp.country, locale);
  const kicker = countryText ? `${tc.head.kicker} · ${countryText}` : tc.head.kicker;
  const subtitle = tabelaRecente
    ? fillCompeticao(tc.head.subtitle, { season: tabelaRecente.season })
    : tc.head.subtitleNoTable;

  const seasonFoco =
    seasons.find((se) => se.season === seasonParam) ??
    latestSeasonWithStandings(seasons) ??
    seasons[0] ??
    null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: comp.name,
    location: comp.country ? { '@type': 'Country', name: comp.country } : undefined,
  };

  const currentChampion = overview?.editions?.[0] ?? null;

  const tabList: Array<{ id: Tab; label: string }> = [
    // T508 (W4) — classificação por temporada primeiro: é a composição do quadro.
    ...(seasons.length > 0 ? [{ id: 'temporadas' as Tab, label: t.tabs.seasons }] : []),
    { id: 'visao', label: t.tabs.overview },
    { id: 'edicoes', label: t.tabs.editions },
    { id: 'clubes', label: t.tabs.clubs },
    { id: 'campeoes', label: t.tabs.topWinners },
    // T30/T33 — só aparece se a competição TEM partidas com placar: aba vazia não é opção.
    ...(matchHistory && matchHistory.matchesUsed > 0
      ? [{ id: 'pontuacao' as Tab, label: ti.tabLabel }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Link
        href="/competitions"
        className="mb-6 inline-flex min-h-6 items-center text-[12px] text-ink-3 transition-colors duration-200 hover:text-primary-ink"
      >
        &larr; {dict.pages.competitions.title}
      </Link>

      {/* CABEÇALHO — kicker, h1 display, âncora de rodadas/edições, subtítulo e troféu. */}
      <CompeticaoHeader
        locale={locale}
        kicker={kicker}
        name={comp.name}
        subtitle={subtitle}
        anchor={anchorValue}
        anchorLabel={anchorLabel}
        countryCode={comp.country ?? null}
        internationalLabel={t.international}
        genderLabel={comp.gender === 'women' ? dict.pages.rankings.genderWomen : null}
        levelLabel={typeof comp.level === 'number' ? `${t.level} ${comp.level}` : null}
        trophyImageUrl={comp.trophyImageUrl ?? null}
        trophyIllustrationNote={ic.competitionTrophy}
        actions={
          <FavoriteButton
            targetType="competition"
            targetId={comp.id}
            initialCount={comp.fansCount ?? undefined}
            countLabel={t.spectators}
          />
        }
        social={
          <SocialLinks
            officialSite={comp.officialSite ?? null}
            socialLinks={comp.socialLinks ?? null}
            followersSnapshot={comp.followersSnapshot ?? null}
          />
        }
      />

      {/* Sub-abas (links server-side: ?tab=) — todas as abas originais preservadas. */}
      <nav className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label={t.tabsLabel}>
        {tabList.map((tb) => {
          const active = tab === tb.id;
          return (
            <Link
              key={tb.id}
              href={`/competitions/${id}?tab=${tb.id}`}
              role="tab"
              aria-selected={active}
              className={`inline-flex min-h-9 items-center rounded-[2px] border px-3 text-[13px] font-semibold transition-colors duration-200 ${
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
              }`}
            >
              {tb.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === 'edicoes' ? (
          overview && overview.editions.length > 0 ? (
            <div data-testid="competition-editions">
              <TabelaFicha
                columns={[
                  { key: 'year', label: t.year, align: 'right', width: 14 },
                  { key: 'champion', label: t.champion, align: 'left' },
                ]}
                rows={overview.editions.map((e) => [
                  <span key="year" className="font-semibold text-foreground">
                    {String(e.year)}
                  </span>,
                  <Link
                    key="champion"
                    href={`/clubs/${e.champion.id}`}
                    className="inline-flex min-h-6 items-center text-primary-ink hover:underline"
                  >
                    {e.champion.name}
                  </Link>,
                ])}
                caption={fillCompeticao(tc.tables.captionEditions, { competition: comp.name })}
                regionLabel={fillCompeticao(tc.tables.regionLabelEditions, {
                  competition: comp.name,
                })}
                testId="competition-editions-table"
                minWidthClass="min-w-[420px]"
              />
            </div>
          ) : (
            <div data-testid="edicoes-empty">
              <EmptyState title={t.editionsEmpty} body={fichaStrings[locale].states.emptyBody} />
            </div>
          )
        ) : null}

        {tab === 'clubes' ? (
          overview && overview.participants.length > 0 ? (
            <>
              <p className="mb-4 text-[11px] leading-snug text-ink-3">{t.participantsNote}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overview.participants.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}`}
                    className="block rounded-[2px] border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/60"
                  >
                    <p className="font-heading text-[15px] font-semibold text-foreground">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-3">
                      {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div data-testid="clubes-empty">
              <EmptyState
                title={t.participantsEmpty}
                body={fichaStrings[locale].states.emptyBody}
              />
            </div>
          )
        ) : null}

        {tab === 'campeoes' ? (
          overview && overview.topWinners.length > 0 ? (
            <ol className="divide-y divide-border border-y border-border" data-testid="top-winners">
              {overview.topWinners.map((w, i) => (
                <li key={w.clubId} className="flex items-center gap-4 py-3">
                  <span className="w-6 shrink-0 text-right font-heading text-base font-bold tabular-nums text-primary-ink">
                    {i + 1}
                  </span>
                  <Link
                    href={`/clubs/${w.clubId}`}
                    className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground hover:text-primary-ink hover:underline"
                  >
                    {w.name}
                  </Link>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
                    {formatCount(w.titles, locale)} {t.titles}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-2">{t.editionsEmpty}</p>
          )
        ) : null}

        {tab === 'pontuacao' ? (
          <div className="space-y-10" data-testid="competition-points">
            {matchHistory && matchHistory.matchesUsed > 0 ? (
              <>
                {/*
                  T33 — MÉTRICAS PRINCIPAIS. Cada número vem das partidas, e o rodapé diz de
                  quantas: sem isso o leitor não sabe se "3,1 gols por jogo" são 10 jogos ou 3.800.
                */}
                <section aria-labelledby="metrics-title">
                  <SectionHeading id="metrics-title">{ti.metricsTitle}</SectionHeading>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-t-2 border-foreground pt-5 sm:grid-cols-4">
                    <Pillar
                      label={ti.matchesUsed}
                      value={formatCount(matchHistory.records.matchesUsed, locale)}
                    />
                    <Pillar
                      label={ti.totalGoals}
                      value={formatCount(matchHistory.records.totalGoals, locale)}
                      accent
                    />
                    <Pillar
                      label={ti.goalsPerMatch}
                      value={
                        matchHistory.records.goalsPerMatch != null
                          ? String(matchHistory.records.goalsPerMatch).replace('.', ',')
                          : '—'
                      }
                    />
                    <Pillar
                      label={ti.goallessDraws}
                      value={formatCount(matchHistory.records.goallessDraws, locale)}
                    />
                  </div>
                </section>

                {/* T33 — RECORDES. Uma goleada e a mesma partida vista dos dois lados: o card
                    mostra o vencedor E o derrotado, em vez de repetir o jogo em dois blocos. */}
                <section aria-labelledby="records-title">
                  <SectionHeading id="records-title">{ti.recordsTitle}</SectionHeading>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {matchHistory.records.biggestWin ? (
                      <div
                        className="rounded-[2px] border border-border p-4"
                        data-testid="record-biggest-win"
                      >
                        <p className="text-[11px] text-ink-3">{ti.biggestWin}</p>
                        <p className="mt-2 font-heading text-lg font-bold text-foreground">
                          {matchHistory.records.biggestWin.homeClubName ?? '—'}{' '}
                          {matchHistory.records.biggestWin.homeScore} ×{' '}
                          {matchHistory.records.biggestWin.awayScore}{' '}
                          {matchHistory.records.biggestWin.awayClubName ?? '—'}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-ink-2">
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
                        className="rounded-[2px] border border-border p-4"
                        data-testid="record-highest-scoring"
                      >
                        <p className="text-[11px] text-ink-3">{ti.highestScoring}</p>
                        <p className="mt-2 font-heading text-lg font-bold text-foreground">
                          {matchHistory.records.highestScoring.homeClubName ?? '—'}{' '}
                          {matchHistory.records.highestScoring.homeScore} ×{' '}
                          {matchHistory.records.highestScoring.awayScore}{' '}
                          {matchHistory.records.highestScoring.awayClubName ?? '—'}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-ink-2">
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
                  T31 — EVOLUÇÃO RODADA A RODADA. A temporada é escolhida por link (sem
                  JavaScript): são dez opções e um <select> controlado exigiria cliente só
                  para navegar. O gráfico é SVG no servidor, e a tabela alternativa dentro
                  dele é a mesma informação em texto — para quem não lê o desenho e para
                  conferir o desenho contra o número.
                */}
                {matchHistory.seasons.length > 0 ? (
                  <section aria-labelledby="rounds-title">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                      <h2
                        id="rounds-title"
                        className="text-[12.5px] font-semibold leading-tight text-foreground"
                      >
                        {ti.roundsTitle}
                      </h2>
                      <nav aria-label={ti.seasonPickerLabel} className="flex flex-wrap gap-1.5">
                        {matchHistory.seasons.map((se) => {
                          const ativa = se === temporadaEscolhida;
                          return (
                            <Link
                              key={se}
                              href={`/competitions/${id}?tab=pontuacao&season=${encodeURIComponent(se)}`}
                              aria-current={ativa ? 'page' : undefined}
                              className={`inline-flex min-h-6 items-center rounded-[2px] border px-2.5 text-[11px] font-semibold transition-colors duration-200 ${
                                ativa
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-border text-ink-2 hover:border-foreground hover:text-foreground'
                              }`}
                            >
                              {se}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                    {seasonRounds && seasonRounds.rounds.length > 1 ? (
                      <PositionChart
                        rounds={seasonRounds.rounds.map((r) => ({
                          round: r.round,
                          table: r.table.map((entry) => ({
                            clubId: entry.clubId,
                            position: entry.position,
                            clubName: entry.clubName,
                          })),
                        }))}
                        title={insText(ti.roundsChartTitle, { season: seasonRounds.season })}
                        tableSummaryLabel={ti.roundsTableSummary}
                        clubLabel={t.club}
                        highlightLabel={(nome, delta) =>
                          insText(ti.roundsHighlight, { club: nome, delta })
                        }
                        totalRounds={seasonRounds.rounds.length}
                      />
                    ) : (
                      <p className="text-sm text-ink-2">{ti.roundsEmpty}</p>
                    )}
                  </section>
                ) : null}

                {/*
                  T30 — TABELA HISTÓRICA DE PONTOS CORRIDOS, agora na tabela densa do conceito.
                  A régua de pontos vai no caption porque somar eras com réguas diferentes
                  produz um total que nunca existiu.
                */}
                <section aria-labelledby="table-title">
                  <SectionHeading id="table-title">{ti.tableTitle}</SectionHeading>
                  <TabelaClassificacao
                    rows={normalizeHistoryTable(matchHistory.table)}
                    locale={locale}
                    competitionName={comp.name}
                    kind="history"
                    s={tc}
                    testId="competition-history-table"
                    rowTestId="competition-history-row"
                  />
                  <p className="mt-2 text-[11px] leading-snug text-ink-3">
                    {matchHistory.pointsRuleNote} {ti.tableScopeNote}
                  </p>
                  {matchHistory.truncated ? (
                    <p className="mt-1 text-[11px] leading-snug text-ink-3">{ti.truncatedNote}</p>
                  ) : null}
                  <Criterios
                    testId="competition-history-criteria"
                    title={tc.criteria.title}
                    items={[tc.criteria.derivedOrder, tc.tables.goalDifferenceNote]}
                  />
                </section>

                {/* T33 — MAIORES CAMPEÕES: campeão derivado por pontos de cada temporada. */}
                {matchHistory.champions.length > 0 ? (
                  <section aria-labelledby="champions-title">
                    <SectionHeading id="champions-title">{ti.championsTitle}</SectionHeading>
                    <ul className="divide-y divide-border border-y border-border">
                      {matchHistory.champions.map((c) => (
                        <li
                          key={c.season}
                          className="flex items-center justify-between gap-3 py-2 text-[13px]"
                        >
                          <span className="font-semibold tabular-nums text-foreground">
                            {c.season}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-center text-ink-2">
                            {c.clubName ?? '—'}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-3">
                            {formatCount(c.points, locale)} {t.points}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ink-2">{ti.emptyState}</p>
            )}
          </div>
        ) : null}

        {tab === 'temporadas' ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[12.5px] font-semibold text-foreground">
                {tc.head.temporadasTitle}
              </h2>
              <nav aria-label={ti.seasonPickerLabel} className="flex flex-wrap gap-1.5">
                {seasons.map((se) => {
                  const ativa = se.season === seasonFoco?.season;
                  return (
                    <Link
                      key={se.season}
                      href={`/competitions/${id}?tab=temporadas&season=${encodeURIComponent(se.season)}`}
                      aria-current={ativa ? 'page' : undefined}
                      className={`inline-flex min-h-6 items-center rounded-[2px] border px-2.5 text-[11px] font-semibold transition-colors duration-200 ${
                        ativa
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-ink-2 hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      {se.season}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {seasonFoco ? (
              <section data-testid={`season-${seasonFoco.season}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold leading-tight text-foreground">
                    {t.season} {seasonFoco.season}
                  </h2>
                  {seasonFoco.topScorer ? (
                    <p className="text-[11px] text-ink-3">
                      {t.topScorer}: {seasonFoco.topScorer.name} (
                      {formatCount(seasonFoco.topScorer.goals, locale)})
                    </p>
                  ) : null}
                </div>
                {seasonFoco.standings && seasonFoco.standings.length > 0 ? (
                  <TabelaClassificacao
                    rows={normalizeStandings(seasonFoco.standings)}
                    locale={locale}
                    competitionName={comp.name}
                    season={seasonFoco.season}
                    kind="standings"
                    s={tc}
                    testId={`competition-standings-table-${seasonFoco.season}`}
                    rowTestId="competition-standings-row"
                  />
                ) : (
                  <div data-testid={`season-standings-empty-${seasonFoco.season}`}>
                    <EmptyState
                      title={tc.states.noStandingsTitle}
                      body={tc.states.noStandingsBody}
                    />
                  </div>
                )}
                <SourceNote
                  href={seasonFoco.sourceUrl ?? null}
                  label={t.source}
                  detail={t.wikipedia}
                />
              </section>
            ) : (
              <EmptyState title={tc.states.noStandingsTitle} body={tc.states.noStandingsBody} />
            )}

            {/* O resumo por edição não está no quadro; fica em disclosure para não competir
                com a classificação. */}
            {seasons.some(
              (se) =>
                se.totalMatches != null ||
                se.totalGoals != null ||
                se.topScorer != null ||
                se.third != null,
            ) ? (
              <details className="border-t border-border pt-3" data-testid="seasons-summary">
                <summary className="cursor-pointer text-[12px] font-semibold text-foreground">
                  {tc.head.seasonSummaryToggle}
                </summary>
                <div className="mt-3">
                  <TabelaFicha
                    columns={[
                      { key: 'season', label: t.season, align: 'left' },
                      { key: 'matches', label: t.matches, align: 'right' },
                      { key: 'goals', label: t.goals, align: 'right' },
                      { key: 'topScorer', label: t.topScorer, align: 'left' },
                      { key: 'third', label: ti.thirdPlace, align: 'left' },
                    ]}
                    rows={seasons.map((se) => [
                      <span key="season" className="font-semibold text-foreground">
                        {se.season}
                      </span>,
                      <span key="matches">
                        {se.totalMatches != null ? formatCount(se.totalMatches, locale) : '—'}
                      </span>,
                      <span key="goals">
                        {se.totalGoals != null ? formatCount(se.totalGoals, locale) : '—'}
                      </span>,
                      <span key="top-scorer">
                        {se.topScorer
                          ? `${se.topScorer.name} (${formatCount(se.topScorer.goals, locale)})`
                          : '—'}
                      </span>,
                      <span key="third">{se.third?.clubName ?? '—'}</span>,
                    ])}
                    caption={fillCompeticao(tc.tables.captionSeasonsSummary, {
                      competition: comp.name,
                    })}
                    regionLabel={fillCompeticao(tc.tables.regionLabelSeasons, {
                      competition: comp.name,
                    })}
                    testId="seasons-summary-table"
                    minWidthClass="min-w-[620px]"
                  />
                  <p className="mt-2 text-[11px] leading-snug text-ink-3">{ti.metricsNote}</p>
                </div>
              </details>
            ) : null}

            <Criterios
              testId="competition-standings-criteria"
              title={tc.criteria.title}
              items={[
                tc.criteria.sourceOrder,
                tc.tables.goalDifferenceNote,
                tc.tables.formGap,
                tc.criteria.zonesGap,
              ]}
            />
          </div>
        ) : null}

        {tab === 'visao' ? (
          <div className="space-y-10" data-testid="competition-insights">
            {/* FICHA TÉCNICA — o que a origem publica sobre o recorte. Era a lista `dl` do
                cabeçalho antigo; desceu para a aba Visão Geral preservando os mesmos campos. */}
            <section aria-labelledby="competition-info-title">
              <SectionHeading id="competition-info-title">{tc.head.infoTitle}</SectionHeading>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-4 sm:grid-cols-3">
                {comp.country ? (
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
                ) : null}
                {comp.type ? <Info label={t.type} value={comp.type} /> : null}
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
                  <Info
                    label={t.totalEditions}
                    value={formatCount(overview.totalEditions, locale)}
                  />
                ) : null}
                {comp.qid ? <Info label="Wikidata" value={comp.qid} /> : null}
              </dl>
            </section>

            {/* PÓDIO — última edição com campeão catalogado (T510). Campeão em destaque;
                vice/3º só quando o acervo tem (copa sem 3º de liga = slot não renderiza). */}
            <section aria-labelledby="podium-title">
              <SectionHeading id="podium-title">{ti.podiumTitle}</SectionHeading>
              <CompetitionPodium
                podium={podium ?? { champion: null, runnerUp: null, third: null }}
                labels={{
                  champion: ti.podiumChampion,
                  runnerUp: t.runnerUp,
                  third: ti.thirdPlace,
                  empty: ti.podiumEmpty,
                  lastEdition: (year: number) => insText(ti.lastEdition, { year }),
                  medalSilverNote: ti.medalSilver,
                  medalBronzeNote: ti.medalBronze,
                }}
                lastEditionYear={history?.lastEditionYear ?? null}
                trophyImageUrl={comp.trophyImageUrl ?? null}
              />
            </section>

            {/* HISTÓRIA — só o que o acervo sustenta; lacuna vira texto declarado. */}
            <section aria-labelledby="history-title">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2
                  id="history-title"
                  className="text-[12.5px] font-semibold leading-tight text-foreground"
                >
                  {ti.historyTitle}
                </h2>
                {history?.status === 'vigente' ? (
                  <span
                    className="inline-flex min-h-6 items-center rounded-[2px] border border-border bg-success-surface px-2 text-[11px] font-semibold leading-none text-success-ink"
                    data-testid="competition-status"
                  >
                    {ti.statusVigente}
                  </span>
                ) : null}
                {history?.status === 'extinta' ? (
                  <span
                    className="inline-flex min-h-6 items-center rounded-[2px] border border-border px-2 text-[11px] leading-none text-ink-2"
                    data-testid="competition-status"
                  >
                    {dissolvedYear != null
                      ? insText(ti.statusExtinta, { year: dissolvedYear })
                      : ti.statusExtinta.replace(' {year}', '')}
                  </span>
                ) : null}
                {history?.status === 'sem_edicao_recente' ? (
                  <span
                    className="inline-flex min-h-6 items-center rounded-[2px] border border-border px-2 text-[11px] leading-none text-ink-2"
                    data-testid="competition-status"
                  >
                    {ti.statusSemEdicao}
                  </span>
                ) : null}
              </div>
              {history && history.editionsCount > 0 ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                  {history.firstEditionYear != null ? (
                    <HistoryStat label={ti.firstEdition} value={String(history.firstEditionYear)} />
                  ) : null}
                  <HistoryStat
                    label={ti.editionsCount}
                    value={formatCount(history.editionsCount, locale)}
                  />
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
                <div data-testid="history-empty">
                  <EmptyState
                    title={ti.historyEmpty}
                    body={fichaStrings[locale].states.emptyBody}
                  />
                </div>
              )}
              {descriptionText ? (
                <div className="mt-5">
                  <h3 className="text-[12.5px] font-semibold text-foreground">{ti.aboutTitle}</h3>
                  <p className="measure-readable mt-1 text-sm text-foreground">{descriptionText}</p>
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
                <SectionHeading id="metrics-title">{ti.metricsTitle}</SectionHeading>
                <div
                  className="grid max-w-md grid-cols-2 gap-x-6 gap-y-6 border-t-2 border-foreground pt-5"
                  data-testid="competition-totals"
                >
                  {totals.matches != null ? (
                    <Pillar label={t.matches} value={formatCount(totals.matches, locale)} accent />
                  ) : null}
                  {totals.goals != null ? (
                    <Pillar label={t.goals} value={formatCount(totals.goals, locale)} />
                  ) : null}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-ink-3">{ti.metricsNote}</p>
              </section>
            ) : null}

            <p className="text-[11px] leading-snug text-ink-3">{t.overviewHint}</p>
          </div>
        ) : null}
      </div>

      <Procedencia
        s={tc}
        season={tabelaRecente?.season ?? null}
        hasDerived={Boolean(matchHistory && matchHistory.matchesUsed > 0)}
      />
    </div>
  );
}

/** Par rótulo/valor da ficha técnica — metadado de 11px, valor em 13px. */
function Info({ label, value, extra }: { label: string; value: React.ReactNode; extra?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-foreground">
        {value}
        {extra ? <span className="text-ink-3"> · {extra}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Estatística da HISTÓRIA — número de display, sem cartão: o conceito não empilha caixas;
 * usa fio de 1px no topo e o número em Barlow Condensed. Só entra quando o acervo tem o dado
 * (chamada condicional no JSX).
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
    <div className="border-t border-border pt-3" data-testid="history-stat">
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-bold leading-none text-foreground">
        {value}
        {extra ? (
          <span className="ml-1 text-[11px] font-semibold text-ink-3"> · {extra}</span>
        ) : null}
      </dd>
    </div>
  );
}
