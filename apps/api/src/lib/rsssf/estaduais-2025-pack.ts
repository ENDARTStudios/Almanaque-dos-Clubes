/**
 * T448b-2d — Packs EMPACOTADOS (runtime) dos pilotos estaduais 2025: GO 2025 e PR 2025.
 * Zod + fail-fast: escopo/ano/competição/clube exatos, atribuição obrigatória, retrievedAt ISO,
 * dedupKeys únicas, homônimos em `doNotTouch`. Determinístico, offline (sem rede/DB).
 */
import { z } from 'zod';
import goRaw from './data/go-2025-pilot-candidates.json' with { type: 'json' };
import prRaw from './data/pr-2025-pilot-candidates.json' with { type: 'json' };
import type { GoCandidate } from './go/types.js';

export class Estadual2025PackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Estadual2025PackError';
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
    uf: z.string().min(1),
    pilotScope: z.string().min(1),
  }),
});

const PackSchema = z.object({
  pilotScope: z.string().min(1),
  parserVersion: z.string().min(1),
  source: z.literal('rsssf'),
  attributionRequired: z.literal(true),
  candidates: z.array(CandidateSchema),
  doNotTouch: z.array(z.string().regex(/^Q\d+$/)),
});

export interface Estadual2025Pack {
  pilotScope: string;
  parserVersion: string;
  candidates: GoCandidate[];
  doNotTouch: string[];
}

export interface Expected2025Scope {
  pilotScope: string;
  parserVersion: string;
  seasonYear: number;
  competitionQid: string;
  clubQid: string;
}

export const GO_2025_EXPECTED: Expected2025Scope = {
  pilotScope: 'go-2025',
  parserVersion: 't448b2d-go-parser-v1',
  seasonYear: 2025,
  competitionQid: 'Q931386',
  clubQid: 'Q1513287',
};

export const PR_2025_EXPECTED: Expected2025Scope = {
  pilotScope: 'pr-2025',
  parserVersion: 't448b2d-pr-parser-v1',
  seasonYear: 2025,
  competitionQid: 'Q920397',
  clubQid: 'Q2580083',
};

export function validateEstadual2025Pack(
  rawPack: unknown,
  expected: Expected2025Scope,
): Estadual2025Pack {
  const parsed = PackSchema.safeParse(rawPack);
  if (!parsed.success) {
    throw new Estadual2025PackError(
      `Pack ${expected.pilotScope} inválido: ${parsed.error.issues
        .map((i) => i.path.join('.') + ' ' + i.message)
        .join('; ')}`,
    );
  }
  const pack = parsed.data as Estadual2025Pack;
  if (pack.pilotScope !== expected.pilotScope)
    throw new Estadual2025PackError(
      `pilotScope inesperado: ${pack.pilotScope} (esperado ${expected.pilotScope})`,
    );
  if (pack.parserVersion !== expected.parserVersion)
    throw new Estadual2025PackError(
      `parserVersion inesperado: ${pack.parserVersion} (esperado ${expected.parserVersion})`,
    );
  const seen = new Set<string>();
  for (const c of pack.candidates) {
    if (c.seasonYear !== expected.seasonYear)
      throw new Estadual2025PackError(`seasonYear fora do escopo: ${c.dedupKey}`);
    if (c.competitionQid !== expected.competitionQid)
      throw new Estadual2025PackError(`competitionQid inesperado: ${c.dedupKey}`);
    if (c.clubQid !== expected.clubQid)
      throw new Estadual2025PackError(`clubQid inesperado: ${c.dedupKey}`);
    if (pack.doNotTouch.includes(c.clubQid))
      throw new Estadual2025PackError(`clubQid doNotTouch em candidate: ${c.clubQid}`);
    if (Number.isNaN(Date.parse(c.retrievedAt)))
      throw new Estadual2025PackError(`retrievedAt inválido: ${c.dedupKey}`);
    if (!c.authorCredit.trim() || !c.licenseText.trim())
      throw new Estadual2025PackError(`attribution ausente: ${c.dedupKey}`);
    if (c.attributionRequired !== true)
      throw new Estadual2025PackError(`attributionRequired != true: ${c.dedupKey}`);
    if (seen.has(c.dedupKey)) throw new Estadual2025PackError(`dedupKey duplicada: ${c.dedupKey}`);
    seen.add(c.dedupKey);
  }
  return pack;
}

export function loadGo2025Pack(): Estadual2025Pack {
  return validateEstadual2025Pack(goRaw, GO_2025_EXPECTED);
}

export function loadPr2025Pack(): Estadual2025Pack {
  return validateEstadual2025Pack(prRaw, PR_2025_EXPECTED);
}

export type Estadual2025Scope = 'go-2025' | 'pr-2025';

export function loadEstadual2025Pack(scope: Estadual2025Scope): Estadual2025Pack {
  return scope === 'go-2025' ? loadGo2025Pack() : loadPr2025Pack();
}
