/**
 * T450 Wave 3 — seed de clubes brasileiros de futebol feminino a partir de
 * fontes abertas alternativas (Wikipedia PT + re-check Wikidata).
 *
 * Levantamento de fontes e justificativas: docs/T450-WAVE3-SOURCES.md.
 * O connector é PURO (wikipedia-women-br.connector) — este script só faz
 * HTTP (1 req/s, User-Agent identificado, backoff em 429/5xx), Prisma e CLI.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx src/scripts/seed-brazilian-women-football-v2.ts              # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx src/scripts/seed-brazilian-women-football-v2.ts --apply      # grava
 *   ... --limit=30            # aplica no máximo N clubes (gate da wave 3)
 *   ... --country=BR          # exigido pelo despacho; único país suportado
 *
 * Integridade: zero overwrite (match por QID ou slug; sufixo "(futebol
 * feminino)" faz parte do slug), não cria duplicata de competição, recusa
 * órfãos honestamente e NÃO toca rankings/entries. Re-run é no-op.
 *
 * Reversível:
 *   -- clubes: DELETE FROM clubs WHERE "importedFrom"='wikipedia-pt' AND metadata->>'wave'='3';
 *   -- arestas: DELETE FROM knowledge_graph WHERE relation='PARTICIPATED_IN' AND metadata->>'wave'='3';
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  W3_USER_AGENT,
  W3_ROOT_CATEGORY,
  W3_SEASON_PAGES,
  W3_WAVE,
  W3_COUNTRY,
  assertSourceApproved,
  filterApprovedSources,
  parseCategoryMembers,
  stateFromCategoryTitle,
  parseSeasonParticipants,
  parseTemplateBatch,
  parseWdqs,
  buildClubInputFromCategory,
  seasonRowsToInputs,
  buildClubInputFromWikidata,
  mergeW3Inputs,
  planW3Seed,
  planW3Competitions,
  clubSlug,
  W3_EDGE_RELATION,
  type W3ClubInput,
  type W3TemplateResolution,
  type W3SeasonRow,
} from '../modules/etl/connectors/wikipedia-women-br.connector.js';

const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || Infinity;
const COUNTRY = process.argv.find((a) => a.startsWith('--country='))?.split('=')[1] ?? W3_COUNTRY;
if (COUNTRY !== W3_COUNTRY) {
  console.error(`wave 3 é BR-only (despacho); recebido --country=${COUNTRY}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP — 1 req/s + backoff + UA identificado (ToS-friendly)
// ---------------------------------------------------------------------------
const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchText(url: string, attempt = 0): Promise<string> {
  await throttle();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': W3_USER_AGENT } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 1000);
        return fetchText(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} após 3 tentativas: ${url.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    return await res.text();
  } catch (err) {
    if (attempt < 3 && !(err instanceof Error && err.message.startsWith('HTTP 4'))) {
      await sleep(2 ** attempt * 1000);
      return fetchText(url, attempt + 1);
    }
    throw err;
  }
}

const mwApi = (params: Record<string, string>): string => {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return `https://pt.wikipedia.org/w/api.php?${qs.toString()}`;
};

async function fetchCategoryTree(
  root: string,
): Promise<{ entries: Array<{ title: string; state: string | null }>; categories: number }> {
  const byTitle = new Map<string, string | null>();
  let categories = 0;
  let frontier: Array<{ cat: string; state: string | null }> = [{ cat: root, state: null }];
  const visited = new Set<string>([root]);
  let depth = 0;
  while (frontier.length > 0 && depth < 3) {
    const next: Array<{ cat: string; state: string | null }> = [];
    for (const { cat, state } of frontier) {
      const body = await fetchText(
        mwApi({
          action: 'query',
          list: 'categorymembers',
          cmtitle: cat,
          cmlimit: '500',
          cmtype: 'page|subcat',
        }),
      );
      const { pages, subcats } = parseCategoryMembers(body);
      categories += subcats.length;
      for (const p of pages) if (!byTitle.has(p.title)) byTitle.set(p.title, state);
      for (const sub of subcats) {
        if (!visited.has(sub)) {
          visited.add(sub);
          // O estado da subcategoria vale para ela e para tudo abaixo dela.
          next.push({ cat: sub, state: state ?? stateFromCategoryTitle(sub) });
        }
      }
    }
    frontier = next;
    depth += 1;
  }
  return { entries: [...byTitle].map(([title, state]) => ({ title, state })), categories };
}

async function fetchWikitext(article: string): Promise<string> {
  const body = await fetchText(mwApi({ action: 'parse', page: article, prop: 'wikitext' }));
  const parsed = JSON.parse(body) as { error?: { info: string }; parse?: { wikitext: string } };
  if (!parsed.parse)
    throw new Error(`artigo sem wikitexto: ${article} (${parsed.error?.info ?? '?'})`);
  return parsed.parse.wikitext;
}

async function resolveTemplates(
  templateNames: string[],
): Promise<Map<string, W3TemplateResolution>> {
  const resolved = new Map<string, W3TemplateResolution>();
  for (let i = 0; i < templateNames.length; i += 50) {
    const batch = templateNames.slice(i, i + 50);
    const titles = batch.map((t) => `Predefinição:${t}`).join('|');
    const body = await fetchText(
      mwApi({ action: 'query', titles, prop: 'revisions', rvprop: 'content', rvslots: 'main' }),
    );
    for (const [k, v] of parseTemplateBatch(body)) resolved.set(k, v);
  }
  return resolved;
}

const WDQS_URL =
  'https://query.wikidata.org/sparql?format=json&query=' +
  encodeURIComponent(`SELECT ?item ?itemLabel ?coord ?founded ?cityLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q28140340 .
  ?item wdt:P17 wd:Q155 .
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P571 ?founded }
  OPTIONAL { ?item wdt:P131 ?city }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". }
}`);

// ---------------------------------------------------------------------------
// Coleta
// ---------------------------------------------------------------------------
interface Collected {
  wikipediaInputs: W3ClubInput[];
  wikidataInputs: W3ClubInput[];
  wdAvailable: boolean;
}

async function collect(): Promise<Collected> {
  assertSourceApproved('wikipedia-pt');
  assertSourceApproved('wikidata');
  // Fontes descartadas NUNCA são buscadas — o filtro abaixo é o guard.
  filterApprovedSources([{ source: 'wikipedia-pt' }, { source: 'wikidata' }]);

  console.log(`  [1/4] categorias a partir de "${W3_ROOT_CATEGORY}"...`);
  const tree = await fetchCategoryTree(W3_ROOT_CATEGORY);
  console.log(
    `    artigos ns=0: ${tree.entries.length} (subcategorias visitadas: ${tree.categories})`,
  );

  console.log('  [2/4] tabelas de participantes das temporadas 2026...');
  const refusals: Array<{ name: string; reason: string }> = [];
  const seasonInputs: W3ClubInput[] = [];
  const allTemplates = new Set<string>();
  const seasonRows: Array<{ rows: W3SeasonRow[]; comp: (typeof W3_SEASON_PAGES)[number] }> = [];
  for (const page of W3_SEASON_PAGES) {
    const wikitext = await fetchWikitext(page.article);
    const rows = parseSeasonParticipants(wikitext);
    for (const row of rows) for (const t of row.templates) allTemplates.add(t);
    seasonRows.push({ rows, comp: page });
    console.log(`    ${page.competition}: ${rows.length} linhas de participante`);
  }

  console.log(`  [3/4] resolvendo ${allTemplates.size} predefinições de clube...`);
  const templateMap = await resolveTemplates([...allTemplates]);
  for (const { rows, comp } of seasonRows) {
    seasonInputs.push(
      ...seasonRowsToInputs(
        rows,
        templateMap,
        {
          name: comp.competition,
          level: comp.level,
          season: comp.season,
          sourceUrl: `https://pt.wikipedia.org/wiki/${encodeURIComponent(comp.article.replace(/ /g, '_'))}`,
        },
        refusals,
      ),
    );
  }

  console.log('  [4/4] re-check Wikidata (WDQS)...');
  let wikidataInputs: W3ClubInput[] = [];
  let wdAvailable = true;
  try {
    const wdBody = await fetchText(WDQS_URL);
    wikidataInputs = parseWdqs(wdBody).map(buildClubInputFromWikidata);
    console.log(`    WD: ${wikidataInputs.length} clubes BR femininos com QID`);
  } catch (err) {
    wdAvailable = false;
    console.log(
      `    WDQS indisponível (${(err as Error).message.slice(0, 80)}) — segue só-Wikipedia`,
    );
  }

  const categoryInputs = tree.entries.map((e) => buildClubInputFromCategory(e.title, e.state));

  // Proveniência verificável: todo título wikipedia-pt tem que EXISTIR (a árvore
  // de categorias pode trazer entrada stale e a resolução de predefinições pode
  // cair em red link). Título inexistente + vínculo de temporada → mantém o
  // clube com sourceUrl do artigo da temporada (a fonte verificável do fato);
  // sem vínculo → recusa honesta.
  const wpTitles = [...new Set([...categoryInputs, ...seasonInputs].map((i) => i.name))];
  const missingTitles = new Set<string>();
  for (let i = 0; i < wpTitles.length; i += 50) {
    const body = await fetchText(
      mwApi({ action: 'query', titles: wpTitles.slice(i, i + 50).join('|') }),
    );
    const payload = JSON.parse(body) as {
      query?: { pages?: Array<{ title: string; missing?: boolean }> };
    };
    for (const page of payload.query?.pages ?? []) {
      if (page.missing) missingTitles.add(page.title.toLowerCase());
    }
  }
  const verifiedInputs: W3ClubInput[] = [];
  for (const input of [...categoryInputs, ...seasonInputs]) {
    if (!missingTitles.has(input.name.toLowerCase())) {
      verifiedInputs.push(input);
      continue;
    }
    if (input.competitions.length > 0) {
      verifiedInputs.push({ ...input, sourceUrl: input.competitions[0]!.sourceUrl });
    } else {
      refusals.push({ name: input.name, reason: 'titulo_inexistente_na_wikipedia' });
    }
  }
  if (missingTitles.size > 0) {
    console.log(
      `    verificação de existência: ${missingTitles.size} título(s) inexistente(s) tratados`,
    );
  }

  for (const r of refusals.slice(0, 10)) console.log(`    recusado: ${r.name} (${r.reason})`);
  return { wikipediaInputs: verifiedInputs, wikidataInputs, wdAvailable };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(
    `T450 wave 3 — clubes BR feminino de fontes abertas (${APPLY ? 'APPLY' : 'DRY-RUN'}, limit=${LIMIT === Infinity ? '∞' : LIMIT})`,
  );
  console.log(`  user-agent: ${W3_USER_AGENT}`);

  const collected = await collect();
  const { merged, stats } = mergeW3Inputs(collected.wikipediaInputs, collected.wikidataInputs);
  console.log(
    `  merge: wikipedia=${stats.wikipedia} wdOnly=${stats.wikidataOnly} crossMatched=${stats.crossMatched} → ${merged.length} clubes`,
  );

  const prisma = new PrismaClient();
  try {
    const existingClubs = await prisma.club.findMany({
      where: { country: W3_COUNTRY },
      select: { id: true, qid: true, name: true, state: true, gender: true, deletedAt: true },
    });
    const existingComps = await prisma.competition.findMany({
      where: { country: W3_COUNTRY },
      select: { id: true, name: true, country: true, gender: true, deletedAt: true },
    });
    console.log(`  acervo BR: ${existingClubs.length} clubes, ${existingComps.length} competições`);

    const seedPlan = planW3Seed(merged, existingClubs);
    const compsPlan = planW3Competitions(
      seedPlan.plan.filter((e) => e.action !== 'refused').map((e) => e.input),
      existingComps,
    );
    console.log(
      `  plano: wouldCreate=${seedPlan.wouldCreate} skips=${seedPlan.skips} recusados=${seedPlan.refusals.length} dupInBatch=${seedPlan.duplicatesInBatch}`,
    );
    console.log(
      `  competições: novas=${compsPlan.compsToCreate.length}, arestas=${compsPlan.edges.length}`,
    );

    for (const c of compsPlan.compsToCreate)
      console.log(`    comp nova: ${c.name} (level ${c.level})`);
    for (const r of seedPlan.refusals.slice(0, 10))
      console.log(`    órfão: ${r.name} (${r.reason})`);

    if (!APPLY) {
      const sample = seedPlan.plan.filter((e) => e.action === 'create').slice(0, 15);
      console.log('  amostra (primeiras 15 criações):');
      for (const e of sample) {
        console.log(
          `    + ${e.finalName} [${e.input.source}] city=${e.input.city ?? '-'} uf=${e.input.state ?? '-'} qid=${e.input.qid ?? '-'} comps=${e.input.competitions.length}`,
        );
      }
      console.log('  DRY-RUN — nada gravado. Rode com --apply para persistir.');
      return;
    }

    // -----------------------------------------------------------------------
    // APPLY — idempotente: re-run é no-op
    // -----------------------------------------------------------------------
    const importedAt = new Date();
    const slugToClubId = new Map<string, string>();
    const existingBySlug = new Map(existingClubs.map((c) => [clubSlug(c.name, c.state), c]));

    let created = 0;
    for (const entry of seedPlan.plan) {
      if (created >= LIMIT) break;
      if (entry.action === 'refused') continue;
      const key = clubSlug(entry.finalName, entry.input.state);
      if (entry.action === 'skip_existing') {
        const existing =
          existingBySlug.get(key) ??
          existingClubs.find((c) => entry.input.qid && c.qid === entry.input.qid);
        if (existing) slugToClubId.set(clubSlug(entry.input.name, entry.input.state), existing.id);
        continue;
      }
      const dup = await prisma.club.findFirst({
        where: { name: entry.finalName, state: entry.input.state, country: W3_COUNTRY },
        select: { id: true },
      });
      if (dup) {
        // Arestas referenciam o slug do input ORIGINAL e o do nome final — cobrir ambos.
        slugToClubId.set(clubSlug(entry.input.name, entry.input.state), dup.id);
        slugToClubId.set(key, dup.id);
        continue;
      }
      const club = await prisma.club.create({
        data: {
          name: entry.finalName,
          fullName: entry.input.fullName,
          shortName: entry.input.shortName,
          city: entry.input.city,
          state: entry.input.state,
          country: W3_COUNTRY,
          foundedYear: entry.input.foundedYear,
          latitude: entry.input.latitude,
          longitude: entry.input.longitude,
          qid: entry.input.qid,
          gender: 'women',
          importedFrom: entry.input.source,
          importedAt,
          sourceUrl: entry.input.sourceUrl,
          metadata: {
            gender: 'women',
            wave: W3_WAVE,
            sources: [entry.input.source],
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      slugToClubId.set(clubSlug(entry.input.name, entry.input.state), club.id);
      slugToClubId.set(key, club.id);
      created += 1;
    }
    console.log(`  clubes criados: ${created}`);

    let compsCreated = 0;
    const compIdByKey = new Map<string, string>();
    for (const comp of existingComps) {
      if (comp.gender === 'women') {
        compIdByKey.set(
          `${comp.name.toLowerCase()}::${(comp.country ?? 'br').toLowerCase()}`,
          comp.id,
        );
      }
    }
    for (const comp of compsPlan.compsToCreate) {
      const key = `${comp.name.toLowerCase()}::${W3_COUNTRY.toLowerCase()}`;
      if (compIdByKey.has(key)) continue;
      const dup = await prisma.competition.findFirst({
        where: { name: comp.name, country: W3_COUNTRY, gender: 'women', deletedAt: null },
        select: { id: true },
      });
      if (dup) {
        compIdByKey.set(key, dup.id);
        continue;
      }
      const createdComp = await prisma.competition.create({
        data: {
          name: comp.name,
          gender: 'women',
          country: W3_COUNTRY,
          type: 'LEAGUE',
          level: comp.level,
          importedFrom: 'wikipedia-pt',
          importedAt,
          sourceUrl: comp.sourceUrl,
        },
        select: { id: true },
      });
      compIdByKey.set(key, createdComp.id);
      compsCreated += 1;
    }
    console.log(`  competições criadas: ${compsCreated}`);

    let edgesCreated = 0;
    let edgesExisting = 0;
    let edgesOrphans = 0;
    for (const edge of compsPlan.edges) {
      const clubId = slugToClubId.get(edge.clubSlugKey);
      const compId = compIdByKey.get(edge.compSlugKey);
      if (!clubId || !compId) {
        edgesOrphans += 1;
        continue;
      }
      const candidates = await prisma.knowledgeGraph.findMany({
        where: {
          sourceId: clubId,
          targetType: 'Competition',
          targetId: compId,
          relation: W3_EDGE_RELATION,
        },
        select: { id: true, metadata: true },
      });
      const already = candidates.some(
        (e) => (e.metadata as Record<string, unknown> | null)?.season === edge.season,
      );
      if (already) {
        edgesExisting += 1;
        continue;
      }
      await prisma.knowledgeGraph.create({
        data: {
          sourceId: clubId,
          sourceType: 'Club',
          targetId: compId,
          targetType: 'Competition',
          relation: W3_EDGE_RELATION,
          metadata: {
            season: edge.season,
            gender: 'women',
            wave: W3_WAVE,
            sourceUrl: edge.sourceUrl,
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      edgesCreated += 1;
    }
    console.log(
      `  arestas ${W3_EDGE_RELATION}: criadas=${edgesCreated} já-existiam=${edgesExisting} órfãs=${edgesOrphans}`,
    );

    const totalAfter = await prisma.club.count({ where: { gender: 'women', country: W3_COUNTRY } });
    console.log(`  banco: clubes femininos BR após seed = ${totalAfter}`);
    console.log(
      '  Aviso honesto: foundedYear/coords só entram para clubes com registro no Wikidata; clubes só-Wikipedia nascem sem eles (gap declarado).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
