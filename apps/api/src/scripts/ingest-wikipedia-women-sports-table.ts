/**
 * T450 wave 10 — classificação women via {{#invoke:Sports table|main|style=WDL}}
 * (A3 2026 e outros artigos que usam este módulo). Os dados win/draw/loss/gf/ga
 * já estão na tabela — pontos computados (3/1/0) e score normalizado via
 * rankDivision. Zero-overwrite.
 */
import { PrismaClient } from '@prisma/client';
import {
  W3_USER_AGENT,
  W3_COUNTRY,
  extractSportsTableBlock,
  parseSportsTable,
  parseTemplateBatch,
  slugify,
  stripFeminineSuffix,
  type W10TableRow,
  type W3TemplateResolution,
} from '../modules/etl/connectors/wikipedia-women-br.connector.js';
import { rankDivision } from '../modules/etl/connectors/rsssf-tables.connector.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const UA = W3_USER_AGENT;
const DATA_SOURCE = 'wikipedia-pt';
const METHOD = 't450-w10-sports-table-v1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.startsWith('You are making too many requests')) throw new Error('rate limit');
  return text;
}

const mwApi = (params: Record<string, string>): string =>
  `https://pt.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;

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
    await sleep(1000);
    for (const [k, v] of parseTemplateBatch(body)) resolved.set(k, v);
  }
  return resolved;
}

interface Target {
  competition: string;
  article: string;
  season: string;
}

const TARGETS: Target[] = [
  {
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A3',
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026 - Série A3',
    season: '2026',
  },
  {
    competition: 'Campeonato Mineiro de Futebol Feminino',
    article: 'Campeonato Mineiro de Futebol Feminino de 2026',
    season: '2026',
  },
  {
    competition: 'Campeonato Gaúcho de Futebol Feminino',
    article: 'Campeonato Gaúcho de Futebol Feminino de 2026',
    season: '2026',
  },
  {
    competition: 'Campeonato Paranaense de Futebol Feminino',
    article: 'Campeonato Paranaense de Futebol Feminino de 2026',
    season: '2026',
  },
];

async function main(): Promise<void> {
  console.log(`T450 wave 10 — Sports table standings women (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const existingClubs = await prisma.club.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, gender: true },
  });
  const existingComps = await prisma.competition.findMany({
    where: { country: W3_COUNTRY, deletedAt: null },
    select: { id: true, name: true, gender: true },
  });
  const compByName = new Map(
    existingComps.filter((c) => c.gender === 'women').map((c) => [c.name.toLowerCase(), c.id]),
  );

  for (const target of TARGETS) {
    console.log(`\n== ${target.competition} (${target.season}) ==`);
    const compId = compByName.get(target.competition.toLowerCase());
    if (!compId) {
      console.log('  ! competição inexistente — pulando');
      continue;
    }

    const res = await fetchText(mwApi({ action: 'parse', page: target.article, prop: 'wikitext' }));
    await sleep(1100);
    const wt = (JSON.parse(res) as { parse?: { wikitext: string } }).parse?.wikitext;
    if (!wt) {
      console.log('  ! sem wikitexto');
      continue;
    }

    const block = extractSportsTableBlock(wt);
    if (!block) {
      console.log('  ! sem Sports table (gap)');
      continue;
    }

    const rows: W10TableRow[] = parseSportsTable(block);
    console.log(`  times=${rows.length}`);

    // resolve templates
    const templateMap = await resolveTemplates(rows.map((r) => r.template));
    const codeToClub = new Map<string, string>();
    for (const row of rows) {
      const res2 = templateMap.get(row.template);
      if (!res2?.target) continue;
      const nameKey = slugify(stripFeminineSuffix(res2.target));
      const hits = existingClubs.filter(
        (c) => slugify(stripFeminineSuffix(c.name)) === nameKey && c.gender !== 'men',
      );
      if (hits.length === 1) codeToClub.set(row.code, hits[0]!.id);
    }
    console.log(`  casados com acervo: ${codeToClub.size}/${rows.length}`);

    const ranked = rankDivision(
      rows
        .filter((r) => codeToClub.has(r.code))
        .map((r) => ({
          position: 0,
          club: r.template,
          played: r.won + r.drawn + r.lost,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          points: r.points,
        })),
    );

    if (!APPLY) {
      for (const r of ranked.slice(0, 5)) {
        console.log(`    ${r.club}: pts=${r.points} score=${r.score.toFixed(1)}`);
      }
      continue;
    }

    let ranking = await prisma.ranking.findFirst({
      where: { competitionId: compId, season: target.season },
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

    let entries = 0;
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i]!;
      const code = rows.find((x) => r.club.includes(x.template.replace('Futebol ', '')))?.code;
      const clubId = code ? codeToClub.get(code) : undefined;
      if (!clubId) continue;
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
      entries++;
    }
    console.log(`  ranking: ${entries} entradas (gender=women, method=${METHOD})`);
  }

  console.log(APPLY ? 'APPLY concluído.' : 'DRY-RUN — nada gravado.');
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
