/**
 * T523 — Estatísticas agregadas por clube a partir das PARTIDAS reais.
 *
 * DECISÃO DE MODELO (Opção B — cálculo sob demanda + cache Redis, sem tabela
 * materializada): com 2.450 partidas a agregação é de milissegundos e o cache de
 * 5 min protege os perfis quentes; tabela materializada (Opção A) adicionaria um
 * job de recálculo e risco de desatualização sem ganho mensurável neste volume.
 * Rever o limite se a ingestão granular levar o acervo a ~10⁵+ partidas.
 *
 * Honestidade:
 *  - só entram partidas FINISHED com os dois placares (nada estimado);
 *  - `points` = vitórias×3 + empates×1 (pontuação de tabela, SEM o peso de
 *    hierarquia do ranking 0-100 — aqui é estatística bruta, não ranking);
 *  - `scorers`/estatística individual não entra neste endpoint (ver T522);
 *  - clube sem partidas devolve totais zerados (não 404) — o zero é verdadeiro.
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';

const STATS_TTL_SECONDS = 300;
const TOP_RIVALS = 10;

export interface VenueStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ClubStats extends VenueStats {
  goalDiff: number;
  points: number;
}

export interface CompetitionSeasonStats extends ClubStats {
  competitionId: string | null;
  competitionName: string | null;
  season: string | null;
}

export interface RivalStats extends ClubStats {
  opponentId: string;
  opponentName: string;
}

export interface ClubStatistics {
  overall: ClubStats & { home: VenueStats; away: VenueStats };
  byCompetition: CompetitionSeasonStats[];
  topRivals: RivalStats[];
  /** Nº de clubes adversários distintos enfrentados. */
  opponents: number;
}

/** Linha mínima de partida para a agregação (o chamador carrega do banco). */
export interface StatsMatchRow {
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  competitionId: string | null;
  competitionName: string | null;
  season: string | null;
}

function emptyVenue(): VenueStats {
  return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
}

function emptyStats(): ClubStats {
  return { ...emptyVenue(), goalDiff: 0, points: 0 };
}

/** PURO — acumula uma partida na cesta do clube (perspectiva de mando). */
export function accumulateMatch(
  target: VenueStats,
  isHome: boolean,
  homeScore: number,
  awayScore: number,
): void {
  const my = isHome ? homeScore : awayScore;
  const opp = isHome ? awayScore : homeScore;
  target.played += 1;
  target.goalsFor += my;
  target.goalsAgainst += opp;
  if (my > opp) target.wins += 1;
  else if (my === opp) target.draws += 1;
  else target.losses += 1;
}

function finalize<T extends VenueStats>(s: T): T & { goalDiff: number; points: number } {
  return { ...s, goalDiff: s.goalsFor - s.goalsAgainst, points: s.wins * 3 + s.draws };
}

/**
 * PURO — agrega as partidas do clube em: geral (com split casa/fora), por
 * competição+temporada e por adversário (confronto direto). Ordena
 * deterministicamente (temporada desc, competição, adversário).
 */
export function buildClubStatistics(
  rows: StatsMatchRow[],
  clubId: string,
): {
  overall: ClubStatistics['overall'];
  byCompetition: CompetitionSeasonStats[];
  rivals: RivalStats[];
} {
  const overall = emptyStats();
  const home = emptyVenue();
  const away = emptyVenue();
  const byComp = new Map<string, CompetitionSeasonStats>();
  const byRival = new Map<string, RivalStats>();

  for (const m of rows) {
    const isHome = m.homeClubId === clubId;
    const oppId = isHome ? m.awayClubId : m.homeClubId;

    accumulateMatch(overall, isHome, m.homeScore, m.awayScore);
    accumulateMatch(isHome ? home : away, isHome, m.homeScore, m.awayScore);

    const compKey = `${m.competitionId ?? '-'}|${m.season ?? '-'}`;
    let comp = byComp.get(compKey);
    if (!comp) {
      comp = {
        ...emptyStats(),
        competitionId: m.competitionId,
        competitionName: m.competitionName,
        season: m.season,
      };
      byComp.set(compKey, comp);
    }
    accumulateMatch(comp, isHome, m.homeScore, m.awayScore);

    let rival = byRival.get(oppId);
    if (!rival) {
      rival = { ...emptyStats(), opponentId: oppId, opponentName: '' };
      byRival.set(oppId, rival);
    }
    accumulateMatch(rival, isHome, m.homeScore, m.awayScore);
  }

  const byCompetition = [...byComp.values()]
    .map(finalize)
    .sort(
      (a, b) =>
        (b.season ?? '').localeCompare(a.season ?? '') ||
        (a.competitionName ?? '').localeCompare(b.competitionName ?? ''),
    );
  const rivals = [...byRival.values()]
    .map(finalize)
    .sort((a, b) => b.played - a.played || a.opponentId.localeCompare(b.opponentId));

  return { overall: { ...finalize(overall), home, away }, byCompetition, rivals };
}

/** Carrega as partidas encerradas do clube e agrega (cache 5 min). */
export async function getClubStatistics(clubId: string): Promise<ClubStatistics | null> {
  return cache.remember(`clubs:stats:${clubId}`, STATS_TTL_SECONDS, async () => {
    const club = await prisma.club.findFirst({
      where: { id: clubId, deletedAt: null },
      select: { id: true },
    });
    if (!club) return null;

    const matches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      },
      select: {
        homeClubId: true,
        awayClubId: true,
        homeScore: true,
        awayScore: true,
        competition: { select: { id: true, name: true } },
        season: { select: { name: true } },
      },
    });

    const rows: StatsMatchRow[] = matches.map((m) => ({
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      competitionId: m.competition?.id ?? null,
      competitionName: m.competition?.name ?? null,
      season: m.season?.name ?? null,
    }));

    const { overall, byCompetition, rivals } = buildClubStatistics(rows, clubId);

    // Nome do adversário em uma segunda passada (só dos top 10 — barato).
    const rivalIds = rivals.slice(0, TOP_RIVALS).map((r) => r.opponentId);
    const oppRows = rivalIds.length
      ? await prisma.club.findMany({
          where: { id: { in: rivalIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(oppRows.map((o) => [o.id, o.name]));
    const topRivals = rivals.slice(0, TOP_RIVALS).map((r) => ({
      ...r,
      opponentName: nameById.get(r.opponentId) ?? r.opponentId,
    }));

    return { overall, byCompetition, topRivals, opponents: rivals.length };
  });
}
