/**
 * WS-D M1b-conservadora — Expansão de clubes/competições via Wikidata CC0. Default DRY.
 * SOMENTE INSERT; dedupe por QID; sem fuzzy; sem update/reativar. `--apply` exige `--allow-production`.
 *
 * Uso:
 *   node dist/scripts/expand-wikidata-conservative.js --stage=PILOT --country=PT --dry-run
 *   node dist/scripts/expand-wikidata-conservative.js --stage=PILOT --country=PT --apply --allow-production --manifest-out=/tmp/m1b.json
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import {
  fetchEntities,
  WIKIDATA_USER_AGENT,
  type WikidataEntity,
} from '../lib/wikidata/wikidata-client.js';
import { extractCoordinate } from '../lib/wikidata/enrich-attributes.js';
import {
  extractCandidateAttrs,
  type CandidateAttrs,
} from '../lib/wikidata/expansion/extract-attributes.js';
import {
  buildClubPlan,
  buildCompetitionPlan,
  type ExistingIndex,
} from '../lib/wikidata/expansion/plan-builder.js';
import { applyClubPlan, applyCompetitionPlan } from '../lib/wikidata/expansion/apply-plan.js';
import {
  COUNTRY_ISO_TO_QID,
  M1B_FILTERS_VERSION,
  type RawCandidate,
} from '../lib/wikidata/expansion/types.js';

function argVal(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : null;
}
const claimIds = (e: WikidataEntity | null, p: string): string[] =>
  (e?.claims?.[p] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string })?.id)
    .filter((v): v is string => typeof v === 'string');
const labelsOf = (e: WikidataEntity) => ({
  pt: e.labels?.pt?.value ?? null,
  en: e.labels?.en?.value ?? null,
  desc: e.descriptions?.pt?.value ?? e.descriptions?.en?.value ?? null,
  aliases: [...(e.aliases?.pt ?? []), ...(e.aliases?.en ?? [])].map((a) => a.value),
});

function toRawCandidate(e: WikidataEntity | null): RawCandidate | null {
  if (!e) return null;
  const l = labelsOf(e);
  const year = claimIds(e, 'P571')[0]
    ? Number.parseInt(
        String(
          (e.claims?.P571?.[0]?.mainsnak?.datavalue?.value as { time?: string })?.time ?? '',
        ).slice(1, 5),
        10,
      )
    : null;
  return {
    qid: e.id,
    labelPt: l.pt,
    labelEn: l.en,
    description: l.desc,
    aliases: l.aliases,
    p31: claimIds(e, 'P31'),
    p17: claimIds(e, 'P17'),
    p576: claimIds(e, 'P576'),
    p115: claimIds(e, 'P115'),
    p159: claimIds(e, 'P159'),
    p131: claimIds(e, 'P131'),
    p625: extractCoordinate(e),
    inceptionYear: Number.isFinite(year) ? (year as number) : null,
  };
}

async function runSparql(query: string): Promise<string[]> {
  const r = await fetch(
    'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query),
    { headers: { 'User-Agent': WIKIDATA_USER_AGENT, Accept: 'application/sparql-results+json' } },
  );
  if (!r.ok) throw new Error(`SPARQL HTTP ${r.status}`);
  const j = (await r.json()) as { results: { bindings: Array<{ item: { value: string } }> } };
  return j.results.bindings.map((b) => b.item.value.split('/').pop() as string);
}

async function buildExistingIndex(prisma: PrismaClient): Promise<ExistingIndex> {
  const [clubs, comps] = await Promise.all([
    prisma.club.findMany({ select: { qid: true, name: true, country: true, deletedAt: true } }),
    prisma.competition.findMany({
      select: { qid: true, name: true, country: true, deletedAt: true },
    }),
  ]);
  const idx: ExistingIndex = {
    activeClubByQid: new Map(),
    softDeletedClubQids: new Set(),
    activeClubNameCountry: new Map(),
    activeCompetitionByQid: new Map(),
    softDeletedCompetitionQids: new Set(),
    activeCompetitionNameCountry: new Map(),
  };
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  for (const c of clubs) {
    if (c.deletedAt) {
      if (c.qid) idx.softDeletedClubQids.add(c.qid);
      continue;
    }
    if (c.qid) idx.activeClubByQid.set(c.qid, c.name);
    if (c.country) idx.activeClubNameCountry.set(`${norm(c.name)}|${c.country}`, c.qid ?? '');
  }
  for (const c of comps) {
    if (c.deletedAt) {
      if (c.qid) idx.softDeletedCompetitionQids.add(c.qid);
      continue;
    }
    if (c.qid) idx.activeCompetitionByQid.set(c.qid, c.name);
    if (c.country)
      idx.activeCompetitionNameCountry.set(`${norm(c.name)}|${c.country}`, c.qid ?? '');
  }
  return idx;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const stage = (argVal('--stage=') ?? 'PILOT').toUpperCase() as 'PILOT' | 'FULL';
  const iso = (argVal('--country=') ?? 'PT').toUpperCase();
  const manifestOut = argVal('--manifest-out=');
  const limit = Number.parseInt(argVal('--limit=') ?? '', 10) || 2000;
  const countryQid = COUNTRY_ISO_TO_QID[iso];
  if (!countryQid) {
    console.error(`País sem QID mapeado: ${iso}`);
    process.exit(1);
  }
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }
  const retrievedAt = new Date().toISOString();
  const prisma = new PrismaClient();
  try {
    const clubQids = await runSparql(
      `SELECT ?item WHERE { ?item wdt:P31 wd:Q476028 ; wdt:P17 wd:${countryQid} . FILTER NOT EXISTS { ?item wdt:P576 ?d } } LIMIT ${limit}`,
    );
    const compQids = await runSparql(
      `SELECT DISTINCT ?item WHERE { VALUES ?cls { wd:Q15991303 wd:Q8463186 wd:Q15991290 wd:Q3270632 wd:Q18608583 wd:Q1478437 } ?item wdt:P31 ?cls ; wdt:P17 wd:${countryQid} . FILTER NOT EXISTS { ?item wdt:P576 ?d } } LIMIT ${limit}`,
    );

    const clubEntities = await fetchEntities(clubQids);
    const compEntities = await fetchEntities(compQids);
    const clubCands = [...clubEntities.values()]
      .map(toRawCandidate)
      .filter((c): c is RawCandidate => !!c);
    const compCands = [...compEntities.values()]
      .map(toRawCandidate)
      .filter((c): c is RawCandidate => !!c);

    // entidades-fonte para coords (P159/P115/P131)
    const srcIds = new Set<string>();
    for (const c of clubCands)
      for (const id of [...(c.p159 ?? []), ...(c.p115 ?? []), ...(c.p131 ?? [])]) srcIds.add(id);
    const sources = await fetchEntities([...srcIds]);

    const existing = await buildExistingIndex(prisma);
    const clubPlan = buildClubPlan(
      clubCands,
      new Map<string, CandidateAttrs>(
        [...clubCands].map((c) => [c.qid, extractCandidateAttrs(c, sources)]),
      ),
      existing,
    );
    const compPlan = buildCompetitionPlan(compCands, existing);

    const plan = {
      mode: apply ? 'APPLY' : 'DRY',
      stage,
      country: iso,
      retrievedAt,
      filtersVersion: M1B_FILTERS_VERSION,
      clubCandidatesRaw: clubCands.length,
      clubWouldCreate: clubPlan.wouldCreate,
      clubSkips: clubPlan.skips,
      clubCoordinateCoverage: clubPlan.coordinateCoverage,
      competitionCandidatesRaw: compCands.length,
      competitionWouldCreate: compPlan.wouldCreate,
      competitionSkips: compPlan.skips,
      errors: [] as string[],
    };

    if (!apply) {
      console.log(JSON.stringify({ ...plan, wouldWrite: true }, null, 2));
      return;
    }

    const clubs = await applyClubPlan(prisma, clubPlan.rows, retrievedAt);
    const competitions = await applyCompetitionPlan(prisma, compPlan.rows, retrievedAt);
    const manifest = {
      batchId: `${iso}-${retrievedAt}`,
      country: iso,
      stage,
      retrievedAt,
      filtersVersion: M1B_FILTERS_VERSION,
      createdClubIds: clubs.createdClubIds,
      createdClubQids: clubs.createdClubQids,
      createdCompetitionIds: competitions.createdCompetitionIds,
      createdCompetitionQids: competitions.createdCompetitionQids,
      skips: { club: clubPlan.skips, competition: compPlan.skips },
    };
    if (manifestOut) writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
    console.log(
      JSON.stringify(
        {
          mode: 'APPLY',
          stage,
          country: iso,
          createdClubs: clubs.createdClubIds.length,
          createdCompetitions: competitions.createdCompetitionIds.length,
          errors: 0,
          hardDeletes: 0,
          migrations: 0,
          updatedExisting: 0,
          reactivatedSoftDeleted: 0,
          manifestPath: manifestOut ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/expand-wikidata-conservative\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
