/**
 * T502 / W1 — MÍDIA DOS CLUBES: logo (P154) e estádio (P115 → nome/coords/
 * capacidade/imagem via P625/P1083/P18). Zero overwrite: só preenche campo NULL.
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/enrich-clubs-media.js --limit=100 [--country=BR]
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchEntities,
  commonsFilePath,
  claimScalar,
  claimAll,
  bestLabel,
  MEDIA_USER_AGENT,
  type EntityShape,
} from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '' },
    country: { type: 'string', default: '' },
  },
});
const LIMIT = values.limit ? parseInt(values.limit, 10) : Infinity;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const APPLY_ON = values.apply || APPLY;
const stadiumEntities = new Map<string, EntityShape>();

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const clubs = await prisma.club.findMany({
      where: {
        qid: { not: null },
        deletedAt: null,
        ...(values.country ? { country: values.country } : {}),
      },
      select: {
        id: true,
        qid: true,
        name: true,
        logoUrl: true,
        stadiumName: true,
        stadiumImage: true,
        stadiumCapacity: true,
        stadiumLat: true,
        stadiumLng: true,
      },
      take: Number.isFinite(LIMIT) ? LIMIT : undefined,
      orderBy: { name: 'asc' },
    });
    const pending = clubs.filter(
      (c) => !c.logoUrl || !c.stadiumName || !c.stadiumImage || c.stadiumCapacity == null,
    );
    console.log(
      `[w1] escopo: ${clubs.length} clubes · a enriquecer: ${pending.length} · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (pending.length === 0) return 0;

    // Fase A — clubes (lotes de 50, 1 req/s)
    const clubEntities = new Map<string, EntityShape>();
    const qids = pending.map((c) => c.qid!);
    for (let i = 0; i < qids.length; i += 50) {
      const res = await fetchEntities(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) clubEntities.set(qid, e);
      console.log(`  clubes ${Math.min(i + 50, qids.length)}/${qids.length}`);
    }

    // Extrai logo + estádio QID por clube
    const stadiumQids = new Set<string>();
    interface ClubPlan {
      id: string;
      logoUrl: string | null;
      stadiumQid: string | null;
    }
    const plans: ClubPlan[] = [];
    for (const c of pending) {
      const e = clubEntities.get(c.qid!);
      if (!e) continue;
      const logoFile = claimScalar(e, 'P154');
      const stadiumQid = qidFromClaims(e, 'P115');
      if (stadiumQid) stadiumQids.add(stadiumQid);
      plans.push({
        id: c.id,
        logoUrl: logoFile ? commonsFilePath(logoFile, 300) : null,
        stadiumQid,
      });
    }

    // Fase B — estádios (2ª rodada de lotes)
    const stList = [...stadiumQids];
    for (let i = 0; i < stList.length; i += 50) {
      const res = await fetchEntities(stList.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) stadiumEntities.set(qid, e);
      console.log(`  estádios ${Math.min(i + 50, stList.length)}/${stList.length}`);
    }

    // Aplica (só preenche NULL — zero overwrite)
    let updated = 0;
    let unchanged = 0;
    for (const plan of plans) {
      const data: Record<string, unknown> = {};
      if (plan.logoUrl) data.logoUrl = plan.logoUrl;
      const stEntity = plan.stadiumQid ? stadiumEntities.get(plan.stadiumQid) : undefined;
      if (stEntity) {
        if (!data.stadiumName) {
          const name = bestLabel(stEntity);
          if (name) data.stadiumName = name;
        }
        const coords = claimScalar(stEntity, 'P625');
        // P625 format: { latitude, longitude, precision, globe } — mas claimScalar
        // retorna .time para objetos com time; para coords o value é objeto com
        // latitude/longitude. Tratamos abaixo via claimAll-free path:
        if (coords == null) {
          // fallback: extrair direto
          const raw = (
            stEntity.claims?.P625?.[0] as
              | { mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number } } } }
              | undefined
          )?.mainsnak?.datavalue?.value;
          if (raw) {
            data.stadiumLat = raw.latitude ?? null;
            data.stadiumLng = raw.longitude ?? null;
          }
        } else {
          const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(coords);
          if (m) {
            data.stadiumLng = parseFloat(m[1]);
            data.stadiumLat = parseFloat(m[2]);
          }
        }
        const cap = claimScalar(stEntity, 'P1083');
        if (cap && !Number.isNaN(parseInt(cap, 10))) data.stadiumCapacity = parseInt(cap, 10);
        if (!data.stadiumImage) {
          const img = claimAll(stEntity, 'P18')[0];
          if (img) data.stadiumImage = commonsFilePath(img, 600);
        }
      }
      if (Object.keys(data).length === 0) {
        unchanged += 1;
        continue;
      }
      if (APPLY_ON) {
        await prisma.club.update({ where: { id: plan.id }, data: data as Prisma.ClubUpdateInput });
        updated += 1;
      }
    }
    console.log(
      `[w1] fim: atualizados=${APPLY_ON ? updated : 0} (dry) · sem-alteração=${unchanged} · estádios consultados=${stList.length}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

function qidFromClaims(e: EntityShape, pid: string): string | null {
  const v = (
    e.claims?.[pid]?.[0] as { mainsnak?: { datavalue?: { value?: { id?: string } } } } | undefined
  )?.mainsnak?.datavalue?.value;
  return v?.id ?? null;
}

if (process.argv[1]?.includes('enrich-clubs-media')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[w1] falha no enrich de mídia dos clubes');
      process.exit(1);
    });
}
