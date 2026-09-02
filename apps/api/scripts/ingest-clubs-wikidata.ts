/**
 * WS-D / M1 — Ingestão de clubes de futebol via Wikidata (fonte aberta, licenciada).
 *
 * Preenche a tabela `clubs` com nomes, país (ISO 3166-1 alpha-2 via P297), cidade
 * e ano de fundação, marcando proveniência: `qid` (Wikidata Q-ID) + `importedFrom='wikidata'`
 * + `importedAt` (a data da ingestão). Idempotente: usa `qid` como chave estável
 * (unique) e `createMany ... skipDuplicates` para não duplicar.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts          # DRY-RUN (não escreve)
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-clubs-wikidata.ts --apply  # grava no banco
 *
 * Reversível: `DELETE FROM clubs WHERE "importedFrom"='wikidata';` (apenas dados importados).
 * Fonte: Wikidata (CC0) — https://www.wikidata.org/wiki/Q476028 (association football club)
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

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

interface ClubRow {
  qid: string;
  name: string;
  country: string | null;
  city: string | null;
  foundedYear: number | null;
}

function qidFrom(uri: string): string {
  const parts = uri.split('/');
  const q = parts[parts.length - 1];
  return q.replace(/^Q/, 'Q');
}

function yearFrom(inception?: string): number | null {
  if (!inception) return null;
  const y = parseInt(inception.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

async function fetchBatch(offset: number): Promise<ClubRow[]> {
  const q = SPARQL + ' LIMIT ' + BATCH + ' OFFSET ' + offset;
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(q) + '&format=json';
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
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
}

async function main(): Promise<void> {
  // 1) Coleta batch, deduplicando por qid (mantém a 1ª ocorrência).
  const byQid = new Map<string, ClubRow>();
  for (let b = 0; b < MAX_BATCHES; b++) {
    const rows = await fetchBatch(b * BATCH);
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.name && !byQid.has(r.qid)) byQid.set(r.qid, r);
    }
    console.log(
      '  batch ' +
        (b + 1) +
        ': +' +
        rows.length +
        ' linhas, acumulado ' +
        byQid.size +
        ' clubes distintos',
    );
    if (byQid.size >= TARGET_MIN) break;
  }

  const clubs = [...byQid.values()].filter((c) => c.name && c.qid);
  console.log('Total de clubes distinctos capturados: ' + clubs.length);

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply para inserir no banco.');
    for (const c of clubs.slice(0, 6))
      console.log(
        '  ' + c.name + ' | ' + (c.country ?? '-') + ' | ' + (c.foundedYear ?? '-') + ' | ' + c.qid,
      );
    return;
  }

  const prisma = new PrismaClient();
  // 2) Idempotência: ignora qids já presentes.
  const qids = clubs.map((c) => c.qid);
  const existing = await prisma.club.findMany({
    where: { qid: { in: qids } },
    select: { qid: true },
  });
  const existingSet = new Set(existing.map((e) => e.qid));
  const toInsert = clubs.filter((c) => !existingSet.has(c.qid));

  // 3) Insert atômico (cria apenas os novos; skipDuplicates protege name+country/qid).
  const res = await prisma.club.createMany({
    data: toInsert.map((c) => ({
      name: c.name,
      country: c.country,
      city: c.city,
      foundedYear: c.foundedYear,
      qid: c.qid,
      importedFrom: 'wikidata',
      importedAt: new Date(),
    })),
    skipDuplicates: true,
  });

  const total = await prisma.club.count();
  const wikidataCount = await prisma.club.count({ where: { importedFrom: 'wikidata' } });
  console.log(
    'APPLY: candidatos=' +
      clubs.length +
      ' | novos=' +
      res.count +
      ' | ja-existentes=' +
      (clubs.length - res.count),
  );
  console.log('CLUBS no banco (total)=' + total + ' | de origem wikidata=' + wikidataCount);
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
