/**
 * T448b-2d GO/PR 2025 — Integração do micro-seed de identidade (Postgres real).
 * Só clubes; por QID; homônimos intocados.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  applyClubSeed,
  createPrismaClubSeedRepo,
  validateClubSeedPack,
} from '../../src/lib/rsssf/seeds/club-seed.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const QID_VN_GO = 'Q1513287';
const QID_OP_PR = 'Q2580083';
const QID_VN_RN = 'Q10391045';
const QID_OP_HOM = 'Q671621';
const createdIds: string[] = [];

const goPack = validateClubSeedPack({
  pilotScope: 'go-2025',
  source: 'wikidata',
  license: 'CC0',
  retrievedAt: '2026-09-25T16:26:51Z',
  clubs: [
    {
      qid: QID_VN_GO,
      name: 'Vila Nova Futebol Clube',
      country: 'BR',
      importedFrom: 'wikidata-go-2025-pre',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1513287',
    },
  ],
  doNotTouch: [QID_VN_RN, 'Q10391046'],
});
const prPack = validateClubSeedPack({
  pilotScope: 'pr-2025',
  source: 'wikidata',
  license: 'CC0',
  retrievedAt: '2026-09-25T16:32:38Z',
  clubs: [
    {
      qid: QID_OP_PR,
      name: 'Operário Ferroviário Esporte Clube',
      country: 'BR',
      importedFrom: 'wikidata-pr-2025-pre',
      sourceUrl: 'https://www.wikidata.org/wiki/Q2580083',
    },
  ],
  doNotTouch: [QID_OP_HOM],
});

async function ensure(qid: string, name: string) {
  const e = await prisma.club.findUnique({ where: { qid }, select: { id: true } });
  if (e) return;
  await prisma.club.create({ data: { name, country: 'BR', qid } });
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
    return;
  }
  await prisma.club.deleteMany({ where: { qid: { in: [QID_VN_GO, QID_OP_PR] } } });
  await ensure(QID_VN_RN, 'Vila Nova Futebol Clube');
  await ensure(QID_OP_HOM, 'Operário Futebol Clube');
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.club.deleteMany({ where: { qid: { in: [QID_VN_GO, QID_OP_PR] } } });
    if (createdIds.length) await prisma.club.deleteMany({ where: { id: { in: createdIds } } });
  }
});

describe('T448b-2d seed GO/PR 2025 (Postgres real)', () => {
  it('cria os 2 clubes por QID; homônimos intactos; re-run idempotente', async () => {
    if (!dbOk || !isPostgres) return;
    const repo = createPrismaClubSeedRepo(prisma);
    const a = await applyClubSeed(goPack, repo);
    const b = await applyClubSeed(prPack, repo);
    expect(a.created + b.created).toBe(2);

    const vn = await prisma.club.findUniqueOrThrow({
      where: { qid: QID_VN_GO },
      select: { name: true, importedFrom: true, sourceUrl: true, deletedAt: true },
    });
    expect(vn).toMatchObject({
      name: 'Vila Nova Futebol Clube',
      importedFrom: 'wikidata-go-2025-pre',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1513287',
      deletedAt: null,
    });
    const op = await prisma.club.findUniqueOrThrow({
      where: { qid: QID_OP_PR },
      select: { name: true, importedFrom: true },
    });
    expect(op).toMatchObject({
      name: 'Operário Ferroviário Esporte Clube',
      importedFrom: 'wikidata-pr-2025-pre',
    });

    // homônimos intactos
    const rn = await prisma.club.findUniqueOrThrow({
      where: { qid: QID_VN_RN },
      select: { name: true },
    });
    const hom = await prisma.club.findUniqueOrThrow({
      where: { qid: QID_OP_HOM },
      select: { name: true },
    });
    expect(rn.name).toBe('Vila Nova Futebol Clube');
    expect(hom.name).toBe('Operário Futebol Clube');

    // re-run ⇒ noop
    expect((await applyClubSeed(goPack, repo)).created).toBe(0);
    expect((await applyClubSeed(prPack, repo)).created).toBe(0);
  });
});
