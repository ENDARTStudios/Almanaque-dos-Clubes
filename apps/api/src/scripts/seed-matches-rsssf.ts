/**
 * T519 — seed de PARTIDAS históricas a partir da RSSSF.
 *
 * Fonte: RSSSF (Rec.Sport.Soccer Statistics Foundation) — páginas em texto puro
 * (`<pre>`), codificação windows-1252, com data/placar/autores dos gols por
 * rodada. Licença: "You are free to copy this document in whole or part provided
 * that proper acknowledgement is given to the author" — por isso toda partida
 * grava `license='RSSSF'` + `sourceUrl` da página, e o /metodologia credita a
 * fundação (atribuição obrigatória).
 *
 * O que este script NÃO faz (por desenho, T519):
 *  - não inventa placar: linha sem placar não vira partida;
 *  - não inventa data: o ano sai do contexto da temporada (BR/Libertadores: ano
 *    civil; Premier League: temporada cruzada — mês ≥ 7 é o ano de início);
 *  - não casa clube ambíguo: token com >1 candidato vira gap declarado;
 *  - não grava jogo abandonado (`abd`) nem agregado de mata-mata sem data por jogo.
 *
 * Uso:
 *   DRY-RUN (default):
 *     node dist/scripts/seed-matches-rsssf.js --source=br --seasons=2021,2022,2023,2024
 *   APPLY (lotes de 500, idempotente):
 *     node dist/scripts/seed-matches-rsssf.js --source=br --apply
 *   Relatório de resolução de clubes (sem parsear partidas):
 *     node dist/scripts/seed-matches-rsssf.js --source=lib --resolve-report
 *   Arquivo local (dev/teste): --file=D:/caminho/braz2023.html
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { decodeLegacyBytes } from '../lib/rsssf/decode-legacy-table.js';
import {
  parseRsssfMatches,
  matchDate,
  resolveCrossYears,
  type RsssfMatch,
  type RsssfSourceKind,
} from '../lib/rsssf/match-parser.js';
import {
  resolveRsssfTeam,
  CONMEBOL_COUNTRIES,
  type ClubCandidate,
} from '../lib/rsssf/team-resolver.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const UA =
  'AlmanaqueDosClubes/0.1 (rsssf matches seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const BATCH = 500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Campos de clube usados na resolução (a mesma projeção nos dois pools). */
const CLUB_FIELDS = {
  id: true,
  name: true,
  country: true,
  state: true,
  gender: true,
  qid: true,
  city: true,
} as const;

export interface SeasonSpec {
  /** Rótulo da temporada como o acervo usa (ex.: "2023", "2023-24"). */
  label: string;
  /** Sufixo do arquivo na RSSSF (ex.: braz2023, eng2024, copa2023). */
  file: string;
  /** Ano inicial da temporada (na PL, a temporada 2023-24 começa em 2023). */
  yearStart: number;
  mode: 'single' | 'cross';
  /** Em `single`: meses <= spillAfter pertencem ao ano seguinte (BR 2020 → jan/fev 2021). */
  spillAfter?: number;
}

export interface SourceSpec {
  competitionQid: string;
  kind: RsssfSourceKind;
  countries: string[];
  url: (file: string) => string;
  seasons: SeasonSpec[];
}

const brSeason = (y: number): SeasonSpec => ({
  label: String(y),
  file: `braz${y}`,
  yearStart: y,
  mode: 'single',
});
const libSeason = (y: number): SeasonSpec => ({
  label: String(y),
  file: `copa${y}`,
  yearStart: y,
  mode: 'single',
});

const ligue1Season = (start: number): SeasonSpec => ({
  label: `${start}-${start + 1}`, // acervo usa '2023-2024'
  file: String(start + 1),
  yearStart: start,
  mode: 'cross',
});
const bundesligaSeason = (start: number): SeasonSpec => ({
  label: `${start}/${String(start + 1).slice(2)}`, // acervo usa '2023/24'
  file: String(start + 1),
  yearStart: start,
  mode: 'cross',
});
/** La Liga: a página é nomeada pelo ano de TÉRMINO (span2016 = 2015-16) e o
 * acervo rotula '2015-16' (dois dígitos no fim, como a Premier League). */
const laligaSeason = (start: number): SeasonSpec => ({
  label: `${start}-${String(start + 1).slice(2)}`,
  file: String(start + 1),
  yearStart: start,
  mode: 'cross',
});
/** Serie A italiana: também nomeada pelo ano de término, mas o acervo rotula com
 * os dois anos completos ('2015-2016', como a Ligue 1). */
const serieaSeason = (start: number): SeasonSpec => ({
  label: `${start}-${start + 1}`,
  file: String(start + 1),
  yearStart: start,
  mode: 'cross',
});

export const SOURCES: Record<string, SourceSpec> = {
  ligue1: {
    competitionQid: 'Q13394',
    kind: 'league',
    countries: ['FR'],
    url: (f) => `https://www.rsssf.org/tablesf/fran${f}.html`,
    seasons: [2023, 2024].map(ligue1Season),
  },
  bundesliga: {
    competitionQid: 'Q82595',
    kind: 'league',
    countries: ['DE'],
    url: (f) => `https://www.rsssf.org/tablesd/duit${f}.html`,
    seasons: [2023, 2024].map(bundesligaSeason),
  },
  br: {
    competitionQid: 'Q206813', // Campeonato Brasileiro Série A (verificado no acervo)
    kind: 'league',
    countries: ['BR'],
    url: (f) => `https://www.rsssf.org/tablesb/${f}.html`,
    seasons: [
      // T529 — 2015-2019 (2019 e anteriores: mesmas seções, cabeçalho de rodada
      // tanto puro quanto com a data no colchete).
      ...[2015, 2016, 2017, 2018, 2019].map(brSeason),
      { ...brSeason(2020), spillAfter: 5 }, // Covid: temporada vaza para jan/fev de 2021
      ...[2021, 2022, 2023, 2024].map(brSeason),
      // 2025 fica FORA: a página não publica rodada a rodada (só tabela final).
    ],
  },
  pl: {
    competitionQid: 'Q9448', // Premier League
    kind: 'league',
    countries: ['GB'],
    // A página inglesa é nomeada pelo ano de TÉRMINO: eng2024 = temporada 2023-24.
    url: (f) => `https://www.rsssf.org/tablese/${f}.html`,
    seasons: [
      // T529 — 2015-16 a 2021-22 (eng2016..eng2022). 2025-26 fica FORA: a página
      // eng2026 ainda não publica rodada a rodada (o parser acha 216 jogos de 124
      // clubes, sinal de bloco deslocado — melhor gap declarado que dado sujo).
      // 2019-20 (Covid) jogou até 26/jul/2020: corte em agosto.
      ...[2015, 2016, 2017, 2018, 2019, 2020, 2021].map((start) => ({
        label: `${start}-${String(start + 1).slice(2)}`,
        file: `eng${start + 1}`,
        yearStart: start,
        mode: 'cross' as const,
      })),
      { label: '2022-23', file: 'eng2023', yearStart: 2022, mode: 'cross' },
      { label: '2023-24', file: 'eng2024', yearStart: 2023, mode: 'cross' },
      { label: '2024-25', file: 'eng2025', yearStart: 2024, mode: 'cross' },
    ],
  },
  // T529 — La Liga (Espanha). O diretório é `tabless` (dois "s"): `tablesp` é
  // Portugal. A página tem La Liga, Copa del Rey e Segunda na mesma página —
  // o corte na tabela final isola as rodadas da primeira divisão.
  laliga: {
    competitionQid: 'Q324867',
    kind: 'league',
    countries: ['ES'],
    url: (f) => `https://www.rsssf.org/tabless/span${f}.html`,
    // 2015-16 a 2024-25 (10 temporadas) — TODAS com 380 jogos validados. 2025-26
    // fica fora (a página só tem um trecho: 12 jogos). 2019-20 (Covid) jogou até
    // 19/jul/2020 → corte em agosto.
    seasons: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map(laligaSeason),
  },
  // T529 — Serie A italiana (rótulo do acervo com os dois anos completos).
  seriea: {
    competitionQid: 'Q15804',
    kind: 'league',
    countries: ['IT'],
    url: (f) => `https://www.rsssf.org/tablesi/ital${f}.html`,
    // 2015-16 a 2024-25. 2025-26 fica fora (a página não publica rodada a rodada).
    // 2019-20 (Covid) jogou até 2/ago/2020 → corte em SETEMBRO (é a única que
    // atravessa agosto).
    seasons: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map(serieaSeason),
  },
  lib: {
    competitionQid: 'Q184795', // Copa Libertadores
    kind: 'libertadores',
    // T529 — além da CONMEBOL, o MÉXICO: clubes mexicanos jogaram a Libertadores
    // como convidados (Atlas, Pumas, Toluca, Tigres). Sem `MX` no escopo, o alias do
    // Atlas mexicano era bloqueado e a cascata caía no Atlas ARGENTINO.
    countries: [...CONMEBOL_COUNTRIES, 'MX'],
    url: (f) => `https://www.rsssf.org/sacups/${f}.html`,
    // T529 — 2015 a 2021 somam-se a 2022-2024. 2025 não existe na fonte (404).
    // 2020 (Covid) teve a FINAL em 30/jan/2021: é o único jogo daquele ano em
    // jan/fev, então o `spillAfter: 1` acerta a final sem mexer no resto.
    seasons: [
      ...[2015, 2016, 2017, 2018, 2019].map(libSeason),
      { ...libSeason(2020), spillAfter: 1 },
      ...[2021, 2022, 2023, 2024].map(libSeason),
    ],
  },
};

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`RSSSF HTTP ${res.status} em ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeLegacyBytes(buf); // windows-1252 (acentos: Atlético, São Paulo, Ñublense)
}

interface MatchPlan {
  homeClubId: string;
  awayClubId: string;
  date: Date;
  competitionId: string;
  seasonId: string | null;
  seasonLabel: string;
  round: string;
  homeScore: number;
  awayScore: number;
  scorers: unknown | null;
  sourceNote: string | null;
  dedupKey: string;
  sourceUrl: string;
}

export interface SeedReport {
  source: string;
  parsed: number;
  plan: MatchPlan[];
  unresolved: Map<string, { count: number; reason: string }>;
  skipped: Map<string, number>;
  warnings: string[];
}

function candidateFrom(row: {
  id: string;
  name: string;
  country: string | null;
  state: string | null;
  gender: string;
  qid: string | null;
  city?: string | null;
}): ClubCandidate {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    state: row.state,
    gender: row.gender,
    qid: row.qid,
    city: row.city ?? null,
  };
}

/** Monta o plano de ingestão (puro quanto a I/O de banco — recebe os pools prontos). */
export function buildPlan(
  matches: RsssfMatch[],
  ctx: {
    source: SourceSpec;
    season: SeasonSpec;
    competitionId: string;
    seasonId: string | null;
    globalPool: ClubCandidate[];
    /** Clubes que o acervo já usa na competição+temporada (desambigua homônimos). */
    seasonPool?: ClubCandidate[];
    competitionName: string;
  },
): SeedReport {
  const unresolved = new Map<string, { count: number; reason: string }>();
  const skipped = new Map<string, number>();
  const plan: MatchPlan[] = [];
  const warnings: string[] = [];
  const cache = new Map<string, string | null>();

  const resolve = (token: string): string | null => {
    if (cache.has(token)) return cache.get(token) ?? null;
    const r = resolveRsssfTeam(token, {
      globalPool: ctx.globalPool,
      seasonPool: ctx.seasonPool,
      countries: ctx.source.countries,
    });
    const id = r.club?.id ?? null;
    if (!id) {
      const reason =
        r.ambiguousWith.length > 0
          ? `ambíguo: ${r.ambiguousWith.slice(0, 4).join(', ')}`
          : 'sem candidato';
      const cur = unresolved.get(token) ?? { count: 0, reason };
      cur.count++;
      unresolved.set(token, cur);
    }
    cache.set(token, id);
    return id;
  };

  // T529 — ano por SEQUÊNCIA nas temporadas cruzadas (a Covid esticou 2019-20 até
  // agosto de 2020, com agosto nos dois extremos: nenhum corte de mês resolve).
  const crossYears =
    ctx.season.mode === 'cross' ? resolveCrossYears(matches, ctx.season.yearStart) : null;

  for (const [idx, m] of matches.entries()) {
    const homeId = resolve(m.homeName);
    const awayId = resolve(m.awayName);
    if (!homeId || !awayId) {
      const key = 'clube não resolvido';
      skipped.set(key, (skipped.get(key) ?? 0) + 1);
      continue;
    }
    if (homeId === awayId) {
      skipped.set('mandante = visitante', (skipped.get('mandante = visitante') ?? 0) + 1);
      continue;
    }
    const date = matchDate(m, {
      mode: 'single',
      year: crossYears ? crossYears[idx]! : ctx.season.yearStart,
      spillAfter: crossYears ? undefined : ctx.season.spillAfter,
    });
    const iso = date.toISOString().slice(0, 10);
    plan.push({
      homeClubId: homeId,
      awayClubId: awayId,
      date,
      competitionId: ctx.competitionId,
      seasonId: ctx.seasonId,
      seasonLabel: ctx.season.label,
      round: m.round,
      homeScore: m.homeGoals,
      awayScore: m.awayGoals,
      scorers: m.scorers
        ? {
            raw: m.scorers.raw,
            home: m.scorers.home,
            away: m.scorers.away,
            sidesVerified: m.scorers.sidesVerified,
          }
        : null,
      sourceNote: m.sourceNote,
      dedupKey: `rsssf|${ctx.competitionId}|${ctx.season.label}|${iso}|${homeId}|${awayId}`,
      sourceUrl: ctx.source.url(ctx.season.file),
    });
  }

  // Duplicidade interna da própria fonte (data+par repetidos) — barreira antes do banco.
  const seen = new Map<string, number>();
  for (const p of plan) seen.set(p.dedupKey, (seen.get(p.dedupKey) ?? 0) + 1);
  const dup = [...seen.entries()].filter(([, n]) => n > 1);
  if (dup.length) warnings.push(`dedupKey repetido na fonte: ${dup.length}`);

  return { source: '', parsed: matches.length, plan, unresolved, skipped, warnings };
}

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      source: { type: 'string' },
      seasons: { type: 'string' },
      file: { type: 'string' },
      limit: { type: 'string' },
      'resolve-report': { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  const sourceKey = values.source ?? '';
  const source = SOURCES[sourceKey];
  if (!source) {
    console.error('--source obrigatório: br | pl | lib | ligue1 | bundesliga | laliga | seriea');
    return 2;
  }
  const limit = values.limit ? Number.parseInt(values.limit, 10) : Number.POSITIVE_INFINITY;

  const prisma = new PrismaClient();
  try {
    const competition = await prisma.competition.findFirst({
      where: { qid: source.competitionQid },
      select: { id: true, name: true },
    });
    if (!competition) {
      console.error(`competição ${source.competitionQid} ausente no acervo`);
      return 3;
    }

    // Pool global: clubes masculinos ativos dos países aceitos.
    const globalPool = (
      await prisma.club.findMany({
        where: { deletedAt: null, gender: 'men', country: { in: source.countries } },
        select: CLUB_FIELDS,
      })
    ).map(candidateFrom);

    const wanted = values.seasons
      ? source.seasons.filter((s) => values.seasons!.split(',').includes(s.label))
      : source.seasons;

    let totalPlanned = 0;
    let totalCreated = 0;
    const allUnresolved = new Map<string, { count: number; reason: string }>();
    const allSkipped = new Map<string, number>();

    for (const season of wanted) {
      const html = values.file
        ? readFileSync(values.file, 'utf8')
        : await fetchPage(source.url(season.file));
      // A RSSSF libera cópia com atribuição e não tem robots.txt, mas o acesso
      // automatizado deve ser contido: 1 página por vez, ~1 req/s.
      if (!values.file) await sleep(1000);
      const parsed = parseRsssfMatches(html, { kind: source.kind });

      // Pool da temporada: os clubes que o PRÓPRIO acervo já usa nesta competição
      // e nesta temporada (classificação ingerida em T508+). É o desambiguador
      // mais forte que existe — o acervo tem homônimos ("Sociedade Esportiva
      // Palmeiras" ×2, "Cruzeiro E.C." ×2...) e esta é a escolha que ele já fez.
      const compSeason = await prisma.competitionSeason.findFirst({
        where: { competitionId: competition.id, season: season.label },
        select: { standings: true },
      });
      const poolIds = new Set<string>();
      const seasonRows = (compSeason?.standings as Array<{ clubId?: string | null }> | null) ?? [];
      for (const r of seasonRows) if (r?.clubId) poolIds.add(r.clubId);
      const seasonPool = poolIds.size
        ? (
            await prisma.club.findMany({
              where: { id: { in: [...poolIds] }, deletedAt: null },
              select: CLUB_FIELDS,
            })
          ).map(candidateFrom)
        : [];

      if (values['resolve-report']) {
        const tokens = new Set(parsed.matches.flatMap((m) => [m.homeName, m.awayName]));
        console.log(
          `\n[${sourceKey} ${season.label}] tokens=${tokens.size} poolTemporada=${seasonPool.length}`,
        );
        for (const t of [...tokens].sort()) {
          const r = resolveRsssfTeam(t, {
            globalPool,
            seasonPool,
            countries: source.countries,
          });
          console.log(
            `  ${t.padEnd(26)} ${r.club ? `-> ${r.club.name} (${r.via})` : `NAO RESOLVIDO ${r.ambiguousWith.slice(0, 4).join(' | ')}`}`,
          );
        }
        continue;
      }

      // Season do acervo (model Season) — find-or-create por nome.
      let seasonId: string | null = null;
      const existingSeason = await prisma.season.findFirst({ where: { name: season.label } });
      if (existingSeason) seasonId = existingSeason.id;
      else if (APPLY) {
        const created = await prisma.season.create({
          data: { name: season.label, status: 'FINISHED' },
        });
        seasonId = created.id;
      }

      const report = buildPlan(parsed.matches, {
        source,
        season,
        competitionId: competition.id,
        seasonId,
        globalPool,
        seasonPool,
        competitionName: competition.name,
      });
      report.source = `${sourceKey}:${season.label}`;
      for (const [k, v] of report.unresolved) {
        const cur = allUnresolved.get(k) ?? { count: 0, reason: v.reason };
        cur.count += v.count;
        allUnresolved.set(k, cur);
      }
      for (const [k, v] of report.skipped) allSkipped.set(k, (allSkipped.get(k) ?? 0) + v);

      const batch = report.plan.slice(0, limit === Infinity ? undefined : limit);
      totalPlanned += batch.length;

      console.log(
        `\n[${sourceKey} ${season.label}] parseadas=${parsed.matches.length} planejadas=${batch.length} ` +
          `avisos=${parsed.warnings.length}${parsed.warnings.length ? ` (${parsed.warnings[0]})` : ''}`,
      );

      if (APPLY && batch.length) {
        let created = 0;
        for (let i = 0; i < batch.length; i += BATCH) {
          const chunk = batch.slice(i, i + BATCH);
          const res = await prisma.match.createMany({
            data: chunk.map((p) => ({
              homeClubId: p.homeClubId,
              awayClubId: p.awayClubId,
              date: p.date,
              competitionId: p.competitionId,
              seasonId: p.seasonId,
              homeScore: p.homeScore,
              awayScore: p.awayScore,
              round: p.round,
              status: 'FINISHED' as const,
              importedFrom: 'rsssf',
              importedAt: new Date(),
              sourceUrl: p.sourceUrl,
              license: 'RSSSF',
              dedupKey: p.dedupKey,
              scorers: (p.scorers ?? Prisma.DbNull) as unknown as Prisma.InputJsonValue,
              sourceNote: p.sourceNote,
            })),
            skipDuplicates: true,
          });
          created += res.count;
        }
        totalCreated += created;
        console.log(`  aplicado: criadas=${created} puladas(existentes)=${batch.length - created}`);
      }
    }

    if (!values['resolve-report']) {
      console.log('\n--- não resolvidos ---');
      if (allUnresolved.size === 0) console.log('  nenhum');
      for (const [token, info] of [...allUnresolved].sort((a, b) => b[1].count - a[1].count)) {
        console.log(
          `  ${token.padEnd(26)} jogos=${String(info.count).padStart(3)} (${info.reason})`,
        );
      }
      console.log('--- pulados ---');
      if (allSkipped.size === 0) console.log('  nenhum');
      for (const [k, v] of allSkipped) console.log(`  ${k}: ${v}`);
      const inDb = await prisma.match.count();
      console.log(
        `\n[${sourceKey}] planejadas=${totalPlanned}${APPLY ? ` criadas=${totalCreated}` : ' (dry-run)'} total na tabela matches=${inDb}`,
      );
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-matches-rsssf')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t519] falha no seed de partidas');
      process.exit(1);
    });
}
