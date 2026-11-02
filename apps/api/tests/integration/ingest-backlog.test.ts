/**
 * T602 — fila de ingestão contínua com Prisma real: idempotência do plano e a
 * REGRA CRÍTICA de fechamento — falha transitória NÃO vira DONE (lição T528, que
 * custou 250 registros em 11-2026).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  closeItem,
  nextBatch,
  syncBacklog,
  MAX_ATTEMPTS,
} from '../../src/modules/ingest/backlog.js';
import { planAndRunBacklog } from '../../src/modules/ingest/backlog-runner.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const SRC = `test-t602-${Date.now()}`;

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.ingestBacklog.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
  }
});

afterAll(async () => {
  if (dbOk && isPostgres) await prisma.ingestBacklog.deleteMany({ where: { sourceKey: SRC } });
});

describe.skipIf(!dbOk || !isPostgres)('T602 — ingest_backlog', () => {
  it('plano idempotente: re-planejar não duplica item', async () => {
    const items = [
      {
        sourceKey: SRC,
        runnerKey: 'br',
        seasonLabel: '2024',
        competitionQid: 'Q1',
        reason: 'never_ingested' as const,
        seasonLabelYear: 2024,
      },
    ];
    const r1 = await syncBacklog(prisma, items);
    expect(r1.created).toBe(1);
    const r2 = await syncBacklog(prisma, items);
    expect(r2.created).toBe(0);
    expect(r2.skipped).toBe(1);
    const n = await prisma.ingestBacklog.count({ where: { sourceKey: SRC } });
    expect(n).toBe(1);
  });

  it('FALHA TRANSITÓRIA volta a PENDING e NUNCA vira DONE', async () => {
    const row = await prisma.ingestBacklog.findFirstOrThrow({ where: { sourceKey: SRC } });
    await closeItem(prisma, row.id, { ok: false, transient: true, detail: 'HTTP 429' });
    const depois = await prisma.ingestBacklog.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe('PENDING');
    expect(depois.attempts).toBe(1);
  });

  it('falha DEFINITIVA vira FAILED', async () => {
    const row = await prisma.ingestBacklog.findFirstOrThrow({ where: { sourceKey: SRC } });
    await closeItem(prisma, row.id, { ok: false, transient: false, detail: 'competição ausente' });
    const depois = await prisma.ingestBacklog.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe('FAILED');
    expect(depois.attempts).toBe(2);
  });

  it('sucesso vira DONE e sai do lote', async () => {
    const row = await prisma.ingestBacklog.findFirstOrThrow({ where: { sourceKey: SRC } });
    // limpa estado para testar o sucesso a partir de PENDING
    await prisma.ingestBacklog.update({
      where: { id: row.id },
      data: { status: 'PENDING', attempts: 0 },
    });
    await closeItem(prisma, row.id, { ok: true, transient: false, detail: 'ok' });
    const depois = await prisma.ingestBacklog.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe('DONE');
    const lote = await nextBatch(prisma, 50);
    expect(lote.some((i) => i.id === row.id)).toBe(false);
  });

  it('item acima do teto de tentativas não é consumido', async () => {
    const novo = await prisma.ingestBacklog.create({
      data: {
        sourceKey: SRC,
        runnerKey: 'br',
        season: '2001',
        competitionQid: 'Q1',
        reason: 'never_ingested',
        attempts: MAX_ATTEMPTS,
      },
    });
    const lote = await nextBatch(prisma, 100);
    expect(lote.some((i) => i.id === novo.id)).toBe(false);
    await prisma.ingestBacklog.delete({ where: { id: novo.id } });
  });

  it('runner orquestra plano+consumo e respeita a injeção de dependências', async () => {
    // A chave precisa estar no REGISTRO (senão é negada — default seguro). Usa
    // `rsssf` com competição/ano fora da cobertura real e limpa depois.
    const executados: string[] = [];
    const out = await planAndRunBacklog(1, {
      prisma,
      sources: () => [
        {
          sourceKey: 'rsssf',
          runnerKey: 'br',
          competitionQid: 'Q602-SEM-COBERTURA',
          seasons: [{ label: '1899' }],
        },
      ],
      run: async (item) => {
        executados.push(`${item.sourceKey}:${item.season}`);
        return { ok: true, transient: false, detail: 'stub' };
      },
      sleep: async () => undefined,
    });
    expect(out.planned).toBeGreaterThanOrEqual(1);
    expect(out.done).toBe(1);
    expect(executados[0]).toBe('rsssf:1899');
    await prisma.ingestBacklog.deleteMany({
      where: { sourceKey: 'rsssf', competitionQid: 'Q602-SEM-COBERTURA', season: '1899' },
    });
  });

  it('fonte bloqueada não entra no plano mesmo se listada', async () => {
    const out = await planAndRunBacklog(0, {
      prisma,
      sources: () => [
        { sourceKey: 'soccerwiki', competitionQid: 'Q99', seasons: [{ label: '2024' }] },
      ],
      run: async () => ({ ok: true, transient: false, detail: '' }),
      sleep: async () => undefined,
    });
    // soccerwiki: competição não existe na cobertura, mas a trava vem antes de tudo
    expect(out.ran).toBe(0);
    const n = await prisma.ingestBacklog.count({ where: { sourceKey: 'soccerwiki' } });
    expect(n).toBe(0);
  });
});
