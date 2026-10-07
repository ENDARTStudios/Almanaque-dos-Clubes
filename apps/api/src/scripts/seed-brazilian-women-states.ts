/**
 * T450 Wave 4 — seed de clubes femininos BR a partir dos CAMPEONATOS ESTADUAIS
 * (Paulista, Carioca, Mineiro, Gaúcho, Paranaense, Baiano, Catarinense,
 * Pernambucano) via Wikipedia PT (fontes aprovadas na wave 3 — ver
 * docs/T450-WAVE3-SOURCES.md). Reusa os parsers/planos do conector wave 3.
 *
 * Para cada estadual sonda a edição mais nova existente (2026 → 2025);
 * edições ausentes viram gap declarado (nada inventado).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx src/scripts/seed-brazilian-women-states.ts              # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx src/scripts/seed-brazilian-women-states.ts --apply      # grava
 *   ... --limit=N            # teto de criações (gate)
 *
 * Integridade: zero overwrite (QID/slug), não duplica competição, arestas
 * PARTICIPATED_IN inertes, rankings intocados, re-run idempotente.
 *
 * Reversível:
 *   -- clubes: DELETE FROM clubs WHERE "importedFrom"='wikipedia-pt' AND metadata->>'wave'='4';
 *   -- arestas: DELETE FROM knowledge_graph WHERE relation='PARTICIPATED_IN' AND metadata->>'wave'='4';
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  W3_USER_AGENT,
  W4_WAVE,
  W4_STATE_PAGES,
  W3_COUNTRY,
  stateCompetitionName,
  stateEditionYear,
  parseSeasonParticipants,
  parseTemplateBatch,
  seasonRowsToInputs,
  planW3Seed,
  planW3Competitions,
  clubSlug,
  slugify,
  stripFeminineSuffix,
  competitionSlugKey,
  W3_EDGE_RELATION,
  type W3ClubInput,
  type W3TemplateResolution,
  type W3SeasonRow,
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
    // MediaWiki responde rate-limit como 200 text/plain (não 429).
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
  if (!parsed.parse) return null;
  return parsed.parse.wikitext;
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

interface ChosenEdition {
  state: string;
  uf: string;
  article: string;
  competition: string;
  level: 4;
  season: string;
}

/** Sonda as edições (1 requisição em lote p/ todos os títulos). */
async function chooseEditions(): Promise<{ chosen: ChosenEdition[]; missing: string[] }> {
  const allTitles = W4_STATE_PAGES.flatMap((s) => s.editions);
  const missing = new Set<string>();
  for (let i = 0; i < allTitles.length; i += 50) {
    const body = await fetchText(
      mwApi({ action: 'query', titles: allTitles.slice(i, i + 50).join('|') }),
    );
    const payload = JSON.parse(body) as {
      query?: { pages?: Array<{ title: string; missing?: boolean }> };
    };
    for (const page of payload.query?.pages ?? []) {
      if (page.missing) missing.add(page.title.toLowerCase());
    }
  }
  const chosen: ChosenEdition[] = [];
  const gaps: string[] = [];
  for (const state of W4_STATE_PAGES) {
    const edition = state.editions.find((t) => !missing.has(t.toLowerCase()));
    if (!edition) {
      gaps.push(state.editions[0]!);
      continue;
    }
    chosen.push({
      state: state.state,
      uf: state.uf,
      article: edition,
      competition: stateCompetitionName(edition),
      level: 4,
      season: stateEditionYear(edition),
    });
  }
  return { chosen, missing: gaps };
}

async function main(): Promise<void> {
  console.log(
    `T450 wave 4 — estaduais femininos BR via Wikipedia PT (${APPLY ? 'APPLY' : 'DRY-RUN'}, limit=${LIMIT === Infinity ? '∞' : LIMIT})`,
  );

  const { chosen, missing } = await chooseEditions();
  console.log(`  edições encontradas: ${chosen.length}/${W4_STATE_PAGES.length}`);
  for (const c of chosen) console.log(`    ${c.competition} → ${c.article} (${c.season})`);
  for (const g of missing) console.log(`    SEM edição (gap declarado): ${g}`);

  const refusals: Array<{ name: string; reason: string }> = [];
  const inputs: W3ClubInput[] = [];
  const allTemplates = new Set<string>();
  const perPage: Array<{ rows: W3SeasonRow[]; edition: ChosenEdition }> = [];

  for (const edition of chosen) {
    const wikitext = await fetchWikitext(edition.article);
    if (!wikitext) continue;
    const rows = parseSeasonParticipants(wikitext);
    for (const row of rows) for (const t of row.templates) allTemplates.add(t);
    perPage.push({ rows, edition });
    console.log(`    ${edition.article}: ${rows.length} linhas de participante`);
  }

  console.log(`  resolvendo ${allTemplates.size} predefinições...`);
  const templateMap = await resolveTemplates([...allTemplates]);
  for (const { rows, edition } of perPage) {
    const editionInputs = seasonRowsToInputs(
      rows,
      templateMap,
      {
        name: edition.competition,
        level: edition.level,
        season: edition.season,
        sourceUrl: wikiUrl(edition.article),
      },
      refusals,
    );
    // A UF é fato do próprio artigo (Campeonato Baiano ⇒ BA): quando a linha
    // não traz {{BR-UF}}, carimba a UF da edição.
    for (const input of editionInputs) input.state = input.state ?? edition.uf;
    inputs.push(...editionInputs);
  }

  // Proveniência verificável: título wikipedia-pt precisa EXISTIR (padrão wave 3).
  const titles = [...new Set(inputs.map((i) => i.name))];
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
  const verified: W3ClubInput[] = [];
  for (const input of inputs) {
    if (!missingTitles.has(input.name.toLowerCase())) {
      verified.push(input);
      continue;
    }
    if (input.competitions.length > 0) {
      verified.push({ ...input, sourceUrl: input.competitions[0]!.sourceUrl });
    } else {
      refusals.push({ name: input.name, reason: 'titulo_inexistente_na_wikipedia' });
    }
  }
  for (const r of refusals.slice(0, 10)) console.log(`  recusado: ${r.name} (${r.reason})`);

  // Dedup do lote (clubes que aparecem em 2 estaduais) — por slug, fundindo comps.
  const bySlug = new Map<string, W3ClubInput>();
  for (const input of verified) {
    const key = clubSlug(input.name, input.state);
    const existing = bySlug.get(key);
    if (!existing) {
      bySlug.set(key, { ...input });
    } else {
      bySlug.set(key, {
        ...existing,
        city: existing.city ?? input.city,
        shortName: existing.shortName ?? input.shortName,
        competitions: [
          ...existing.competitions,
          ...input.competitions.filter(
            (c) => !existing.competitions.some((e) => e.name === c.name && e.season === c.season),
          ),
        ],
      });
    }
  }
  const deduped = [...bySlug.values()];

  const prisma = new PrismaClient();
  try {
    const existingClubs = await prisma.club.findMany({
      select: { id: true, qid: true, name: true, state: true, gender: true, deletedAt: true },
    });
    const existingComps = await prisma.competition.findMany({
      where: { country: W3_COUNTRY },
      select: { id: true, name: true, country: true, gender: true, deletedAt: true },
    });
    console.log(`  acervo: ${existingClubs.length} clubes, ${existingComps.length} competições BR`);

    // Adoção canônica 1:1 (modulo sufixo "(futebol feminino)"): a tabela
    // estadual linka o artigo principal ("EC Juventude") enquanto o acervo tem
    // "EC Juventude (futebol feminino)" — e clubes de categoria (wave 3) nasceram
    // sem estado. Nome-slug sem sufixo casando EXATAMENTE 1 clube do acervo
    // (estado igual ou NULL) = MESMO time: adota o nome/estado canônicos →
    // plano vira skip_existing e a aresta liga no clube existente. 2+ hits =
    // homônimo ambíguo: não adota nada (honesto).
    for (const input of deduped) {
      const nameKey = slugify(stripFeminineSuffix(input.name));
      const sameName = existingClubs.filter(
        (c) =>
          slugify(stripFeminineSuffix(c.name)) === nameKey &&
          (c.state == null || c.state === input.state),
      );
      // Clubes tradicionais têm gêmeos masculino E feminino no acervo — entre os
      // homônimos, exatamente 1 time (gender != men) é o candidato: clubes só
      // masculinos NÃO são adoção (o plano aplica o sufixo feminino neles).
      const team = sameName.filter((c) => c.gender !== 'men');
      if (team.length === 1) {
        input.name = team[0]!.name;
        // Estado do gêmeo INCONDICIONAL (inclusive NULL): gêmeo sem estado +
        // input carimbado gerava slug ::uf vs ::null e recriação do time.
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
      console.log('  amostra (primeiras 12 criações):');
      for (const e of sample) {
        console.log(
          `    + ${e.finalName} uf=${e.input.state ?? '-'} city=${e.input.city ?? '-'} comps=${e.input.competitions.length}`,
        );
      }
      console.log('  DRY-RUN — nada gravado. Rode com --apply para persistir.');
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
              wave: W4_WAVE,
              sources: [entry.input.source],
            } as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        slugToClubId.set(inputKey, club.id);
        slugToClubId.set(key, club.id);
        created += 1;
      } catch (err) {
        // Corrida benigna P2002 (qid surgiu entre plano e create) — vincula e segue.
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

    let compsCreated = 0;
    const compIdByKey = new Map<string, string>();
    for (const comp of existingComps) {
      if (comp.gender === 'women') {
        compIdByKey.set(competitionSlugKey(comp.name, comp.country), comp.id);
      }
    }
    for (const comp of compsPlan.compsToCreate) {
      const key = competitionSlugKey(comp.name, W3_COUNTRY);
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
            wave: W4_WAVE,
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
