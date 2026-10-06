/**
 * T450 wave 2 — clubes de futebol feminino BR via P118 (liga) — Wikidata CC0.
 *
 * Busca clubes que PARTICIPAM das ligas femininas brasileiras (P118 = liga):
 *   - Q5028272  Campeonato Brasileiro de Futebol Feminino (Série A1)
 *   - Q28679927 Campeonato Brasileiro de Futebol Feminino Série A2
 *   - Q5028303  Campeonato Paulista de Futebol Feminino
 *   - Q5028277  Campeonato Carioca de Futebol Feminino
 *
 * HISTÓRICO DE VERIFICAÇÃO (lição T424 — QIDs de despacho vêm errados):
 *   - Q2891107/Q2891108/Q65088888/Q65088889 (do despacho original) = Anatomography /
 *     Enrique Gil Robles (pessoa) / ferrovia finlandesa / construtora — TODOS errados.
 *   - QIDs acima verificados via wbsearchentities (labels+descrição "football league").
 *   - Limitação DESCOBERTA no gate (10-06): as 4 ligas são STUBS no Wikidata
 *     (zero claims P1923/P1346/P710) e NENHUM clube aponta P118 para elas —
 *     a query retorna 0 hoje. O script fica PRONTO; a onda 3 re-executa quando
 *     o Wikidata preencher as claims (sem fabricar itens de terceiros).
 *
 * Uso:
 *   node dist/scripts/seed-brazilian-women-football.js            # DRY-RUN
 *   node dist/scripts/seed-brazilian-women-football.js --apply    # grava
 *
 * Idempotente: find-or-create por QID (nunca sobrescreve). Proveniência:
 * importedFrom='wikidata-women-br', gender='women',
 * metadata {gender:'women', coordSource:'wikidata'}.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'AlmanaqueDosClubes-WikidataBot/1.0';

const APPLY = process.argv.includes('--apply');

/** Ligas femininas BR — QIDs verificados via wbsearchentities (10-06). */
export const BR_WOMENS_LEAGUE_QIDS: readonly string[] = [
  'Q5028272', // Brasileiro Feminino Série A1
  'Q28679927', // Brasileiro Feminino Série A2
  'Q5028303', // Paulista Feminino
  'Q5028277', // Carioca Feminino
];

export interface BrWomensClub {
  qid: string;
  name: string;
  country: string;
}

/** Query SPARQL: clubes com P118 → ligas femininas BR (label service pt/en). */
export function buildBrWomensSparql(leagues: readonly string[]): string {
  const values = leagues.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?club ?clubLabel WHERE {
  VALUES ?league { ${values} }
  ?club wdt:P118 ?league.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
LIMIT 200`;
}

/** Dedup por QID. */
export function dedupeByQid<T extends { qid: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (seen.has(it.qid)) continue;
    seen.add(it.qid);
    out.push(it);
  }
  return out;
}

interface SparqlBinding {
  club?: { value: string };
  clubLabel?: { value: string };
}

/** Baixa os clubes via SPARQL (WDQS). 504/503 propagam (transiente — re-executar). */
export async function fetchBrWomensClubs(leagues: readonly string[]): Promise<BrWomensClub[]> {
  const params = new URLSearchParams({
    query: buildBrWomensSparql(leagues),
    format: 'json',
  });
  const res = await fetch(`${SPARQL_ENDPOINT}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) {
    throw new Error(`SPARQL HTTP ${res.status}`);
  }
  const json = (await res.json()) as { results: { bindings: SparqlBinding[] } };
  return json.results.bindings
    .filter((b) => b.club?.value)
    .map((b) => ({
      qid: b.club!.value.split('/').pop() as string,
      name: b.clubLabel?.value ?? '',
      country: 'BR',
    }))
    .filter((c) => c.name.length > 0);
}

async function main(): Promise<void> {
  console.log('T450 wave 2 — clubes BR femininos via P118 (Wikidata / CC0)');
  console.log('  modo: ' + (APPLY ? 'APPLY (grava)' : 'DRY-RUN (nao grava)'));
  console.log('  ligas: ' + BR_WOMENS_LEAGUE_QIDS.join(' '));

  const fetched = await fetchBrWomensClubs(BR_WOMENS_LEAGUE_QIDS);
  const clubs = dedupeByQid(fetched);
  console.log(`  candidatos: ${clubs.length} (dedup de ${fetched.length})`);

  if (clubs.length === 0) {
    console.log(
      '  NADA A SEMEAR — as ligas femininas BR são stubs no Wikidata hoje (sem claims de' +
        ' participantes e sem clubes apontando P118). Gap estrutural documentado em' +
        ' D-2026-10-06-t450-rankings-femininos-adiados; re-executar quando o Wikidata' +
        ' preencher os dados. Nada fabricado.',
    );
    return;
  }
  console.log('  amostra:');
  for (const c of clubs.slice(0, 5)) console.log(`   CLUB ${c.qid} ${c.name}`);

  if (!APPLY) {
    console.log('  DRY-RUN — nada gravado. Rode com --apply para persistir.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    let created = 0;
    let skipped = 0;
    for (const c of clubs) {
      const byQid = await prisma.club.findFirst({ where: { qid: c.qid }, select: { id: true } });
      if (byQid) {
        skipped++;
        continue;
      }
      try {
        await prisma.club.create({
          data: {
            name: c.name,
            country: c.country,
            qid: c.qid,
            gender: 'women',
            importedFrom: 'wikidata-women-br',
            importedAt: new Date(),
            metadata: { gender: 'women', coordSource: 'wikidata' },
          },
          select: { id: true },
        });
        created++;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          skipped++;
          continue;
        }
        throw err;
      }
    }
    console.log(`  sync: criados=${created} skip=${skipped}`);
    const total = await prisma.club.count({ where: { gender: 'women' } });
    console.log(`  banco: clubes femininos=${total}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
