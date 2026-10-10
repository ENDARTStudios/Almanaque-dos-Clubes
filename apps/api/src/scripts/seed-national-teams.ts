/**
 * T502 / W3 — SELEÇÕES NACIONAIS (masculinas e femininas) via Wikidata.
 *
 * Descobre as seleções por país FIFA via SPARQL (P31 = national sports team,
 * P17 = country) e cria em `clubs` com kind='national_team' + logo (P154) e
 * federação (P17 → P279/nome). Dedup por QID (nunca duplica).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/seed-national-teams.js [--limit=50]
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchEntities,
  commonsFilePath,
  claimScalar,
  sparql,
  parseBindings,
  MEDIA_USER_AGENT,
  type EntityShape,
} from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { apply: { type: 'boolean', default: false }, limit: { type: 'string', default: '' } },
});
const LIMIT = values.limit ? parseInt(values.limit, 10) : Infinity;
const APPLY_ON = values.apply || APPLY;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * SPARQL: seleções nacionais de futebol (association football national team).
 * Q6979593 = national association football team. A query usa P279* (hierarquia):
 * as seleções PRINCIPAIS usam P31=Q135408445 (men's national association
 * football team), subclasse de Q6979593 — com P31 direto elas ficavam de fora
 * (2.300 via hierarquia vs 1.229 direto; gap do Brasil/Argentina etc. em 10/10).
 * Original (VALIDADO na Wikidata 09/10 —
 * Q6979593 estava errado e retornava 0). Separa masculino (P21 men)
 * e feminino (P21 women) quando o gênero está declarado.
 */
const QUERY = `SELECT DISTINCT ?team ?teamLabel ?country ?countryLabel ?iso2 ?genderQ ?logo WHERE {
  ?team wdt:P31 ?teamType . ?teamType wdt:P279* wd:Q6979593 .
  OPTIONAL { ?team wdt:P17 ?country . OPTIONAL { ?country wdt:P297 ?iso2 . } }
  OPTIONAL { ?team wdt:P21 ?genderQ . }
  OPTIONAL { ?team wdt:P154 ?logo . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
LIMIT 3000`;

interface TeamRow {
  qid: string;
  name: string | null;
  countryIso: string | null;
  countryName: string | null;
  gender: 'men' | 'women';
  logoUrl: string | null;
}

function rowsFromSparql(json: unknown): TeamRow[] {
  const out: TeamRow[] = [];
  const seen = new Set<string>();
  for (const b of parseBindings(json)) {
    const qid = b.team?.split('/').pop();
    if (!qid || !/^Q\d+$/.test(qid) || seen.has(qid)) continue;
    seen.add(qid);
    const genderQ = b.genderQ?.split('/').pop();
    const gender: 'men' | 'women' = genderQ === 'Q6581072' ? 'women' : 'men';
    out.push({
      qid,
      name: b.teamLabel ?? null,
      countryIso: b.iso2 ?? null,
      countryName: b.countryLabel ?? null,
      gender,
      logoUrl: null,
    });
  }
  return out;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    console.log(`[w3] modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`);
    const json = await sparql(QUERY, { userAgent: MEDIA_USER_AGENT, sleep });
    const rows = rowsFromSparql(json).slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
    console.log(`[w3] seleções encontradas no Wikidata: ${rows.length}`);

    // Dedup contra o acervo por QID
    const qids = rows.map((r) => r.qid);
    const existing = await prisma.club.findMany({
      where: { qid: { in: qids } },
      select: { qid: true },
    });
    const existingQids = new Set(existing.map((e) => e.qid));
    const missing = rows.filter((r) => !existingQids.has(r.qid));
    console.log(`[w3] já no acervo: ${existing.length} · wouldCreate: ${missing.length}`);

    for (const s of missing.slice(0, 8)) {
      console.log(`  amostra: ${s.qid} ${s.name ?? '?'} [${s.countryIso ?? '?'}] ${s.gender}`);
    }
    if (!APPLY_ON) {
      console.log('[w3] DRY-RUN — nada gravado. Rode com --apply.');
      return 0;
    }

    // Logos em lote (P154) para os ausentes
    const logos = new Map<string, string>();
    for (let i = 0; i < missing.length; i += 50) {
      const res = await fetchEntities(
        missing.slice(i, i + 50).map((m) => m.qid),
        {
          userAgent: MEDIA_USER_AGENT,
          sleep,
        },
      );
      for (const [qid, e] of res) {
        const f = claimScalar(e as EntityShape, 'P154');
        if (f) logos.set(qid, commonsFilePath(f, 300));
      }
      console.log(`  logos ${Math.min(i + 50, missing.length)}/${missing.length}`);
    }

    let created = 0;
    for (let i = 0; i < missing.length; i += 500) {
      for (const s of missing.slice(i, i + 500)) {
        if (!s.name) continue; // R4: sem rótulo humano não entra
        try {
          await prisma.club.create({
            data: {
              name: s.name,
              fullName: s.name,
              country: s.countryIso,
              gender: s.gender,
              kind: 'national_team',
              federation: s.countryName,
              logoUrl: logos.get(s.qid) ?? null,
              qid: s.qid,
              importedFrom: 'wikidata-national-teams',
              importedAt: new Date(),
              sourceUrl: 'https://www.wikidata.org/wiki/' + s.qid,
            } as Prisma.ClubCreateInput,
          });
          created += 1;
        } catch (err) {
          if ((err as { code?: string }).code !== 'P2002') throw err;
        }
      }
      console.log(
        `  lote ${Math.floor(i / 500) + 1}/${Math.ceil(missing.length / 500)} — criados: ${created}`,
      );
    }
    console.log(`[w3] seleções criadas: ${created} · logos: ${logos.size}`);

    const total = await prisma.club.count({ where: { kind: 'national_team' } });
    console.log(`[w3] total de seleções no acervo: ${total}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-national-teams')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[w3] falha no seed de seleções');
      process.exit(1);
    });
}
