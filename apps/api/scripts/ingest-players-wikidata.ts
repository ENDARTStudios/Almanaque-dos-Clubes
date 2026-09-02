/**
 * WS-D — Ingestão de jogadores de futebol via Wikidata (notáveis, com artigo na en-wiki).
 *
 * Estratégia em 2 passos para não estourar o timeout do SPARQL:
 *  1) SPARQL (sem o pesado serviço de label do player) → QID + país (ISO) + nascimento + posição, em batches;
 *  2) labels (nome) via API `wbgetentities` (50 por chamada).
 *
 * Popula `players` com fullName, country, birthDate, position, qid (unique),
 * importedFrom='wikidata', importedAt. Idempotente; SKIP duplicados.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-players-wikidata.ts          # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-players-wikidata.ts --apply
 *
 * Reversível: `DELETE FROM players WHERE "importedFrom"='wikidata';`
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata player ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const TARGET_MIN = 2000;
const BATCH = 1000;
const MAX_BATCHES = 3;

const SPARQL = `
SELECT DISTINCT ?player ?iso ?dob ?posLabel WHERE {
  ?player wdt:P106 wd:Q937857 .
  ?article schema:about ?player . ?article schema:isPartOf <https://en.wikipedia.org/> .
  ?player wdt:P27 ?country . ?country wdt:P297 ?iso .
  OPTIONAL { ?player wdt:P569 ?dob . }
  OPTIONAL { ?player wdt:P413 ?pos . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }
}
`;

interface PlayerRow {
  qid: string;
  country: string | null;
  birthDate: Date | null;
  position: string | null;
}

function qidFrom(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1].replace(/^Q/, 'Q');
}
function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchBatch(offset: number): Promise<PlayerRow[]> {
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
    .filter((b) => b.player?.value)
    .map((b) => ({
      qid: qidFrom(b.player.value),
      country: b.iso?.value ? b.iso.value.toUpperCase() : null,
      birthDate: parseDate(b.dob?.value),
      position: b.posLabel?.value ?? null,
    }));
}

async function fetchNames(qids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' +
      encodeURIComponent(batch.join('|')) +
      '&props=labels&languages=en&format=json';
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error('Wikidata API HTTP ' + res.status);
    const j = (await res.json()) as {
      entities?: Record<string, { labels?: Record<string, { value: string }> }>;
    };
    for (const [qid, ent] of Object.entries(j.entities ?? {})) {
      const label = ent.labels?.en?.value;
      if (label) map.set(qid, label);
    }
  }
  return map;
}

async function main(): Promise<void> {
  const byQid = new Map<string, PlayerRow>();
  for (let b = 0; b < MAX_BATCHES; b++) {
    const rows = await fetchBatch(b * BATCH);
    if (rows.length === 0) break;
    for (const r of rows) if (!byQid.has(r.qid)) byQid.set(r.qid, r);
    console.log('  batch ' + (b + 1) + ': +' + rows.length + ', acumulado ' + byQid.size);
    if (byQid.size >= TARGET_MIN) break;
  }
  const qids = [...byQid.keys()];
  console.log('Fetching nomes para ' + qids.length + ' jogadores...');
  const names = await fetchNames(qids);
  const players = qids
    .map((qid) => ({ qid, name: names.get(qid) ?? null, ...byQid.get(qid)! }))
    .filter((p) => p.name);
  console.log('Jogadores distintos com nome: ' + players.length);

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply.');
    for (const p of players.slice(0, 5))
      console.log(
        '  ' +
          p.name +
          ' | ' +
          (p.country ?? '-') +
          ' | ' +
          (p.birthDate ? p.birthDate.getUTCFullYear() : '-') +
          ' | ' +
          (p.position ?? '-') +
          ' | ' +
          p.qid,
      );
    return;
  }

  const prisma = new PrismaClient();
  const existing = await prisma.player.findMany({
    where: { qid: { in: qids } },
    select: { qid: true },
  });
  const existingSet = new Set(existing.map((e) => e.qid));
  const toInsert = players.filter((p) => !existingSet.has(p.qid));

  const res = await prisma.player.createMany({
    data: toInsert.map((p) => ({
      fullName: p.name,
      country: p.country,
      birthDate: p.birthDate,
      position: p.position,
      qid: p.qid,
      importedFrom: 'wikidata',
      importedAt: new Date(),
    })),
    skipDuplicates: true,
  });

  const total = await prisma.player.count();
  const wd = await prisma.player.count({ where: { importedFrom: 'wikidata' } });
  console.log(
    'APPLY: candidatos=' +
      players.length +
      ' | novos=' +
      res.count +
      ' | ja-existentes=' +
      (players.length - res.count),
  );
  console.log('PLAYERS total=' + total + ' | wikidata=' + wd);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
