/**
 * T448b-2i — Integração: busca case/acento-insensível (translate nativo).
 * Fixture com nomes acentuados únicos (R2); busca por variações sem acento,
 * maiúsculas/minúsculas e com % injetado (escape). Requer Postgres.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { searchMatchedIds } from '../../src/lib/search.js';

const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const SUFFIX = 'T448b2i';
const created: string[] = [];

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
    return;
  }
  const club = await prisma.club.create({
    data: { name: `Grêmio ${SUFFIX}`, country: 'BR' },
  });
  created.push(club.id);
  await prisma.competition.create({
    data: { name: `Campeonato Açoriano ${SUFFIX}`, importedFrom: 'manual' },
  });
  await prisma.player.create({
    data: { fullName: `João Ninguém ${SUFFIX}`, clubId: club.id, country: 'BR' },
  });
});

afterAll(async () => {
  if (created.length) {
    await prisma.player.deleteMany({ where: { clubId: { in: created } } });
    await prisma.competition.deleteMany({ where: { name: { contains: SUFFIX } } });
    await prisma.club.deleteMany({ where: { id: { in: created } } });
  }
});

describe.skipIf(!isPostgres)('T448b-2i — busca translate+lower (sem extensão)', () => {
  it('case-insensitive: MAIÚSCULAS acha', async () => {
    const ids = await searchMatchedIds(prisma, 'clubs', ['name', 'fullName', 'shortName'], `GRÊMIO ${SUFFIX}`, { softDeleteCol: 'deletedAt' });
    expect(ids.length).toBeGreaterThanOrEqual(1);
  });

  it('acento-insensível: "Gremio" acha "Grêmio"', async () => {
    const ids = await searchMatchedIds(prisma, 'clubs', ['name', 'fullName', 'shortName'], `Gremio ${SUFFIX.toLowerCase()}`, { softDeleteCol: 'deletedAt' });
    expect(ids).toContain(created[0]);
  });

  it('sem acento e sem case: "sao" acha "São..."', async () => {
    await prisma.club.create({ data: { name: `São Bento ${SUFFIX}`, country: 'BR' } });
    const ids = await searchMatchedIds(prisma, 'clubs', ['name'], `sao bento ${SUFFIX.toLowerCase()}`, { softDeleteCol: 'deletedAt' });
    expect(ids.length).toBe(1);
    await prisma.club.deleteMany({ where: { name: `São Bento ${SUFFIX}` } });
  });

  it('competitions: acento-insensível', async () => {
    const ids = await searchMatchedIds(prisma, 'competitions', ['name'], `Acoriano ${SUFFIX.toLowerCase()}`);
    expect(ids.length).toBe(1);
  });

  it('players: acento-insensível', async () => {
    const ids = await searchMatchedIds(prisma, 'players', ['fullName'], `Joao Ninguem ${SUFFIX.toLowerCase()}`);
    expect(ids.length).toBe(1);
  });

  it('LIKE-injection: termo com % não vira curinga', async () => {
    const ids = await searchMatchedIds(prisma, 'clubs', ['name'], '%', { softDeleteCol: 'deletedAt' });
    expect(ids).toHaveLength(0);
  });

  it('soft-delete: clube deletado não aparece', async () => {
    const club = await prisma.club.create({ data: { name: `Deletável ${SUFFIX}`, country: 'BR' } });
    await prisma.club.update({ where: { id: club.id }, data: { deletedAt: new Date() } });
    const ids = await searchMatchedIds(prisma, 'clubs', ['name'], `deletavel ${SUFFIX.toLowerCase()}`, { softDeleteCol: 'deletedAt' });
    expect(ids).toHaveLength(0);
    await prisma.club.delete({ where: { id: club.id } });
  });
});
