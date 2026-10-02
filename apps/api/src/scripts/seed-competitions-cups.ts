/**
 * T448b-1 — Semeador de competições-mãe COPA (Wikidata CC0) para `competitions`.
 *
 * O gap real de produção (2.832 mães ausentes) é dominado por COPAS: o seed
 * T429 importou só ligas (Q15991303), então FA Cup, Coppa Italia, DFB-Pokal,
 * Copa del Rey, Libertadores, Champions, FIFA Club World Cup etc. nunca
 * entraram como mães — e as arestas WON dessas edições ficaram de fora.
 *
 * Seleção de "é copa" (R3 — classes validadas AO VIVO no Wikidata nesta
 * tarefa, com contagem de instâncias e P31 das mães reais do gap):
 *   Q8463186   national association football cup (FA Cup, DFB-Pokal, del Rey)
 *   Q1824674   league cup
 *   Q34262807  national association football super cup (Supercopa, Trophée)
 *   Q34542757  international association football clubs cup (UCL)
 *   Q123856943 club world championship (FIFA Club World Cup)
 * FALLBACK por rótulo (necessário: Coppa Italia e Libertadores estão
 * modeladas com classes genéricas no Wikidata — "sports competition" /
 * "recurring sporting event"): marcadores cup/copa/coppa/pokal/trophy/…
 *
 * Universo = mães que têm temporadas com vencedor no universo WON (P3450 ∧
 * P1346) — as mesmas que o conector T448 processa. Reusa `fetchWonCandidates`.
 *
 * Uso (produção, dentro do container):
 *   node dist/scripts/seed-competitions-cups.js            # DRY-RUN
 *   node dist/scripts/seed-competitions-cups.js --apply --spot-check=10
 * Reversível:
 *   DELETE FROM competitions WHERE "importedFrom"='wikidata-cups';
 * (marcador dedicado espelha o padrão das arestas: purge limpo por proveniência)
 */
import { PrismaClient } from '@prisma/client';
import {
  resolveHierarchy,
  type RankHierarchy,
} from '../modules/rankings/ranking-algorithm.service.js';
import { resolveGender } from '../modules/etl/connectors/wikidata-won-edges.connector.js';
import { fetchWonCandidates } from '../modules/etl/won-edges.service.js';
import { fetchWithRetry } from '../lib/http-resilience.js';
import {
  WIKIDATA_SPARQL_ENDPOINT,
  WON_USER_AGENT,
} from '../modules/etl/connectors/wikidata-won-edges.connector.js';

const APPLY = process.argv.includes('--apply');
const argValue = (flag: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1];
const MIN_YEAR = Number(argValue('min-year') ?? 1870);
const MAX_YEAR = Number(argValue('max-year') ?? new Date().getFullYear());
const SPOT_CHECK_N = Number(argValue('spot-check') ?? 0);
const SEED_MARKER = 'wikidata-cups';
const COUNTRY_CHUNK = 200;

// ---------------------------------------------------------------------------
// Seleção de copa (pura — testável)
// ---------------------------------------------------------------------------

/** Classes de copa validadas ao vivo (ver cabeçalho). Valores, não QIDs do gap. */
export const CUP_CLASS_QIDS = [
  'Q8463186', // national association football cup
  'Q1824674', // league cup
  'Q34262807', // national association football super cup
  'Q34542757', // international association football clubs cup
  'Q123856943', // club world championship
] as const;

const CUP_LABEL_MARKERS =
  /\b(cups?|copas?|coppa|coppas?|pokal|pokalen|cupen|trophy|trophies|trofeo|trofeu|troph[eé]e|supercup|super cup|super copa|recopa)\b/i;

/** Fallback por rótulo para mães com classes genéricas no Wikidata. */
export function isCupByLabel(name: string | null | undefined): boolean {
  if (!name) return false;
  return CUP_LABEL_MARKERS.test(name);
}

/** Query VALUES-bounded: quais QIDs são copas pelas classes validadas. */
export function buildCupClassQuery(qids: string[]): string {
  const values = qids.map((q) => `wd:${q}`).join(' ');
  const classes = CUP_CLASS_QIDS.map((q) => `wd:${q}`).join(' ');
  return `SELECT DISTINCT ?mother WHERE {
  VALUES ?mother { ${values} }
  ?mother wdt:P31/wdt:P279* ?class .
  VALUES ?class { ${classes} }
}`;
}

/** País (ISO P297 via P17) das mães — nullable; internacional fica sem país. */
export function buildMothersCountryQuery(qids: string[]): string {
  const values = qids.map((q) => `wd:${q}`).join(' ');
  return `SELECT ?mother ?iso WHERE {
  VALUES ?mother { ${values} }
  OPTIONAL { ?mother wdt:P17 ?pais . ?pais wdt:P297 ?iso }
}`;
}

export interface CupSeedRow {
  qid: string;
  name: string;
  country: string | null;
  via: 'class' | 'label';
  hierarchy: RankHierarchy;
  gender: 'men' | 'women';
}

/** Plano de semente: candidatos (classe ∪ rótulo) menos QIDs já no acervo. */
export function planCupSeed(
  mothers: Array<{ qid: string; name: string }>,
  cupQids: Set<string>,
  existingQids: Set<string>,
): CupSeedRow[] {
  const rows: CupSeedRow[] = [];
  const seen = new Set<string>();
  for (const m of mothers) {
    if (existingQids.has(m.qid) || seen.has(m.qid)) continue;
    const via = cupQids.has(m.qid) ? 'class' : isCupByLabel(m.name) ? 'label' : null;
    if (!via) continue;
    seen.add(m.qid);
    rows.push({
      qid: m.qid,
      name: m.name,
      country: null,
      via,
      hierarchy: resolveHierarchy({ qid: m.qid, name: m.name }),
      gender: resolveGender(m.name),
    });
  }
  return rows.sort((a, b) => cmp(a.name, b.name));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Parse da resposta de classes → QIDs de copa. */
export function parseQids(json: unknown, bindingKey: string): Set<string> {
  const bindings = (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })
    ?.results?.bindings;
  const out = new Set<string>();
  for (const b of bindings ?? []) {
    const qid = b[bindingKey]?.value?.split('/').pop();
    if (qid && /^Q\d+$/.test(qid)) out.add(qid);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function sparqlFetch(query: string): Promise<unknown> {
  const res = await fetchWithRetry(
    `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`,
    { headers: { 'user-agent': WON_USER_AGENT, Accept: 'application/sparql-results+json' } },
    { timeoutMs: 90_000, label: 'seed-competitions-cups', retryDelaysMs: [2000, 5000, 10_000] },
  );
  return (await res.json()) as unknown;
}

async function main(): Promise<void> {
  console.log(`T448b-1 — semeadura de mães-copa (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const prisma = new PrismaClient();
  const antes = await prisma.competition.count();
  console.log(`competitions no acervo: ${antes}`);

  // 1) Universo WON → mães distintas com rótulo (reusa toda a infra do T448).
  console.log('Buscando mães do universo WON (janelas de 5 anos)...');
  const { candidates, stats } = await fetchWonCandidates({ minYear: MIN_YEAR, maxYear: MAX_YEAR });
  const mothers = new Map<string, string>();
  for (const c of candidates) if (!mothers.has(c.motherQid)) mothers.set(c.motherQid, c.motherName);
  console.log(
    `Fetch: ${stats.windows} janelas · ${candidates.length} candidatos · ${mothers.size} mães distintas`,
  );

  // 2) Quais mães são copas pelas classes validadas (VALUES-bounded, chunk 200).
  const qids = [...mothers.keys()];
  const cupQids = new Set<string>();
  for (let i = 0; i < qids.length; i += 200) {
    const json = await sparqlFetch(buildCupClassQuery(qids.slice(i, i + 200)));
    for (const qid of parseQids(json, 'mother')) cupQids.add(qid);
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 3) Plano: classe ∪ rótulo − existente. País via P297 (lote, só para os novos).
  const existing = await prisma.competition.findMany({
    where: { qid: { in: qids } },
    select: { qid: true },
  });
  const existingQids = new Set(existing.map((e) => e.qid).filter((q): q is string => !!q));
  const plan = planCupSeed(
    qids.map((q) => ({ qid: q, name: mothers.get(q) ?? '' })),
    cupQids,
    existingQids,
  );
  console.log(
    `copas por classe: ${cupQids.size} · por rótulo (extras): ${plan.filter((p) => p.via === 'label').length} · já no acervo (skip): ${qids.filter((q) => existingQids.has(q)).length}`,
  );

  const byHier: Record<string, number> = {};
  for (const p of plan) byHier[p.hierarchy] = (byHier[p.hierarchy] ?? 0) + 1;
  console.log('plano por hierarquia projetada:', JSON.stringify(byHier));

  // País (P297) das novas — lote VALUES.
  if (plan.length > 0) {
    for (let i = 0; i < plan.length; i += COUNTRY_CHUNK) {
      const chunk = plan.slice(i, i + COUNTRY_CHUNK);
      const json = await sparqlFetch(buildMothersCountryQuery(chunk.map((p) => p.qid)));
      const bindings =
        (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })?.results
          ?.bindings ?? [];
      for (const b of bindings) {
        const qid = b.mother?.value?.split('/').pop();
        const iso = b.iso?.value?.toUpperCase();
        const row = plan.find((p) => p.qid === qid);
        if (row && iso) row.country = iso;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN — nada gravado. ${plan.length} copas seriam semeadas; amostra:`);
    for (const p of plan.slice(0, 12))
      console.log(`  ${p.qid} | ${p.name} | ${p.hierarchy} | ${p.via} | ${p.country ?? '—'}`);
    await prisma.$disconnect();
    return;
  }

  // 4) APPLY — upsert idempotente por QID (existentes intocados).
  const now = new Date();
  let created = 0;
  for (const p of plan) {
    const existingRow = await prisma.competition.findUnique({ where: { qid: p.qid } });
    if (existingRow) continue; // corrida entre checagem e gravação: dedup por QID manda
    await prisma.competition.create({
      data: {
        name: p.name,
        type: 'CUP',
        qid: p.qid,
        country: p.country,
        importedFrom: SEED_MARKER,
        sourceUrl: `https://www.wikidata.org/wiki/${p.qid}`,
        importedAt: now,
      },
    });
    created += 1;
  }
  console.log(`\nAPPLY: ${created} mães-copa criadas (importedFrom='${SEED_MARKER}', type='CUP')`);

  const depois = await prisma.competition.count();
  console.log(`competitions no acervo: ${antes} → ${depois}`);

  // 5) Spot-check independente: re-busca a mãe e confere classe de copa OU
  // rótulo com marcador + presença de P3450 (temporadas no universo WON).
  if (SPOT_CHECK_N > 0 && plan.length > 0) {
    const step = Math.max(1, Math.floor(plan.length / Math.min(SPOT_CHECK_N, plan.length)));
    const samples = plan
      .filter((_, i) => i % step === 0)
      .slice(0, Math.min(SPOT_CHECK_N, plan.length));
    let ok = 0;
    for (const s of samples) {
      try {
        const res = await fetchWithRetry(
          `https://www.wikidata.org/wiki/Special:EntityData/${s.qid}.json`,
          { headers: { 'user-agent': WON_USER_AGENT } },
          { timeoutMs: 30_000, label: 't448b1-spot-check' },
        );
        const j = (await res.json()) as {
          entities?: Record<
            string,
            {
              labels?: Record<string, { value?: string }>;
              claims?: Record<
                string,
                Array<{ mainsnak?: { datavalue?: { value?: { id?: string } } } }>
              >;
            }
          >;
        };
        const ent = j.entities?.[s.qid];
        const classes = (ent?.claims?.P31 ?? [])
          .map((c) => c.mainsnak?.datavalue?.value?.id)
          .filter((v): v is string => typeof v === 'string');
        const inCupClass = classes.some((c) => (CUP_CLASS_QIDS as readonly string[]).includes(c));
        const label = ent?.labels?.en?.value ?? s.name;
        const byLabel = isCupByLabel(label);
        const verdictOk = inCupClass || byLabel;
        if (verdictOk) ok += 1;
        console.log(
          `  [${verdictOk ? 'OK' : 'FALHA'}] ${s.qid} ${s.name} → ${inCupClass ? 'classe' : byLabel ? 'rótulo' : 'não-copa'}`,
        );
      } catch (err) {
        console.log(`  [ERRO] ${s.qid}: ${err instanceof Error ? err.message : String(err)}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`Spot-check: ${ok}/${samples.length} confirmados na fonte`);
  }

  console.log(`\nReversível:`);
  console.log(`  DELETE FROM competitions WHERE "importedFrom"='${SEED_MARKER}';`);
  console.log(`  (e depois re-rodar ingest-won-edges para purgar arestas órfãs, se desejado)`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('FALHA:', err);
  process.exit(1);
});
