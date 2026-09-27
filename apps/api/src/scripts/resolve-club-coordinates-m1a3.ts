/**
 * WS-D M1a-3 — Geocodificação opcional via fallback profundo Wikidata (CC0).
 *
 * Preenche SOMENTE `latitude`/`longitude` nulas (nunca sobrescreve) e `city` quando vazia;
 * grava proveniência/precisão em `clubs.metadata` (JSONB): {coordSource, coordPrecision, coordResolvedAt}.
 * NÃO toca `importedFrom`/`sourceUrl` (proveniência da ingestão). Nunca usa centroide de país.
 * Default DRY. `--apply` em produção exige `--allow-production`.
 *
 * Uso:
 *   tsx src/scripts/resolve-club-coordinates-m1a3.ts [--country=SE] [--limit=N] [--max-chain=3]
 *       [--apply --allow-production] [--manifest-out=path] [--sample-out=path]
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { fetchEntities } from '../lib/wikidata/wikidata-client.js';
import {
  resolveDeepCoordinatesBulk,
  type DeepCoordResult,
} from '../lib/wikidata/deep-coordinates.js';

function argStr(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : undefined;
}
function argNum(name: string, def: number): number {
  const n = Number.parseInt(argStr(name) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const country = argStr('country');
  const limit = argNum('limit', 0);
  const chunkSize = argNum('chunk-size', 100);
  const maxChain = argNum('max-chain', 3);

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
        ...(country ? { country } : {}),
        OR: [{ latitude: null }, { longitude: null }],
      },
      select: { id: true, qid: true, latitude: true, longitude: true, city: true, metadata: true },
      orderBy: { id: 'asc' },
    });
    if (limit) clubs = clubs.slice(0, limit);

    const resolved = await resolveDeepCoordinatesBulk(
      clubs.map((c) => c.qid as string),
      fetchEntities,
      { maxChain },
    );

    const plans: Array<{ club: (typeof clubs)[number]; r: DeepCoordResult }> = [];
    for (const c of clubs) {
      const r = resolved.get(c.qid as string) ?? null;
      if (r) plans.push({ club: c, r });
    }

    const bySource: Record<string, number> = {};
    const byPrecision: Record<string, number> = {};
    for (const { r } of plans) {
      bySource[r.source] = (bySource[r.source] ?? 0) + 1;
      byPrecision[r.precision] = (byPrecision[r.precision] ?? 0) + 1;
    }

    const wouldUpdate = {
      coordinates: plans.filter((p) => p.club.latitude == null || p.club.longitude == null).length,
      city: plans.filter((p) => !p.club.city && p.r.cityLabel).length,
    };

    const sampleOut = argStr('sample-out');
    if (sampleOut) {
      const { writeFileSync } = await import('node:fs');
      const sample = plans
        .slice(0, 200)
        .map((p) => `${p.club.qid}|${p.r.lat}|${p.r.lng}|${p.r.source}|${p.r.precision}`);
      writeFileSync(sampleOut, sample.join('\n') + '\n', 'utf8');
    }

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'DRY',
            country: country ?? null,
            candidates: clubs.length,
            wouldResolve: plans.length,
            wouldUpdate,
            bySource,
            byPrecision,
            skipped: { no_coordinates_found: clubs.length - plans.length },
            errors: [],
          },
          null,
          2,
        ),
      );
      return;
    }

    const now = new Date().toISOString();
    const updated = { coordinates: 0, city: 0 };
    let totalUpdated = 0;
    for (let i = 0; i < plans.length; i += chunkSize) {
      const chunk = plans.slice(i, i + chunkSize);
      await prisma.$transaction(
        async (tx) => {
          for (const { club, r } of chunk) {
            const meta = { ...((club.metadata as Record<string, unknown> | null) ?? {}) };
            meta.coordSource = r.source;
            meta.coordPrecision = r.precision;
            meta.coordResolvedAt = now;
            const res = await tx.club.updateMany({
              where: { id: club.id, deletedAt: null, OR: [{ latitude: null }, { longitude: null }] },
              data: {
                ...(club.latitude == null ? { latitude: r.lat } : {}),
                ...(club.longitude == null ? { longitude: r.lng } : {}),
                ...(!club.city && r.cityLabel ? { city: r.cityLabel } : {}),
                metadata: meta as Prisma.InputJsonValue,
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

    const manifestPath = argStr('manifest-out');
    const summary = {
      mode: 'APPLY',
      country: country ?? null,
      totalUpdated,
      updated,
      bySource,
      byPrecision,
      errors: 0,
      hardDeletes: 0,
      migrations: 0,
      overwroteExistingCoords: 0,
      manifestPath: manifestPath ?? null,
    };
    if (manifestPath) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(manifestPath, JSON.stringify(summary, null, 2), 'utf8');
    }
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/resolve-club-coordinates-m1a3\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
