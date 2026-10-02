// T471 onda 1 — SQL gate pré/pós (somente leitura). Mesma fórmula pré e pós.
// Uso no container: echo <b64> | base64 -d | node -
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const q = (sql) => p.$queryRawUnsafe(sql);
  const out = {};
  out.clubs = await q(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE latitude IS NOT NULL)::int AS com_coords,
            count(*) FILTER (WHERE latitude IS NULL AND qid IS NOT NULL AND "deletedAt" IS NULL)::int AS sem_coords_qid
     FROM clubs`,
  );
  out.stadiums = await q(`SELECT count(*)::int AS n FROM stadiums`);
  out.kg_won = await q(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE metadata->>'sourceUrl' IS NULL)::int AS sem_sourceurl
     FROM knowledge_graph WHERE relation = 'WON'`,
  );
  out.kg_rsssf = await q(
    `SELECT count(*)::int AS n FROM knowledge_graph WHERE metadata->>'sourceUrl' ILIKE '%rsssf%'`,
  );
  out.rsssf = await q(
    `SELECT count(*)::int AS n FROM competitions
     WHERE "sourceUrl" ILIKE '%rsssf%' AND "deletedAt" IS NULL`,
  );
  out.comp_br = await q(
    `SELECT count(*)::int AS n FROM competitions WHERE country = 'BR' AND "deletedAt" IS NULL`,
  );
  out.en_pyramid_l1 = await q(
    `SELECT count(*)::int AS n FROM competitions
     WHERE country IN ('GB','EN') AND level = 1 AND "deletedAt" IS NULL`,
  );
  out.rankings = await q(`SELECT count(*)::int AS n FROM rankings`);
  out.ranking_hash = await q(
    `SELECT count(*)::int AS n,
            md5(string_agg(e.id || ':' || coalesce(e."rankingId",'') || ':' || coalesce(e."clubId",'') || ':'
              || coalesce(e.position::text,'-') || ':' || coalesce(e.points::text,'-') || ':'
              || coalesce(e."baseMatches"::text,'-') || ':' || coalesce(e."baseTitles"::text,'-') || ':'
              || coalesce(e.gender,'-'), ',' ORDER BY e.id)) AS h
     FROM ranking_entries e`,
  );
  console.log('T471GATE ' + JSON.stringify(out));
  await p.$disconnect();
})().catch((e) => {
  console.error('GATE FALHOU:', e.message);
  process.exit(1);
});
