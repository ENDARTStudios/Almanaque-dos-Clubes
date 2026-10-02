/**
 * SCRATCH (T448 FASE 3) — semeia corpus-piloto LOCAL (não commitado como fluxo):
 * busca candidatos reais nas janelas, escolhe as mães mais frequentes e insere
 * essas competições + seus clubes vencedores no Postgres local via SQL.
 * O gap do ingest-won-edges passa a ser medido CONTRA ESTE CORPUS DECLARADO.
 */
import { fetchWonCandidates } from '../src/modules/etl/won-edges.service.js';
import {
  WIKIDATA_ENTITY_URL_BASE,
  WON_USER_AGENT,
} from '../src/modules/etl/connectors/wikidata-won-edges.connector.js';
import { writeFileSync } from 'node:fs';

const MIN = Number(process.argv[2] ?? 2005);
const MAX = Number(process.argv[3] ?? 2026);
const TOP_MOTHERS = Number(process.argv[4] ?? 12);

const { candidates, stats } = await fetchWonCandidates({ minYear: MIN, maxYear: MAX });
console.log(`candidatos: ${candidates.length}`, JSON.stringify(stats.truncatedWindows));

const byMother = new Map<string, number>();
for (const c of candidates) byMother.set(c.motherQid, (byMother.get(c.motherQid) ?? 0) + 1);
const top = [...byMother.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_MOTHERS);
const topQids = new Set(top.map(([q]) => q));
const pilot = candidates.filter((c) => topQids.has(c.motherQid));
console.log('top mães:', top.map(([q, n]) => `${q}(${n})`).join(' '));

// Labels dos vencedores do piloto em lote VALUES-bounded.
const winnerQids = [...new Set(pilot.map((c) => c.winnerQid))];
async function labelsFor(qids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  for (let i = 0; i < qids.length; i += 200) {
    const chunk = qids.slice(i, i + 200);
    const q = `SELECT ?e ?l WHERE { VALUES ?e { ${chunk.map((x) => `wd:${x}`).join(' ')} } ?e rdfs:label ?l . FILTER(LANG(?l) = "en") }`;
    const res = await fetch(
      'https://query.wikidata.org/sparql?query=' + encodeURIComponent(q) + '&format=json',
      { headers: { 'user-agent': WON_USER_AGENT, Accept: 'application/sparql-results+json' } },
    );
    if (!res.ok) throw new Error('labels HTTP ' + res.status);
    const j = await res.json();
    for (const b of j.results.bindings) {
      const qid = b.e.value?.split('/').pop();
      if (qid && b.l.value) labels.set(qid, b.l.value);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return labels;
}

const winnerLabels = await labelsFor(winnerQids);
console.log(`labels de vencedores: ${winnerLabels.size}/${winnerQids.length}`);

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [];
const now = new Date().toISOString();

for (const c of pilot) {
  const name = winnerLabels.get(c.winnerQid);
  if (!name) continue;
  lines.push(
    `INSERT INTO clubs (id, name, status, qid, "importedFrom", "sourceUrl", "importedAt", "createdAt", "updatedAt") ` +
      `VALUES (gen_random_uuid()::text, '${esc(name)}', 'ACTIVE', '${c.winnerQid}', 'wikidata', '${WIKIDATA_ENTITY_URL_BASE}${c.winnerQid}', '${now}', now(), now()) ` +
      `ON CONFLICT (qid) DO NOTHING;`,
  );
}
for (const c of pilot) {
  lines.push(
    `INSERT INTO competitions (id, name, type, qid, "importedFrom", "sourceUrl", "importedAt", "createdAt", "updatedAt") ` +
      `VALUES (gen_random_uuid()::text, '${esc(c.motherName)}', NULL, '${c.motherQid}', 'wikidata', '${WIKIDATA_ENTITY_URL_BASE}${c.motherQid}', '${now}', now(), now()) ` +
      `ON CONFLICT (qid) DO NOTHING;`,
  );
}
writeFileSync('scripts/sql/_t448-pilot-corpus.sql', lines.join('\n') + '\n');
console.log(`SQL gerado: scripts/sql/_t448-pilot-corpus.sql (${lines.length} statements)`);
process.exit(0);
