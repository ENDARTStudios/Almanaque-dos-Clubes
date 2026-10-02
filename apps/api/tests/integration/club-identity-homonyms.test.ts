/**
 * T448b-2f — Integração: homônimos nacionais coexistem (sem @@unique name,country);
 * duplicata EXATA bloqueada pela validação de negócio. Postgres real.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { clubsService } from '../../src/modules/clubs/service.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const NAME = 'Vila Nova Futebol Clube T448b2f';
const QID_A = 'Q94805001';
const QID_B = 'Q94805002';
const createdIds: string[] = [];

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
  await prisma.club.deleteMany({ where: { qid: { in: [QID_A, QID_B] } } });
  await prisma.club.deleteMany({ where: { name: NAME, qid: null } });
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.club.deleteMany({ where: { qid: { in: [QID_A, QID_B] } } });
    await prisma.club.deleteMany({ where: { name: NAME, qid: null } });
    if (createdIds.length) await prisma.club.deleteMany({ where: { id: { in: createdIds } } });
  }
});

describe('T448b-2f — homônimos coexistem; duplicata exata bloqueada', () => {
  it('cria dois "Vila Nova..." (GO e RN) sem erro (constraint removida)', async () => {
    if (!dbOk || !isPostgres) return;
    const a = await prisma.club.create({
      data: { name: NAME, country: 'BR', state: 'GO', city: 'Goiânia', qid: QID_A },
      select: { id: true },
    });
    const b = await prisma.club.create({
      data: { name: NAME, country: 'BR', state: 'RN', city: 'Natal', qid: QID_B },
      select: { id: true },
    });
    createdIds.push(a.id, b.id);
    const n = await prisma.club.count({ where: { name: NAME, country: 'BR', deletedAt: null } });
    expect(n).toBe(2);
  });

  it('bloqueia duplicata EXATA pela validação de negócio (nenhum registro novo)', async () => {
    if (!dbOk || !isPostgres) return;
    const before = await prisma.club.count({
      where: { name: NAME, country: 'BR', state: 'GO', city: 'Goiânia', deletedAt: null },
    });
    await expect(
      clubsService.create({ name: NAME, country: 'BR', state: 'GO', city: 'Goiânia' }),
    ).rejects.toThrow('Já existe');
    const after = await prisma.club.count({
      where: { name: NAME, country: 'BR', state: 'GO', city: 'Goiânia', deletedAt: null },
    });
    expect(after).toBe(before);
  });

  it('permite homônimo com state diferente via serviço (GO existente ⇒ RN passa)', async () => {
    if (!dbOk || !isPostgres) return;
    const club = await clubsService.create({
      name: NAME,
      country: 'BR',
      state: 'RN',
      city: 'Parnamirim',
    });
    if (club?.id) createdIds.push(club.id);
    expect(club.name).toBe(NAME);
  });
});
