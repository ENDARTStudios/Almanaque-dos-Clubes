/**
 * T450 Wave 5 — campeões históricos dos estaduais femininos (modo "Edições"):
 * os artigos-mãe (Campeonato Paulista de Futebol Feminino etc.) têm a tabela
 * ano → campeão de ~1983 a 2026. Cada campeão participou da temporada do
 * título → aresta PARTICIPATED_IN {season: ano} (inerte; rankings intocados).
 *
 * Fontes: Wikipedia PT (aprovada na wave 3) — mesmo UA/throttle/backoff.
 * Zero overwrite: clubes por QID/slug com adoção canônica (padrão wave 4);
 * re-run idempotente.
 *
 * Uso: tsx src/scripts/seed-brazilian-women-champions.ts [--apply] [--limit=N]
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  W3_USER_AGENT,
  W4_STATE_PAGES,
  W3_COUNTRY,
  parseChampionEditions,
  parseTemplateBatch,
  slugify,
  stripFeminineSuffix,
  clubSlug,
  competitionSlugKey,
  planW3Seed,
  planW3Competitions,
  W3_EDGE_RELATION,
  type W3ClubInput,
  type W3TemplateResolution,
} from '../modules/etl/connectors/wikipedia-women-br.connector.js';

const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || Infinity;

const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchText(url: string, attempt = 0): Promise<string> {
  await throttle();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': W3_USER_AGENT } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchText(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} após 3 tentativas: ${url.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    const text = await res.text();
    if (text.startsWith('You are making too many requests')) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchText(url, attempt + 1);
      }
      throw new Error('rate limit persistente da MediaWiki (200 text/plain)');
    }
    return text;
  } catch (err) {
    if (attempt < 3 && !(err instanceof Error && err.message.startsWith('HTTP 4'))) {
      await sleep(2 ** attempt * 1000);
      return fetchText(url, attempt + 1);
    }
    throw err;
  }
}

const mwApi = (params: Record<string, string>): string =>
  `https://pt.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;

const wikiUrl = (title: string): string =>
  `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

async function fetchWikitext(article: string): Promise<string | null> {
  const body = await fetchText(mwApi({ action: 'parse', page: article, prop: 'wikitext' }));
  const parsed = JSON.parse(body) as { error?: { info: string }; parse?: { wikitext: string } };
  return parsed.parse?.wikitext ?? null;
}

async function resolveTemplates(names: string[]): Promise<Map<string, W3TemplateResolution>> {
  const resolved = new Map<string, W3TemplateResolution>();
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const body = await fetchText(
      mwApi({
        action: 'query',
        titles: batch.map((t) => `Predefinição:${t}`).join('|'),
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
      }),
    );
    for (const [k, v] of parseTemplateBatch(body)) resolved.set(k, v);
  }
  return resolved;
}

interface ChampionRow {
  state: string;
  uf: string;
  article: string;
  competition: string;
  year: number;
  clubTitle: string;
}

async function main(): Promise<void> {
  console.log(
    `T450 wave 5 — campeões históricos dos estaduais femininos (${APPLY ? 'APPLY' : 'DRY-RUN'}, limit=${LIMIT === Infinity ? '∞' : LIMIT})`,
  );

  // 1) coleta: artigo-mãe de cada estado → edições (ano, campeão)
  const refusals: Array<{ name: string; reason: string }> = [];
  const templateNames = new Set<string>();
  const rawRows: Array<
    Omit<ChampionRow, 'clubTitle'> & { template: string | null; link: string | null }
  > = [];

  for (const state of W4_STATE_PAGES) {
    const wikitext = await fetchWikitext(state.competition);
    if (!wikitext) {
      console.log(`  ${state.competition}: sem artigo-mãe (gap)`);
      continue;
    }
    const editions = parseChampionEditions(wikitext);
    for (const e of editions) {
      if (e.template) templateNames.add(e.template);
      rawRows.push({
        state: state.state,
        uf: state.uf,
        article: state.competition,
        competition: state.competition,
        year: e.year,
        template: e.template,
        link: e.link,
      });
    }
    console.log(`  ${state.competition}: ${editions.length} edições com campeão`);
  }

  // 2) resolve predefinições → título de artigo por campeão
  const templateMap = await resolveTemplates([...templateNames]);
  const rows: ChampionRow[] = [];
  for (const row of rawRows) {
    let title: string | null = null;
    if (row.template) {
      const res = templateMap.get(row.template);
      if (res?.target) title = res.target;
    } else if (row.link) {
      title = row.link;
    }
    if (!title) {
      refusals.push({ name: `${row.competition} ${row.year}`, reason: 'campeao_sem_artigo' });
      continue;
    }
    rows.push({ ...row, clubTitle: title });
  }
  // dedup (clube, competição, ano)
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = `${clubSlug(r.clubTitle, r.uf)}>>${r.competition}::${r.year}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  console.log(`  edições com campeão resolvido: ${unique.length} (recusados: ${refusals.length})`);
  for (const r of refusals.slice(0, 8)) console.log(`    recusado: ${r.name} (${r.reason})`);

  // 3) verificação de existência dos títulos (proveniência verificável)
  const titles = [...new Set(unique.map((r) => r.clubTitle))];
  const missingTitles = new Set<string>();
  for (let i = 0; i < titles.length; i += 50) {
    const body = await fetchText(
      mwApi({ action: 'query', titles: titles.slice(i, i + 50).join('|') }),
    );
    const payload = JSON.parse(body) as {
      query?: { pages?: Array<{ title: string; missing?: boolean }> };
    };
    for (const page of payload.query?.pages ?? []) {
      if (page.missing) missingTitles.add(page.title.toLowerCase());
    }
  }

  // 4) inputs (um por edição; mesmo clube em vários anos = várias arestas)
  const bySlug = new Map<string, W3ClubInput>();
  for (const r of unique) {
    if (missingTitles.has(r.clubTitle.toLowerCase())) {
      refusals.push({ name: r.clubTitle, reason: 'titulo_inexistente_na_wikipedia' });
      continue;
    }
    const key = clubSlug(r.clubTitle, r.uf);
    const input: W3ClubInput = bySlug.get(key) ?? {
      name: r.clubTitle,
      fullName: r.clubTitle,
      shortName: null,
      city: null,
      state: r.uf,
      country: W3_COUNTRY,
      foundedYear: null,
      latitude: null,
      longitude: null,
      qid: null,
      source: 'wikipedia-pt',
      sourceUrl: wikiUrl(r.clubTitle),
      competitions: [],
    };
    input.competitions.push({
      name: r.competition,
      level: 4,
      season: String(r.year),
      sourceUrl: wikiUrl(r.article),
    });
    bySlug.set(key, input);
  }
  const deduped = [...bySlug.values()];
  console.log(`  clubes únicos: ${deduped.length}`);

  const prisma = new PrismaClient();
  try {
    const existingClubs = await prisma.club.findMany({
      where: { deletedAt: null },
      select: { id: true, qid: true, name: true, state: true, gender: true, deletedAt: true },
    });
    const existingComps = await prisma.competition.findMany({
      where: { country: W3_COUNTRY },
      select: { id: true, name: true, country: true, gender: true, deletedAt: true },
    });

    // adoção canônica 1:1 módulo sufixo feminino (padrão wave 4)
    for (const input of deduped) {
      const nameKey = slugify(stripFeminineSuffix(input.name));
      const sameName = existingClubs.filter(
        (c) =>
          slugify(stripFeminineSuffix(c.name)) === nameKey &&
          (c.state == null || c.state === input.state),
      );
      const team = sameName.filter((c) => c.gender !== 'men');
      if (team.length === 1) {
        input.name = team[0]!.name;
        input.state = team[0]!.state;
      }
    }

    const seedPlan = planW3Seed(deduped, existingClubs);
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

    if (!APPLY) {
      const sample = seedPlan.plan.filter((e) => e.action === 'create').slice(0, 12);
      for (const e of sample) {
        console.log(
          `    + ${e.finalName} uf=${e.input.state ?? '-'} seasons=${e.input.competitions.map((c) => c.season).join(',')}`,
        );
      }
      console.log('  DRY-RUN — nada gravado.');
      return;
    }

    const importedAt = new Date();
    const slugToClubId = new Map<string, string>();
    let created = 0;
    for (const entry of seedPlan.plan) {
      if (created >= LIMIT) break;
      if (entry.action === 'refused') continue;
      const key = clubSlug(entry.finalName, entry.input.state);
      const inputKey = clubSlug(entry.input.name, entry.input.state);
      if (entry.action === 'skip_existing') {
        const hit =
          existingClubs.find((c) => entry.input.qid && c.qid === entry.input.qid) ??
          existingClubs.find((c) => clubSlug(c.name, c.state) === key);
        if (hit) slugToClubId.set(inputKey, hit.id);
        continue;
      }
      const dup = await prisma.club.findFirst({
        where: { name: entry.finalName, state: entry.input.state, country: W3_COUNTRY },
        select: { id: true },
      });
      if (dup) {
        slugToClubId.set(inputKey, dup.id);
        slugToClubId.set(key, dup.id);
        continue;
      }
      try {
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
              wave: 5,
              sources: [entry.input.source],
            } as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        slugToClubId.set(inputKey, club.id);
        slugToClubId.set(key, club.id);
        created += 1;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          entry.input.qid
        ) {
          const winner = await prisma.club.findFirst({
            where: { qid: entry.input.qid },
            select: { id: true },
          });
          if (winner) {
            slugToClubId.set(inputKey, winner.id);
            slugToClubId.set(key, winner.id);
            continue;
          }
        }
        throw err;
      }
    }
    console.log(`  clubes criados: ${created}`);

    const compIdByKey = new Map<string, string>();
    for (const comp of existingComps) {
      if (comp.gender === 'women')
        compIdByKey.set(competitionSlugKey(comp.name, comp.country), comp.id);
    }
    let compsCreated = 0;
    for (const comp of compsPlan.compsToCreate) {
      const key = competitionSlugKey(comp.name, W3_COUNTRY);
      if (compIdByKey.has(key)) continue;
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
      if (
        candidates.some(
          (e) => (e.metadata as Record<string, unknown> | null)?.season === edge.season,
        )
      ) {
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
            wave: 5,
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
