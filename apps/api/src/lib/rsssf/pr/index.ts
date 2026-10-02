/**
 * T448b-2d PR 2025 — Parser puro do Campeonato Paranaense (Operário Ferroviário / Q2580083).
 * Reusa o núcleo genérico (decode/extract/map/resolve) e o builder GO já parametrizado
 * (`options`). Resolução ESTRITA por QID — homônimo "Operário FC" (Q671621) NÃO casa.
 */
import {
  buildGoWonCandidate,
  type BuildGoInput,
  type BuildGoResult,
} from '../go/build-go-won-candidate.js';

export {
  decodeGoTable as decodePrTable,
  goFixtureToText as prFixtureToText,
} from '../go/decode-go-table.js';
export type { BuildGoResult as BuildPrResult };

export const PR_COMPETITION_QID = 'Q920397';
export const PR_CHAMPION_QID = 'Q2580083';
export const PR_PILOT_SCOPE = 'pr-2025';
export const PR_PARSER_VERSION = 't448b2d-pr-parser-v1';

export const PR_DEFAULT_OPTIONS = {
  expectedCompetitionQid: PR_COMPETITION_QID,
  expectedChampionQid: PR_CHAMPION_QID,
  pilotScope: PR_PILOT_SCOPE,
  uf: 'PR',
  parserVersion: PR_PARSER_VERSION,
} as const;

export type BuildPrInput = Omit<BuildGoInput, 'options'> & { options?: BuildGoInput['options'] };

/** Constrói candidate WON do PR 2025 com os defaults do piloto (overridáveis). */
export function buildPrWonCandidate(input: BuildPrInput): BuildGoResult {
  return buildGoWonCandidate({
    ...input,
    options: { ...PR_DEFAULT_OPTIONS, ...input.options },
  });
}
