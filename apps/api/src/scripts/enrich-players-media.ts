/**
 * T502 / W2 — MÍDIA DOS JOGADORES: foto (P18) + completude de bio
 * (P27→país se null, P413→posição se null). Zero overwrite.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-players-media.js --limit=100
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchEntities,
  commonsFilePath,
  claimScalar,
  bestLabel,
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

// P413 (rótulo EN) → posição do acervo (mesmo mapa do connector T034)
function positionFromLabel(label: string | null): string | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('goalkeeper')) return 'GOALKEEPER';
  if (l.includes('defender') || l.includes('centre-back') || l.includes('fullback'))
    return 'DEFENDER';
  if (l.includes('midfielder')) return 'MIDFIELDER';
  if (l.includes('forward') || l.includes('striker') || l.includes('winger')) return 'FORWARD';
  return null;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const players = await prisma.player.findMany({
      where: { qid: { not: null } },
      select: {
        id: true,
        qid: true,
        fullName: true,
        photoUrl: true,
        country: true,
        position: true,
      },
      take: Number.isFinite(LIMIT) ? LIMIT : undefined,
      orderBy: { fullName: 'asc' },
    });
    const pending = players.filter((p) => !p.photoUrl || !p.country || !p.position);
    console.log(
      `[w2] escopo: ${players.length} jogadores · a enriquecer: ${pending.length} · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (pending.length === 0) return 0;

    const qids = pending.map((p) => p.qid!);
    const entities = new Map<string, EntityShape>();
    for (let i = 0; i < qids.length; i += 50) {
      const res = await fetchEntities(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) entities.set(qid, e);
      if (i % 500 === 0)
        console.log(`  wbgetentities ${Math.min(i + 50, qids.length)}/${qids.length}`);
    }

    // Resolve posições: QIDs P413 → rótulo EN (1 lote por QIDs distintos)
    const posQids = new Set<string>();
    for (const e of entities.values()) {
      const raw = (e.claims?.P413 ?? [])
        .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
        .filter((q): q is string => !!q);
      for (const q of raw) posQids.add(q);
    }
    const posLabels = new Map<string, string>();
    const posList = [...posQids];
    for (let i = 0; i < posList.length; i += 50) {
      const res = await fetchEntities(posList.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) {
        const l = bestLabel(e);
        if (l) posLabels.set(qid, l);
      }
    }

    let updated = 0;
    let noMedia = 0;
    for (let i = 0; i < pending.length; i += 1000) {
      const chunk = pending.slice(i, i + 1000);
      for (const p of chunk) {
        const e = entities.get(p.qid!);
        if (!e) {
          noMedia += 1;
          continue;
        }
        const data: Record<string, unknown> = {};
        if (!p.photoUrl) {
          const img = claimScalar(e, 'P18');
          if (img) data.photoUrl = commonsFilePath(img, 400);
        }
        if (!p.country) {
          const cc = claimScalar(e, 'P27') ? await isoFor(prisma, e) : null;
          if (cc) data.country = cc;
        }
        if (!p.position) {
          const qids413 = (e.claims?.P413 ?? [])
            .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
            .filter((q): q is string => !!q);
          const pos =
            qids413.map((q) => positionFromLabel(posLabels.get(q) ?? null)).find((x) => x) ?? null;
          if (pos) data.position = pos;
        }
        if (Object.keys(data).length === 0) {
          noMedia += 1;
          continue;
        }
        if (APPLY_ON) {
          await prisma.player.update({
            where: { id: p.id },
            data: data as Prisma.PlayerUpdateInput,
          });
          updated += 1;
        }
      }
      if (APPLY_ON)
        console.log(
          `  lote ${Math.floor(i / 1000) + 1}/${Math.ceil(pending.length / 1000)} — atualizados: ${updated}`,
        );
    }
    console.log(`[w2] fim: atualizados=${APPLY_ON ? updated : 0} (dry) · sem-dados=${noMedia}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

/** P27 (QID do país) → ISO alpha-2 via tabela `countries` (T466). */
async function isoFor(prisma: PrismaClient, e: EntityShape): Promise<string | null> {
  const countryQid = (
    e.claims?.P27?.[0] as { mainsnak?: { datavalue?: { value?: { id?: string } } } } | undefined
  )?.mainsnak?.datavalue?.value?.id;
  if (!countryQid) return null;
  const row = await prisma.country.findFirst({
    where: { qid: countryQid },
    select: { iso2: true },
  });
  return row?.iso2 ?? null;
}

if (process.argv[1]?.includes('enrich-players-media')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error(
        { err: String(err).slice(0, 200) },
        '[w2] falha no enrich de mídia dos jogadores',
      );
      process.exit(1);
    });
}
