/**
 * T450 Wave 7 — classificação final women via {{#invoke:sports results|main}}
 * das páginas de temporada da Wikipédia PT (fonte aprovada na wave 3).
 *
 * Fluxo por competição: extrai o bloco → parseSportsResults (classificação
 * COMPUTADA dos placares) → resolve {{Futebol X}} → artigo → casa com o acervo
 * (adoção canônica 1:1 módulo sufixo) → rankDivision (score 0-100) →
 * Ranking (competitionId, season, publishedAt) + rankingEntry gender='women',
 * dataSourceIds=['wikipedia-pt'].
 *
 * Uso: tsx src/scripts/ingest-wikipedia-women-standings.ts [--apply] [--limit=N]
 * Reversível: DELETE rankings/entries com name/season e competitionId alvo
 * (proveniência dataSourceIds=['wikipedia-pt']).
 */
import { PrismaClient } from '@prisma/client';
import {
  W3_USER_AGENT,
  W3_COUNTRY,
  parseSportsResults,
  extractSportsResultsBlock,
  parseTemplateBatch,
  stripFeminineSuffix,
  slugify,
  type W7StandingsRow,
  type W3TemplateResolution,
} from '../modules/etl/connectors/wikipedia-women-br.connector.js';
import { rankDivision } from '../modules/etl/connectors/rsssf-tables.connector.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || Infinity;
const UA = W3_USER_AGENT;
const METHOD_VERSION = 't450-w7-wikipedia-standings-v1';
const DATA_SOURCE = 'wikipedia-pt';

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
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchText(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    const text = await res.text();
    if (text.startsWith('You are making too many requests')) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchText(url, attempt + 1);
      }
      throw new Error('rate limit persistente da MediaWiki');
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

/** Competições alvo desta onda: nome da competição + artigo da temporada. */
const TARGETS = [
  {
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A1',
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026',
    season: '2026',
    level: 1,
  },
  {
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A2',
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026 - Série A2',
    season: '2026',
    level: 2,
  },
  {
    competition: 'Campeonato Paulista de Futebol Feminino',
    article: 'Campeonato Paulista de Futebol Feminino de 2026',
    season: '2026',
    level: 4,
  },
] as const;

async function resolveTemplates(names: string[]): Promise<Map<string, W3TemplateResolution>> {
  const resolved = new Map<string, W3TemplateResolution>();
  for (let i = 0; i < names.length; i += 50) {
    const body = await fetchText(
      mwApi({
        action: 'query',
        titles: names
          .slice(i, i + 50)
          .map((t) => `Predefinição:${t}`)
          .join('|'),
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
      }),
    );
    for (const [k, v] of parseTemplateBatch(body)) resolved.set(k, v);
  }
  return resolved;
}

async function main(): Promise<void> {
  console.log(
    `T450 wave 7 — classificação women via sports results (${APPLY ? 'APPLY' : 'DRY-RUN'})`,
  );

  const existingClubs = await prisma.club.findMany({
    where: { deletedAt: null },
    select: { id: true, qid: true, name: true, state: true, gender: true },
  });
  const existingComps = await prisma.competition.findMany({
    where: { country: W3_COUNTRY, deletedAt: null },
    select: { id: true, name: true, gender: true },
  });
  const compByName = new Map(
    existingComps.filter((c) => c.gender === 'women').map((c) => [c.name.toLowerCase(), c.id]),
  );

  let processed = 0;
  for (const target of TARGETS) {
    if (processed >= LIMIT) break;
    processed += 1;
    console.log(`\n== ${target.competition} (${target.season}) ==`);

    const compId = compByName.get(target.competition.toLowerCase());
    if (!compId) {
      console.log('  ! competição inexistente no acervo — pulando');
      continue;
    }

    const body = await fetchText(
      mwApi({ action: 'parse', page: target.article, prop: 'wikitext' }),
    );
    const wt = (JSON.parse(body) as { parse?: { wikitext: string } }).parse?.wikitext;
    if (!wt) {
      console.log('  ! sem wikitexto');
      continue;
    }
    const block = extractSportsResultsBlock(wt);
    if (!block) {
      console.log('  ! sem sports results (gap declarado)');
      continue;
    }
    const { teams, matches, standings } = parseSportsResults(block);
    console.log(`  clubes=${teams.length} partidas=${matches.length}`);

    // resolve templates → título de artigo
    const templateMap = await resolveTemplates(teams.map((t) => t.template));
    const titleByCode = new Map<string, string>();
    for (const t of teams) {
      const res = templateMap.get(t.template);
      if (res?.target) titleByCode.set(t.code, res.target);
    }

    // casa com o acervo: adoção canônica 1:1 módulo sufixo (padrão wave 4)
    const clubIdByCode = new Map<string, string>();
    let unmatched: string[] = [];
    for (const row of standings as W7StandingsRow[]) {
      const title = titleByCode.get(row.code);
      if (!title) {
        unmatched.push(`${row.code} (template sem artigo)`);
        continue;
      }
      const nameKey = slugify(stripFeminineSuffix(title));
      const hits = existingClubs.filter(
        (c) =>
          slugify(stripFeminineSuffix(c.name)) === nameKey &&
          (c.gender !== 'men' || c.state != null),
      );
      const team = hits.filter((c) => c.gender !== 'men');
      const winner = team.length === 1 ? team[0]! : hits.length === 1 ? hits[0]! : null;
      if (winner) clubIdByCode.set(row.code, winner.id);
      else unmatched.push(`${title} (sem match 1:1 no acervo)`);
    }
    if (unmatched.length) {
      for (const u of unmatched) console.log(`    sem acervo: ${u}`);
    }

    const eligible = (standings as W7StandingsRow[]).filter(
      (r) => clubIdByCode.has(r.code) && r.played > 0,
    );
    const ranked = rankDivision(
      eligible.map((r, i) => ({
        position: i + 1,
        club: titleByCode.get(r.code)!,
        played: r.played,
        won: r.wins,
        drawn: r.draws,
        lost: r.losses,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        points: r.points,
      })),
    );
    console.log(`  classificadas (jogaram ≥1): ${ranked.length}/${teams.length}`);

    // amostra no dry-run
    if (!APPLY) {
      for (const r of ranked.slice(0, 6)) {
        console.log(`    ${r.club}: pts=${r.points} j=${r.played} score=${r.score.toFixed(1)}`);
      }
    }

    if (!APPLY) continue;

    // Ranking.name NÃO é unique — findFirst + create/update (padrão do piloto EN).
    let ranking = await prisma.ranking.findFirst({
      where: {
        competitionId: compId,
        season: target.season,
        name: `${target.competition} ${target.season}`,
      },
      select: { id: true },
    });
    if (!ranking) {
      ranking = await prisma.ranking.create({
        data: {
          name: `${target.competition} ${target.season}`,
          competitionId: compId,
          season: target.season,
          publishedAt: new Date(),
        },
        select: { id: true },
      });
    } else {
      await prisma.ranking.update({ where: { id: ranking.id }, data: { publishedAt: new Date() } });
    }

    // rankDivision reordena: recuperar o code pelo TÍTULO canônico do clube.
    const codeByTitle = new Map(
      [...clubIdByCode.entries()].map(([code, clubId2]) => {
        const club = existingClubs.find((c) => c.id === clubId2)!;
        return [club.name, code];
      }),
    );
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i]!;
      const code = codeByTitle.get(r.club);
      if (!code) {
        console.log(`    ! club sem code no mapa: ${r.club}`);
        continue;
      }
      const clubId = clubIdByCode.get(code)!;
      const scored = Math.round(r.score);
      await prisma.rankingEntry.upsert({
        where: { rankingId_clubId: { rankingId: ranking.id, clubId } },
        update: {
          position: i + 1,
          points: scored,
          baseMatches: r.played,
          dataSourceIds: [DATA_SOURCE],
          gender: 'women',
          reason: null,
        },
        create: {
          rankingId: ranking.id,
          clubId,
          position: i + 1,
          points: scored,
          baseMatches: r.played,
          dataSourceIds: [DATA_SOURCE],
          gender: 'women',
        },
      });
    }
    console.log(
      `  ranking upsertado: ${ranked.length} entradas (gender=women, method=${METHOD_VERSION})`,
    );
  }

  console.log(APPLY ? 'APPLY concluído.' : 'DRY-RUN — nada gravado.');
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
