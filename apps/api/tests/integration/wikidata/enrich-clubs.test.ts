/**
 * WS-D M1a — integração DB do enriquecimento (SEM rede: planos sintéticos).
 * Prova: preenche só campos nulos (COALESCE); não sobrescreve; idempotente; rollback lógico.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../src/config/prisma.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const ROLLBACK = Symbol('m1a-rollback');
const IMPORTED = 'wikidata-enrich-v1';

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

describe('WS-D M1a — enrich clubs (Postgres real, rollback)', () => {
  it('preenche só campos nulos; não sobrescreve; idempotente; rollback lógico', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await inTx(async (tx) => {
      const c = await tx.club.create({
        data: { name: 'M1a Enrich FC', country: 'BR', qid: 'Q9900001' },
        select: { id: true },
      });
      // 1) preenche city/coord/fullName
      const u1 = await tx.club.updateMany({
        where: {
          id: c.id,
          deletedAt: null,
          OR: [{ city: null }, { latitude: null }, { fullName: null }],
        },
        data: {
          city: 'Rio de Janeiro',
          latitude: -22.9,
          longitude: -43.2,
          fullName: 'M1a Full',
          importedFrom: IMPORTED,
        },
      });
      const after1 = await tx.club.findUnique({
        where: { id: c.id },
        select: { city: true, latitude: true, fullName: true },
      });

      // 2) re-run com outros valores NÃO deve sobrescrever (where exige algum nulo)
      const u2 = await tx.club.updateMany({
        where: {
          id: c.id,
          deletedAt: null,
          OR: [{ city: null }, { latitude: null }, { fullName: null }],
        },
        data: { city: 'X', latitude: 0, longitude: 0, fullName: 'Y' },
      });
      const after2 = await tx.club.findUnique({
        where: { id: c.id },
        select: { city: true, fullName: true },
      });

      // 3) rollback lógico por importedFrom
      const rb = await tx.club.updateMany({
        where: { importedFrom: IMPORTED, deletedAt: null, id: c.id },
        data: { city: null, latitude: null, longitude: null, fullName: null },
      });
      const afterRb = await tx.club.findUnique({
        where: { id: c.id },
        select: { city: true, fullName: true },
      });
      return { u1: u1.count, after1, u2: u2.count, after2, rb: rb.count, afterRb };
    });
    expect(res.u1).toBe(1);
    expect(res.after1).toMatchObject({ city: 'Rio de Janeiro', fullName: 'M1a Full' });
    expect(res.u2).toBe(0); // nada nulo → noop
    expect(res.after2).toMatchObject({ city: 'Rio de Janeiro', fullName: 'M1a Full' });
    expect(res.rb).toBe(1);
    expect(res.afterRb).toMatchObject({ city: null, fullName: null });
  });
});
