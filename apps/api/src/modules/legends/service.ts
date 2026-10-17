/**
 * Legends — hall da fama agregado (T-L1).
 *
 * DECISÃO DE MODELO (Opção B — cálculo sob demanda + cache Redis, igual ao
 * `clubs/statistics.service.ts`): são duas agregações leves — arestas WON do
 * KnowledgeGraph e partidas com placar — e nenhuma delas justifica tabela
 * materializada. Cache de 5 min protege a vitrine (`legends:summary`).
 *
 * Honestidade do acervo (regra do projeto):
 *  - títulos vêm SOMENTE de arestas `KnowledgeGraph` relation='WON'
 *    (sourceType='Club' → targetType='Competition') ativas (sem soft-delete);
 *  - `lastTitleYear` é null quando nenhuma edição tem `metadata.year` — o ano
 *    não é inferido de nome, ordem ou "mais provável";
 *  - recordes vêm SOMENTE de partidas FINISHED com os dois placares; nada
 *    estimado;
 *  - seção sem dado suficiente devolve lista vazia / item null — o zero e o
 *    vazio são verdadeiros, e a proveniência de cada bloco declara a base
 *    considerada (a UI mostra o gap, não inventa).
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';

const LEGENDS_TTL_SECONDS = 300;
export const LEGENDS_CACHE_KEY = 'legends:summary';
const TOP_CLUBS = 10;
const TOP_COMPETITIONS = 8;

// ---------------------------------------------------------------------------
// Entradas (o carregador busca do banco; as funções puras recebem fixtures)
// ---------------------------------------------------------------------------

/** Aresta WON Club→Competition já filtrada (o chamador aplica excludeSoftDeleted). */
export interface WonTitleEdge {
  sourceId: string;
  targetId: string;
  metadata: unknown;
}

export interface ClubRef {
  id: string;
  name: string;
  country: string | null;
}

export interface CompetitionRef {
  id: string;
  name: string | null;
  type: string | null;
  country: string | null;
}

/** Linha mínima de partida com nomes já resolvidos (o chamador carrega do banco). */
export interface RecordMatchRow {
  id: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  date: string; // ISO
  competitionId: string | null;
  competitionName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  sourceUrl: string | null;
}

// ---------------------------------------------------------------------------
// Saídas
// ---------------------------------------------------------------------------

export interface TopChampionItem {
  clubId: string;
  clubName: string;
  country: string | null;
  titles: number;
  /** Ano da edição mais recente com `metadata.year`; null = sem ano na fonte. */
  lastTitleYear: number | null;
}

export interface CompetitionLeaderItem {
  competitionId: string;
  competitionName: string | null;
  competitionType: string | null;
  leaderClubId: string;
  leaderClubName: string;
  titles: number;
  lastTitleYear: number | null;
}

export interface MatchRecordItem {
  matchId: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  /** Saldo da partida (módulo). */
  margin: number;
  totalGoals: number;
  date: string;
  competitionId: string | null;
  competitionName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  sourceUrl: string | null;
}

export interface ClubSeasonGoalsItem {
  clubId: string;
  clubName: string;
  seasonId: string | null;
  seasonName: string | null;
  goals: number;
  matches: number;
}

export interface UnbeatenRunItem {
  clubId: string;
  clubName: string;
  seasonId: string | null;
  seasonName: string | null;
  /** Nº de partidas invictas consecutivas (ordenadas por data). */
  length: number;
  fromDate: string;
  toDate: string;
}

export interface LegendsSummary {
  topChampions: {
    items: TopChampionItem[];
    provenance: { source: 'knowledge-graph:WON'; titlesCounted: number };
  };
  competitionLeaders: {
    items: CompetitionLeaderItem[];
    provenance: { source: 'knowledge-graph:WON'; competitionsConsidered: number };
  };
  records: {
    biggestWin: MatchRecordItem | null;
    mostGoalsMatch: MatchRecordItem | null;
    mostGoalsClubSeason: ClubSeasonGoalsItem | null;
    longestUnbeatenSeason: UnbeatenRunItem | null;
    provenance: { source: 'matches'; matchesConsidered: number };
  };
}

export interface LegendsResponse {
  data: LegendsSummary;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Pureza — agregações determinísticas (ordem de entrada não muda o resultado)
// ---------------------------------------------------------------------------

function edgeMeta(metadata: unknown): Record<string, unknown> {
  return (metadata as Record<string, unknown> | null) ?? {};
}

/** Ano da edição da aresta; null quando a fonte não traz (nunca inferir). */
export function yearOfEdge(metadata: unknown): number | null {
  const year = edgeMeta(metadata).year;
  return typeof year === 'number' && Number.isFinite(year) ? year : null;
}

/** Comparador de texto sem locale (ordem de bytes, como no champions.service). */
function cmpAsc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

interface TitleAgg {
  titles: number;
  lastTitleYear: number | null;
}

/** PURA — conta títulos por clube a partir das arestas WON Club→Competition. */
export function countTitlesByClub(edges: WonTitleEdge[]): Map<string, TitleAgg> {
  const byClub = new Map<string, TitleAgg>();
  for (const e of edges) {
    let agg = byClub.get(e.sourceId);
    if (!agg) {
      agg = { titles: 0, lastTitleYear: null };
      byClub.set(e.sourceId, agg);
    }
    agg.titles += 1;
    const year = yearOfEdge(e.metadata);
    if (year !== null && (agg.lastTitleYear === null || year > agg.lastTitleYear)) {
      agg.lastTitleYear = year;
    }
  }
  return byClub;
}

/**
 * PURA — top N clubes por títulos. Ordem: títulos desc, último ano desc
 * (sem ano vai por último), nome asc, id asc (desempate total).
 */
export function buildTopChampions(
  edges: WonTitleEdge[],
  clubs: ClubRef[],
  limit: number = TOP_CLUBS,
): TopChampionItem[] {
  const byClub = countTitlesByClub(edges);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  return [...byClub.entries()]
    .filter(([clubId]) => clubById.has(clubId))
    .map(([clubId, agg]) => ({
      clubId,
      clubName: clubById.get(clubId)!.name,
      country: clubById.get(clubId)!.country,
      titles: agg.titles,
      lastTitleYear: agg.lastTitleYear,
    }))
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        (b.lastTitleYear ?? -Infinity) - (a.lastTitleYear ?? -Infinity) ||
        cmpAsc(a.clubName, b.clubName) ||
        cmpAsc(a.clubId, b.clubId),
    )
    .slice(0, limit);
}

/** PURA — líder de cada competição (mais títulos; empate: ano desc, nome asc, id asc). */
export function leaderOfCompetition(
  edges: WonTitleEdge[],
  clubs: ClubRef[],
): { clubId: string; titles: number; lastTitleYear: number | null } | null {
  const byClub = countTitlesByClub(edges);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  let leader: {
    clubId: string;
    titles: number;
    lastTitleYear: number | null;
    name: string;
  } | null = null;
  for (const [clubId, agg] of byClub) {
    const club = clubById.get(clubId);
    if (!club) continue; // clube fora do acervo ativo — não elege líder órfão
    if (
      !leader ||
      agg.titles > leader.titles ||
      (agg.titles === leader.titles &&
        ((agg.lastTitleYear ?? -Infinity) > (leader.lastTitleYear ?? -Infinity) ||
          ((agg.lastTitleYear ?? -Infinity) === (leader.lastTitleYear ?? -Infinity) &&
            (cmpAsc(club.name, leader.name) < 0 ||
              (club.name === leader.name && clubId < leader.clubId)))))
    ) {
      leader = { clubId, titles: agg.titles, lastTitleYear: agg.lastTitleYear, name: club.name };
    }
  }
  return leader
    ? { clubId: leader.clubId, titles: leader.titles, lastTitleYear: leader.lastTitleYear }
    : null;
}

/**
 * PURA — líderes das top N competições por nº de arestas. Competição sem linha
 * no acervo ativo é excluída (não há nome honesto para exibir). Ordem: arestas
 * desc, nome asc, id asc.
 */
export function buildCompetitionLeaders(
  edges: WonTitleEdge[],
  comps: CompetitionRef[],
  clubs: ClubRef[],
  limit: number = TOP_COMPETITIONS,
): CompetitionLeaderItem[] {
  const compById = new Map(comps.map((c) => [c.id, c]));
  const byComp = new Map<string, WonTitleEdge[]>();
  for (const e of edges) {
    if (!compById.has(e.targetId)) continue;
    const list = byComp.get(e.targetId);
    if (list) list.push(e);
    else byComp.set(e.targetId, [e]);
  }

  return [...byComp.entries()]
    .map(([competitionId, compEdges]) => {
      const comp = compById.get(competitionId)!;
      const leader = leaderOfCompetition(compEdges, clubs);
      return leader
        ? {
            competitionId,
            competitionName: comp.name,
            competitionType: comp.type,
            leaderClubId: leader.clubId,
            leaderClubName: clubs.find((c) => c.id === leader.clubId)?.name ?? '',
            titles: leader.titles,
            lastTitleYear: leader.lastTitleYear,
          }
        : null;
    })
    .filter((x): x is CompetitionLeaderItem => x !== null)
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        cmpAsc(a.competitionName ?? '', b.competitionName ?? '') ||
        cmpAsc(a.competitionId, b.competitionId),
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Recordes (partidas FINISHED com placar) — puras
// ---------------------------------------------------------------------------

function toMatchItem(m: RecordMatchRow): MatchRecordItem {
  return {
    matchId: m.id,
    homeClubId: m.homeClubId,
    homeClubName: m.homeClubName,
    awayClubId: m.awayClubId,
    awayClubName: m.awayClubName,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    margin: Math.abs(m.homeScore - m.awayScore),
    totalGoals: m.homeScore + m.awayScore,
    date: m.date,
    competitionId: m.competitionId,
    competitionName: m.competitionName,
    seasonId: m.seasonId,
    seasonName: m.seasonName,
    sourceUrl: m.sourceUrl,
  };
}

/** PURA — maior saldo de gols (|home−away|). Empate: mais gols, data asc, id asc. */
export function pickBiggestWin(rows: RecordMatchRow[]): MatchRecordItem | null {
  let best: MatchRecordItem | null = null;
  for (const m of rows) {
    const cand = toMatchItem(m);
    if (
      !best ||
      cand.margin > best.margin ||
      (cand.margin === best.margin &&
        (cand.totalGoals > best.totalGoals ||
          (cand.totalGoals === best.totalGoals &&
            (cand.date < best.date ||
              (cand.date === best.date && cmpAsc(cand.matchId, best.matchId) < 0)))))
    ) {
      best = cand;
    }
  }
  return best;
}

/** PURA — mais gols somados. Empate: data asc, id asc. */
export function pickMostGoalsMatch(rows: RecordMatchRow[]): MatchRecordItem | null {
  let best: MatchRecordItem | null = null;
  for (const m of rows) {
    const cand = toMatchItem(m);
    if (
      !best ||
      cand.totalGoals > best.totalGoals ||
      (cand.totalGoals === best.totalGoals &&
        (cand.date < best.date ||
          (cand.date === best.date && cmpAsc(cand.matchId, best.matchId) < 0)))
    ) {
      best = cand;
    }
  }
  return best;
}

/**
 * PURA — clube+temporada com mais gols marcados (casa + fora). Empate:
 * mais partidas, clubeId asc, temporada asc (total).
 */
export function buildMostGoalsClubSeason(rows: RecordMatchRow[]): ClubSeasonGoalsItem | null {
  const aggs = new Map<string, ClubSeasonGoalsItem>();
  for (const m of rows) {
    const scored = (clubId: string): number =>
      m.homeClubId === clubId ? m.homeScore : m.awayScore;
    for (const clubId of [m.homeClubId, m.awayClubId]) {
      const key = `${clubId}|${m.seasonId ?? '-'}`;
      let agg = aggs.get(key);
      if (!agg) {
        agg = {
          clubId,
          clubName: m.homeClubId === clubId ? m.homeClubName : m.awayClubName,
          seasonId: m.seasonId,
          seasonName: m.seasonName,
          goals: 0,
          matches: 0,
        };
        aggs.set(key, agg);
      }
      agg.goals += scored(clubId);
      agg.matches += 1;
    }
  }
  return (
    [...aggs.values()].sort(
      (a, b) =>
        b.goals - a.goals ||
        b.matches - a.matches ||
        cmpAsc(a.clubId, b.clubId) ||
        cmpAsc(a.seasonName ?? '', b.seasonName ?? ''),
    )[0] ?? null
  );
}

/**
 * PURA — maior sequência invicta DENTRO de uma temporada (clube+temporada,
 * partidas ordenadas por data; empate de data: id asc). Invicto = vitória OU
 * empate; derrota encerra a sequência. Empate de tamanho: sequência que termina
 * antes (mais antiga) vence, depois clubeId asc — determinístico.
 */
export function findLongestUnbeatenRun(rows: RecordMatchRow[]): UnbeatenRunItem | null {
  const byRun = new Map<
    string,
    {
      clubId: string;
      clubName: string;
      seasonId: string | null;
      seasonName: string | null;
      matches: RecordMatchRow[];
    }
  >();
  for (const m of rows) {
    for (const clubId of [m.homeClubId, m.awayClubId]) {
      const key = `${clubId}|${m.seasonId ?? '-'}`;
      let entry = byRun.get(key);
      if (!entry) {
        entry = {
          clubId,
          clubName: m.homeClubId === clubId ? m.homeClubName : m.awayClubName,
          seasonId: m.seasonId,
          seasonName: m.seasonName,
          matches: [],
        };
        byRun.set(key, entry);
      }
      entry.matches.push(m);
    }
  }

  let best: UnbeatenRunItem | null = null;
  const goalsOf = (m: RecordMatchRow, clubId: string): number =>
    m.homeClubId === clubId ? m.homeScore : m.awayScore;
  const concededOf = (m: RecordMatchRow, clubId: string): number =>
    m.homeClubId === clubId ? m.awayScore : m.homeScore;

  for (const run of byRun.values()) {
    const ordered = [...run.matches].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : cmpAsc(a.id, b.id),
    );
    const consider = (streak: RecordMatchRow[]): void => {
      if (streak.length === 0) return;
      const cand: UnbeatenRunItem = {
        clubId: run.clubId,
        clubName: run.clubName,
        seasonId: run.seasonId,
        seasonName: run.seasonName,
        length: streak.length,
        fromDate: streak[0].date,
        toDate: streak[streak.length - 1].date,
      };
      if (
        !best ||
        cand.length > best.length ||
        (cand.length === best.length &&
          (cand.toDate < best.toDate ||
            (cand.toDate === best.toDate && cmpAsc(cand.clubId, best.clubId) < 0)))
      ) {
        best = cand;
      }
    };
    let start = 0;
    for (let i = 0; i < ordered.length; i++) {
      const lost = goalsOf(ordered[i], run.clubId) < concededOf(ordered[i], run.clubId);
      if (!lost) continue;
      consider(ordered.slice(start, i));
      start = i + 1;
    }
    // Sequência que vai até o fim da temporada sem derrota também conta.
    consider(ordered.slice(start));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Carregador (I/O) + cache
// ---------------------------------------------------------------------------

async function loadLegendsSummary(): Promise<LegendsResponse> {
  const [rawEdges, matches] = await Promise.all([
    prisma.knowledgeGraph.findMany({
      where: { relation: 'WON', sourceType: 'Club', targetType: 'Competition' },
      select: { sourceId: true, targetId: true, metadata: true },
    }),
    prisma.match.findMany({
      where: { status: 'FINISHED', homeScore: { not: null }, awayScore: { not: null } },
      select: {
        id: true,
        homeClubId: true,
        awayClubId: true,
        homeScore: true,
        awayScore: true,
        date: true,
        competitionId: true,
        competition: { select: { name: true } },
        seasonId: true,
        season: { select: { name: true } },
        sourceUrl: true,
        homeClub: { select: { id: true, name: true } },
        awayClub: { select: { id: true, name: true } },
      },
    }),
  ]);
  // Arestas soft-deletadas (metadata.deletedAt) não contam título.
  const edges = excludeSoftDeleted(rawEdges);

  const rows: RecordMatchRow[] = matches.map((m) => ({
    id: m.id,
    homeClubId: m.homeClubId,
    homeClubName: m.homeClub?.name ?? m.homeClubId,
    awayClubId: m.awayClubId,
    awayClubName: m.awayClub?.name ?? m.awayClubId,
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    date: m.date.toISOString(),
    competitionId: m.competitionId,
    competitionName: m.competition?.name ?? null,
    seasonId: m.seasonId,
    seasonName: m.season?.name ?? null,
    sourceUrl: m.sourceUrl,
  }));

  const clubIds = new Set<string>();
  const compIds = new Set<string>();
  for (const e of edges) {
    clubIds.add(e.sourceId);
    compIds.add(e.targetId);
  }
  const [clubs, comps] = await Promise.all([
    clubIds.size
      ? prisma.club.findMany({
          where: { id: { in: [...clubIds] }, deletedAt: null },
          select: { id: true, name: true, country: true },
        })
      : Promise.resolve([] as ClubRef[]),
    compIds.size
      ? prisma.competition.findMany({
          where: { id: { in: [...compIds] }, deletedAt: null },
          select: { id: true, name: true, type: true, country: true },
        })
      : Promise.resolve([] as CompetitionRef[]),
  ]);

  return {
    data: {
      topChampions: {
        items: buildTopChampions(edges, clubs),
        provenance: { source: 'knowledge-graph:WON', titlesCounted: edges.length },
      },
      competitionLeaders: {
        items: buildCompetitionLeaders(edges, comps, clubs),
        provenance: { source: 'knowledge-graph:WON', competitionsConsidered: comps.length },
      },
      records: {
        biggestWin: pickBiggestWin(rows),
        mostGoalsMatch: pickMostGoalsMatch(rows),
        mostGoalsClubSeason: buildMostGoalsClubSeason(rows),
        longestUnbeatenSeason: findLongestUnbeatenRun(rows),
        provenance: { source: 'matches', matchesConsidered: rows.length },
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Resumo Legends (cache 5 min — mesma política do clube/statistics). */
export async function getLegendsSummary(): Promise<LegendsResponse> {
  return cache.remember(LEGENDS_CACHE_KEY, LEGENDS_TTL_SECONDS, loadLegendsSummary);
}
