/**
 * T448b-2b FIX-PACK (#197) — Pack de candidates EMPACOTADO no runtime.
 *
 * O writer de produção NÃO pode depender de `tests/fixtures/**` (o Dockerfile não
 * copia `tests/`). Este módulo carrega o pack congelado de dentro de `src/` (que o
 * `COPY apps/api/src` já leva e o tsc emite em `dist/`), validado por Zod e
 * fail-fast. Determinístico e offline — sem fetch externo no apply.
 */
import { z } from 'zod';
import pack from './data/mg-pilot-candidates.json' with { type: 'json' };
import type { WonCandidate } from './types.js';

export const CANDIDATE_PACK_VERSION = 't448b2b-mg-pilot-candidates-v1';

export class CandidatePackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidatePackError';
  }
}

const WonCandidateSchema = z.object({
  relation: z.literal('WON'),
  competitionQid: z.string().regex(/^Q\d+$/),
  competitionName: z.string().min(1),
  competitionId: z.string().nullable(),
  seasonYear: z.number().int(),
  clubQid: z.string().regex(/^Q\d+$/),
  clubName: z.string().min(1),
  clubId: z.string().nullable(),
  hierarchy: z.literal('estadual'),
  gender: z.enum(['men', 'women', 'unknown']),
  source: z.literal('rsssf'),
  sourceUrl: z.string().regex(/^https?:\/\//),
  retrievedAt: z.string().min(1),
  authorCredit: z.string().min(1),
  licenseText: z.string().min(1),
  attributionRequired: z.literal(true),
  externalId: z.string().min(1),
  dedupKey: z.string().min(1),
  metadataExtras: z.object({
    pageChampionPhrase: z.string().nullable(),
    tablePosition: z.number().nullable(),
    sourcePageUrlHash: z.string().min(1),
    parserVersion: z.string().min(1),
  }),
});

/** Valida o pack cru: Zod + fail-fast (atribuição obrigatória e dedupKey única). */
export function validateCandidates(raw: unknown): WonCandidate[] {
  const parsed = z.array(WonCandidateSchema).safeParse(raw);
  if (!parsed.success) {
    throw new CandidatePackError(
      `Pack inválido: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    );
  }
  const candidates = parsed.data as WonCandidate[];
  if (candidates.length === 0) throw new CandidatePackError('Pack vazio.');
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c.authorCredit.trim() || !c.licenseText.trim()) {
      throw new CandidatePackError(`attribution ausente em ${c.dedupKey}`);
    }
    if (seen.has(c.dedupKey)) {
      throw new CandidatePackError(`dedupKey duplicada: ${c.dedupKey}`);
    }
    seen.add(c.dedupKey);
  }
  return candidates;
}

/** Pack de produção (embutido no bundle). Fail-fast se inválido. */
export function loadPilotCandidates(): WonCandidate[] {
  return validateCandidates(pack);
}
