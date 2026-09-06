/**
 * WS-D / M1 — Ingestão de clubes de futebol via Wikidata (fonte aberta, licenciada).
 *
 * Preenche a tabela `clubs` com nomes, país (ISO 3166-1 alpha-2 via P297), cidade
 * e ano de fundação, marcando proveniência: `qid` (Wikidata Q-ID) + `importedFrom='wikidata'`
 * + `importedAt` (a data da ingestão) + `sourceUrl` (URL canônica do item).
 * Idempotente: usa `qid` como chave estável (unique); novos → insert, qid
 * existente com campo mudado → update, resto ignorado; colisões de qid no
 * mesmo lote são logadas (mantém a 1ª ocorrência).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts          # DRY-RUN (não escreve)
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts --apply  # grava no banco
 *
 * Reversível: `DELETE FROM clubs WHERE "importedFrom"='wikidata';` (apenas dados importados).
 * Fonte: Wikidata (CC0) — https://www.wikidata.org/wiki/Q476028 (association football club)
 */
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const APPLY = process.argv.includes('--apply');

const log = pino({ name: 'ingest-clubs-wikidata' });

// T426 — política de robustez: retry com backoff exponencial (3 tentativas:
// 1s, 2s, 4s), timeout de 30s por request, sleep de 2s entre batches
// (rate limit conservador do endpoint SPARQL da Wikidata).
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const BATCH_SLEEP_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function wikidataItemUrl(qid: string): string {
  return `https://www.wikidata.org/wiki/${qid}`;
}

const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata club ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const TARGET_MIN = 1000; // mínimo de clubes distintos desejados
const BATCH = 1000; // linhas por consulta SPARQL
const MAX_BATCHES = 4; // limite de segurança de rodada

const SPARQL = `
SELECT DISTINCT ?club ?clubLabel ?iso ?cityLabel ?inception WHERE {
  ?club wdt:P31/wdt:P279* wd:Q476028 .
  ?club wdt:P17 ?country .
  ?country wdt:P297 ?iso .
  OPTIONAL { ?club wdt:P131 ?city . }
  OPTIONAL { ?club wdt:P571 ?inception . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;

export interface ClubRow {
  qid: string;
  name: string;
  country: string | null;
  city: string | null;
  foundedYear: number | null;
}

export interface ClubCollision {
  qid: string;
  kept: string;
  dropped: string;
}

/**
 * T426 — dedup puro por qid (mantém a 1ª ocorrência). Colisões (mesmo qid com
 * nomes distintos no mesmo lote) são REPORTADAS, não adivinhadas: o chamador
 * decide o que logar; a 1ª ocorrência vence.
 */
export function dedupeClubRows(rows: ClubRow[]): {
  unique: ClubRow[];
  collisions: ClubCollision[];
} {
  const byQid = new Map<string, ClubRow>();
  const collisions: ClubCollision[] = [];
  for (const r of rows) {
    if (!r.name || !r.qid) continue;
    const prev = byQid.get(r.qid);
    if (!prev) {
      byQid.set(r.qid, r);
      continue;
    }
    if (prev.name !== r.name) collisions.push({ qid: r.qid, kept: prev.name, dropped: r.name });
  }
  return { unique: [...byQid.values()], collisions };
}

export type ClubFieldDiff = Partial<Pick<ClubRow, 'name' | 'country' | 'city' | 'foundedYear'>>;

/** Diferença campo a campo entre o registro existente e o incoming (null se iguais). */
export function diffClubFields(existing: ClubRow, incoming: ClubRow): ClubFieldDiff | null {
  const diff: ClubFieldDiff = {};
  if (existing.name !== incoming.name) diff.name = incoming.name;
  if ((existing.country ?? null) !== (incoming.country ?? null)) diff.country = incoming.country;
  if ((existing.city ?? null) !== (incoming.city ?? null)) diff.city = incoming.city;
  if ((existing.foundedYear ?? null) !== (incoming.foundedYear ?? null))
    diff.foundedYear = incoming.foundedYear;
  return Object.keys(diff).length > 0 ? diff : null;
}

export interface ClubSyncPlan {
  toInsert: ClubRow[];
  toUpdate: Array<{ qid: string; diff: ClubFieldDiff }>;
  collisions: ClubCollision[];
}

/** Plano de sync idempotente: novos → insert; qid existente com diff → update; resto ignora. */
export function planClubSync(existing: Map<string, ClubRow>, incoming: ClubRow[]): ClubSyncPlan {
  const { unique, collisions } = dedupeClubRows(incoming);
  const toInsert: ClubRow[] = [];
  const toUpdate: Array<{ qid: string; diff: ClubFieldDiff }> = [];
  for (const row of unique) {
    const prev = existing.get(row.qid);
    if (!prev) {
      toInsert.push(row);
      continue;
    }
    const diff = diffClubFields(prev, row);
    if (diff) toUpdate.push({ qid: row.qid, diff });
  }
  return { toInsert, toUpdate, collisions };
}

export interface NameCollision {
  qid: string;
  name: string;
  country: string | null;
  reason: 'batch-duplicate' | 'exists-in-db';
}

/**
 * T426 — QIDs distintos podem compartilhar (name, country) — que é @@unique
 * no schema (ex.: homônimos, seções amadoras/profissionais com mesmo label).
 * Dedup secundário: 1ª ocorrência vence; demais são REPORTADAS e puladas.
 */
export function dedupeByNameCountry(rows: ClubRow[]): {
  rows: ClubRow[];
  dropped: NameCollision[];
} {
  const seen = new Set<string>();
  const out: ClubRow[] = [];
  const dropped: NameCollision[] = [];
  for (const r of rows) {
    const key = `${r.name}|||${r.country ?? ''}`;
    if (seen.has(key)) {
      dropped.push({ qid: r.qid, name: r.name, country: r.country, reason: 'batch-duplicate' });
      continue;
    }
    seen.add(key);
    out.push(r);
  }
  return { rows: out, dropped };
}

/** Carimbo de proveniência canônico (D-2026-09-07-proveniencia-convencional). */
export function toClubCreate(row: ClubRow, now: Date) {
  return {
    name: row.name,
    country: row.country,
    city: row.city,
    foundedYear: row.foundedYear,
    qid: row.qid,
    sourceUrl: wikidataItemUrl(row.qid),
    importedFrom: 'wikidata',
    importedAt: now,
  };
}

export function qidFrom(uri: string): string {
  const parts = uri.split('/');
  const q = parts[parts.length - 1];
  return q.replace(/^Q/, 'Q');
}

export function yearFrom(inception?: string): number | null {
  if (!inception) return null;
  const y = parseInt(inception.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export async function fetchBatch(offset: number): Promise<ClubRow[]> {
  const q = SPARQL + ' LIMIT ' + BATCH + ' OFFSET ' + offset;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(q) + '&format=json';
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: { 'user-agent': USER_AGENT, Accept: 'application/sparql-results+json' },
        },
        REQUEST_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error('SPARQL HTTP ' + res.status);
      const j = (await res.json()) as {
        results?: { bindings?: Array<Record<string, { value: string }>> };
      };
      return (j.results?.bindings ?? []).map((b) => ({
        qid: qidFrom(b.club?.value ?? ''),
        name: b.clubLabel?.value ?? '',
        country: b.iso?.value ? b.iso.value.toUpperCase() : null,
        city: b.cityLabel?.value ?? null,
        foundedYear: yearFrom(b.inception?.value),
      }));
    } catch (err) {
      lastError = err;
      if (attempt === RETRY_DELAYS_MS.length) break;
      const delay = RETRY_DELAYS_MS[attempt];
      log.warn(
        { offset, attempt: attempt + 1, delayMs: delay, err: (err as Error).message },
        'SPARQL batch failed — retrying',
      );
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('SPARQL fetch failed');
}

async function main(): Promise<void> {
  // 1) Coleta batches (linhas brutas); dedup + colisões resolvidos em seguida.
  const allRows: ClubRow[] = [];
  for (let b = 0; b < MAX_BATCHES; b++) {
    const rows = await fetchBatch(b * BATCH);
    if (rows.length === 0) break;
    allRows.push(...rows);
    const distinct = dedupeClubRows(allRows).unique.length;
    console.log(
      '  batch ' + (b + 1) + ': +' + rows.length + ' linhas, ' + distinct + ' clubes distintos',
    );
    if (distinct >= TARGET_MIN) break;
    if (b + 1 < MAX_BATCHES) await sleep(BATCH_SLEEP_MS);
  }

  const { unique: clubs, collisions } = dedupeClubRows(allRows);
  console.log(
    'Total de clubes distintos capturados: ' +
      clubs.length +
      ' | colisões de qid: ' +
      collisions.length,
  );
  for (const c of collisions.slice(0, 10)) log.warn(c, 'qid collision — kept first occurrence');

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply para inserir no banco.');
    for (const c of clubs.slice(0, 6))
      console.log(
        '  ' + c.name + ' | ' + (c.country ?? '-') + ' | ' + (c.foundedYear ?? '-') + ' | ' + c.qid,
      );
    return;
  }

  const prisma = new PrismaClient();
  // 2) Plano idempotente contra o estado atual do banco.
  const qids = clubs.map((c) => c.qid);
  const existing = await prisma.club.findMany({
    where: { qid: { in: qids } },
    select: {
      qid: true,
      name: true,
      country: true,
      city: true,
      foundedYear: true,
      sourceUrl: true,
    },
  });
  const existingMap = new Map<string, ClubRow>(
    existing.map((e) => [
      e.qid as string,
      {
        qid: e.qid as string,
        name: e.name,
        country: e.country,
        city: e.city,
        foundedYear: e.foundedYear,
      },
    ]),
  );
  const plan = planClubSync(existingMap, clubs);
  const now = new Date();

  // 3) Insert dos novos. Sem `skipDuplicates` (opção inexistente no SQLite):
  // a idempotência vem do plano (planClubSync exclui qids já presentes) +
  // do dedup secundário por (name, country) — @@unique no schema.
  const nameDedup = dedupeByNameCountry(plan.toInsert);
  const dropped: NameCollision[] = [...nameDedup.dropped];
  let finalInsert = nameDedup.rows;
  if (finalInsert.length > 0) {
    const pairs = await prisma.club.findMany({
      where: { name: { in: [...new Set(finalInsert.map((c) => c.name))] } },
      select: { name: true, country: true },
    });
    const taken = new Set(pairs.map((p) => `${p.name}|||${p.country ?? ''}`));
    finalInsert = finalInsert.filter((c) => {
      const clash = taken.has(`${c.name}|||${c.country ?? ''}`);
      if (clash)
        dropped.push({ qid: c.qid, name: c.name, country: c.country, reason: 'exists-in-db' });
      return !clash;
    });
  }
  for (const d of dropped.slice(0, 10))
    log.warn(d, 'name-country collision — row skipped (@@unique)');
  const res = await prisma.club.createMany({
    data: finalInsert.map((c) => toClubCreate(c, now)),
  });

  // 4) Update dos existentes cujo dado mudou na fonte (mesmo qid = mesma entidade),
  // mais backfill de sourceUrl onde ele ainda é NULL (auto-reparo pós-restore).
  const missingUrl = new Set(existing.filter((e) => !e.sourceUrl).map((e) => e.qid as string));
  let updated = 0;
  for (const u of plan.toUpdate) {
    await prisma.club.update({
      where: { qid: u.qid },
      data: {
        ...u.diff,
        ...(missingUrl.has(u.qid) ? { sourceUrl: wikidataItemUrl(u.qid) } : {}),
      },
    });
    updated++;
  }
  let backfilled = 0;
  const updateQids = new Set(plan.toUpdate.map((u) => u.qid));
  for (const qid of missingUrl) {
    if (updateQids.has(qid)) continue; // já tratado acima
    await prisma.club.update({
      where: { qid },
      data: { sourceUrl: wikidataItemUrl(qid) },
    });
    backfilled++;
  }

  const total = await prisma.club.count();
  const wikidataCount = await prisma.club.count({ where: { importedFrom: 'wikidata' } });
  log.info(
    {
      candidatos: clubs.length,
      novos: res.count,
      atualizados: updated,
      backfilled,
      colisoes: plan.collisions.length,
      conflitosNameCountry: dropped.length,
    },
    'sync concluído',
  );
  console.log(
    'APPLY: candidatos=' +
      clubs.length +
      ' | novos=' +
      res.count +
      ' | atualizados=' +
      updated +
      ' | backfilled-url=' +
      backfilled +
      ' | conflitos-name-country=' +
      dropped.length +
      ' | sem-mudanca=' +
      (clubs.length - res.count - updated - backfilled - dropped.length),
  );
  console.log('CLUBS no banco (total)=' + total + ' | de origem wikidata=' + wikidataCount);
}

// Guarda de importação: em testes (vitest) o módulo é importado sem executar.
const invokedAsScript = (process.argv[1] ?? '')
  .replace(/\\/g, '/')
  .endsWith('scripts/ingest-clubs-wikidata.ts');
if (invokedAsScript) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
