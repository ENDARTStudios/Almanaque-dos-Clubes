/**
 * T448b-2d GO — pack de candidates EMPACOTADO (runtime). Determinístico, offline.
 * Zod + fail-fast: sem 2025, sem Q1513287, dedupKeys únicas, atribuição obrigatória.
 */
import { z } from 'zod';
import raw from '../data/go-pilot-candidates.json' with { type: 'json' };
import { GO_PARSER_VERSION, GO_PILOT_SCOPE, type GoPack } from './types.js';

export class GoPackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoPackError';
  }
}

const CandidateSchema = z.object({
  relation: z.literal('WON'),
  competitionQid: z.string().regex(/^Q\d+$/),
  seasonYear: z.number().int(),
  clubQid: z.string().regex(/^Q\d+$/),
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
  parserVersion: z.string().min(1),
  metadataExtras: z.object({
    championPhrase: z.string().nullable(),
    tablePosition: z.number().nullable(),
    sourcePageUrlHash: z.string().min(1),
    uf: z.literal('GO'),
    pilotScope: z.string().min(1),
  }),
});

const PackSchema = z.object({
  pilotScope: z.literal(GO_PILOT_SCOPE),
  parserVersion: z.literal(GO_PARSER_VERSION),
  source: z.literal('rsssf'),
  attributionRequired: z.literal(true),
  candidates: z.array(CandidateSchema),
  excluded: z.array(
    z.object({
      seasonYear: z.number().int(),
      reason: z.string().min(1),
      clubQid: z
        .string()
        .regex(/^Q\d+$/)
        .optional(),
      detail: z.string().optional(),
    }),
  ),
  doNotTouch: z.array(z.string().regex(/^Q\d+$/)),
});

export function validateGoPack(rawPack: unknown): GoPack {
  const parsed = PackSchema.safeParse(rawPack);
  if (!parsed.success) {
    throw new GoPackError(
      `Pack GO inválido: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    );
  }
  const pack = parsed.data as GoPack;
  const seen = new Set<string>();
  for (const c of pack.candidates) {
    if (c.seasonYear === 2025) throw new GoPackError('candidate 2025 proibido no pack GO.');
    if (c.clubQid === 'Q1513287' || pack.doNotTouch.includes(c.clubQid))
      throw new GoPackError(`clubQid doNotTouch em candidate: ${c.clubQid}`);
    if (Number.isNaN(Date.parse(c.retrievedAt)))
      throw new GoPackError(`retrievedAt inválido: ${c.dedupKey}`);
    if (!c.authorCredit.trim() || !c.licenseText.trim())
      throw new GoPackError(`attribution ausente: ${c.dedupKey}`);
    if (seen.has(c.dedupKey)) throw new GoPackError(`dedupKey duplicada: ${c.dedupKey}`);
    seen.add(c.dedupKey);
  }
  return pack;
}

export function loadGoPack(): GoPack {
  return validateGoPack(raw);
}
