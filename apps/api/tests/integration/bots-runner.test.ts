/**
 * T603 — runner de bots com Prisma real: o registro prova "rodou" e "rendeu".
 *
 * O caso que motivou: no t602 um bot terminou DONE e o acervo não mudou. Aqui o
 * `delta` é campo de banco — se for 0, o painel mostra 0.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { runBot } from '../../src/modules/bots/runner.js';
import type { BotDefinition } from '../../src/modules/bots/registry.js';

let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const BOT_KEY = `test-t603-${Date.now()}`;

const botNoop: BotDefinition = {
  key: BOT_KEY,
  domain: 'catalogo',
  label: 'Bot de teste (noop)',
  script: 'legends-rebuild.js', // script leve, sem escrita de dados
  args: [],
  cadenceHours: 24,
  sources: [],
  writes: false,
  metric: `SELECT count(*)::bigint FROM countries`,
};

const botQueGrava: BotDefinition = {
  ...botNoop,
  key: `${BOT_KEY}-w`,
  writes: true,
};

beforeAll(async () => {
  if (!isPostgres) return;
  try {
    await prisma.botRun.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
  }
});

afterAll(async () => {
  if (dbOk && isPostgres)
    await prisma.botRun.deleteMany({ where: { botKey: { in: [BOT_KEY, `${BOT_KEY}-w`] } } });
});

describe.skipIf(!dbOk || !isPostgres)('T603 — runner de bots', () => {
  it('bot que grava NÃO roda em dry-run: registra SKIPPED_DRY_RUN', async () => {
    const r = await runBot(prisma, botQueGrava, { apply: false });
    expect(r.status).toBe('SKIPPED_DRY_RUN');
    const row = await prisma.botRun.findFirst({ where: { botKey: botQueGrava.key } });
    expect(row?.status).toBe('SKIPPED_DRY_RUN');
  });

  it('rodada real grava métrica antes/depois e delta', async () => {
    const r = await runBot(prisma, botNoop, { apply: true, triggeredBy: 'test' });
    expect(['SUCCESS', 'FAILED']).toContain(r.status);
    expect(r.metricBefore).not.toBeNull();
    expect(r.metricAfter).not.toBeNull();
    expect(r.delta).toBe(r.metricAfter! - r.metricBefore!);
    const row = await prisma.botRun.findFirst({ where: { botKey: BOT_KEY } });
    expect(row?.triggeredBy).toBe('test');
    expect(row?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('métrica inválida não derruba a rodada (delta null)', async () => {
    const r = await runBot(
      prisma,
      { ...botNoop, key: `${BOT_KEY}-m`, metric: 'SELECT nao_existe()' },
      { apply: true },
    );
    expect(r.metricBefore).toBeNull();
    expect(r.delta).toBeNull();
    await prisma.botRun.deleteMany({ where: { botKey: `${BOT_KEY}-m` } });
  });
});
