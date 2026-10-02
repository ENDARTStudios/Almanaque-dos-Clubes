/**
 * T420 — Serviço de ingestão de resultados (RSSSF) e títulos (Wikidata).
 *
 * Responsável por: normalizar candidatos → resolver clube/competição contra o acervo
 * → calcular chave estável de dedup → upsert idempotente com proveniência. As funções
 * puras (`computeMatchDedupKey`, `resolveMatchCandidate`) são testáveis sem banco; o
 * acesso ao banco é injetado via `repo` (para TDD com mock) e o default usa Prisma.
 */
import { MatchCandidate } from './connectors/rsssf-matches.connector.js';

export interface LookupClub {
  id: string;
  name: string;
  qid: string | null;
}
export interface LookupCompetition {
  id: string;
  name: string;
  qid: string | null;
}
export interface LookupSeason {
  id: string;
  name: string;
}

export interface ResolvedMatch {
  homeClubId: string;
  awayClubId: string;
  competitionId: string | null;
  seasonId: string | null;
  dateISO: string;
  homeScore: number;
  awayScore: number;
  round: string | null;
  venue: string | null;
  dedupKey: string;
}

export interface MatchIngestRepo {
  findClubByQid(qid: string): Promise<LookupClub | null>;
  findClubByName(name: string): Promise<LookupClub | null>;
  findCompetitionByQid(qid: string): Promise<LookupCompetition | null>;
  findCompetitionByName(name: string): Promise<LookupCompetition | null>;
  findSeasonByName(name: string): Promise<LookupSeason | null>;
  upsertMatch(row: ResolvedMatch, provenance: MatchProvenance): Promise<{ created: boolean }>;
  upsertTitle(title: TitleRow, provenance: MatchProvenance): Promise<{ created: boolean }>;
}

export interface MatchProvenance {
  dataSource: 'rsssf' | 'wikidata' | 'manual';
  sourceUrl: string;
  license: string;
  importedAt: Date;
}

export interface TitleRow {
  clubId: string;
  competitionId: string;
  year: number;
  clubQid: string;
  competitionQid: string;
}

/** Chave estável de dedup de partida (independente de ordem de inserção). */
export function computeMatchDedupKey(args: {
  competitionId: string | null;
  season: string | null;
  dateISO: string;
  homeClubId: string;
  awayClubId: string;
}): string {
  return [
    args.competitionId ?? 'x',
    args.season ?? 'x',
    args.dateISO,
    args.homeClubId,
    args.awayClubId,
  ].join('|');
}

export interface MatchResolution {
  matched: ResolvedMatch | null;
  rejected: { candidate: MatchCandidate; reason: string }[];
}

/** Resolve clube/competição contra repos; nunca cria entidade órfã (rejeitado vai para fila de revisão). */
async function resolveClub(
  repo: Pick<MatchIngestRepo, 'findClubByName'>,
  name: string,
): Promise<LookupClub | null> {
  return repo.findClubByName(name);
}

/** Resolve um candidato de partida em linha com IDs, ou rejeita com motivo. */
export async function resolveMatchCandidate(
  candidate: MatchCandidate,
  repo: Pick<MatchIngestRepo, 'findClubByName' | 'findCompetitionByName' | 'findSeasonByName'>,
): Promise<MatchResolution> {
  const home = await resolveClub(repo, candidate.homeName);
  if (!home)
    return {
      matched: null,
      rejected: [{ candidate, reason: 'clube casa não resolvido: ' + candidate.homeName }],
    };
  const away = await resolveClub(repo, candidate.awayName);
  if (!away)
    return {
      matched: null,
      rejected: [{ candidate, reason: 'clube fora não resolvido: ' + candidate.awayName }],
    };
  const competition = await repo.findCompetitionByName(candidate.competitionName);
  if (!competition)
    return {
      matched: null,
      rejected: [{ candidate, reason: 'competição não resolvida: ' + candidate.competitionName }],
    };
  const season = (await repo.findSeasonByName(candidate.season).catch(() => null)) ?? null;
  const dateISO = candidate.date;
  const dedupKey = computeMatchDedupKey({
    competitionId: competition.id,
    season: candidate.season,
    dateISO,
    homeClubId: home.id,
    awayClubId: away.id,
  });
  return {
    matched: {
      homeClubId: home.id,
      awayClubId: away.id,
      competitionId: competition.id,
      seasonId: season ? season.id : null,
      dateISO,
      homeScore: candidate.homeScore,
      awayScore: candidate.awayScore,
      round: candidate.round,
      venue: null,
      dedupKey,
    },
    rejected: [],
  };
}

/** Ingere candidatos; exige que clube/competição existam (sem órfãos). Retorna totais. */
export async function ingestMatches(
  candidates: MatchCandidate[],
  repo: MatchIngestRepo,
  provenance: Omit<MatchProvenance, 'importedAt'>,
): Promise<{ inserted: number; alreadyExists: number; rejected: number }> {
  const importedAt = new Date();
  let inserted = 0;
  let alreadyExists = 0;
  let rejected = 0;
  for (const c of candidates) {
    const res = await resolveMatchCandidate(c, repo);
    if (res.rejected.length > 0) {
      rejected += res.rejected.length;
      continue;
    }
    const { created } = await repo.upsertMatch(res.matched! as ResolvedMatch, {
      ...provenance,
      importedAt,
    });
    if (created) inserted++;
    else alreadyExists++;
  }
  return { inserted, alreadyExists, rejected };
}
