/**
 * WS-D / M1 — Ingestão de competições de futebol via Wikidata (fonte aberta).
 *
 * Popula `competitions` com nome, país (ISO via P297), ano de início/fim opcionais,
 * marcando proveniência (`qid` + `importedFrom='wikidata'` + `importedAt`). Idempotente
 * (dedup por `qid` unique; `createMany ... skipDuplicates`). type fica null por ora
 * (refinar LEAGUE/CUP/TOURNAMENT num round de enriquecimento).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-competitions-wikidata.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-competitions-wikidata.ts --apply  # grava
 *
 * Reversível: `DELETE FROM competitions WHERE "importedFrom"='wikidata';`
 * Classe-alvo (Q15991303, "association football league" + subclasses).
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata competition ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const TARGET_MIN = 500;
const BATCH = 1000;
const MAX_BATCHES = 4;

const SPARQL = `
SELECT DISTINCT ?comp ?compLabel ?iso ?start ?end WHERE {
  ?comp wdt:P31/wdt:P279* wd:Q15991303 .
  OPTIONAL { ?comp wdt:P17 ?country . ?country wdt:P297 ?iso . }
  OPTIONAL { ?comp wdt:P580 ?start . }
  OPTIONAL { ?comp wdt:P582 ?end . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;

interface CompRow {
  qid: string;
  name: string;
  country: string | null;
  startYear: number | null;
  endYear: number | null;
}

function qidFrom(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1].replace(/^Q/, 'Q');
}
function yearFrom(v?: string): number | null {
  if (!v) return null;
  const y = parseInt(v.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
function isQidLabel(l: string): boolean {
  return /^Q\d+$/.test(l);
}

async function fetchBatch(offset: number): Promise<CompRow[]> {
  const q = SPARQL + ' LIMIT ' + BATCH + ' OFFSET ' + offset;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(q) + '&format=json';
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error('SPARQL HTTP ' + res.status);
  const j = (await res.json()) as {
    results?: { bindings?: Array<Record<string, { value: string }>> };
  };
  return (j.results?.bindings ?? [])
    .filter((b) => b.comp?.value && b.compLabel?.value && !isQidLabel(b.compLabel.value))
    .map((b) => ({
      qid: qidFrom(b.comp.value),
      name: b.compLabel.value,
      country: b.iso?.value ? b.iso.value.toUpperCase() : null,
      startYear: yearFrom(b.start?.value),
      endYear: yearFrom(b.end?.value),
    }));
}

async function main(): Promise<void> {
  const byQid = new Map<string, CompRow>();
  for (let b = 0; b < MAX_BATCHES; b++) {
    const rows = await fetchBatch(b * BATCH);
    if (rows.length === 0) break;
    for (const r of rows) if (!byQid.has(r.qid)) byQid.set(r.qid, r);
    console.log('  batch ' + (b + 1) + ': +' + rows.length + ', acumulado ' + byQid.size);
    if (byQid.size >= TARGET_MIN) break;
  }
  const comps = [...byQid.values()].filter((c) => c.name && c.qid);
  console.log('Total de competições distintas: ' + comps.length);

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply para inserir.');
    for (const c of comps.slice(0, 6))
      console.log(
        '  ' + c.name + ' | ' + (c.country ?? '-') + ' | ' + (c.startYear ?? '-') + ' | ' + c.qid,
      );
    return;
  }

  const prisma = new PrismaClient();
  const qids = comps.map((c) => c.qid);
  const existing = await prisma.competition.findMany({
    where: { qid: { in: qids } },
    select: { qid: true },
  });
  const existingSet = new Set(existing.map((e) => e.qid));
  const toInsert = comps.filter((c) => !existingSet.has(c.qid));

  const res = await prisma.competition.createMany({
    data: toInsert.map((c) => ({
      name: c.name,
      country: c.country,
      qid: c.qid,
      importedFrom: 'wikidata',
      importedAt: new Date(),
    })),
    skipDuplicates: true,
  });

  const total = await prisma.competition.count();
  const wd = await prisma.competition.count({ where: { importedFrom: 'wikidata' } });
  console.log(
    'APPLY: candidatos=' +
      comps.length +
      ' | novos=' +
      res.count +
      ' | ja-existentes=' +
      (comps.length - res.count),
  );
  console.log('COMPETITIONS total=' + total + ' | wikidata=' + wd);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
