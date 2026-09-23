/**
 * T448b-2b FASE 1 — Tipos do parser PURO RSSSF (Campeonato Mineiro / Módulo I).
 *
 * SEM DB, SEM rede, SEM Prisma, SEM escrita. Apenas leitura/parse de fixtures
 * locais e construção de CANDIDATES (nunca aplicados). Determinístico.
 *
 * dedupKey factual (R1) = competitionQid|seasonYear|clubQid|WON.
 * O hash da URL-fonte vive em `externalId`/`metadataExtras`, NUNCA na chave.
 */

export const PARSER_VERSION = 't448b2b-fase1-v1';

/** Códigos de pendência. Os 8 primeiros foram exigidos no dispatch; os 3
 * `_ext` são extensões declaradas porque o dispatch manda pendurar casos
 * que não têm código próprio (frase sem tabela, clube inativo, tabela ok). */
export type ReasonCode =
  | 'missing_club'
  | 'ambiguous_club'
  | 'missing_competition'
  | 'ambiguous_competition'
  | 'missing_attribution'
  | 'multiple_champions'
  | 'conflicting_champion'
  | 'malformed_table'
  | 'champion_unconfirmed'
  | 'missing_table_link'
  | 'club_inactive'
  | 'gender_unknown';

export type Severity = 'blocker' | 'review';

/** Blocker = impede gravar. Review/gap = pendência auditável, sem aresta. */
export const BLOCKER_CODES: readonly ReasonCode[] = [
  'missing_attribution',
  'multiple_champions',
  'conflicting_champion',
  'ambiguous_club',
  'ambiguous_competition',
  'malformed_table',
  'gender_unknown',
  'champion_unconfirmed',
];

export interface ParseWarning {
  code: string;
  message: string;
  line?: number;
}

export interface TableRow {
  position: number;
  team: string;
  /** números na ordem em que aparecem (sem rótulo — não adivinhar). */
  numbers: number[];
  /** saldo (GP-GC) quando o layout traz par hifenizado. */
  goalDiff: number | null;
  /** último número = pontos (convenção observada no layout MG). */
  points: number | null;
  raw: string;
}

export interface ParsedTable {
  rows: TableRow[];
  warnings: ParseWarning[];
}

export interface AttributionMeta {
  sourceUrl: string;
  retrievedAt: string;
  authorCredit: string;
  licenseText: string;
}

export interface FixtureMeta extends AttributionMeta {
  expectedSeason: number;
  expectedCompetitionName: string;
  notes?: string;
}

export interface FixtureFile {
  season: number;
  meta: FixtureMeta;
  encoding?: string;
  /** conteúdo cp1252 (ou outra legacy) em base64 — preserva bytes reais. */
  rawBase64?: string;
  /** conteúdo textual direto (fixtures sintéticas de borda). */
  rawText?: string;
}

export interface ClubIndexEntry {
  id: string | null;
  qid: string;
  name: string;
  popularName?: string;
  officialName?: string;
  aliases?: string[];
  active: boolean;
}

export interface CompetitionIndexEntry {
  id: string | null;
  qid: string;
  name: string;
  aliases?: string[];
  hierarchy: 'estadual' | 'nacional' | 'continental' | 'mundial' | 'municipal';
  gender: 'men' | 'women' | 'unknown';
}

export type Gender = 'men' | 'women' | 'unknown';

export interface WonCandidate {
  relation: 'WON';
  competitionQid: string;
  competitionId: string | null;
  seasonYear: number;
  clubQid: string;
  clubId: string | null;
  hierarchy: 'estadual';
  gender: Gender;
  source: 'rsssf';
  sourceUrl: string;
  retrievedAt: string;
  authorCredit: string;
  licenseText: string;
  attributionRequired: true;
  /** rastreabilidade reversa à fonte — NÃO é chave de dedup. */
  externalId: string;
  /** dedup factual (R1): competitionQid|seasonYear|clubQid|WON. */
  dedupKey: string;
  metadataExtras: {
    pageChampionPhrase: string | null;
    tablePosition: number | null;
    sourcePageUrlHash: string;
    parserVersion: string;
  };
}

export interface PendingReviewItem {
  reasonCode: ReasonCode;
  severity: Severity;
  season: number;
  competitionName: string;
  teamName: string | null;
  sourceUrl: string;
  details: Record<string, unknown>;
}
