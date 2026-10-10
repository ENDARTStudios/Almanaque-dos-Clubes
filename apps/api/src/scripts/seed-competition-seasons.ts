/**
 * T508 (W4) — seed de TEMPORADAS de competição (classificação + artilheiro).
 * T510 (W4.1) — generalizado: multi-idioma (pt/en/es/it), template de título
 *   com `{season}`, e suporte a COPA (campeão/vice do infobox + tabela da fase
 *   de grupos). O match de clube passou a ser por QID (resolvido pelo ARTIGO da
 *   Wikipedia via `prop=pageprops`), com fallback por nome — 100% confiável
 *   quando o clube existe no acervo, sem depender de grafia/idioma.
 *
 * Fonte: Wikipedia (HTML renderizado via `action=parse&prop=text`) — a PT monta
 * as tabelas por módulos Lua, então o HTML é obrigatório. Licença CC-BY-SA
 * (atribuição exibida no perfil da competição).
 *
 * Uso:
 *   DRY-RUN (default):
 *     node dist/scripts/seed-competition-seasons.js --competition="La Liga" \
 *       --lang=es --title="Primera División de España {season}" \
 *       --seasons=2021-22,2022-23,2023-24,2024-25
 *   APPLY: ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  parseStandings,
  parseTopScorer,
  parseCupPlacements,
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
    // Título na Wikipedia difere do nome no acervo. Duas formas:
    //  - template:  --title="Serie A {season}" (recomendado; idioma-agnóstico)
    //  - legado PT: --article=<base> --suffix=<sufixo> → "{base} de {ano}{sufixo}"
    title: { type: 'string', default: '' },
    article: { type: 'string', default: '' },
    suffix: { type: 'string', default: '' },
    // Escopo do fallback de match por NOME (país ISO-2). Default: país da competição.
    country: { type: 'string', default: '' },
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

// --- Helpers de casamento de nome (puros, testáveis) ------------------------
import { NAME_ALIASES, normalizeClubName, isJunkClubName } from '../lib/wikipedia/club-match.js';

interface MatchableClub {
  id: string;
  name: string;
}

/**
 * Casa um clube do acervo com a linha da tabela.
 * Ordem: QID (via artigo) → nome exato → alias → normalizado(país) → token único.
 * `null` = recusa honesta (nunca inventa clube).
 */
export async function matchClub(
  prisma: PrismaClient,
  opts: { rawName: string; article?: string | null; qid?: string | null; country?: string | null },
): Promise<MatchableClub | null> {
  // 1) QID é a chave canônica (independe de grafia/idioma)
  if (opts.qid) {
    const byQid = await prisma.club.findFirst({
      where: { qid: opts.qid, deletedAt: null, kind: { not: 'national_team' } },
      select: { id: true, name: true },
    });
    if (byQid) return byQid;
  }

  const cleaned = (opts.rawName ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const alias = NAME_ALIASES[cleaned] ?? NAME_ALIASES[opts.rawName];
  const candidates = [alias, cleaned, opts.article ?? undefined, opts.rawName].filter(
    (x): x is string => !!x,
  );

  // 2) nome EXATO (insensível)
  for (const name of candidates) {
    const exact = await prisma.club.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, name: true },
    });
    if (exact) return exact;
  }

  // 3) NORMALIZADO (remove tipos: F.C./C.F./A.C./Club de Fútbol…), no país da competição
  const normTargets = new Set(candidates.map(normalizeClubName).filter(Boolean));
  if (normTargets.size > 0) {
    const pool = await prisma.club.findMany({
      where: {
        deletedAt: null,
        kind: { not: 'national_team' },
        gender: { not: 'women' },
        ...(opts.country ? { country: opts.country } : {}),
      },
      select: { id: true, name: true },
    });
    const hits = pool.filter((c) => normTargets.has(normalizeClubName(c.name)));
    if (hits.length === 1) return hits[0];
  }

  // 4) FALLBACK: palavra distintiva, escopo do país, sem ruído, único (o mais curto)
  const words = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    // palavra real (>=4 letras) que NÃO seja token de tipo (normalizeClubName→'' se for)
    .filter((w) => /^[a-z]{4,}$/.test(w) && normalizeClubName(w).length > 0);
  const word = words[0];
  if (!word) return null;
  const found = await prisma.club.findMany({
    where: {
      name: { contains: word, mode: 'insensitive' },
      deletedAt: null,
      kind: { not: 'national_team' },
      ...(opts.country ? { country: opts.country } : {}),
    },
    select: { id: true, name: true, gender: true },
  });
  const clean = found
    .filter((c) => c.gender !== 'women' && !isJunkClubName(c.name))
    .sort((a, b) => a.name.length - b.name.length);
  if (clean.length >= 1) {
    // aceita quando o mais curto é claramente o alvo (evita 'United' → clube errado)
    const first = clean[0];
    const second = clean[1];
    if (!second || second.name.length > first.name.length + 4) return first;
  }
  return null; // ambíguo ⇒ recusa honesta
}

/** Resolve QIDs a partir de títulos de artigo da Wikipedia (lotes de 50). */
async function resolveQids(lang: string, titles: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(titles.filter((t) => t && t.length >= 3))];
  const out = new Map<string, string>(); // título original → QID
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const url =
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item` +
      `&titles=${encodeURIComponent(chunk.join('|'))}&redirects=1&format=json&formatversion=2`;
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        query?: {
          normalized?: Array<{ from: string; to: string }>;
          redirects?: Array<{ from: string; to: string }>;
          pages?: Array<{ title?: string; pageprops?: { wikibase_item?: string } }>;
        };
      };
      const norm = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]));
      const redir = new Map((json.query?.redirects ?? []).map((r) => [r.from, r.to]));
      const byTitle = new Map(
        (json.query?.pages ?? [])
          .filter((p) => p.title && p.pageprops?.wikibase_item)
          .map((p) => [p.title as string, p.pageprops?.wikibase_item as string]),
      );
      for (const t of chunk) {
        const t1 = norm.get(t) ?? t;
        const t2 = redir.get(t1) ?? t1;
        const qid = byTitle.get(t2) ?? byTitle.get(t1) ?? byTitle.get(t);
        if (qid) out.set(t, qid);
      }
    } catch {
      /* rede falhou: cai no match por nome */
    }
    await sleep(1000); // rate limit Wikipedia
  }
  return out;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    if (!values.competition || !values.seasons) {
      console.error(
        '[t510] use --competition=<nome|uuid> --seasons=<lista> [--title="...{season}..."]',
      );
      return 1;
    }
    const seasons = values.seasons.split(',').map((s) => s.trim());
    const lang = values.lang ?? 'pt';
    const articleBase = values.article || values.competition;
    const suffix = values.suffix ?? '';
    const titleFor = (season: string): string =>
      values.title
        ? values.title.replace('{season}', season)
        : `${articleBase} de ${season}${suffix}`;
    console.log(
      `[t510] modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'} · lang=${lang} · temporadas=${seasons.join(',')}`,
    );

    // --- competição: por UUID, ou por nome (preferindo o registro canônico) ---
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(values.competition);
    let comp = isUuid
      ? await prisma.competition.findFirst({
          where: { id: values.competition, deletedAt: null },
          select: { id: true, name: true, qid: true, type: true, country: true },
        })
      : null;
    if (!comp) {
      const exact = await prisma.competition.findMany({
        where: { name: { equals: values.competition, mode: 'insensitive' }, deletedAt: null },
        select: { id: true, name: true, qid: true, type: true, country: true },
      });
      // Há homônimas (ex.: 'Premier League' = inglesa GB Q9448 e ucraniana UA
      // Q206073). O `--country` desempata — sem ele, casaria a competição errada
      // (visto 10/10: os dados da INGLESA iriam para a UCRAINIANA).
      const scoped = values.country ? exact.filter((c) => c.country === values.country) : exact;
      const pool = scoped.length > 0 ? scoped : exact;
      comp = pool.sort((a, b) => (b.qid ? 1 : 0) - (a.qid ? 1 : 0))[0] ?? null;
    }
    if (!comp) {
      console.log(`[t510] competição "${values.competition}" não está no acervo — recusa honesta.`);
      return 0;
    }
    const isCup = comp.type === 'CUP';
    const country = values.country || comp.country || null;
    console.log(
      `  competição: ${comp.name} (${comp.id}) · tipo=${comp.type} · país=${country ?? '—'}`,
    );

    for (const season of seasons) {
      const title = titleFor(season);
      const html = await fetchArticleHtml(lang, title);
      if (!html) {
        console.log(`  ${season}: artigo "${title}" não existe — nada a fazer.`);
        continue;
      }
      const topScorer = parseTopScorer(html);

      // --- linhas: liga (classificação) ou copa (tabela combinada da fase de grupos)
      const standings: StandingRow[] = isCup
        ? parseStandings(html, { requireGroup: true, minRows: 8 })
        : parseStandings(html);
      const placements = isCup ? parseCupPlacements(html) : null;

      if (!isCup && standings.length < 4) {
        console.log(
          `  ${season}: classificação não encontrada no artigo (${standings.length} linhas).`,
        );
        continue;
      }
      if (isCup && !placements?.champion && standings.length < 8) {
        console.log(`  ${season}: copa sem colocações finais nem tabela de grupos — nada a fazer.`);
        continue;
      }

      // --- resolve QIDs dos clubes (linhas + campeão/vice) via Wikipedia
      const articleTitles = [
        ...standings.map((r) => r.clubArticle).filter((a): a is string => !!a),
        placements?.championArticle,
        placements?.runnerUpArticle,
      ].filter((a): a is string => !!a);
      const qidMap = await resolveQids(lang, articleTitles);

      // --- match de clubes
      const matched: Array<StandingRow & { clubId: string | null; matchedName: string | null }> =
        [];
      for (const row of standings) {
        const qid = row.clubArticle ? qidMap.get(row.clubArticle) : undefined;
        const club = await matchClub(prisma, {
          rawName: row.clubName,
          article: row.clubArticle,
          qid: qid ?? null,
          country,
        });
        matched.push({ ...row, clubId: club?.id ?? null, matchedName: club?.name ?? null });
      }
      const withClub = matched.filter((m) => m.clubId).length;
      const unmatched = matched.filter((m) => !m.clubId).map((m) => m.clubName);

      // campeão/vice: copa (infobox) ou liga (posição 1/2)
      const resolvePlacement = async (
        name: string | null | undefined,
        article: string | null | undefined,
      ): Promise<MatchableClub | null> => {
        if (!name) return null;
        const qid = article ? qidMap.get(article) : undefined;
        return matchClub(prisma, {
          rawName: name,
          article: article ?? null,
          qid: qid ?? null,
          country,
        });
      };
      const champion = isCup
        ? await resolvePlacement(placements?.champion, placements?.championArticle)
        : await resolvePlacement(
            matched.find((m) => m.position === 1)?.clubName,
            matched.find((m) => m.position === 1)?.clubArticle,
          );
      const runnerUp = isCup
        ? await resolvePlacement(placements?.runnerUp, placements?.runnerUpArticle)
        : await resolvePlacement(
            matched.find((m) => m.position === 2)?.clubName,
            matched.find((m) => m.position === 2)?.clubArticle,
          );

      console.log(
        `  ${season}: ${isCup ? 'copa' : 'liga'} · linhas=${standings.length} · casados=${withClub}` +
          ` · campeão=${champion?.name ?? placements?.champion ?? '?'}` +
          ` · vice=${runnerUp?.name ?? placements?.runnerUp ?? '?'}` +
          ` · artilheiro=${topScorer ? topScorer.name + ' (' + topScorer.goals + ')' : 'n/d'}` +
          (unmatched.length > 0 ? ` · SEM-MATCH=[${unmatched.join(', ')}]` : '') +
          ` · fonte=${lang}.wikipedia/${title}`,
      );

      if (!APPLY_ON) continue;

      const data = {
        competitionId: comp.id,
        season,
        championId: champion?.id ?? null,
        runnerUpId: runnerUp?.id ?? null,
        totalMatches:
          !isCup && standings.length > 0
            ? standings.reduce((n, r) => n + (r.played ?? 0), 0) / 2 || null
            : parseInfoboxInt(html, /Partidas|Matches played|Partidos|Partite/i),
        totalGoals:
          !isCup && standings.length > 0
            ? standings.reduce((n, r) => n + (r.goalsFor ?? 0), 0) || null
            : parseInfoboxInt(html, /Gol\(o\)s|Goals scored|Goles|Reti/i),
        topScorer: (topScorer ?? undefined) as unknown as Prisma.InputJsonValue,
        standings:
          matched.length > 0 ? (matched as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        sourceUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
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
    console.log(`[t510] competition_seasons no acervo: ${total}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

/** Lê um inteiro do infobox a partir de um rótulo (ex.: "Partidas</th><td>155"). */
export function parseInfoboxInt(html: string, label: RegExp): number | null {
  const re = new RegExp(`>(?:${label.source})\\s*</th>\\s*<td[^>]*>\\s*([\\d.]+)`, 'i');
  const m = re.exec(html);
  if (!m) return null;
  const n = Number.parseInt(m[1].replace(/\./g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

if (process.argv[1]?.includes('seed-competition-seasons')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t510] falha no seed de temporadas');
      process.exit(1);
    });
}
