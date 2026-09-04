/**
 * T425 — Algoritmo de Ranking 0-100 auditável.
 *
 * Funções PURAS (sem Prisma, sem rede) para o Ranking de clube-ano e jogador-ano,
 * com repositório injetável para teste (TDD). O acesso ao banco é abstraído pela
 * interface `RankingAlgorithmRepo`; a implementação Prisma vive em
 * `createPrismaRankingAlgorithmRepo` (abaixo) e é usada pela cron job.
 *
 * Contrato (documentado em docs/RANKING-ALGORITHM.md):
 *  - Pontos brutos clube = (vitórias×3×peso) + (empates×1×peso) + (títulos×50×peso).
 *  - Pesos por hierarquia: Mundial 5.0 · Continental 4.0 · Nacional 3.0 ·
 *    Estadual 2.0 · Municipal 1.0. Sem campo de hierarquia no schema → default
 *    NACIONAL (3.0) com override por QID/país/type em `HIERARCHY_WEIGHTS`.
 *  - Amostra mínima: clube-ano só é ranqueado se `baseTitles >= 1 OU
 *    baseMatches >= 5`; caso contrário o registro é NULL com
 *    `reason='dados insuficientes'` (NÃO publica posição/score).
 *  - Jogador-ano: exige `baseMatches >= 3` E estatísticas (gols/assistências).
 *    Como NÃO existe tabela de estatísticas jogador↔partida no schema, todos os
 *    jogadores-ano retornam NULL com o mesmo motivo (limitação documentada).
 *  - MinMax por gênero (isolamento): normalizar separadamente o conjunto
 *    feminino (WOMENS_COMPETITION_QIDS / metadata.gender='women') para que o
 *    feminino não seja esmagado pela escala masculina.
 */
import type { PrismaClient } from '@prisma/client';
import {
  WOMENS_COMPETITION_QIDS,
  WOMENS_GENDER_VALUE,
} from '../etl/connectors/wikidata-womens-football.connector.js';

// ---------------------------------------------------------------------------
// Config & pesos (registro documentado — ver docs/RANKING-ALGORITHM.md)
// ---------------------------------------------------------------------------
export const RANKING_HIERARCHIES = [
  'mundial',
  'continental',
  'nacional',
  'estadual',
  'municipal',
] as const;
export type RankHierarchy = (typeof RANKING_HIERARCHIES)[number];

export const HIERARCHY_WEIGHTS: Record<RankHierarchy, number> = {
  mundial: 5.0,
  continental: 4.0,
  nacional: 3.0,
  estadual: 2.0,
  municipal: 1.0,
};

export const DEFAULT_HIERARCHY: RankHierarchy = 'nacional';

export const WIN_POINTS = 3;
export const DRAW_POINTS = 1;
export const TITLE_POINTS = 50;

export const CLUB_MIN_TITLES = 1;
export const CLUB_MIN_MATCHES = 5;
export const PLAYER_MIN_MATCHES = 3;

export const INSUFFICIENT_DATA_REASON = 'dados insuficientes';

export type Gender = 'men' | 'women';

/**
 * Mapeamento de hierarquia por competição. O schema NÃO tem campo de hierarquia,
 * então adotamos: default NACIONAL (3.0) + overrides documentados por QID, por
 * `país:type`, e por palavra-chave no nome. Preencha `COMPETITION_HIERARCHY_BY_QID`
 * conforme o acervo ganha competições conhecidas (mundial/continental); os
 * demais caem no default nacional.
 */
export const COMPETITION_HIERARCHY_BY_QID: Record<string, RankHierarchy> = {};

/** Override por `país:type` (ex.: "BR:LEAGUE" → nacional). Estrito por chave exata. */
export const HIERARCHY_BY_COUNTRY_TYPE: Record<string, RankHierarchy> = {};

/** Palavras-chave (minúsculas) que posicionam a competição na hierarquia. */
const HIERARCHY_KEYWORDS: ReadonlyArray<[RegExp, RankHierarchy]> = [
  [/\b(copa do mundo|mundial|world cup|club world cup|fifa club)\b/i, 'mundial'],
  [
    /\b(libertadores|champions league|uefa|conmebol|europa league|afc cup|african champions|copa america)\b/i,
    'continental',
  ],
  [/\b(supercopa|super cup|supertaça|superliga)\b/i, 'nacional'],
  [/\b(campeonato|liga|league|serie|divisão|division|torneio|tournament)\b/i, 'nacional'],
  [/\b(copa do brasil|copa brasil)\b/i, 'nacional'],
];

/** Resolve a hierarquia de uma competição (default NACIONAL). Função pura. */
export function resolveHierarchy(
  comp: {
    qid?: string | null;
    name?: string | null;
    type?: string | null;
    country?: string | null;
  } | null,
): RankHierarchy {
  if (!comp) return DEFAULT_HIERARCHY;
  if (comp.qid && COMPETITION_HIERARCHY_BY_QID[comp.qid]) {
    return COMPETITION_HIERARCHY_BY_QID[comp.qid];
  }
  if (comp.country && comp.type) {
    const byCountryType = HIERARCHY_BY_COUNTRY_TYPE[`${comp.country}:${comp.type}`];
    if (byCountryType) return byCountryType;
  }
  if (comp.name) {
    for (const [re, h] of HIERARCHY_KEYWORDS) {
      if (re.test(comp.name)) return h;
    }
  }
  return DEFAULT_HIERARCHY;
}

/** Peso da hierarquia (default = peso de NACIONAL). */
export function hierarchyWeight(
  comp: {
    qid?: string | null;
    name?: string | null;
    type?: string | null;
    country?: string | null;
  } | null,
): number {
  return HIERARCHY_WEIGHTS[resolveHierarchy(comp)];
}

/** Existe a competição marcada como feminina (QID ou nome)? */
export function isWomensCompetition(
  comp: {
    qid?: string | null;
    name?: string | null;
  } | null,
): boolean {
  if (!comp) return false;
  if (comp.qid && WOMENS_COMPETITION_QIDS.includes(comp.qid)) return true;
  if (comp.name && /\b(women'?s|women|feminino|female)\b/i.test(comp.name)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Tipos de dados de entrada (contrato do repositório)
// ---------------------------------------------------------------------------
export interface CompetitionRef {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}

export interface AlgoMatch {
  id: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  date: Date;
  seasonName: string | null;
  competition: CompetitionRef | null;
  importedFrom: string | null;
  sourceUrl: string | null;
  license: string | null;
}

export interface AlgoTitle {
  id: string;
  clubId: string;
  competition: CompetitionRef | null;
  year: number | null;
  gender: Gender | null;
  importedFrom: string | null;
  sourceUrl: string | null;
  license: string | null;
}

export interface SeasonData {
  season: string;
  matches: AlgoMatch[];
  titles: AlgoTitle[];
}

export interface PlayerSeasonStats {
  playerId: string;
  goals: number;
  assists: number;
  matches: number;
}

/** Contrato do repositório injetável (permite TDD com mock / CI com Prisma). */
export interface RankingAlgorithmRepo {
  loadSeasonData(season: string, competitionId?: string | null): Promise<SeasonData>;
  loadPlayerSeasonStats(season: string): Promise<PlayerSeasonStats[]>;
}

/** Subconjunto do Prisma usado pelo repositório (aceita PrismaClient ou TransactionClient). */
export type RankingDb = Pick<PrismaClient, 'match' | 'knowledgeGraph' | 'competition'>;

// ---------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------
export type Outcome = 'WIN' | 'DRAW' | 'LOSS';

/** Resultado de `clubId` na partida (da perspectiva do clube). */
export function decideOutcome(
  match: Pick<AlgoMatch, 'homeClubId' | 'awayClubId' | 'homeScore' | 'awayScore'>,
  clubId: string,
): Outcome {
  const isHome = match.homeClubId === clubId;
  const my = isHome ? match.homeScore : match.awayScore;
  const opp = isHome ? match.awayScore : match.homeScore;
  if (my > opp) return 'WIN';
  if (my < opp) return 'LOSS';
  return 'DRAW';
}

export interface ClubPointsInput {
  clubId: string;
  matches: AlgoMatch[];
  titles: AlgoTitle[];
  hierarchyWeightFn?: (comp: CompetitionRef | null) => number;
}

export interface ClubPointsResult {
  points: number;
  wins: number;
  draws: number;
  losses: number;
  titlesWon: number;
  baseMatches: number;
  baseTitles: number;
}

/** Pontos brutos de um clube-ano: vitórias×3×peso + empates×1×peso + títulos×50×peso. */
export function computeClubPoints(input: ClubPointsInput): ClubPointsResult {
  const weight = input.hierarchyWeightFn ?? hierarchyWeight;
  const res: ClubPointsResult = {
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    titlesWon: 0,
    baseMatches: 0,
    baseTitles: 0,
  };
  for (const m of input.matches) {
    res.baseMatches += 1;
    const outcome = decideOutcome(m, input.clubId);
    if (outcome === 'WIN') {
      res.wins += 1;
      res.points += WIN_POINTS * weight(m.competition);
    } else if (outcome === 'DRAW') {
      res.draws += 1;
      res.points += DRAW_POINTS * weight(m.competition);
    } else {
      res.losses += 1;
    }
  }
  for (const t of input.titles) {
    res.baseTitles += 1;
    res.titlesWon += 1;
    res.points += TITLE_POINTS * weight(t.competition);
  }
  return res;
}

/**
 * Pontos brutos de um jogador-ano. A fórmula usa gols/assistências/vitórias:
 *   pontos = gols×4 + assistências×2 + vitórias×1   (base por temporada).
 * Honesto: SEM tabela de estatísticas jogador↔partida no schema, este valor só
 * será consumido quando essa fonte existir; hoje o jogador-ano é NULL (T425 §8).
 */
export function computePlayerPoints(input: {
  goals: number;
  assists: number;
  wins: number;
}): number {
  return input.goals * 4 + input.assists * 2 + input.wins * 1;
}

/**
 * MinMax: normaliza valores para 0-100.
 *  - máximo assume 100, mínimo assume 0;
 *  - se todos iguais (ou houver só um valor) → devolve 0 para todos.
 */
export function normalizeMinMax(values: number[], max = 100): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const maxV = Math.max(...values);
  const denom = maxV - min;
  if (denom === 0) return values.map(() => 0);
  return values.map((v) => Math.round(((v - min) / denom) * max));
}

export interface ClubAggregate {
  clubId: string;
  gender: Gender;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  titlesWon: number;
  baseMatches: number;
  baseTitles: number;
  dataSourceIds: string[];
}

function addDataSource(set: Set<string>, ...sources: Array<string | null | undefined>): void {
  for (const s of sources) {
    if (s) set.add(s);
  }
}

/** Agrega partidas+títulos por clube-ano, com gênero e proveniência (função pura). */
export function aggregateSeason(data: SeasonData): Map<string, ClubAggregate> {
  const byClub = new Map<string, ClubAggregate & { _sources: Set<string> }>();
  const getOrCreate = (
    clubId: string,
    comp: CompetitionRef | null,
  ): ClubAggregate & { _sources: Set<string> } => {
    let agg = byClub.get(clubId);
    if (!agg) {
      agg = {
        clubId,
        gender: isWomensCompetition(comp) ? 'women' : 'men',
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        titlesWon: 0,
        baseMatches: 0,
        baseTitles: 0,
        dataSourceIds: [],
        _sources: new Set<string>(),
      };
      byClub.set(clubId, agg);
    }
    return agg;
  };

  for (const m of data.matches) {
    for (const clubId of [m.homeClubId, m.awayClubId]) {
      const agg = getOrCreate(clubId, m.competition);
      agg.baseMatches += 1;
      if (isWomensCompetition(m.competition)) agg.gender = 'women';
      const outcome = decideOutcome(m, clubId);
      if (outcome === 'WIN') {
        agg.wins += 1;
        agg.points += WIN_POINTS * hierarchyWeight(m.competition);
      } else if (outcome === 'DRAW') {
        agg.draws += 1;
        agg.points += DRAW_POINTS * hierarchyWeight(m.competition);
      } else {
        agg.losses += 1;
      }
      addDataSource(agg._sources, m.importedFrom, m.sourceUrl, m.license);
    }
  }

  for (const t of data.titles) {
    const agg = getOrCreate(t.clubId, t.competition);
    agg.baseTitles += 1;
    agg.titlesWon += 1;
    agg.points += TITLE_POINTS * hierarchyWeight(t.competition);
    if (t.gender === 'women' || isWomensCompetition(t.competition)) agg.gender = 'women';
    addDataSource(agg._sources, t.importedFrom, t.sourceUrl, t.license);
  }

  const out = new Map<string, ClubAggregate>();
  for (const [clubId, agg] of byClub) {
    const { _sources, ...rest } = agg;
    rest.dataSourceIds = [..._sources].sort();
    out.set(clubId, rest);
  }
  return out;
}

/** Predicado de amostra mínima do clube-ano: baseTitles >= 1 OU baseMatches >= 5. */
export function meetsClubMinimum(agg: Pick<ClubAggregate, 'baseTitles' | 'baseMatches'>): boolean {
  return agg.baseTitles >= CLUB_MIN_TITLES || agg.baseMatches >= CLUB_MIN_MATCHES;
}

export interface BuildRankingParams {
  season: string;
  competitionId?: string | null;
  gender?: Gender | null;
}

export interface ClubRankingRow {
  clubId: string;
  gender: Gender;
  position: number | null;
  points: number | null; // 0-100 normalizado por gênero
  rawPoints: number;
  baseMatches: number;
  baseTitles: number;
  dataSourceIds: string[];
  reason: string | null;
  wins: number;
  draws: number;
  losses: number;
  titlesWon: number;
}

export interface ClubRankingResult {
  season: string;
  scope: { competitionId: string | null; gender: Gender | null };
  rows: ClubRankingRow[];
  rankedCount: number;
  excludedCount: number;
}

/**
 * Constrói o Ranking de clube-ano (0-100) para uma temporada/escopo.
 * Normaliza separadamente por gênero (isolamento). Clube abaixo da amostra
 * mínima vira registro NULL com reason='dados insuficientes'.
 */
export async function buildClubRanking(
  repo: RankingAlgorithmRepo,
  params: BuildRankingParams,
): Promise<ClubRankingResult> {
  const data = await repo.loadSeasonData(params.season, params.competitionId);
  const matches = params.competitionId
    ? data.matches.filter((m) => m.competition?.id === params.competitionId)
    : data.matches;
  const titles = params.competitionId
    ? data.titles.filter((t) => t.competition?.id === params.competitionId)
    : data.titles;
  const aggs = aggregateSeason({ season: params.season, matches, titles });

  const rows: ClubRankingRow[] = [];
  for (const gender of ['men', 'women'] as Gender[]) {
    const group = [...aggs.values()].filter((a) => a.gender === gender);
    if (group.length === 0) continue;

    const qualified = group.filter((a) => meetsClubMinimum(a)).sort((a, b) => b.points - a.points);
    const excluded = group.filter((a) => !meetsClubMinimum(a)).sort((a, b) => b.points - a.points);

    // Isolamento por gênero: normaliza somente o conjunto do mesmo gênero.
    const scores = normalizeMinMax(qualified.map((a) => a.points));

    qualified.forEach((agg, idx) => {
      rows.push({
        clubId: agg.clubId,
        gender,
        position: idx + 1,
        points: scores[idx] ?? 0,
        rawPoints: agg.points,
        baseMatches: agg.baseMatches,
        baseTitles: agg.baseTitles,
        dataSourceIds: agg.dataSourceIds,
        reason: null,
        wins: agg.wins,
        draws: agg.draws,
        losses: agg.losses,
        titlesWon: agg.titlesWon,
      });
    });

    for (const agg of excluded) {
      rows.push({
        clubId: agg.clubId,
        gender,
        position: null,
        points: null,
        rawPoints: agg.points,
        baseMatches: agg.baseMatches,
        baseTitles: agg.baseTitles,
        dataSourceIds: agg.dataSourceIds,
        reason: INSUFFICIENT_DATA_REASON,
        wins: agg.wins,
        draws: agg.draws,
        losses: agg.losses,
        titlesWon: agg.titlesWon,
      });
    }
  }

  const rankedCount = rows.filter((r) => r.position !== null).length;
  const excludedCount = rows.length - rankedCount;
  return {
    season: params.season,
    scope: {
      competitionId: params.competitionId ?? null,
      gender: params.gender ?? null,
    },
    rows,
    rankedCount,
    excludedCount,
  };
}

export interface PlayerRankingRow {
  playerId: string;
  position: null;
  points: null;
  rawPoints: number | null;
  baseMatches: number;
  dataSourceIds: string[];
  reason: string | null;
}

export interface PlayerRankingResult {
  season: string;
  scope: { competitionId: string | null; gender: Gender | null };
  rows: PlayerRankingRow[];
  rankedCount: number;
  excludedCount: number;
}

/**
 * Ranking de jogador-ano. Exige baseMatches >= 3 E estatísticas (gols/assists).
 * Como NÃO há tabela de estatísticas jogador↔partida no schema, o repositório
 * devolve lista vazia → todos os jogadores-ano são NULL com motivo
 * 'dados insuficientes' (T425 §8, limitação documentada).
 */
export async function buildPlayerRanking(
  repo: RankingAlgorithmRepo,
  params: { season: string; competitionId?: string | null },
): Promise<PlayerRankingResult> {
  const stats = await repo.loadPlayerSeasonStats(params.season);
  const rows: PlayerRankingRow[] = [];
  for (const s of stats) {
    const meets = s.matches >= PLAYER_MIN_MATCHES && (s.goals > 0 || s.assists > 0);
    if (meets) {
      rows.push({
        playerId: s.playerId,
        position: null,
        points: null,
        rawPoints: computePlayerPoints({ goals: s.goals, assists: s.assists, wins: 0 }),
        baseMatches: s.matches,
        dataSourceIds: [],
        reason: null,
      });
    } else {
      rows.push({
        playerId: s.playerId,
        position: null,
        points: null,
        rawPoints: null,
        baseMatches: s.matches,
        dataSourceIds: [],
        reason: INSUFFICIENT_DATA_REASON,
      });
    }
  }
  const rankedCount = rows.filter((r) => r.reason === null).length;
  return {
    season: params.season,
    scope: { competitionId: params.competitionId ?? null, gender: null },
    rows,
    rankedCount,
    excludedCount: rows.length - rankedCount,
  };
}

// ---------------------------------------------------------------------------
// Repositório Prisma (usado pela cron job e pelos testes de integração)
// ---------------------------------------------------------------------------
function toCompetitionRef(c: {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}): CompetitionRef {
  return { id: c.id, qid: c.qid, name: c.name, type: c.type, country: c.country };
}

export function createPrismaRankingAlgorithmRepo(db: RankingDb): RankingAlgorithmRepo {
  return {
    async loadSeasonData(season, competitionId = null) {
      const seasonNum = Number.parseInt(season, 10) || null;
      const matchOr =
        seasonNum !== null
          ? [
              { season: { name: season } },
              {
                date: {
                  gte: new Date(Date.UTC(seasonNum, 0, 1, 0, 0, 0)),
                  lt: new Date(Date.UTC(seasonNum + 1, 0, 1, 0, 0, 0)),
                },
              },
            ]
          : [{ season: { name: season } }];

      const matches = await db.match.findMany({
        where: {
          status: 'FINISHED',
          ...(competitionId ? { competitionId } : {}),
          OR: matchOr,
        },
        include: { competition: true, season: true },
      });
      const algoMatches: AlgoMatch[] = matches.map((m) => ({
        id: m.id,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        date: m.date,
        seasonName: m.season?.name ?? m.competition?.name ?? null,
        competition: m.competition ? toCompetitionRef(m.competition) : null,
        importedFrom: m.importedFrom,
        sourceUrl: m.sourceUrl,
        license: m.license,
      }));

      // Títulos = arestas KnowledgeGraph relation='WON' (sourceType/targetType Club/Competition).
      const edges = await db.knowledgeGraph.findMany({ where: { relation: 'WON' } });
      const relevant = edges.filter((e) => {
        const meta = (e.metadata as Record<string, unknown> | null) ?? {};
        if (seasonNum !== null) {
          const year = Number(meta.year ?? seasonNum);
          return year === seasonNum;
        }
        return meta.season === season;
      });

      const compIds = new Set<string>();
      for (const e of relevant) {
        if (e.sourceType === 'Club' && e.targetType === 'Competition') compIds.add(e.targetId);
        else if (e.targetType === 'Club' && e.sourceType === 'Competition') compIds.add(e.sourceId);
      }
      const comps = await db.competition.findMany({ where: { id: { in: [...compIds] } } });
      const compById = new Map(comps.map((c) => [c.id, toCompetitionRef(c)]));

      const algoTitles: AlgoTitle[] = relevant.map((e) => {
        const sourceIsClub = e.sourceType === 'Club';
        const clubId = sourceIsClub ? e.sourceId : e.targetId;
        const compId = sourceIsClub ? e.targetId : e.sourceId;
        const meta = (e.metadata as Record<string, unknown> | null) ?? {};
        return {
          id: e.id,
          clubId,
          competition: compById.get(compId) ?? null,
          year: meta.year != null ? Number(meta.year) : seasonNum,
          gender: meta.gender === WOMENS_GENDER_VALUE ? 'women' : null,
          importedFrom: typeof meta.dataSource === 'string' ? meta.dataSource : null,
          sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
          license: typeof meta.license === 'string' ? meta.license : null,
        };
      });

      return { season, matches: algoMatches, titles: algoTitles };
    },

    async loadPlayerSeasonStats() {
      // Sem tabela de estatísticas jogador↔partida (gols/assistências) no schema.
      // Retorna vazio → jogador-ano sempre NULL (limitação documentada, T425 §8).
      return [];
    },
  };
}
