/**
 * T602 — CLI da FILA DE INGESTÃO CONTÍNUA.
 *
 *   node dist/scripts/ingest-backlog.js --plan            # descobre o que falta e enfileira
 *   node dist/scripts/ingest-backlog.js --plan --dry-run  # mostra o plano sem gravar
 *   node dist/scripts/ingest-backlog.js --run --limit=2 --apply --allow-production
 *   node dist/scripts/ingest-backlog.js --status          # estado da fila
 *
 * Duas metades: `--plan` (comparação cobertura × temporadas publicadas pela fonte) e
 * `--run` (consome N itens, um por vez, com pausa). O job agendado chama as duas.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { SOURCES } from './seed-matches-rsssf.js';
import { buildCoverageMatrix } from '../modules/coverage/coverage.service.js';
import {
  closeItem,
  nextBatch,
  planBacklog,
  syncBacklog,
  type CoverageStat,
  type ItemOutcome,
  type SourceSeasonRef,
} from '../modules/ingest/backlog.js';
import { isAutomationAllowed } from '../modules/ingest/source-registry.js';

/** Pausa entre itens: rate limit é por rajada (lição T528). */
const PAUSE_BETWEEN_ITEMS_MS = 1500;

function argValue(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

/** Temporadas publicadas por fonte, no formato do planejador. */
export function sourceSeasonRefs(): SourceSeasonRef[] {
  return Object.entries(SOURCES)
    .filter(([key]) => isAutomationAllowed(key))
    .map(([key, spec]) => ({
      sourceKey: key,
      competitionQid: spec.competitionQid,
      seasons: spec.seasons.map((s) => ({ label: s.label })),
    }));
}

function runSeeder(sourceKey: string, season: string): Promise<{ code: number; tail: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const script = join(here, 'seed-matches-rsssf.js');
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [script, `--source=${sourceKey}`, `--seasons=${season}`, '--apply'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    const collect = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.length > 20_000) out = out.slice(-20_000);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.on('close', (code) => resolve({ code: code ?? 1, tail: out }));
  });
}

/**
 * Executa um item: spawn do seeder. `ok` só com exit 0 E sem erro de rede
 * reconhecível no output — o redeploy/429 vira falha transitória, não conclusão.
 */
export async function runItem(item: { sourceKey: string; season: string }): Promise<ItemOutcome> {
  const r = await runSeeder(item.sourceKey, item.season);
  const transitório = /HTTP (429|5\d\d)|ECONNRESET|ETIMEDOUT|fetch failed/i.test(r.tail);
  if (r.code === 0) return { ok: true, transient: false, detail: r.tail.slice(-300) };
  return {
    ok: false,
    transient: transitório,
    detail: `exit=${r.code} · ${r.tail.slice(-300)}`,
  };
}

async function doPlan(prisma: PrismaClient, dryRun: boolean): Promise<void> {
  const matrix = await buildCoverageMatrix(false);
  const coverage: CoverageStat[] = matrix.rows.map((r) => ({
    qid: r.qid,
    year: r.year,
    matchesTotal: r.matchesTotal,
    matchesWithScore: r.matchesWithScore,
    matchesWithScorers: r.matchesWithScorers,
  }));
  const items = planBacklog(sourceSeasonRefs(), coverage);
  console.log(`\nPLANO: ${items.length} item(ns) a ingerir`);
  for (const i of items.slice(0, 40)) {
    console.log(`  ${i.sourceKey.padEnd(6)} ${i.seasonLabel.padEnd(8)} ${i.reason}`);
  }
  if (items.length > 40) console.log(`  … +${items.length - 40}`);
  if (dryRun) {
    console.log('\nDRY-RUN: nada gravado.');
    return;
  }
  const out = await syncBacklog(prisma, items);
  console.log(
    `\nFila: ${out.created} criado(s) · ${out.requeued} re-enfileirado(s) · ${out.skipped} já existente(s)`,
  );
}

async function doRun(prisma: PrismaClient, limit: number, apply: boolean): Promise<void> {
  const lote = await nextBatch(prisma, limit);
  if (lote.length === 0) {
    console.log('Fila vazia (nada PENDING abaixo do teto de tentativas).');
    return;
  }
  console.log(`\nExecutando ${lote.length} item(ns)…`);
  for (const item of lote) {
    await prisma.ingestBacklog.update({
      where: { id: item.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    console.log(`▶ ${item.sourceKey} ${item.season} (${item.reason})`);
    if (!apply) {
      // Sem --apply: devolve à fila sem consumir tentativa (simulação honesta).
      await prisma.ingestBacklog.update({
        where: { id: item.id },
        data: { status: 'PENDING' },
      });
      console.log('  DRY-RUN: item devolvido à fila.');
      continue;
    }
    const outcome = await runItem({ sourceKey: item.sourceKey, season: item.season });
    await closeItem(prisma, item.id, outcome);
    console.log(
      `  ${outcome.ok ? 'DONE' : outcome.transient ? 'PENDING (transitório)' : 'FAILED'}`,
    );
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_ITEMS_MS));
  }
}

async function doStatus(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.ingestBacklog.groupBy({
    by: ['status'],
    _count: { _all: true },
    orderBy: { status: 'asc' },
  });
  console.log('\nFILA DE INGESTÃO — por status:');
  for (const r of rows) console.log(`  ${r.status.padEnd(9)} ${r._count._all}`);
  const falhas = await prisma.ingestBacklog.findMany({
    where: { status: 'FAILED' },
    select: { sourceKey: true, season: true, attempts: true, lastError: true },
    take: 10,
  });
  if (falhas.length > 0) {
    console.log('\nFalhas (amostra):');
    for (const f of falhas)
      console.log(`  ${f.sourceKey} ${f.season} · tentativas=${f.attempts} · ${f.lastError ?? ''}`);
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const allowProduction = process.argv.includes('--allow-production');
  const limit = Number(argValue('limit') ?? '2');

  if (!(process.env.DATABASE_URL ?? '').startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    if (process.argv.includes('--plan')) await doPlan(prisma, !apply);
    if (process.argv.includes('--run')) await doRun(prisma, limit, apply);
    if (process.argv.includes('--status')) await doStatus(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  /ingest-backlog\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
