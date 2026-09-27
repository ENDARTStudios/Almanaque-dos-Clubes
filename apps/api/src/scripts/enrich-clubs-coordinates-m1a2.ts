/**
 * WS-D M1a-2 — Preenche city/latitude/longitude via P159/P115/P131 (Wikidata CC0). Default DRY.
 * Só preenche campos nulos; nunca sobrescreve; nunca cria/apaga. `--apply` exige `--allow-production`.
 * Rollback por importedFrom='wikidata-enrich-m1a2'.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  extractClubCoordinatesBulk,
  type ClubCoordinateResult,
} from '../lib/wikidata/extract-club-coordinates.js';

const IMPORTED_FROM = 'wikidata-enrich-m1a2';

function argNum(name: string, def: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  const n = a ? Number.parseInt(a.slice(name.length + 3), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const chunkSize = argNum('chunk-size', 100);
  const limit = argNum('limit', 0);
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    let clubs = await prisma.club.findMany({
      where: {
        deletedAt: null,
        qid: { not: null },
        OR: [{ latitude: null }, { longitude: null }, { city: null }],
      },
      select: { id: true, qid: true, latitude: true, longitude: true, city: true },
      orderBy: { id: 'asc' },
    });
    if (limit) clubs = clubs.slice(0, limit);

    const results = await extractClubCoordinatesBulk(clubs.map((c) => c.qid as string));

    const plans: Array<{ club: (typeof clubs)[number]; r: ClubCoordinateResult }> = [];
    for (const c of clubs) {
      const r = results.get(c.qid as string) ?? null;
      if (r) plans.push({ club: c, r });
    }

    const wouldUpdate = {
      coordinates: plans.filter((p) => p.club.latitude == null || p.club.longitude == null).length,
      city: plans.filter((p) => !p.club.city && p.r.cityLabel).length,
    };
    const skipped = { no_coordinates_found: clubs.length - plans.length };

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'DRY',
            totalClubsToEnrich: clubs.length,
            chunks: Math.ceil(clubs.length / chunkSize),
            wouldUpdate,
            skipped,
            errors: [],
          },
          null,
          2,
        ),
      );
      return;
    }

    const updated = { coordinates: 0, city: 0 };
    let totalUpdated = 0;
    for (let i = 0; i < plans.length; i += chunkSize) {
      const chunk = plans.slice(i, i + chunkSize);
      await prisma.$transaction(
        async (tx) => {
          for (const { club, r } of chunk) {
            const res = await tx.club.updateMany({
              where: {
                id: club.id,
                deletedAt: null,
                OR: [{ latitude: null }, { longitude: null }, { city: null }],
              },
              data: {
                ...(club.latitude == null ? { latitude: r.lat } : {}),
                ...(club.longitude == null ? { longitude: r.lng } : {}),
                ...(!club.city && r.cityLabel ? { city: r.cityLabel } : {}),
                importedFrom: IMPORTED_FROM,
              },
            });
            if (res.count === 1) {
              totalUpdated += 1;
              if (club.latitude == null || club.longitude == null) updated.coordinates += 1;
              if (!club.city && r.cityLabel) updated.city += 1;
            }
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await new Promise((res) => setTimeout(res, 100));
    }

    console.log(
      JSON.stringify(
        { mode: 'APPLY', totalUpdated, updated, skipped, errors: 0, hardDeletes: 0, migrations: 0 },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/enrich-clubs-coordinates-m1a2\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
