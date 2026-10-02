/**
 * T448b-2d GO/PR 2025 — Micro-seed de IDENTIDADE de clubes (só clubes, por QID).
 * PURO sobre repo injetável. SEM parser RSSSF, SEM writer WON, SEM link-by-name.
 * Upsert por QID (idempotente); homônimos (doNotTouch) nunca tocados.
 */
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

export class ClubSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClubSeedError';
  }
}

const QID = z.string().regex(/^Q\d+$/);
const PackSchema = z.object({
  pilotScope: z.string().min(1),
  source: z.literal('wikidata'),
  license: z.literal('CC0'),
  retrievedAt: z.string().min(1),
  clubs: z.array(
    z.object({
      qid: QID,
      name: z.string().min(1),
      country: z.string().length(2),
      importedFrom: z.string().min(1),
      sourceUrl: z.string().regex(/^https?:\/\//),
    }),
  ),
  doNotTouch: z.array(QID),
});

export type ClubSeedPack = z.infer<typeof PackSchema>;
export type SeedClub = ClubSeedPack['clubs'][number];

export function validateClubSeedPack(raw: unknown): ClubSeedPack {
  const parsed = PackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ClubSeedError(
      `Pack de seed inválido: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    );
  }
  if (Number.isNaN(Date.parse(parsed.data.retrievedAt))) {
    throw new ClubSeedError('retrievedAt ausente/inválido (não ISO-8601).');
  }
  const forbidden = new Set(parsed.data.doNotTouch);
  for (const c of parsed.data.clubs) {
    if (forbidden.has(c.qid)) throw new ClubSeedError(`clubQid em doNotTouch: ${c.qid}`);
  }
  return parsed.data;
}

export interface SeedClubRef {
  id: string;
  qid: string | null;
  name: string;
  country: string | null;
  deletedAt: Date | null;
}

export interface ClubSeedRepo {
  findClubsByQid(qid: string): Promise<SeedClubRef[]>;
  createClub(input: SeedClub): Promise<{ id: string }>;
}

export function createPrismaClubSeedRepo(prisma: PrismaClient): ClubSeedRepo {
  return {
    findClubsByQid: (qid) =>
      prisma.club.findMany({
        where: { qid },
        select: { id: true, qid: true, name: true, country: true, deletedAt: true },
      }),
    createClub: (input) =>
      prisma.club.create({
        data: {
          name: input.name,
          country: input.country,
          qid: input.qid,
          status: 'ACTIVE',
          importedFrom: input.importedFrom,
          sourceUrl: input.sourceUrl,
          importedAt: new Date(),
        },
        select: { id: true },
      }),
  };
}

export type SeedAction = 'create' | 'noop';
export type SeedConflict = 'ambiguous_club_qid' | 'soft_deleted_club_qid';

export interface ClubSeedPlanEntry {
  qid: string;
  action: SeedAction;
  conflicts: SeedConflict[];
  existingId?: string;
}

export interface ClubSeedPlan {
  mode: 'DRY' | 'APPLY';
  scope: string;
  entries: ClubSeedPlanEntry[];
  errors: string[];
  wouldWrite: boolean;
}

export async function planClubSeed(pack: ClubSeedPack, repo: ClubSeedRepo): Promise<ClubSeedPlan> {
  const entries: ClubSeedPlanEntry[] = [];
  const errors: string[] = [];
  for (const c of pack.clubs) {
    const refs = await repo.findClubsByQid(c.qid);
    if (refs.length > 1) {
      entries.push({ qid: c.qid, action: 'noop', conflicts: ['ambiguous_club_qid'] });
      continue;
    }
    if (refs.length === 1) {
      if (refs[0].deletedAt) {
        entries.push({
          qid: c.qid,
          action: 'noop',
          conflicts: ['soft_deleted_club_qid'],
          existingId: refs[0].id,
        });
      } else {
        entries.push({ qid: c.qid, action: 'noop', conflicts: [], existingId: refs[0].id });
      }
      continue;
    }
    entries.push({ qid: c.qid, action: 'create', conflicts: [] });
  }
  const anyConflict = entries.some((e) => e.conflicts.length > 0);
  const anyCreate = entries.some((e) => e.action === 'create');
  return {
    mode: 'DRY',
    scope: pack.pilotScope,
    entries,
    errors,
    wouldWrite: !anyConflict && anyCreate,
  };
}

export interface ClubSeedApplyResult {
  created: number;
  noop: number;
}

export async function applyClubSeed(
  pack: ClubSeedPack,
  repo: ClubSeedRepo,
): Promise<ClubSeedApplyResult> {
  const plan = await planClubSeed(pack, repo);
  const conflict = plan.entries.find((e) => e.conflicts.length > 0);
  if (conflict)
    throw new ClubSeedError(`Seed abortado (${conflict.qid}): ${conflict.conflicts.join(',')}`);
  let created = 0;
  let noop = 0;
  for (const c of pack.clubs) {
    const entry = plan.entries.find((e) => e.qid === c.qid)!;
    if (entry.action === 'create') {
      await repo.createClub(c);
      created += 1;
    } else {
      noop += 1;
    }
  }
  return { created, noop };
}
