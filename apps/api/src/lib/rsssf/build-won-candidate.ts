/**
 * T448b-2b FASE 1 — Construção de CANDIDATE WON (nunca aplicado). PURO.
 *
 * R1: dedupKey FACTUAL = competitionQid|seasonYear|clubQid|WON (sem hash de URL).
 *     O hash da URL vive em externalId/metadataExtras (rastreabilidade).
 * R4: authorCredit + licenseText obrigatórios — ausência bloqueia o candidate.
 */
import { createHash } from 'node:crypto';
import type {
  AttributionMeta,
  ClubIndexEntry,
  CompetitionIndexEntry,
  ParsedTable,
  PendingReviewItem,
  WonCandidate,
} from './types.js';
import { PARSER_VERSION } from './types.js';
import { extractStateChampionResolved } from './extract-state-champion.js';
import { mapTeamToClub } from './map-team-to-club.js';
import { resolveCompetitionQid } from './resolve-competition-qid.js';
import { makePending } from './pending-review.js';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function dedupKeyOf(competitionQid: string, seasonYear: number, clubQid: string): string {
  return `${competitionQid}|${seasonYear}|${clubQid}|WON`;
}

export interface BuildInput {
  season: number;
  competitionName: string;
  text: string;
  table: ParsedTable;
  meta: AttributionMeta;
  clubIndex: ClubIndexEntry[];
  competitionIndex: CompetitionIndexEntry[];
}

export interface BuildResult {
  candidate: WonCandidate | null;
  pending: PendingReviewItem[];
}

/** Deriva gênero de forma EXPLÍCITA (não assume men). */
function deriveGender(
  competitionGender: CompetitionIndexEntry['gender'] | undefined,
  text: string,
): 'men' | 'women' | 'unknown' {
  if (competitionGender && competitionGender !== 'unknown') return competitionGender;
  if (/\b(feminino|women|feminina)\b/i.test(text)) return 'women';
  if (/\b(masculino|men'?s?)\b/i.test(text)) return 'men';
  return 'unknown';
}

export function buildWonCandidate(input: BuildInput): BuildResult {
  const { season, competitionName, text, table, meta, clubIndex, competitionIndex } = input;
  const pending: PendingReviewItem[] = [];
  const base = { season, competitionName, sourceUrl: meta.sourceUrl };

  // R4 — atribuição obrigatória.
  const hasAttribution = !!meta.authorCredit?.trim() && !!meta.licenseText?.trim();
  if (!hasAttribution) {
    pending.push(
      makePending({
        ...base,
        reasonCode: 'missing_attribution',
        teamName: null,
        details: {
          hasAuthorCredit: !!meta.authorCredit?.trim(),
          hasLicenseText: !!meta.licenseText?.trim(),
        },
      }),
    );
  }

  // Campeão (família de frases + cross-check com a tabela).
  const champ = extractStateChampionResolved(table, text);
  if (champ.reasonCode) {
    pending.push(
      makePending({
        ...base,
        reasonCode: champ.reasonCode,
        teamName: champ.evidence.phraseChampions[0] ?? champ.evidence.tableChampion ?? null,
        details: {
          phraseChampions: champ.evidence.phraseChampions,
          tableChampion: champ.evidence.tableChampion,
          phraseText: champ.evidence.phraseText,
        },
      }),
    );
  }

  // Tabela malformada que impeça campeão.
  if (table.warnings.some((w) => w.code === 'malformed_table') && !champ.championTeam) {
    const already = pending.some((p) => p.reasonCode === 'malformed_table');
    if (!already) {
      pending.push(
        makePending({
          ...base,
          reasonCode: 'malformed_table',
          teamName: null,
          details: { warnings: table.warnings },
        }),
      );
    }
  }

  // Competição-mãe.
  const comp = resolveCompetitionQid(
    { expectedCompetitionName: competitionName },
    competitionIndex,
  );
  if (comp.reasonCode) {
    pending.push(
      makePending({
        ...base,
        reasonCode: comp.reasonCode,
        teamName: null,
        details: comp.details,
      }),
    );
  }

  // Clube campeão.
  let club: ClubIndexEntry | null = null;
  if (champ.championTeam) {
    const res = mapTeamToClub(champ.championTeam, clubIndex);
    club = res.club;
    if (res.reasonCode) {
      pending.push(
        makePending({
          ...base,
          reasonCode: res.reasonCode,
          teamName: champ.championTeam,
          details: res.details,
        }),
      );
    }
  }

  // Gênero.
  const gender = deriveGender(comp.competition?.gender, text);
  if (gender === 'unknown') {
    pending.push(
      makePending({
        ...base,
        reasonCode: 'gender_unknown',
        teamName: champ.championTeam,
        details: {},
      }),
    );
  }

  if (pending.length > 0 || !champ.championTeam || !club || !comp.competition) {
    return { candidate: null, pending };
  }

  const pos1 = table.rows.find((r) => r.position === 1) ?? null;
  const rawHint = pos1?.raw ?? champ.evidence.phraseText ?? champ.championTeam;
  const externalId = sha256Hex(`${rawHint}|${meta.sourceUrl}`).slice(0, 16);
  const sourcePageUrlHash = sha256Hex(meta.sourceUrl);

  return {
    candidate: {
      relation: 'WON',
      competitionQid: comp.competition.qid,
      competitionName,
      competitionId: comp.competition.id,
      seasonYear: season,
      clubQid: club.qid,
      clubName: champ.championTeam,
      clubId: club.id,
      hierarchy: 'estadual',
      gender,
      source: 'rsssf',
      sourceUrl: meta.sourceUrl,
      retrievedAt: meta.retrievedAt,
      authorCredit: meta.authorCredit,
      licenseText: meta.licenseText,
      attributionRequired: true,
      externalId,
      dedupKey: dedupKeyOf(comp.competition.qid, season, club.qid),
      metadataExtras: {
        pageChampionPhrase: champ.evidence.phraseText,
        tablePosition: pos1?.position ?? null,
        sourcePageUrlHash,
        parserVersion: PARSER_VERSION,
      },
    },
    pending: [],
  };
}
