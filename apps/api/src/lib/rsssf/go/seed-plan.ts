/**
 * T448b-2d GO — Plano e execução do seed de identidade (reduzido 2023–2024).
 * PURO sobre um repo injetável; I/O (Prisma) fica no adapter. SEM parser/writer/arestas.
 */
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import rawPack from '../data/go-identity-seed.json' with { type: 'json' };
import {
  GO_SEED_LICENSE,
  GO_SEED_SCOPE,
  type CompetitionPlan,
  type ClubPlan,
  type GoSeedClubRef,
  type GoSeedCompetition,
  type GoSeedCompetitionRef,
  type GoSeedPack,
  type GoSeedPlan,
} from './identity-types.js';

export class GoSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoSeedError';
  }
}

const QID = z.string().regex(/^Q\d+$/);

const PackSchema = z.object({
  pilotScope: z.literal(GO_SEED_SCOPE),
  source: z.literal('wikidata'),
  license: z.literal(GO_SEED_LICENSE),
  retrievedAt: z.string().min(1),
  competition: z.object({
    qid: QID,
    name: z.string().min(1),
    type: z.literal('LEAGUE'),
    country: z.string().length(2),
    importedFrom: z.string().min(1),
    sourceUrl: z.string().regex(/^https?:\/\//),
  }),
  clubs: z.array(
    z.object({
      qid: QID,
      action: z.literal('noop_if_present'),
      name: z.string().min(1),
      country: z.string().length(2),
      sourceUrl: z.string().regex(/^https?:\/\//),
    }),
  ),
  excluded: z.array(
    z.object({
      qid: QID,
      name: z.string().min(1),
      reason: z.string().min(1),
      detail: z.string().min(1),
      pilotImpact: z.string().min(1),
    }),
  ),
  doNotTouch: z.array(QID),
});

/** Valida o pack cru (Zod + retrievedAt ISO estático + ação de clube permitida). */
export function validateGoSeedPack(raw: unknown): GoSeedPack {
  const parsed = PackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GoSeedError(
      `Pack GO inválido: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    );
  }
  if (Number.isNaN(Date.parse(parsed.data.retrievedAt))) {
    throw new GoSeedError('retrievedAt ausente/inválido (não ISO-8601) no pack GO.');
  }
  return parsed.data as GoSeedPack;
}

export function loadGoSeedPack(): GoSeedPack {
  return validateGoSeedPack(rawPack);
}

// ---------------------------------------------------------------------------
// Repo injetável
// ---------------------------------------------------------------------------

export interface GoSeedRepo {
  findCompetitionsByQid(qid: string): Promise<GoSeedCompetitionRef[]>;
  findCompetitionsByNameLike(terms: string[]): Promise<GoSeedCompetitionRef[]>;
  findClubsByQid(qid: string): Promise<GoSeedClubRef[]>;
  createCompetition(input: GoSeedCompetition): Promise<{ id: string }>;
}

// importedAt = instante da importação (operacional); retrievedAt (coleta) é estático no pack.
const GO_SEED_CREATE_IMPORTED_AT = '2026-09-24T14:49:12Z';

export function createPrismaGoSeedRepo(prisma: PrismaClient): GoSeedRepo {
  return {
    findCompetitionsByQid: (qid) =>
      prisma.competition.findMany({
        where: { qid },
        select: {
          id: true,
          qid: true,
          name: true,
          type: true,
          country: true,
          importedFrom: true,
          sourceUrl: true,
        },
      }) as Promise<GoSeedCompetitionRef[]>,
    findCompetitionsByNameLike: async (terms) =>
      (await prisma.competition.findMany({
        where: { OR: terms.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
        select: {
          id: true,
          qid: true,
          name: true,
          type: true,
          country: true,
          importedFrom: true,
          sourceUrl: true,
        },
      })) as GoSeedCompetitionRef[],
    findClubsByQid: (qid) =>
      prisma.club.findMany({
        where: { qid },
        select: { id: true, qid: true, name: true, country: true, deletedAt: true },
      }),
    createCompetition: (input) =>
      prisma.competition.create({
        data: {
          name: input.name,
          country: input.country,
          type: input.type,
          qid: input.qid,
          importedFrom: input.importedFrom,
          sourceUrl: input.sourceUrl,
          importedAt: new Date(GO_SEED_CREATE_IMPORTED_AT),
        },
        select: { id: true },
      }),
  };
}

// ---------------------------------------------------------------------------
// Planejamento (read-only)
// ---------------------------------------------------------------------------

export async function planGoSeed(pack: GoSeedPack, repo: GoSeedRepo): Promise<GoSeedPlan> {
  const errors: string[] = [];
  const excludedQids = new Set(pack.excluded.map((e) => e.qid));
  const forbidden = new Set([...pack.doNotTouch, ...excludedQids]);

  // Nenhum clube do pack pode ser um excluído/doNotTouch (nada de create/link).
  for (const c of pack.clubs) {
    if (forbidden.has(c.qid)) errors.push(`forbidden_excluded_club_in_seed_plan:${c.qid}`);
  }

  // --- Competição-mãe ---
  const comp: CompetitionPlan = { qid: pack.competition.qid, action: 'noop', conflicts: [] };
  const existing = await repo.findCompetitionsByQid(pack.competition.qid);
  if (existing.length > 1) {
    comp.conflicts.push('ambiguous_competition_qid');
  } else if (existing.length === 1) {
    comp.action = 'noop';
  } else {
    const nameMatches = await repo.findCompetitionsByNameLike(['goiano', 'Goiás']);
    const conflicting = nameMatches.filter((c) => c.qid !== pack.competition.qid);
    if (conflicting.length > 0) {
      comp.conflicts.push('conflicting_competition_name');
    } else {
      comp.action = 'create';
    }
  }

  // --- Clubes (apenas noop_if_present) ---
  const clubs: ClubPlan[] = [];
  for (const c of pack.clubs) {
    const refs = await repo.findClubsByQid(c.qid);
    const plan: ClubPlan = { qid: c.qid, action: 'noop', conflicts: [] };
    if (refs.length === 0) plan.conflicts.push('missing_required_club');
    else if (refs.length > 1) plan.conflicts.push('ambiguous_club_qid');
    else if (refs[0].deletedAt) plan.conflicts.push('soft_deleted_required_club');
    else plan.action = 'noop';
    clubs.push(plan);
  }

  const wouldWrite = errors.length === 0 && comp.action === 'create' && comp.conflicts.length === 0;
  return {
    mode: 'DRY',
    pilotScope: pack.pilotScope,
    competition: comp,
    clubs,
    excluded: pack.excluded.map((e) => ({ qid: e.qid, reason: e.reason })),
    errors,
    wouldWrite,
  };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

export interface GoSeedApplyResult {
  created: number;
  noop: number;
  competitionId: string | null;
}

/** Executa SÓ a competição-mãe; clubes são sempre noop (reduzido). Idempotente. */
export async function applyGoSeed(pack: GoSeedPack, repo: GoSeedRepo): Promise<GoSeedApplyResult> {
  const plan = await planGoSeed(pack, repo);
  if (plan.errors.length > 0 || plan.competition.conflicts.length > 0) {
    throw new GoSeedError(
      `Seed GO abortado: ${JSON.stringify({ errors: plan.errors, conflicts: plan.competition.conflicts })}`,
    );
  }
  if (plan.competition.action === 'create') {
    const created = await repo.createCompetition(pack.competition);
    return { created: 1, noop: plan.clubs.length, competitionId: created.id };
  }
  return { created: 0, noop: plan.clubs.length, competitionId: null };
}
