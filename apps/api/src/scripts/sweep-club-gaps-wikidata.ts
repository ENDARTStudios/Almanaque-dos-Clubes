/**
 * T450 mega-sweep — lacunas de clubes via UM SPARQL consolidado (Wikidata CC0).
 *
 * Preenche ZERO-OVERWRITE: foundedYear (P571), city (P131 label), latitude/
 * longitude (P625), website (P856) para clubes do acervo com QID e campo vazio.
 * Nada de rankings; nada de identidade (QID já no acervo).
 *
 * Uso: tsx dist/scripts/sweep-club-gaps-wikidata.js [--apply] [--limit=N]
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || 5000;
const UA = 'AlmanaqueDosClubes-ETL/3.0 (github.com/ENDARTStudios/Almanaque-dos-Clubes)';

const SPARQL = `
SELECT ?qid ?found ?cityLabel ?coord ?site WHERE {
  VALUES ?qid { %QIDS% }
  OPTIONAL { ?qid wdt:P571 ?found. }
  OPTIONAL { ?qid wdt:P159/wdt:P131 ?city. }
  OPTIONAL { ?qid wdt:P625 ?coord. }
  OPTIONAL { ?qid wdt:P856 ?site. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
`;

async function main(): Promise<void> {
  console.log(`mega-sweep club gaps (${APPLY ? 'APPLY' : 'DRY-RUN'})`);
  const clubs = await prisma.club.findMany({
    where: {
      deletedAt: null,
      qid: { not: null },
      OR: [{ foundedYear: null }, { city: null }, { latitude: null }, { website: null }],
    },
    select: { id: true, qid: true, foundedYear: true, city: true, latitude: true, website: true },
    take: LIMIT,
    orderBy: { id: 'asc' },
  });
  console.log(`alvos (qid + ≥1 campo vazio): ${clubs.length}`);
  const byQid = new Map(clubs.map((c) => [c.qid!, c]));
  const qids = [...byQid.keys()];
  console.log(`consultas SPARQL: ${Math.ceil(qids.length / 200)} lotes de 200`);

  let updated = 0;
  let withFound = 0;
  let withCity = 0;
  let withCoord = 0;
  let withSite = 0;

  for (let i = 0; i < qids.length; i += 200) {
    const batch = qids.slice(i, i + 200);
    const q = SPARQL.replace('%QIDS%', batch.map((q) => `wd:${q}`).join(' '));
    const url = `https://query.wikidata.org/sparql?format=json&query=` + encodeURIComponent(q);
    let rows: Array<Record<string, { value: string }>> = [];
    for (;;) {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'application/sparql-results+json' },
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }
      if (!res.ok) throw new Error(`WDQS HTTP ${res.status}`);
      const d = (await res.json()) as {
        results: { bindings: Array<Record<string, { value: string }>> };
      };
      rows = d.results.bindings;
      break;
    }
    await new Promise((r) => setTimeout(r, 1200)); // cortesia WDQS

    for (const row of rows) {
      const qid = row.qid?.value.split('/').pop();
      const club = qid ? byQid.get(qid) : undefined;
      if (!club) continue;
      const patch: Record<string, unknown> = {};
      const meta =
        {
          ...((club as unknown as { metadata?: object }).metadata as Record<
            string,
            unknown
          > | null),
        } ?? {};
      if (club.foundedYear == null && row.found?.value) {
        const y = row.found.value.slice(0, 4);
        if (/^\d{4}$/.test(y) && Number(y) > 1800 && Number(y) <= new Date().getFullYear()) {
          patch.foundedYear = Number(y);
          withFound++;
        }
      }
      if (!club.city && row.cityLabel?.value) {
        patch.city = row.cityLabel.value;
        withCity++;
      }
      if (club.latitude == null && row.coord?.value) {
        const m = /Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)/.exec(row.coord.value);
        if (m) {
          patch.longitude = Number(m[1]);
          patch.latitude = Number(m[2]);
          withCoord++;
        }
      }
      if (!club.website && row.site?.value) {
        patch.website = row.site.value;
        withSite++;
      }
      if (Object.keys(patch).length === 0) continue;
      if (APPLY) {
        await prisma.club.update({ where: { id: club.id }, data: patch as Prisma.ClubUpdateInput });
        updated++;
      }
    }
    if ((i / 200) % 5 === 0) console.log(`  lote ${i / 200}: acumulado updated=${updated}`);
  }

  console.log(
    `resumo: updated=${updated} (fund=${withFound} city=${withCity} coord=${withCoord} site=${withSite})`,
  );
  if (!APPLY) console.log('DRY-RUN — nada gravado.');
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
