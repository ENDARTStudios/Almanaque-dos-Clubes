/**
 * T507 (W5) — texto editorial de clubes via Wikipedia REST (pt/en/es).
 * Idempotente: só preenche NULL. Fonte CC-BY-SA 3.0 (atribuição no perfil).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-clubs-editorial.js --limit=100 [--country=BR]
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  sitelinksFromEntity,
  buildEditorial,
  EDITORIAL_USER_AGENT,
  EDITORIAL_LICENSE,
} from '../modules/etl/connectors/wikipedia-editorial.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '500' },
    country: { type: 'string', default: '' },
  },
});
const LIMIT = parseInt(values.limit ?? '500', 10) || 500;
const APPLY_ON = values.apply || APPLY;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface WikidataEntity {
  sitelinks?: Record<string, { title?: string } | undefined>;
}

/** wbgetentities com sitelinks (o fetchEntities do media não os pede). */
async function fetchSitelinks(qids: string[]): Promise<Map<string, WikidataEntity>> {
  const out = new Map<string, WikidataEntity>();
  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50);
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}` +
      `&format=json&props=sitelinks`;
    const res = await fetch(url, { headers: { 'user-agent': EDITORIAL_USER_AGENT } });
    if (!res.ok) throw new Error(`wbgetentities(sitelinks) HTTP ${res.status}`);
    const json = (await res.json()) as { entities?: Record<string, WikidataEntity> };
    for (const [qid, e] of Object.entries(json.entities ?? {})) out.set(qid, e);
    if (i + 50 < qids.length) await sleep(1000);
  }
  return out;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const clubs = await prisma.club.findMany({
      where: {
        qid: { not: null },
        deletedAt: null,
        editorialText: { equals: Prisma.DbNull },
        ...(values.country ? { country: values.country } : {}),
      },
      select: { id: true, qid: true, name: true },
      take: LIMIT,
      orderBy: { name: 'asc' },
    });
    console.log(
      `[w5] escopo: ${clubs.length} clubes sem texto · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (clubs.length === 0) {
      console.log('[w5] nada pendente (todos com editorialText ou sem QID).');
      return 0;
    }

    const entities = await fetchSitelinks(clubs.map((c) => c.qid!));

    let updated = 0;
    let noArticle = 0;
    let samples = 0;
    for (const club of clubs) {
      const e = entities.get(club.qid!);
      const titles = e ? sitelinksFromEntity(e) : {};
      if (Object.keys(titles).length === 0) {
        noArticle += 1;
        continue;
      }
      const editorial = await buildEditorial(titles, { sleep });
      if (!editorial) {
        noArticle += 1;
        continue;
      }
      if (samples < 5) {
        const langs = Object.keys(editorial).join(',');
        const firstExtract = Object.values(editorial)[0]?.extract ?? '';
        console.log(`  amostra: ${club.name} [${langs}] — "${firstExtract.slice(0, 90)}…"`);
        samples += 1;
      }
      if (APPLY_ON) {
        await prisma.club.update({
          where: { id: club.id },
          data: {
            editorialText: {
              ...editorial,
              license: EDITORIAL_LICENSE,
            } as unknown as Prisma.InputJsonValue,
          },
        });
        updated += 1;
      }
    }
    console.log(
      `[w5] fim: processados=${clubs.length} · atualizados=${APPLY_ON ? updated : 0} (dry) · sem-artigo=${noArticle}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('enrich-clubs-editorial')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[w5] falha no enriquecimento editorial');
      process.exit(1);
    });
}
