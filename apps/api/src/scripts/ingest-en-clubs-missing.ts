/**
 * T449EN — Completa a base de clubes da Inglaterra para o piloto T449a:
 *  1. lê os nomes do RSSSF (England 2022/23);
 *  2. identifica os faltantes vs a base (por nome normalizado);
 *  3. resolve por QID no Wikidata (P31=>futebol, P17 UK/England) — dedup QID;
 *  4. upsert idempotente com proveniência/licença CC0;
 *  5. soft-delete do ruído (`…season` como clube) — nunca hard delete.
 *
 * Uso: tsx src/scripts/ingest-en-clubs-missing.ts [--apply]  (prod: node dist/scripts/...)
 */
import { PrismaClient } from '@prisma/client';
import {
  parseEnglandFinalTables,
  rsssfSeasonUrl,
} from '../modules/etl/connectors/rsssf-tables.connector.js';
import {
  buildEnClubsQuery,
  buildSearchUrl,
  matchByNormalizedName,
  normalizeClubName,
  parseEnClubs,
  pickClubFromSearch,
  wikidataEntityUrl,
  WIKIDATA_EN_DATASOURCE,
  WIKIDATA_LICENSE,
  type EnClub,
} from '../modules/etl/connectors/wikidata-en-clubs.connector.js';
import { fetchWithRetry } from '../lib/http-resilience.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const UA = 'AlmanaqueDosClubes/0.1 (t449en; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const NOISE_QID = 'Q10556336'; // 1964–65 Leeds United A.F.C. season (não é clube)

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetchWithRetry(
    url,
    { headers: { 'user-agent': UA, Accept: 'application/sparql-results+json' } },
    { label: 't449en' },
  );
  return res.json();
}

async function fetchEnClubs(): Promise<EnClub[]> {
  const all: EnClub[] = [];
  for (let offset = 0; offset < 9000; offset += 3000) {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(buildEnClubsQuery(3000, offset))}`;
    const batch = parseEnClubs(await fetchJson(url));
    all.push(...batch);
    console.log(`  wikidata offset=${offset}: ${batch.length}`);
    if (batch.length < 3000) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return all;
}

/** Resolve/cria o Country GB (hierarquia T466) para ligar os clubes EN. */
async function ensureGbCountry(): Promise<{ id: string }> {
  let gb = await prisma.country.findUnique({ where: { iso2: 'GB' }, select: { id: true } });
  if (!gb) {
    gb = await prisma.country.create({
      data: {
        iso2: 'GB',
        name: 'United Kingdom',
        continent: 'EU',
        qid: 'Q145',
        importedFrom: WIKIDATA_EN_DATASOURCE,
        importedAt: new Date(),
        sourceUrl: 'https://www.wikidata.org/wiki/Q145',
      },
      select: { id: true },
    });
  }
  return gb;
}

async function main(): Promise<void> {
  // 1. nomes RSSSF
  const rsssfRes = await fetchWithRetry(
    rsssfSeasonUrl('2023'),
    { headers: { 'user-agent': UA } },
    { label: 't449en-rsssf' },
  );
  const names = [
    ...new Set(
      parseEnglandFinalTables(await rsssfRes.text()).flatMap((t) => t.rows.map((r) => r.club)),
    ),
  ];
  console.log('Nomes RSSSF:', names.length);

  // 2. faltantes vs base
  const existing = await prisma.club.findMany({
    where: { country: 'GB', deletedAt: null },
    select: { name: true },
  });
  const norms = new Set(existing.map((c) => normalizeClubName(c.name)));
  const missingNames = names.filter((n) => !norms.has(normalizeClubName(n)));
  console.log(
    `Casados na base: ${names.length - missingNames.length}/${names.length} · faltantes: ${missingNames.length}`,
  );

  // Fixes de dados (idempotentes; rodam MESMO sem clubes novos): link geo
  // (countryId T466) + soft-delete do ruído.
  if (APPLY) {
    const gbFix = await ensureGbCountry();
    const back = await prisma.club.updateMany({
      where: { country: 'GB', countryId: null, deletedAt: null },
      data: { countryId: gbFix.id },
    });
    const noise = await prisma.club.updateMany({
      where: { qid: NOISE_QID, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    console.log(
      `APPLY fixes: countryId backfill=${back.count} | ruído soft-deleted=${noise.count}`,
    );
  }

  if (!missingNames.length) {
    console.log('Nada a ingerir.');
    return;
  }

  // 3. Wikidata (SPARQL por esporte) + fallback de busca p/ o resto
  const wk = await fetchEnClubs();
  const { matched, missing } = matchByNormalizedName(missingNames, wk);
  const viaSearch: Record<string, string> = {};
  for (const name of missing) {
    const qid = pickClubFromSearch(await fetchJson(buildSearchUrl(name)));
    if (qid) viaSearch[name] = qid;
  }
  const resolved = { ...matched, ...viaSearch };
  const stillMissing = missing.filter((n) => !viaSearch[n]);
  console.log(
    'Resolvidos:',
    Object.keys(resolved).length,
    '· não resolvidos:',
    stillMissing.length,
    stillMissing.join(', '),
  );

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado.');
    return;
  }

  const gb = await ensureGbCountry();

  const now = new Date();
  let created = 0;
  let updated = 0;
  for (const [name, qid] of Object.entries(resolved)) {
    const src = wk.find((c) => c.qid === qid);
    const label = src?.label ?? name;
    const existingClub = await prisma.club.findUnique({ where: { qid }, select: { id: true } });
    if (existingClub) {
      await prisma.club.update({
        where: { qid },
        data: {
          name: label,
          country: 'GB',
          countryId: gb.id,
          foundedYear: src?.foundedYear ?? undefined,
          deletedAt: null,
        },
      });
      updated++;
    } else {
      await prisma.club.create({
        data: {
          name: label,
          country: 'GB',
          countryId: gb.id,
          fullName: label,
          foundedYear: src?.foundedYear ?? null,
          qid,
          importedFrom: WIKIDATA_EN_DATASOURCE,
          importedAt: now,
          sourceUrl: wikidataEntityUrl(qid),
        },
      });
      created++;
    }
  }

  // 5. soft-delete do ruído
  const noise = await prisma.club.updateMany({
    where: { qid: NOISE_QID, deletedAt: null },
    data: { deletedAt: now },
  });

  console.log(
    `APPLY created=${created} updated=${updated} | ruído soft-deleted=${noise.count} | licença=${WIKIDATA_LICENSE}`,
  );
}

const invokedAsScript = /scripts\/ingest-en-clubs-missing\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invokedAsScript) {
  main()
    .catch((err) => {
      console.error('Erro:', (err as Error).message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
