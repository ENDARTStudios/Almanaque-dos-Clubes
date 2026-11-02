/**
 * T603 — SISTEMA DE BOTS: execução e registro.
 *
 * ── A IDEIA CENTRAL ───────────────────────────────────────────────────────────────
 * Um bot que "roda sem erro" pode não ter trazido nada (a fonte não publica). Então
 * toda rodada mede a MÉTRICA do domínio ANTES e DEPOIS e grava o delta. É o mesmo
 * erro que custou uma rodada inteira no t602 ("DONE" sem dado): aqui ele vira dado
 * visível no painel.
 *
 * ── HONESTIDADE ───────────────────────────────────────────────────────────────────
 * - `SUCCESS` com `delta <= 0` é legítimo (rodou, não havia o que trazer) — o painel
 *   mostra "sem ganho", não "sucesso" sozinho;
 * - `TIMEOUT` e `FAILED` ficam registrados com o motivo;
 * - dry-run é o default: sem `apply`, nenhum bot que grava é executado.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';
import type { BotDefinition } from './registry.js';

/** Teto por rodada individual (scripts de lote têm limite próprio; isto é o freio). */
export const BOT_TIMEOUT_MS = 20 * 60 * 1000;

export interface BotRunResult {
  botKey: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'SKIPPED_DRY_RUN';
  durationMs: number;
  metricBefore: number | null;
  metricAfter: number | null;
  delta: number | null;
  error: string | null;
}

async function readMetric(prisma: PrismaClient, sql: string): Promise<number | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint | number }>>(
      `SELECT (${sql}) AS n`,
    );
    const n = rows[0]?.n;
    return n === undefined || n === null ? null : Number(n);
  } catch {
    return null; // métrica indisponível não derruba a rodada
  }
}

function spawnScript(script: string, args: string[]): Promise<{ code: number; out: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const full = join(here, '..', '..', 'scripts', script);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [full, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const collect = (c: Buffer) => {
      out += c.toString();
      if (out.length > 20_000) out = out.slice(-20_000);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, BOT_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
  });
}

/**
 * Executa um bot e registra a rodada. `apply=false` NÃO executa bot que grava —
 * registra SKIPPED_DRY_RUN para o painel deixar claro que a fila está parada.
 */
export async function runBot(
  prisma: PrismaClient,
  bot: BotDefinition,
  opts: { apply: boolean; triggeredBy?: string } = { apply: false },
): Promise<BotRunResult> {
  if (bot.writes && !opts.apply) {
    const skipped: BotRunResult = {
      botKey: bot.key,
      status: 'SKIPPED_DRY_RUN',
      durationMs: 0,
      metricBefore: null,
      metricAfter: null,
      delta: null,
      error: 'bot grava no acervo; apply=false (dry-run)',
    };
    await prisma.botRun.create({
      data: {
        botKey: bot.key,
        status: skipped.status,
        error: skipped.error,
        triggeredBy: opts.triggeredBy ?? 'schedule',
      },
    });
    return skipped;
  }

  const started = Date.now();
  const before = await readMetric(prisma, bot.metric);
  const args = [...bot.args, ...(bot.writes ? ['--apply', '--allow-production'] : [])];
  const { code, out } = await spawnScript(bot.script, args);

  // A métrica pode demorar a refletir (cache/transação): lê uma vez, direto.
  const after = await readMetric(prisma, bot.metric);
  const durationMs = Date.now() - started;
  const delta = before !== null && after !== null ? after - before : null;
  const timedOut = /timeout/i.test(out.slice(-400)) && code !== 0;
  const status: BotRunResult['status'] = code === 0 ? 'SUCCESS' : timedOut ? 'TIMEOUT' : 'FAILED';

  await prisma.botRun.create({
    data: {
      botKey: bot.key,
      status,
      finishedAt: new Date(),
      durationMs,
      metricBefore: before,
      metricAfter: after,
      delta,
      error: code === 0 ? null : out.slice(-500),
      triggeredBy: opts.triggeredBy ?? 'schedule',
    },
  });

  logger.info({ bot: bot.key, status, durationMs, before, after, delta }, 'bot: rodada registrada');
  return {
    botKey: bot.key,
    status,
    durationMs,
    metricBefore: before,
    metricAfter: after,
    delta,
    error: code === 0 ? null : out.slice(-300),
  };
}
