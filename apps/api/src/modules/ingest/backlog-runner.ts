/**
 * T602 — RUNNER da ingestão contínua (chamado pelo scheduler, sem operador).
 *
 * Diferença em relação ao CLI: aqui NÃO há flag de produção — o job roda em
 * produção por definição, e a garantia vem do desenho: teto de itens por rodada,
 * um item por vez, pausa entre requisições, falha transitória de volta à fila.
 *
 * O `planAndRunBacklog` faz as duas metades numa execução:
 *   1. PLANEJA (cobertura × temporadas publicadas) e enfileira o que falta;
 *   2. CONSOME até `limit` itens PENDING.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { buildCoverageMatrix } from '../coverage/coverage.service.js';
import { closeItem, nextBatch, planBacklog, syncBacklog, type CoverageStat } from './backlog.js';
import { isAutomationAllowed } from './source-registry.js';
import { logger } from '../../config/logger.js';

/** Pausa entre itens (rate limit é por rajada — lição T528). */
const PAUSE_MS = 1500;

/** Representação mínima da fonte que o runner precisa (injetável para teste). */
export interface RunnerSource {
  sourceKey: string;
  competitionQid: string;
  seasons: Array<{ label: string }>;
}

export interface RunnerDeps {
  prisma: PrismaClient;
  /** Temporadas publicadas por fonte (em produção vem de SOURCES do seeder). */
  sources: () => Promise<RunnerSource[]> | RunnerSource[];
  /** Executa um item e devolve o resultado, já com a classificação transitória. */
  run: (item: { sourceKey: string; season: string }) => Promise<{
    ok: boolean;
    transient: boolean;
    detail: string;
  }>;
  sleep?: (ms: number) => Promise<void>;
}

export interface BacklogRunResult {
  planned: number;
  created: number;
  ran: number;
  done: number;
  failed: number;
}

/**
 * Orquestra plano + consumo. Tudo idempotente: reexecutar não duplica item nem
 * reabre DONE. A fonte bloqueada não entra nem no plano.
 */
export async function planAndRunBacklog(
  limit: number,
  deps: RunnerDeps,
): Promise<BacklogRunResult> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const sources = (await deps.sources()).filter((s) => isAutomationAllowed(s.sourceKey));

  const matrix = await buildCoverageMatrix(false);
  const coverage: CoverageStat[] = matrix.rows.map((r) => ({
    qid: r.qid,
    year: r.year,
    matchesTotal: r.matchesTotal,
    matchesWithScore: r.matchesWithScore,
    matchesWithScorers: r.matchesWithScorers,
  }));

  const items = planBacklog(sources, coverage);
  const sync = await syncBacklog(deps.prisma, items);
  logger.info({ planned: items.length, ...sync }, 'ingest-backlog: plano sincronizado');

  const lote = await nextBatch(deps.prisma, limit);
  let done = 0;
  let failed = 0;
  for (const item of lote) {
    await deps.prisma.ingestBacklog.update({
      where: { id: item.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    const outcome = await deps.run({ sourceKey: item.sourceKey, season: item.season });
    await closeItem(deps.prisma, item.id, outcome);
    if (outcome.ok) done += 1;
    else failed += 1;
    await sleep(PAUSE_MS);
  }

  return {
    planned: items.length,
    created: sync.created,
    ran: lote.length,
    done,
    failed,
  };
}

/**
 * Temporadas publicadas por fonte AUTORIZADA. Importa o registro do seeder
 * (`SOURCES`) — fonte bloqueada nem chega a virar candidata.
 */
export async function sourceSeasonRefs(): Promise<RunnerSource[]> {
  const { SOURCES } = await import('../../scripts/seed-matches-rsssf.js');
  return Object.entries(SOURCES)
    .filter(([key]) => isAutomationAllowed(key))
    .map(([key, spec]) => ({
      sourceKey: key,
      competitionQid: spec.competitionQid,
      seasons: spec.seasons.map((season) => ({ label: season.label })),
    }));
}

/**
 * Executa um item: spawn do seeder (lista de args, nunca shell). `ok` só com exit
 * 0; erro de rede/429/redeploy vira falha TRANSITÓRIA.
 */
export async function runIngestItem(item: {
  sourceKey: string;
  season: string;
}): Promise<{ ok: boolean; transient: boolean; detail: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const script = join(here, '..', '..', 'scripts', 'seed-matches-rsssf.js');
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [script, `--source=${item.sourceKey}`, `--seasons=${item.season}`, '--apply'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    const collect = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.length > 20_000) out = out.slice(-20_000);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.on('close', (code) => {
      const code_ = code ?? 1;
      const transitorio = /HTTP (429|5\d\d)|ECONNRESET|ETIMEDOUT|fetch failed/i.test(out);
      resolve(
        code_ === 0
          ? { ok: true, transient: false, detail: out.slice(-300) }
          : { ok: false, transient: transitorio, detail: `exit=${code_} · ${out.slice(-300)}` },
      );
    });
  });
}

/** Dependências de produção do runner (usado pelo job agendado). */
export function defaultRunnerDeps(prisma: PrismaClient): RunnerDeps {
  return { prisma, sources: sourceSeasonRefs, run: runIngestItem };
}
