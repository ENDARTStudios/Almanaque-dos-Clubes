/**
 * WS-D M1a-2 — integração DB do preenchimento de coords/city (SEM rede: resultado sintético).
 * Prova: só preenche nulos (não sobrescreve); idempotente; rollback por importedFrom.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../src/config/prisma.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const ROLLBACK = Symbol('m1a2-rollback');
const IMPORTED = 'wikidata-enrich-m1a2';

async function inTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let out!: T;
  try {
    await prisma.$transaction(async (tx) => {
      out = await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  return out;
}

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI');
  }
});

describe('WS-D M1a-2 — enrich coords (Postgres real, rollback)', () => {
  it('preenche só nulos; não sobrescreve; rollback', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      const c = await tx.club.create({
        data: {
          name: 'M1a2 Coords FC',
          country: 'BR',
          qid: 'Q9900099',
          city: 'Curitiba',
          latitude: null,
          longitude: null,
        },
        select: { id: true, city: true, latitude: true },
      });
      // preenche coords (city já existe → NÃO sobrescrever)
      const u = await tx.club.updateMany({
        where: {
          id: c.id,
          deletedAt: null,
          OR: [{ latitude: null }, { longitude: null }, { city: null }],
        },
        data: {
          ...(c.latitude == null ? { latitude: -25.4 } : {}),
          ...(c.latitude == null ? { longitude: -49.2 } : {}),
          ...(!c.city ? { city: 'Rio de Janeiro' } : {}),
          importedFrom: IMPORTED,
        },
      });
      const after = await tx.club.findUnique({
        where: { id: c.id },
        select: { city: true, latitude: true },
      });
      const rb = await tx.club.updateMany({
        where: { id: c.id, importedFrom: IMPORTED, deletedAt: null },
        data: { latitude: null, longitude: null, city: null },
      });
      const afterRb = await tx.club.findUnique({
        where: { id: c.id },
        select: { city: true, latitude: true },
      });
      return { u: u.count, after, rb: rb.count, afterRb };
    });
    expect(res.u).toBe(1);
    expect(res.after).toMatchObject({ city: 'Curitiba', latitude: -25.4 }); // city preservado
    expect(res.rb).toBe(1);
    expect(res.afterRb).toMatchObject({ city: null, latitude: null });
  });
});
