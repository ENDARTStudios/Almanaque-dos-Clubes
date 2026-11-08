/**
 * T606 — ingestão das PARTIDAS da fase de grupos da Copa Libertadores 2021
 * (96 jogos) a partir da Wikipedia.
 *
 * Fonte PRIMÁRIA: EN `2021_Copa_Libertadores_group_stage` (oldid 1363263442) —
 * caixas `footballbox` com data ISO e microdata (parser mais simples e robusto).
 * Fonte SECUNDÁRIA (opcional, --pt-file): PT `Fase_de_grupos_da_Copa_
 * Libertadores_da_América_de_2021` — cross-check de placar e FONTE DO VENUE.
 * Mata-mata NÃO é ingerido (a página de grupos não o tem; agregados sem data
 * são gap declarado).
 *
 * Licença: CC BY-SA 4.0 — cada partida grava `license='Wikipedia CC BY-SA 4.0'`,
 * `sourceUrl` COM oldid e `importedFrom='wikipedia'` (lote reversível por
 * proveniência: `DELETE FROM matches WHERE "importedFrom"='wikipedia' AND
 * "dedupKey" LIKE 'wikipedia|%'`).
 *
 * Resolução de clube: NOME/ARTIGO → QID por mapa FIXO (QIDs validados na
 * Wikidata via sitelinks + scout do T606) → clube do acervo por `club.qid`.
 * SEM fuzzy: nome fora do mapa = skip contado, NUNCA chute.
 *
 * Idempotência (regra do projeto): upsert por dedupKey
 * `wikipedia|<competitionId>|<season>|<dateISO>|<homeClubId>|<awayClubId>`;
 * jogo existente COM placar = noop; jogo existente SEM placar agora com placar
 * = update honesto (preenche só o que estava NULL).
 *
 * Uso:
 *   DRY-RUN (default):
 *     tsx src/scripts/ingest-wikipedia-matches.ts --file=tests/fixtures/wikipedia-matches-lib2021-group-stage.html
 *   APPLY:
 *     tsx src/scripts/ingest-wikipedia-matches.ts --apply --file=<html EN> [--pt-file=<html PT>] \
 *       --competition-id=<uuid> --season=2021
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  parseWikipediaGroupMatches,
  type WikiMatchParsed,
} from '../modules/etl/connectors/wikipedia-matches.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');

/**
 * Artigo EN com oldid (a revisão usada no parse; mudou o artigo, muda o oldid).
 * Licença do conteúdo: CC BY-SA 4.0.
 */
export const DEFAULT_SOURCE_URL =
  'https://en.wikipedia.org/wiki/2021_Copa_Libertadores_group_stage?oldid=1363263442';
export const LICENSE = 'Wikipedia CC BY-SA 4.0';
export const IMPORTED_FROM = 'wikipedia';

// O mapa FIXO nome→QID (32 clubes validados) vive no connector — é usado
// tanto no casamento PT↔EN do cross-check quanto aqui na resolução do acervo.
export {
  CLUB_QID_MAP,
  normalizeTeamKey,
  resolveTeamQid,
} from '../modules/etl/connectors/wikipedia-matches.connector.js';
import { resolveTeamQid } from '../modules/etl/connectors/wikipedia-matches.connector.js';

// ---------------------------------------------------------------------------
// Plano (puro quanto a banco — recebe clubByQid pronto)
// ---------------------------------------------------------------------------
export interface PlanMatch {
  dedupKey: string;
  date: Date;
  competitionId: string;
  seasonId: string | null;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  round: string;
  venue: string | null;
  sourceUrl: string;
}

export interface IngestPlan {
  creates: PlanMatch[];
  /** Jogo existente sem placar que agora ganha placar (update honesto). */
  updates: Array<{ id: string; dedupKey: string; data: Record<string, unknown> }>;
  /** Jogo existente com placar — noop. */
  noops: number;
  /** Motivos de skip, agregados (ex.: "clube sem QID no mapa: Rentistas FC"). */
  skipped: Map<string, number>;
  warnings: string[];
}

export interface PlanContext {
  competitionId: string;
  seasonLabel: string;
  seasonId: string | null;
  sourceUrl: string;
  /** QID do clube → id no acervo (só clubes existentes, deletedAt null). */
  clubByQid: Map<string, { id: string; name: string }>;
}

export function buildIngestPlan(matches: WikiMatchParsed[], ctx: PlanContext): IngestPlan {
  const skipped = new Map<string, number>();
  const warnings: string[] = [];
  const creates: PlanMatch[] = [];
  const qidCache = new Map<string, string | null>();

  const resolveQid = (name: string, article: string | null): string | null => {
    // 1º o ARTIGO da Wikipedia (título canônico da fonte), depois o texto.
    for (const candidate of [article, name]) {
      if (!candidate) continue;
      if (!qidCache.has(candidate)) {
        const qid = resolveTeamQid(candidate);
        qidCache.set(candidate, qid);
      }
      const qid = qidCache.get(candidate) ?? null;
      if (qid) return qid;
    }
    return null;
  };

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) {
      skipped.set('sem placar na fonte', (skipped.get('sem placar na fonte') ?? 0) + 1);
      continue;
    }
    if (!m.dateIso) {
      skipped.set(
        `sem data na fonte (${m.group} ${m.homeTeam} × ${m.awayTeam})`,
        (skipped.get(`sem data na fonte (${m.group} ${m.homeTeam} × ${m.awayTeam})`) ?? 0) + 1,
      );
      continue;
    }
    const homeQid = resolveQid(m.homeTeam, m.homeArticle);
    const awayQid = resolveQid(m.awayTeam, m.awayArticle);
    if (!homeQid || !awayQid) {
      const names = [
        !homeQid ? (m.homeArticle ?? m.homeTeam) : null,
        !awayQid ? (m.awayArticle ?? m.awayTeam) : null,
      ]
        .filter(Boolean)
        .join(', ');
      skipped.set(
        `clube sem QID no mapa: ${names}`,
        (skipped.get(`clube sem QID no mapa: ${names}`) ?? 0) + 1,
      );
      continue;
    }
    const homeClub = ctx.clubByQid.get(homeQid);
    const awayClub = ctx.clubByQid.get(awayQid);
    if (!homeClub || !awayClub) {
      const missing = [!homeClub ? homeQid : null, !awayClub ? awayQid : null]
        .filter(Boolean)
        .join(', ');
      skipped.set(
        `QID sem clube no acervo: ${missing}`,
        (skipped.get(`QID sem clube no acervo: ${missing}`) ?? 0) + 1,
      );
      continue;
    }
    if (homeClub.id === awayClub.id) {
      skipped.set('mandante = visitante', (skipped.get('mandante = visitante') ?? 0) + 1);
      continue;
    }
    creates.push({
      dedupKey: `wikipedia|${ctx.competitionId}|${ctx.seasonLabel}|${m.dateIso}|${homeClub.id}|${awayClub.id}`,
      date: new Date(`${m.dateIso}T00:00:00Z`),
      competitionId: ctx.competitionId,
      seasonId: ctx.seasonId,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      round: m.group,
      venue: m.venue,
      sourceUrl: ctx.sourceUrl,
    });
  }

  // Duplicidade interna da fonte (mesma data+par) — barreira antes do banco.
  const seen = new Map<string, number>();
  for (const p of creates) seen.set(p.dedupKey, (seen.get(p.dedupKey) ?? 0) + 1);
  const dup = [...seen.entries()].filter(([, n]) => n > 1);
  if (dup.length) warnings.push(`dedupKey repetido na fonte: ${dup.length}`);

  return { creates, updates: [], noops: 0, skipped, warnings };
}

/** Separa creates vs updates vs noops contra o que JÁ está no banco. */
export function applyExisting(
  plan: IngestPlan,
  existing: Array<{
    id: string;
    dedupKey: string | null;
    homeScore: number | null;
    awayScore: number | null;
    round: string | null;
    venue: string | null;
  }>,
): IngestPlan {
  const byKey = new Map(existing.filter((e) => e.dedupKey).map((e) => [e.dedupKey!, e]));
  const out: IngestPlan = {
    ...plan,
    creates: [],
    updates: [],
    noops: 0,
  };
  for (const p of plan.creates) {
    const hit = byKey.get(p.dedupKey);
    if (!hit) {
      out.creates.push(p);
      continue;
    }
    if (hit.homeScore !== null && hit.awayScore !== null) {
      out.noops++;
      continue;
    }
    // Update honesto: preenche só o que estava NULL (zero overwrite do resto).
    const data: Record<string, unknown> = {};
    if (hit.homeScore === null) data.homeScore = p.homeScore;
    if (hit.awayScore === null) data.awayScore = p.awayScore;
    if (hit.round === null) data.round = p.round;
    if (hit.venue === null && p.venue) data.venue = p.venue;
    out.updates.push({ id: hit.id, dedupKey: p.dedupKey, data });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      apply: { type: 'boolean', default: false },
      file: { type: 'string' },
      'pt-file': { type: 'string' },
      'competition-id': { type: 'string' },
      'competition-qid': { type: 'string' },
      season: { type: 'string' },
      'source-url': { type: 'string' },
    },
  });
  if (!values.file) {
    console.error('--file=<html EN> obrigatório');
    return 2;
  }
  const seasonLabel = values.season ?? '2021';
  const seasonYear = Number.parseInt(seasonLabel, 10);
  const sourceUrl = values['source-url'] ?? DEFAULT_SOURCE_URL;

  const enHtml = readFileSync(values.file, 'utf8');
  const ptHtml = values['pt-file'] ? readFileSync(values['pt-file'], 'utf8') : undefined;
  const { matches, warnings } = parseWikipediaGroupMatches(enHtml, {
    ptHtml,
    seasonYear,
  });

  const prisma = new PrismaClient();
  try {
    const competition = values['competition-id']
      ? await prisma.competition.findFirst({
          where: { id: values['competition-id'], deletedAt: null },
          select: { id: true, name: true, qid: true },
        })
      : values['competition-qid']
        ? await prisma.competition.findFirst({
            where: { qid: values['competition-qid'], deletedAt: null },
            select: { id: true, name: true, qid: true },
          })
        : null;
    if (!competition) {
      console.error(
        'competição não encontrada: informe --competition-id=<uuid> ou --competition-qid=Q184795',
      );
      return 2;
    }

    // QIDs distintos da fonte → clubes do acervo (pool mínimo).
    const qids = new Set<string>();
    for (const m of matches) {
      for (const [name, article] of [
        [m.homeTeam, m.homeArticle],
        [m.awayTeam, m.awayArticle],
      ] as const) {
        const qid = resolveQidFrom(name, article);
        if (qid) qids.add(qid);
      }
    }
    const clubs = qids.size
      ? await prisma.club.findMany({
          where: { qid: { in: [...qids] }, deletedAt: null },
          select: { id: true, name: true, qid: true },
        })
      : [];
    const clubByQid = new Map<string, { id: string; name: string }>();
    for (const c of clubs) if (c.qid) clubByQid.set(c.qid, { id: c.id, name: c.name });

    // Season do acervo (a edição Libertadores 2021 já linka a Season '2021').
    let seasonId: string | null = null;
    const existingSeason = await prisma.season.findFirst({ where: { name: seasonLabel } });
    if (existingSeason) seasonId = existingSeason.id;
    else if (APPLY) {
      const created = await prisma.season.create({
        data: { name: seasonLabel, status: 'FINISHED' },
      });
      seasonId = created.id;
    } else {
      warnings.push(`Season '${seasonLabel}' ausente no acervo (dry-run; --apply cria)`);
    }

    const plan = buildIngestPlan(matches, {
      competitionId: competition.id,
      seasonLabel,
      seasonId,
      sourceUrl,
      clubByQid,
    });
    for (const w of warnings) plan.warnings.push(w);

    // Idempotência: lê o que já existe com essas dedupKeys.
    const existing = plan.creates.length
      ? await prisma.match.findMany({
          where: { dedupKey: { in: plan.creates.map((p) => p.dedupKey) } },
          select: {
            id: true,
            dedupKey: true,
            homeScore: true,
            awayScore: true,
            round: true,
            venue: true,
          },
        })
      : [];
    const finalPlan = applyExisting(plan, existing);

    if (APPLY) {
      const BATCH = 500;
      let created = 0;
      for (let i = 0; i < finalPlan.creates.length; i += BATCH) {
        const chunk = finalPlan.creates.slice(i, i + BATCH);
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
            venue: p.venue,
            status: 'FINISHED' as const,
            importedFrom: IMPORTED_FROM,
            importedAt: new Date(),
            sourceUrl: p.sourceUrl,
            license: LICENSE,
            dedupKey: p.dedupKey,
          })),
          skipDuplicates: true,
        });
        created += res.count;
      }
      for (const u of finalPlan.updates) {
        await prisma.match.update({
          where: { id: u.id },
          data: u.data as Prisma.MatchUpdateInput,
        });
      }
      console.log(
        `\n[APPLY] criadas=${created} atualizadas=${finalPlan.updates.length} noop(existentes com placar)=${finalPlan.noops}`,
      );
    }

    // --- Resumo ---
    console.log(`\n[libertadores ${seasonLabel}] competição=${competition.name}`);
    console.log(
      `parseadas=${matches.length} planejadas=${plan.creates.length} ` +
        `criar=${finalPlan.creates.length} atualizar=${finalPlan.updates.length} ` +
        `já-existiam=${finalPlan.noops}${APPLY ? '' : ' (dry-run)'}`,
    );
    console.log('--- pulados ---');
    if (finalPlan.skipped.size === 0) console.log('  nenhum');
    for (const [k, v] of [...finalPlan.skipped].sort((a, b) => b[1] - a[1]))
      console.log(`  ${k}: ${v}`);
    if (finalPlan.warnings.length) {
      console.log('--- avisos ---');
      for (const w of finalPlan.warnings.slice(0, 20)) console.log(`  ${w}`);
      if (finalPlan.warnings.length > 20)
        console.log(`  ... +${finalPlan.warnings.length - 20} avisos`);
    }
    const totalByRound = new Map<string, number>();
    for (const p of plan.creates) totalByRound.set(p.round, (totalByRound.get(p.round) ?? 0) + 1);
    console.log('--- por grupo ---');
    for (const [g, n] of [...totalByRound].sort()) console.log(`  ${g}: ${n}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

/** Wrapper local para o pool de QIDs (evita poluir o plano com skips duplos). */
function resolveQidFrom(name: string, article: string | null): string | null {
  for (const candidate of [article, name]) {
    if (!candidate) continue;
    const qid = resolveTeamQid(candidate);
    if (qid) return qid;
  }
  return null;
}

if (process.argv[1]?.includes('ingest-wikipedia-matches')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error(
        { err: String(err).slice(0, 300) },
        '[t606] falha na ingestão wikipedia-matches',
      );
      process.exit(1);
    });
}
