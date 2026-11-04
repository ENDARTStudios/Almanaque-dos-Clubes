/**
 * T-24/28 — REGISTRO DOS 12 BOTS DE DOMÍNIO.
 *
 * Cada entrada é uma função REAL do acervo (serviço/lote importável já testado):
 * nada aqui é casca vazia. Quando um domínio não tem fonte/fila segura, o bot
 * retorna `skipped` com a contagem e o motivo — e isso aparece no monitor.
 *
 * ORDEM = prioridade da rodada de 4h. Os primeiros alimentam dado de vitrine
 * (jogadores/clubes/partidas); os últimos só derivam/validam o que os anteriores
 * produziram (rankings, histórico, gráficos, comparação).
 */
import { runPlayerProfileBatch } from '../../scripts/enrich-player-profiles.js';
import { runFillClubStatesBatch } from '../../scripts/fill-club-states.js';
import { runEnrichCompetitionsBatch } from '../../scripts/enrich-competitions.js';
import { enrichAllMediaBatch } from '../etl/enrich-all-media.service.js';
import { enrichClubsEditorialBatch } from '../etl/enrich-media.service.js';
import { runMatchValidations, syncAnomaliesToQueue } from '../../jobs/match-validations.js';
import { runRankingCronOnce } from '../rankings/ranking-cron.job.js';
import {
  createPrismaWonEdgeRepo,
  fetchWonCandidates,
  syncWonEdges,
} from '../etl/won-edges.service.js';
import {
  fetchStadiums,
  syncStadiums,
  type StadiumsRepository,
} from '../etl/connectors/wikidata-stadiums.connector.js';
import { compareClubs } from '../compare/compare.service.js';
import { cache } from '../../services/cache.js';
import type { BotDefinition, BotOutcome } from './types.js';

/** Normaliza contadores (todos os batches devolvem números parciais). */
function outcome(input: {
  status?: BotOutcome['status'];
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
}): BotOutcome {
  const status =
    input.status ??
    (input.errors > 0 && input.processed > 0
      ? 'partial'
      : input.processed === 0 && input.updated === 0
        ? 'skipped'
        : 'ok');
  return {
    status,
    processed: input.processed,
    updated: input.updated,
    skipped: input.skipped,
    errors: input.errors,
    message: input.message,
  };
}

const players: BotDefinition = {
  id: 'players',
  domain: 'players',
  label: 'Perfis de jogadores (Wikidata)',
  async run({ prisma }) {
    const out = await runPlayerProfileBatch({ apply: true, limit: 500, prisma });
    return outcome({
      processed: out.processed,
      updated: out.updated,
      skipped: out.skipped,
      errors: out.errors,
      message: out.message,
    });
  },
};

const clubs: BotDefinition = {
  id: 'clubs',
  domain: 'clubs',
  label: 'Mídia e texto editorial dos clubes',
  async run({ prisma }) {
    // Sequencial de propósito: as duas passadas batem nas mesmas fontes externas
    // (Wikipédia/Commons); paralelizar aqui só aumenta a taxa de 429.
    const media = await enrichAllMediaBatch(200, { apply: true, prisma });
    const editorial = await enrichClubsEditorialBatch(200, { apply: true, prisma });
    const processed = media.processed + editorial.processed;
    const updated = media.enriched + editorial.updated;
    const skipped = media.gaps + editorial.skipped;
    const errors = media.errors + (editorial.infoboxFetchFailures ?? 0);
    return outcome({
      processed,
      updated,
      skipped,
      errors,
      message:
        `clubes: mídia ${media.processed} processados/${media.enriched} enriquecidos ` +
        `(gap ${media.gaps}, erros ${media.errors}); editorial ${editorial.processed} ` +
        `processados/${editorial.updated} atualizados (gap ${editorial.skipped})`,
    });
  },
};

const matches: BotDefinition = {
  id: 'matches',
  domain: 'matches',
  label: 'Validações e fila de revisão de partidas',
  async run() {
    const anomalies = await runMatchValidations();
    const queued = await syncAnomaliesToQueue(anomalies);
    const findings = anomalies.reduce((n, a) => n + a.count, 0);
    return outcome({
      status: 'ok',
      processed: findings,
      updated: queued.queued,
      skipped: queued.alreadyPending,
      errors: 0,
      message:
        `partidas: ${anomalies.length} checagem(ns) com achados, ${findings} ocorrências; ` +
        `${queued.queued} enviadas à revisão, ${queued.alreadyPending} já pendentes`,
    });
  },
};

const geo: BotDefinition = {
  id: 'geo',
  domain: 'geo',
  label: 'Estado/UF dos clubes (cidade + Wikidata P131)',
  async run({ prisma }) {
    const out = await runFillClubStatesBatch({ apply: true, limit: 300, prisma });
    return outcome({
      processed: out.processed,
      updated: out.updated,
      skipped: out.skipped,
      errors: out.errors,
      message: out.message,
    });
  },
};

const competitions: BotDefinition = {
  id: 'competitions',
  domain: 'competitions',
  label: 'Descrições e bandeiras de competições/estados (Wikidata)',
  async run({ prisma }) {
    // A passada de bandeiras (estados) é mais cara e não muda a cada 4h: roda em
    // rodadas alternadas (par/ímpar de blocos de 4h) para dividir o orçamento.
    const includeStates = Math.floor(Date.now() / (4 * 3600_000)) % 2 === 0;
    const out = await runEnrichCompetitionsBatch({
      apply: true,
      limit: 300,
      states: includeStates,
      prisma,
    });
    return outcome({
      processed: out.processed,
      updated: out.updated,
      skipped: out.skipped,
      errors: out.errors,
      message: out.message,
    });
  },
};

const seasons: BotDefinition = {
  id: 'seasons',
  domain: 'seasons',
  label: 'Integridade de edições (campeão/vice)',
  async run({ prisma }) {
    const [total, semCampeao, semVice] = await Promise.all([
      prisma.competitionSeason.count(),
      prisma.competitionSeason.count({ where: { championId: null } }),
      prisma.competitionSeason.count({ where: { runnerUpId: null } }),
    ]);
    const gaps = Math.max(semCampeao, semVice);
    return outcome({
      status: gaps > 0 ? 'skipped' : 'ok',
      processed: total,
      updated: 0,
      skipped: gaps,
      errors: 0,
      message:
        `edições: ${total} no acervo; ${semCampeao} sem campeão e ${semVice} sem vice. ` +
        (gaps > 0
          ? 'Sem re-derivação segura (a fonte não publica o dado ou o seed veio incompleto) — nenhuma escrita.'
          : 'Integridade completa — nada a corrigir.'),
    });
  },
};

const stadiums: BotDefinition = {
  id: 'stadiums',
  domain: 'stadiums',
  label: 'Estádios dos clubes (Wikidata P466/P625)',
  async run({ prisma }) {
    const semCoordenada = await prisma.stadium.count({
      where: { OR: [{ latitude: null }, { longitude: null }] },
    });
    const clubRows = await prisma.club.findMany({
      where: { deletedAt: null, qid: { not: null }, stadiums: { none: {} } },
      select: { qid: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    const clubQids = clubRows.map((c) => c.qid).filter((q): q is string => q !== null);
    if (clubQids.length === 0) {
      return outcome({
        status: 'skipped',
        processed: 0,
        updated: 0,
        skipped: semCoordenada,
        errors: 0,
        message: `estádios: nenhum clube com QID e sem estádio vinculado; ${semCoordenada} estádios sem coordenada (gap declarado)`,
      });
    }

    const entries = await fetchStadiums({
      clubQids,
      limit: 200,
      maxPages: 1,
      maxRetries: 1,
    });
    const repo: StadiumsRepository = {
      findClubByQid: (qid) => prisma.club.findUnique({ where: { qid }, select: { id: true } }),
      findStadiumByQid: (qid) =>
        prisma.stadium.findUnique({ where: { qid }, select: { id: true } }),
      createStadium: (args) => prisma.stadium.create({ data: args, select: { id: true } }),
    };
    const sync = await syncStadiums(entries, repo);
    return outcome({
      processed: entries.length,
      updated: sync.persisted.length,
      skipped: sync.skipped.length + sync.orphans.length,
      errors: 0,
      message:
        `estádios: ${clubQids.length} clubes sem estádio consultados, ${entries.length} ` +
        `estádios na fonte, ${sync.persisted.length} criados, ${sync.skipped.length} já existentes, ` +
        `${sync.orphans.length} órfãos (clube fora do acervo); ${semCoordenada} sem coordenada`,
    });
  },
};

const rankings: BotDefinition = {
  id: 'rankings',
  domain: 'rankings',
  label: 'Ranking 0-100 de clubes (temporada corrente)',
  async run() {
    const season = String(new Date().getUTCFullYear());
    const out = await runRankingCronOnce({ season, type: 'club' });
    const processed = out.results.reduce((n, r) => n + r.rankedCount, 0);
    return outcome({
      status: out.skipped
        ? 'skipped'
        : out.emptyResults > 0 && out.rankingIds.length > 0
          ? 'partial'
          : 'ok',
      processed,
      updated: out.rankingIds.length,
      skipped: out.emptyResults,
      errors: 0,
      message: out.skipped
        ? `rankings ${season}: já publicado (idempotência) — nada a recalcular`
        : `rankings ${season}: ${out.rankingIds.length} ranking(s) publicado(s), ` +
          `${processed} clube(s) ranqueado(s), ${out.emptyResults} resultado(s) vazio(s)`,
    });
  },
};

const tables: BotDefinition = {
  id: 'tables',
  domain: 'tables',
  label: 'Classificações (standings) pendentes',
  async run({ prisma }) {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n
         FROM "CompetitionSeason"
        WHERE standings IS NULL OR standings::text = 'null'`,
    );
    const semStandings = Number(rows[0]?.n ?? 0);
    return outcome({
      status: 'skipped',
      processed: 0,
      updated: 0,
      skipped: semStandings,
      errors: 0,
      message:
        `classificações: ${semStandings} edição(ões) sem standings. Não existe fila de ` +
        'standings pendentes com fonte armazenada — reingestão exige o seed por artigo ' +
        '(seed-competition-seasons); nenhuma escrita inventada.',
    });
  },
};

const history: BotDefinition = {
  id: 'history',
  domain: 'history',
  label: 'Arestas WON recentes (KnowledgeGraph)',
  async run({ prisma }) {
    const maxYear = new Date().getUTCFullYear();
    const minYear = maxYear - 4;
    const fetched = await fetchWonCandidates({ minYear, maxYear });
    const sync = await syncWonEdges(fetched.candidates, createPrismaWonEdgeRepo(prisma));
    return outcome({
      processed: sync.totalCandidates,
      updated: sync.counts.created + sync.counts.updated,
      skipped: sync.counts.skipped + sync.gaps.length + sync.orphans.length,
      errors: sync.implausible.length,
      message:
        `histórico ${minYear}-${maxYear}: ${sync.totalCandidates} candidatos; ` +
        `${sync.counts.created} arestas criadas, ${sync.counts.updated} atualizadas, ` +
        `${sync.counts.skipped} idempotentes, ${sync.gaps.length} gaps de competição, ` +
        `${sync.orphans.length} órfãos, ${sync.implausible.length} implausíveis`,
    });
  },
};

/** Chaves de cache computado que alimentam gráficos/agregados da vitrine. */
const CHART_CACHE_PATTERNS = [
  'clubs:stats:*',
  'clubs:timeline:*',
  'clubs:related:*',
  'competitions:*',
  'rankings:*',
  'legends:summary',
] as const;

const charts: BotDefinition = {
  id: 'charts',
  domain: 'charts',
  label: 'Agregados de gráficos (invalidação de cache)',
  async run() {
    let keysDeleted = 0;
    const failures: string[] = [];
    for (const pattern of CHART_CACHE_PATTERNS) {
      const res = await cache.invalidate(pattern);
      keysDeleted += res.keysDeleted;
      if (!res.ok) failures.push(pattern);
    }
    return outcome({
      status: failures.length > 0 ? (keysDeleted > 0 ? 'partial' : 'skipped') : 'ok',
      processed: CHART_CACHE_PATTERNS.length,
      updated: keysDeleted,
      skipped: 0,
      errors: failures.length,
      message:
        `gráficos: ${keysDeleted} chave(s) de cache invalidadas em ${CHART_CACHE_PATTERNS.length} padrões` +
        (failures.length > 0 ? `; falha ao invalidar: ${failures.join(', ')}` : ''),
    });
  },
};

const comparison: BotDefinition = {
  id: 'comparison',
  domain: 'comparison',
  label: 'Comparador H2H (validação amostral)',
  async run({ prisma }) {
    const edges = await prisma.knowledgeGraph.findMany({
      where: { relation: 'WON', sourceType: 'Club' },
      select: { sourceId: true },
      distinct: ['sourceId'],
      take: 2,
    });
    const ids = edges.map((e) => e.sourceId);
    if (ids.length < 2) {
      return outcome({
        status: 'skipped',
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: 'comparador: menos de 2 clubes com arestas WON — não há par para validar o H2H',
      });
    }
    const a = ids[0];
    const b = ids[1];
    const out = await compareClubs([a, b]);
    if (out.kind !== 'clubs') {
      return outcome({
        status: 'skipped',
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: 'comparador: serviço devolveu tipo inesperado (esperado clubs)',
      });
    }
    return outcome({
      status: 'ok',
      processed: 1,
      updated: 0,
      skipped: 0,
      errors: 0,
      message:
        `comparador: H2H validado (${out.comparison.titles.a} × ${out.comparison.titles.b} títulos) ` +
        '— serviço respondeu sem erro',
    });
  },
};

/**
 * Ordem canônica da rodada. NÃO reordene sem revisar o orçamento: `charts` e
 * `comparison` pressupõem que os domínios de escrita já rodaram.
 */
export const BOTS: readonly BotDefinition[] = [
  players,
  clubs,
  matches,
  geo,
  competitions,
  seasons,
  stadiums,
  rankings,
  tables,
  history,
  charts,
  comparison,
];

const byId = new Map(BOTS.map((bot) => [bot.id, bot]));

export function getBot(id: string): BotDefinition | undefined {
  return byId.get(id);
}

export function botIds(): string[] {
  return BOTS.map((bot) => bot.id);
}
