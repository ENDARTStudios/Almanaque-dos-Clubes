/**
 * T508 (W4) — seed de TEMPORADAS de competição (classificação + artilheiro).
 *
 * Fonte: Wikipedia (HTML renderizado via `action=parse&prop=text`) — a PT monta
 * as tabelas por módulos Lua, então o HTML é obrigatório. Licença CC-BY-SA
 * (atribuição exibida no perfil da competição).
 *
 * Match de clube: nome exato (insensitive, com aliases) → busca única por
 * palavra distintiva → recusa honesta. NUNCA inventa clube.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/seed-competition-seasons.js --competition=<qid|nome> --seasons=2023,2024,2025
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  parseStandings,
  parseTopScorer,
  type StandingRow,
} from '../lib/wikipedia/standings-parser.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    competition: { type: 'string', default: '' },
    seasons: { type: 'string', default: '' },
    lang: { type: 'string', default: 'pt' },
    // Título na Wikipedia difere do nome no acervo: 'Campeonato Brasileiro de
    // Futebol de 2024 - Série A' (artigo) × 'Campeonato Brasileiro Série A' (acervo).
    article: { type: 'string', default: '' },
    suffix: { type: 'string', default: '' },
  },
});
const APPLY_ON = values.apply || APPLY;
const UA =
  'AlmanaqueDosClubes/0.1 (wikipedia standings seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Busca o HTML renderizado de um artigo (segue redirects de título). */
export async function fetchArticleHtml(lang: string, title: string): Promise<string | null> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const url = `${base}?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&redirects=1`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const json = (await res.json()) as {
    parse?: { text?: { '*': string } };
    error?: { code?: string };
  };
  if (json.error) return null; // artigo inexistente (honesto)
  return json.parse?.text?.['*'] ?? null;
}

/** Aliases públicos (Wikipedia → acervo), mesma convenção do seed RSSSF. */
const NAME_ALIASES: Record<string, string> = {
  'Botafogo FR': 'Botafogo F.R.',
  'Botafogo de Futebol e Regatas': 'Botafogo F.R.',
  Palmeiras: 'Sociedade Esportiva Palmeiras',
  Flamengo: 'Clube de Regatas do Flamengo',
  Corinthians: 'S.C. Corinthians Paulista',
  Fluminense: 'Fluminense F.C.',
  Cruzeiro: 'Cruzeiro E.C.',
  Grêmio: 'Grêmio FBPA',
  Internacional: 'S.C. Internacional',
  Santos: 'Santos F.C.',
  Vasco: 'Club de Regatas Vasco da Gama',
  'São Paulo': 'São Paulo FC',
};

async function matchClub(
  prisma: PrismaClient,
  rawName: string,
): Promise<{ id: string; name: string } | null> {
  // o HTML do clube vem com prefixos/links: limpa sufixos entre parênteses e dígitos
  const cleaned = rawName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const alias = NAME_ALIASES[cleaned] ?? NAME_ALIASES[rawName];
  const candidates = [alias, cleaned, rawName].filter((x): x is string => !!x);
  for (const name of candidates) {
    const exact = await prisma.club.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, name: true },
    });
    if (exact) return exact;
  }
  // palavra distintiva + país BR (as tabelas do seed são do Brasileirão)
  const tokens = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['clube', 'futebol', 'sport', 'esporte'].includes(w));
  const word = tokens[0];
  if (!word) return null;
  const found = await prisma.club.findMany({
    where: { name: { contains: word, mode: 'insensitive' }, country: 'BR', deletedAt: null },
    select: { id: true, name: true, gender: true },
  });
  const men = found.filter((c) => c.gender !== 'women');
  if (men.length === 1) return { id: men[0].id, name: men[0].name };
  return null; // ambíguo ⇒ recusa honesta
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    if (!values.competition || !values.seasons) {
      console.error('[t508] use --competition=<nome do artigo base> --seasons=2024,2025');
      return 1;
    }
    const seasons = values.seasons.split(',').map((s) => s.trim());
    // Nome do artigo: "{base} de {ano}" (formato consagrado da Wikipedia PT)
    const base = values.competition;
    const articleBase = values.article || base;
    const suffix = values.suffix ?? '';
    console.log(
      `[t508] modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'} · base="${base}" · temporadas=${seasons.join(',')}`,
    );

    // Competição no acervo. ORDEM importa (bug pego pelo dry-run 10/10:
    // 'Campeonato Brasileiro de Futebol' casou com '...Feminino - Série A3' —
    // os dados masculinos iriam para a competição feminina):
    //  1) nome EXATO;
    //  2) 'contains' EXCLUINDO feminino;
    //  3) o nome MAIS CURTO entre os candidatos (a divisão principal é a mais
    //     genérica: 'Campeonato Brasileiro de Futebol' antes de '... - Série B').
    let comp = await prisma.competition.findFirst({
      where: { name: { equals: base, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, name: true, qid: true },
    });
    if (!comp) {
      const cands = await prisma.competition.findMany({
        where: {
          name: { contains: base, mode: 'insensitive' },
          deletedAt: null,
          NOT: { name: { contains: 'feminin', mode: 'insensitive' } },
        },
        select: { id: true, name: true, qid: true },
      });
      const men = cands
        .filter((c) => !/feminin|women/i.test(c.name))
        .sort((a, b) => a.name.length - b.name.length);
      comp = men[0] ?? null;
    }
    if (!comp) {
      console.log(`[t508] competição "${base}" não está no acervo — recusa honesta.`);
      return 0;
    }
    console.log(`  competição: ${comp.name} (${comp.id})`);

    for (const season of seasons) {
      const title = `${articleBase} de ${season}${suffix}`;
      const html = await fetchArticleHtml(values.lang ?? 'pt', title);
      if (!html) {
        console.log(`  ${season}: artigo "${title}" não existe — nada a fazer.`);
        continue;
      }
      const standings: StandingRow[] = parseStandings(html);
      if (standings.length < 4) {
        console.log(
          `  ${season}: classificação não encontrada no artigo (${standings.length} linhas).`,
        );
        continue;
      }
      const topScorer = parseTopScorer(html);

      // Match de clubes (uma passada por linha)
      const matched: Array<StandingRow & { clubId: string | null; matchedName: string | null }> =
        [];
      for (const row of standings) {
        const club = await matchClub(prisma, row.clubName);
        matched.push({ ...row, clubId: club?.id ?? null, matchedName: club?.name ?? null });
      }
      const withClub = matched.filter((m) => m.clubId).length;
      const champion = matched.find((m) => m.position === 1);
      const runnerUp = matched.find((m) => m.position === 2);
      console.log(
        `  ${season}: ${standings.length} clubes · casados=${withClub} · campeão=${champion?.matchedName ?? champion?.clubName ?? '?'} · artilheiro=${topScorer ? topScorer.name + ' (' + topScorer.goals + ')' : 'n/d'} · fonte=${values.lang}.wikipedia/${title}`,
      );

      if (!APPLY_ON) continue;

      const data = {
        competitionId: comp.id,
        season,
        championId: champion?.clubId ?? null,
        runnerUpId: runnerUp?.clubId ?? null,
        totalMatches: standings.reduce((n, r) => n + (r.played ?? 0), 0) / 2 || null,
        totalGoals: standings.reduce((n, r) => n + (r.goalsFor ?? 0), 0) || null,
        topScorer: (topScorer ?? undefined) as unknown as Prisma.InputJsonValue,
        standings: matched as unknown as Prisma.InputJsonValue,
        sourceUrl: `https://${values.lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        importedFrom: 'wikipedia',
        importedAt: new Date(),
      };
      await prisma.competitionSeason.upsert({
        where: { competitionId_season: { competitionId: comp.id, season } },
        create: data,
        update: {
          standings: data.standings,
          topScorer: data.topScorer,
          championId: data.championId,
          runnerUpId: data.runnerUpId,
          totalMatches: data.totalMatches,
          totalGoals: data.totalGoals,
          sourceUrl: data.sourceUrl,
        },
      });
      console.log(`  ${season}: gravado (upsert idempotente).`);
      await sleep(1000);
    }
    const total = await prisma.competitionSeason.count();
    console.log(`[t508] competition_seasons no acervo: ${total}`);
    void Prisma;
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-competition-seasons')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t508] falha no seed de temporadas');
      process.exit(1);
    });
}
