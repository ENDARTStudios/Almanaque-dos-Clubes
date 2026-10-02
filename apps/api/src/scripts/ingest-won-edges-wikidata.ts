/**
 * T448 — Ingestão de arestas WON (conquistas) do Wikidata para o KnowledgeGraph.
 *
 * Âncora em query de produção (regra R3): a FASE 0 provou em query que
 * knowledge_graph está vazio por design e que competitions/clubs têm QIDs do
 * Wikidata — este conector só resolve por QID (nunca fuzzy-match de nome).
 *
 * O que faz:
 *   1. Contagem ANTES de arestas WON por hierarquia (metadata.hierarchy ou
 *      derivação fallback — mesma função do ranking).
 *   2. Busca paginada no Wikidata (janelas de 5 anos, User-Agent identificado,
 *      retry+backoff via http-resilience) de edições com P1346 sobre mães de
 *      futebol (Q1478437).
 *   3. Sync idempotente: dedup (competitionId, year, clubId, WON); vencedor
 *      ausente = órfão; mãe ausente = GAP contado por hierarquia (NUNCA semeia
 *      a mãe — escopo do T448b).
 *   4. Contagem DEPOIS por hierarquia + relatório de gap + idempotência.
 *   5. Spot-check independente: re-busca N edições direto da API de entidades
 *      do Wikidata e confere (vencedor, mãe, ano) contra a aresta gravada.
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-won-edges-wikidata.ts           # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/ingest-won-edges-wikidata.ts --apply   # grava
 *   Opções: --min-year=1870 --max-year=2026 --spot-check=20
 *
 * Reversível:
 *   DELETE FROM knowledge_graph WHERE relation='WON' AND metadata->>'dataSource'='wikidata';
 *
 * Produção (Operador): rodar via Railway com DATABASE_URL de produção — a
 * mesma one-liner acima. Primeira ingestão ≈ 30 janelas × 20-45s (endpoint
 * do Wikidata limita a ~60s por consulta; janelas curtas evitam 504).
 */
import { PrismaClient } from '@prisma/client';
import {
  RANKING_HIERARCHIES,
  type RankHierarchy,
} from '../modules/rankings/ranking-algorithm.service.js';
import {
  createPrismaWonEdgeRepo,
  fetchWonCandidates,
  hierarchyOfEdge,
  syncWonEdges,
  type WonEdgeRepo,
} from '../modules/etl/won-edges.service.js';
import { fetchWithRetry } from '../lib/http-resilience.js';
import { WIKIDATA_ENTITY_URL_BASE } from '../modules/etl/connectors/wikidata-won-edges.connector.js';

const APPLY = process.argv.includes('--apply');
const argValue = (flag: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1];

const MIN_YEAR = Number(argValue('min-year') ?? 1870);
const MAX_YEAR = Number(argValue('max-year') ?? new Date().getFullYear());
const SPOT_CHECK_N = Number(argValue('spot-check') ?? (APPLY ? 20 : 0));

const log = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn('⚠ ' + msg),
};

interface HierarchyCount {
  total: number;
  byHierarchy: Record<RankHierarchy, number>;
}

/** Contagem de arestas WON por hierarquia (metadata.hierarchy congelada; fallback = derivação do ranking). */
async function countWonByHierarchy(prisma: PrismaClient): Promise<HierarchyCount> {
  const edges = await prisma.knowledgeGraph.findMany({
    where: { relation: 'WON' },
    select: { targetId: true, targetType: true, metadata: true },
  });
  const compIds = [
    ...new Set(edges.filter((e) => e.targetType === 'Competition').map((e) => e.targetId)),
  ];
  const comps = compIds.length
    ? await prisma.competition.findMany({
        where: { id: { in: compIds } },
        select: { id: true, qid: true, name: true, type: true, country: true },
      })
    : [];
  const compById = new Map(comps.map((c) => [c.id, c]));
  const byHierarchy = Object.fromEntries(RANKING_HIERARCHIES.map((h) => [h, 0])) as Record<
    RankHierarchy,
    number
  >;
  for (const e of edges) {
    const comp = e.targetType === 'Competition' ? (compById.get(e.targetId) ?? null) : null;
    byHierarchy[hierarchyOfEdge(e.metadata, comp)] += 1;
  }
  return { total: edges.length, byHierarchy };
}

function printHierarchyCounts(label: string, c: HierarchyCount): void {
  log.info(`\n${label} (total: ${c.total})`);
  for (const h of RANKING_HIERARCHIES) log.info(`  ${h.padEnd(12)} ${c.byHierarchy[h]}`);
}

/** Repo DRY-RUN: mesma resolução/plano, zero escrita. */
function dryRunRepo(repo: WonEdgeRepo): WonEdgeRepo {
  let fakeId = 0;
  return {
    ...repo,
    async createWonEdge(_args) {
      fakeId += 1;
      return { id: `dry-run-${fakeId}` };
    },
    async updateWonEdgeMetadata() {
      /* DRY-RUN: não escreve */
    },
  };
}

interface SpotCheckRow {
  editionQid: string;
  winnerQid: string;
  motherQid: string;
  year: number;
  ok: boolean;
  detail: string;
}

/**
 * Spot-check INDEPENDENTE: re-busca a entidade da edição na API do Wikidata e
 * confere vencedor (P1346), mãe (P3450) e ano (P585/P580/P582). Não confia no
 * pipeline — confere a fonte.
 */
async function spotCheck(
  prisma: PrismaClient,
  samples: Array<{ editionQid: string; winnerQid: string; motherQid: string; year: number }>,
): Promise<SpotCheckRow[]> {
  const out: SpotCheckRow[] = [];
  for (const s of samples) {
    const url = `${WIKIDATA_ENTITY_URL_BASE}Special:EntityData/${s.editionQid}.json`;
    try {
      const res = await fetchWithRetry(
        url,
        {
          headers: {
            'user-agent':
              'AlmanaqueDosClubes/0.1 (t448 spot-check; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)',
          },
        },
        { timeoutMs: 30_000, label: 't448-spot-check' },
      );
      const json = (await res.json()) as {
        entities?: Record<
          string,
          {
            claims?: Record<
              string,
              Array<{ mainsnak?: { datavalue?: { value?: { id?: string; time?: string } } } }>
            >;
          }
        >;
      };
      const entity = json.entities?.[s.editionQid];
      if (!entity) {
        out.push({ ...s, ok: false, detail: 'entidade não encontrada na API' });
        continue;
      }
      const qidsOf = (p: string) =>
        (entity.claims?.[p] ?? [])
          .map((c) => c.mainsnak?.datavalue?.value?.id)
          .filter((v): v is string => typeof v === 'string');
      const yearsOf = (ps: string[]) =>
        ps
          .flatMap((p) => entity.claims?.[p] ?? [])
          .map((c) => c.mainsnak?.datavalue?.value?.time?.slice(1, 5))
          .filter((v): v is string => typeof v === 'string')
          .map((v) => parseInt(v, 10))
          .filter((n) => Number.isFinite(n));
      const hasWinner = qidsOf('P1346').includes(s.winnerQid);
      const hasMother = qidsOf('P3450').includes(s.motherQid);
      const hasYear = yearsOf(['P585', 'P580', 'P582']).includes(s.year);
      const ok = hasWinner && hasMother && hasYear;
      const missing = [
        hasWinner ? null : `P1346≠${s.winnerQid}`,
        hasMother ? null : `P3450≠${s.motherQid}`,
        hasYear ? null : `ano≠${s.year}`,
      ].filter(Boolean);
      out.push({ ...s, ok, detail: ok ? 'OK' : missing.join('; ') });
    } catch (err) {
      out.push({
        ...s,
        ok: false,
        detail: 'erro de rede: ' + (err instanceof Error ? err.message : String(err)),
      });
    }
  }
  void prisma;
  return out;
}

async function main(): Promise<void> {
  log.info(`T448 — ingestão de arestas WON (${APPLY ? 'APPLY' : 'DRY-RUN'})`);
  log.info(`Janela: ${MIN_YEAR}–${MAX_YEAR} · spot-check: ${SPOT_CHECK_N || 'off'}`);

  const prisma = new PrismaClient();

  // 1) ANTES
  const before = await countWonByHierarchy(prisma);
  printHierarchyCounts('ANTES — arestas WON por hierarquia', before);

  // 2) FETCH (rede real; janelas de 5 anos evitam 504 do endpoint)
  log.info('\nBuscando edições com vencedor no Wikidata (janelas de 5 anos)...');
  const fetchStart = Date.now();
  const { candidates, stats } = await fetchWonCandidates({ minYear: MIN_YEAR, maxYear: MAX_YEAR });
  log.info(
    `Fetch: ${stats.windows} janelas · ${stats.rows} linhas · ${candidates.length} candidatos únicos · ` +
      `inválidos: ${stats.invalid} · sem label: ${stats.withoutLabel} · ` +
      `${((Date.now() - fetchStart) / 1000).toFixed(0)}s`,
  );
  if (stats.truncatedWindows.length > 0) {
    log.warn(
      `JANELAS TRUNCADAS (bateram no LIMIT ${'10.000'}): ` +
        stats.truncatedWindows.map((w) => `${w.minYear}-${w.maxYear}(${w.rows})`).join(', '),
    );
  }

  // 3) SYNC (dry-run = mesmo plano, zero escrita)
  const repo = createPrismaWonEdgeRepo(prisma);
  const result = await syncWonEdges(candidates, APPLY ? repo : dryRunRepo(repo));
  const c = result.counts;
  log.info(
    `\nPlano de sync: ${c.created} criar · ${c.skipped} já existentes (skip) · ${c.updated} atualizar metadata · ` +
      `${c.duplicatesInBatch} duplicatas em lote · ${result.gaps.length} gaps (mãe ausente) · ` +
      `${result.orphans.length} órfãos (clube ausente)`,
  );

  printHierarchyCounts('CRIAR por hierarquia', {
    total: c.created,
    byHierarchy: Object.fromEntries(
      RANKING_HIERARCHIES.map((h) => [h, result.byHierarchy[h].created]),
    ) as Record<RankHierarchy, number>,
  });

  if (result.gaps.length > 0) {
    printHierarchyCounts('GAP por hierarquia (mãe ausente no acervo — input do T448b)', {
      total: result.gaps.length,
      byHierarchy: result.gapByHierarchy,
    });
    const byMother = new Map<string, number>();
    for (const g of result.gaps) byMother.set(g.motherName, (byMother.get(g.motherName) ?? 0) + 1);
    const top = [...byMother.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    log.info('\nTop mães ausentes (QID para o T448b):');
    for (const [name, n] of top) log.info(`  ${n}\t${name}`);
  }

  if (result.orphans.length > 0) {
    log.info(`\nÓrfãos (vencedor não está em clubs — ex. seleções): ${result.orphans.length}`);
    for (const o of result.orphans.slice(0, 5))
      log.info(`  ${o.winnerQid} × ${o.motherQid} ${o.year}`);
  }

  if (!APPLY) {
    log.info('\nDRY-RUN — nada gravado. Rode com --apply para gravar.');
    await prisma.$disconnect();
    return;
  }

  // 4) DEPOIS
  const after = await countWonByHierarchy(prisma);
  printHierarchyCounts('DEPOIS — arestas WON por hierarquia', after);

  // 5) SPOT-CHECK independente (re-busca a fonte)
  if (SPOT_CHECK_N > 0 && result.created.length > 0) {
    const n = Math.min(SPOT_CHECK_N, result.created.length);
    // Amostra estratificada: espalha pelo array (determinística, T428).
    const step = Math.max(1, Math.floor(result.created.length / n));
    const samples = result.created
      .filter((_, i) => i % step === 0)
      .slice(0, n)
      .map((r) => ({
        editionQid: r.editionQid,
        winnerQid: r.clubQid,
        motherQid: r.motherQid,
        year: r.year,
      }));
    log.info(`\nSpot-check independente de ${samples.length} arestas (re-busca na API Wikidata):`);
    const rows = await spotCheck(prisma, samples);
    const okCount = rows.filter((r) => r.ok).length;
    for (const r of rows) {
      log.info(`  [${r.ok ? 'OK' : 'FALHA'}] ${r.editionQid} ${r.year} → ${r.detail}`);
    }
    log.info(`Spot-check: ${okCount}/${rows.length} confirmados na fonte`);
    if (okCount !== rows.length)
      log.warn('HÁ FALHAS NO SPOT-CHECK — investigar antes de prosseguir');
  }

  log.info('\nReversível:');
  log.info(
    "  DELETE FROM knowledge_graph WHERE relation='WON' AND metadata->>'dataSource'='wikidata';",
  );
  log.info(
    '\nSe a API estiver em pé, invalide o cache de campeões (ou aguarde TTL de 1h): chave champions:*',
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('FALHA:', err);
  process.exit(1);
});
