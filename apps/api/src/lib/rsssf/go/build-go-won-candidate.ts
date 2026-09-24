/**
 * T448b-2d GO — construção de candidate WON (piloto 2023–2024). PURO.
 * dedupKey factual = Q931386|year|Q198034|WON (sem hash de URL). retrievedAt do pack, não now().
 */
import type { ClubIndexEntry, CompetitionIndexEntry, ParsedTable } from '../types.js';
import { extractStateChampionResolved } from '../extract-state-champion.js';
import { mapTeamToClub } from '../map-team-to-club.js';
import { resolveCompetitionQid } from '../resolve-competition-qid.js';
import { sha256Hex } from '../build-won-candidate.js';
import { makeGoPending } from './pending-review.js';
import {
  GO_COMPETITION_QID,
  GO_EXCLUDED_SEASONS,
  GO_PARSER_VERSION,
  GO_PILOT_SCOPE,
  type GoCandidate,
  type GoPendingReview,
} from './types.js';

export interface GoAttributionMeta {
  sourceUrl: string;
  retrievedAt: string;
  authorCredit: string;
  licenseText: string;
}

export interface BuildGoInput {
  season: number;
  competitionName: string;
  text: string;
  table: ParsedTable;
  meta: GoAttributionMeta;
  clubIndex: ClubIndexEntry[];
  competitionIndex: CompetitionIndexEntry[];
}

export interface BuildGoResult {
  candidate: GoCandidate | null;
  pending: GoPendingReview[];
}

export function dedupKeyOfGo(competitionQid: string, seasonYear: number, clubQid: string): string {
  return `${competitionQid}|${seasonYear}|${clubQid}|WON`;
}

function validIso(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Date.parse(v));
}

export function buildGoWonCandidate(input: BuildGoInput): BuildGoResult {
  const { season, competitionName, text, table, meta, clubIndex, competitionIndex } = input;
  const pending: GoPendingReview[] = [];
  const base = { season, competitionName, sourceUrl: meta.sourceUrl };

  // Temporada excluída (2025) nunca entra.
  if (GO_EXCLUDED_SEASONS.includes(season)) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'excluded_season_in_candidates',
        teamName: null,
        details: {},
      }),
    );
    return { candidate: null, pending };
  }

  // R4 — atribuição obrigatória + retrievedAt ISO.
  if (!meta.authorCredit?.trim() || !meta.licenseText?.trim() || !validIso(meta.retrievedAt)) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'missing_attribution',
        teamName: null,
        details: {
          hasAuthor: !!meta.authorCredit?.trim(),
          hasLicense: !!meta.licenseText?.trim(),
          validRetrievedAt: validIso(meta.retrievedAt),
        },
      }),
    );
  }

  // Campeão (frase + cross-check).
  const champ = extractStateChampionResolved(table, text);
  if (champ.reasonCode) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: champ.reasonCode,
        teamName: champ.evidence.phraseChampions[0] ?? champ.evidence.tableChampion ?? null,
        details: {
          phraseChampions: champ.evidence.phraseChampions,
          tableChampion: champ.evidence.tableChampion,
        },
      }),
    );
  }
  if (table.warnings.some((w) => w.code === 'malformed_table') && !champ.championTeam) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'malformed_table',
        teamName: null,
        details: { warnings: table.warnings },
      }),
    );
  }

  // Competição-mãe por QID/alias.
  const comp = resolveCompetitionQid(
    { expectedCompetitionName: competitionName },
    competitionIndex,
  );
  if (comp.reasonCode) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: comp.reasonCode,
        teamName: null,
        details: comp.details,
      }),
    );
  } else if (comp.competition && comp.competition.qid !== GO_COMPETITION_QID) {
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'missing_competition',
        teamName: null,
        details: { expected: GO_COMPETITION_QID, got: comp.competition.qid },
      }),
    );
  }

  // Clube campeão por QID/alias exato (sem fuzzy).
  let club: ClubIndexEntry | null = null;
  if (champ.championTeam) {
    const res = mapTeamToClub(champ.championTeam, clubIndex);
    club = res.club;
    if (res.reasonCode)
      pending.push(
        makeGoPending({
          ...base,
          reasonCode: res.reasonCode,
          teamName: champ.championTeam,
          details: res.details,
        }),
      );
  }

  // Gênero e hierarquia SÓ com evidência (índice validado do acervo).
  const gender = comp.competition?.gender ?? 'unknown';
  if (gender === 'unknown')
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'gender_unknown',
        teamName: champ.championTeam,
        details: {},
      }),
    );
  const hierarchy = comp.competition?.hierarchy ?? null;
  if (hierarchy !== 'estadual')
    pending.push(
      makeGoPending({
        ...base,
        reasonCode: 'hierarchy_unknown',
        teamName: champ.championTeam,
        details: { hierarchy },
      }),
    );

  if (pending.length > 0 || !champ.championTeam || !club || !comp.competition) {
    return { candidate: null, pending };
  }
  if (club.qid !== 'Q198034') {
    return {
      candidate: null,
      pending: [
        makeGoPending({
          ...base,
          reasonCode: 'missing_club',
          teamName: champ.championTeam,
          details: { expected: 'Q198034', got: club.qid },
        }),
      ],
    };
  }

  const pos1 = table.rows.find((r) => r.position === 1) ?? null;
  const rawHint = pos1?.raw ?? champ.evidence.phraseText ?? champ.championTeam;
  const externalId = sha256Hex(`${rawHint}|${meta.sourceUrl}`).slice(0, 16);
  const sourcePageUrlHash = sha256Hex(meta.sourceUrl);

  return {
    candidate: {
      relation: 'WON',
      competitionQid: comp.competition.qid,
      seasonYear: season,
      clubQid: club.qid,
      hierarchy: 'estadual',
      gender: gender === 'women' ? 'women' : 'men',
      source: 'rsssf',
      sourceUrl: meta.sourceUrl,
      retrievedAt: meta.retrievedAt,
      authorCredit: meta.authorCredit,
      licenseText: meta.licenseText,
      attributionRequired: true,
      externalId,
      dedupKey: dedupKeyOfGo(comp.competition.qid, season, club.qid),
      parserVersion: GO_PARSER_VERSION,
      metadataExtras: {
        championPhrase: champ.evidence.phraseText,
        tablePosition: pos1?.position ?? null,
        sourcePageUrlHash,
        uf: 'GO',
        pilotScope: GO_PILOT_SCOPE,
      },
    },
    pending: [],
  };
}

export type { GoCandidate };
