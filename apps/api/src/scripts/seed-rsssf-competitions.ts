/**
 * T035 (Operador, 09/10) — seed de COMPETIÇÕES HISTÓRICAS via RSSSF Brasil.
 *
 * Piloto com 3 competições extintas/históricas (páginas de palmares do
 * rsssfbrasil.com, fonte CC0-com-atribuição já creditada em /metodologia):
 *  - Taça Brasil (1959-1968)  → tablesae/brcuphst.htm
 *  - Torneio Roberto Gomes Pedrosa / Robertão (1967-1970) → tablesr/rgpcamp.htm
 *  - Torneio Rio-São Paulo (1933-1966) → tablesr/rjspcamp.htm
 *
 * Fluxo por competição:
 *  1. fetch página (latin1, 1 req/s, User-Agent identificado)
 *  2. parseChampionsPage → edições
 *  3. find-or-create Competition por nome+país (importedFrom='rsssf')
 *  4. match Campeão → Club em 3 camadas (exato insensitive → busca única → recusa)
 *  5. aresta WON com metadata {rsssf:true, year, sourceUrl}
 *
 * REGRAS: dedup por (competição, ano); zero overwrite; clube não identificado =
 * edição registrada sem aresta (gap declarado); não toca rankings.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/seed-rsssf-competitions.js
 *   APPLY:              node dist/scripts/seed-rsssf-competitions.js --apply
 *   Categoria:          --category=taca-brasil|robertao|rio-sp (default: todas)
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  decodeLatin1,
  parseChampionsPage,
  type RsssfChampionEntry,
} from '../lib/rsssf/champions-parser.js';
import { logger } from '../config/logger.js';

const RSSSF_BASE = 'http://www.rsssfbrasil.com/';
const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (rsssf historic competitions seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

interface Category {
  key: string;
  competitionName: string;
  country: string | null;
  page: string;
}

const CATEGORIES: Category[] = [
  {
    key: 'taca-brasil',
    competitionName: 'Taça Brasil',
    country: 'BR',
    page: 'tablesae/brcuphst.htm',
  },
  {
    key: 'robertao',
    competitionName: 'Torneio Roberto Gomes Pedrosa',
    country: 'BR',
    page: 'tablesr/rgpcamp.htm',
  },
  {
    key: 'rio-sp',
    competitionName: 'Torneio Rio-São Paulo',
    country: 'BR',
    page: 'tablesr/rjspcamp.htm',
  },
];

/** Fetch da página RSSSF (windows-1252). */
async function fetchPage(page: string): Promise<string> {
  const url = RSSSF_BASE + page;
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`RSSSF HTTP ${res.status} em ${page}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return decodeLatin1(buf);
}

/** Match do campeão em 3 camadas: exato insensitive → busca única (pg_trgm) → recusa. */
async function matchClub(
  prisma: PrismaClient,
  championName: string,
): Promise<{ id: string; name: string } | null> {
  const exact = await prisma.club.findFirst({
    where: { name: { equals: championName, mode: 'insensitive' }, deletedAt: null },
    select: { id: true, name: true },
  });
  if (exact) return exact;

  // Fallback: busca do acervo por palavra distintiva (pg_trgm/tsvector, o mesmo
  // mecanismo da busca global). 'Santos Futebol Clube' → busca 'Santos' porque
  // o acervo cataloga 'Santos F.C.' — tsvector composto não casa com o nome
  // completo do RSSSF. Validação: ≥60% das palavras do RSSSF presentes no nome
  // do acervo (Santos F.C. vs Botafogo F.R. nunca confundem).
  const tokens = championName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const distinctWord = tokens.find(
    (w) => !['futebol', 'clube', 'club', 'esporte', 'esportes'].includes(w),
  );
  if (!distinctWord) return null;
  const cands = await prisma.club.findMany({
    where: {
      name: { contains: distinctWord, mode: 'insensitive' },
      deletedAt: null,
    },
    select: { id: true, name: true, country: true },
  });
  const scored = cands
    .map((c) => {
      const norm = c.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const hits = tokens.filter((w) => norm.includes(w)).length;
      return { c, hits };
    })
    .filter((x) => x.hits > 0)
    // Taça Brasil/Robertão/Rio-SP são competições masculinas históricas — o
    // candidato '(futebol feminino)' é OUTRO clube no acervo (T450) e nunca é
    // o campeão correto (bug do smoke 09/10: Santos ×5 linkado ao feminino).
    .filter((x) => !/futebol feminino|femenino|women/i.test(x.c.name))
    .sort((a, b) => b.hits - a.hits || a.c.name.localeCompare(b.c.name));
  if (scored.length > 0 && (scored.length === 1 || scored[0].hits > scored[1].hits)) {
    return { id: scored[0].c.id, name: scored[0].c.name };
  }
  return null;
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    category: { type: 'string', default: 'all' },
  },
});
const APPLY_LOCAL = values.apply;
void APPLY_LOCAL;

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const { category } = values;
    const cats =
      category && category !== 'all' ? CATEGORIES.filter((c) => c.key === category) : CATEGORIES;
    if (cats.length === 0) {
      console.error(`[t035] categoria desconhecida: ${category}`);
      return 1;
    }
    console.log(
      `[t035] modo=${values.apply ? 'APPLY' : 'DRY-RUN'} · categorias=${cats.map((c) => c.key).join(',')}`,
    );

    for (const cat of cats) {
      console.log(`\n=== ${cat.competitionName} (${cat.page})`);

      // 1. fetch + parse
      const html = await fetchPage(cat.page);
      const entries: RsssfChampionEntry[] = parseChampionsPage(html);
      const championEditions = entries.filter((e) => e.status === 'champion');
      console.log(
        `  edições: ${championEditions.length} campeãs · ${entries.length - championEditions.length} sem torneio`,
      );

      // 2. find-or-create Competition (por nome exato insensitive)
      let comp = await prisma.competition.findFirst({
        where: { name: { equals: cat.competitionName, mode: 'insensitive' }, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!comp) {
        if (!values.apply) {
          console.log(`  competição "${cat.competitionName}" não existe — seria criada no apply.`);
          continue;
        }
        comp = await prisma.competition.create({
          data: {
            name: cat.competitionName,
            country: cat.country,
            qid: null,
            importedFrom: 'rsssf',
            importedAt: new Date(),
            sourceUrl: RSSSF_BASE + cat.page,
          },
        });
        console.log(`  competição criada: ${comp.id}`);
      }

      // 3. arestas WON (campeão → competição) — apenas com clube identificado
      let created = 0;
      let skipped = 0;
      let unmatched: string[] = [];
      for (const e of championEditions) {
        const club = await matchClub(prisma, e.championName);
        if (!club) {
          unmatched.push(`${e.year} ${e.championName}`);
          continue;
        }
        if (!values.apply) continue;
        const exists = await prisma.knowledgeGraph.findFirst({
          where: {
            sourceId: club.id,
            targetType: 'Competition',
            targetId: comp.id,
            relation: 'WON',
            metadata: { path: ['year'], equals: e.year },
          },
          select: { id: true },
        });
        if (exists) {
          skipped += 1;
          continue;
        }
        await prisma.knowledgeGraph.create({
          data: {
            sourceId: club.id,
            sourceType: 'Club',
            targetId: comp.id,
            targetType: 'Competition',
            relation: 'WON',
            metadata: {
              rsssf: true,
              year: e.year,
              sourceUrl: RSSSF_BASE + cat.page,
              license: 'CC0-with-attribution',
              category: cat.key,
            } as Prisma.InputJsonValue,
          },
        });
        created += 1;
      }
      console.log(
        `  arestas WON: criadas=${created} · já-existiam=${skipped} · sem-match(no acervo)=${unmatched.length}`,
      );
      for (const u of unmatched.slice(0, 10)) console.log(`    sem-match: ${u}`);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-rsssf-competitions')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t035] falha no seed RSSSF');
      process.exit(1);
    });
}
