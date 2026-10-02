/**
 * WS-D M1a-3 (Opção C) — Geocodificação APROXIMADA via Nominatim/OSM para clubes sem
 * coordenada após o fallback Wikidata (Opção A esgotada). ODbL — atribuição obrigatória.
 *
 * Regras: máx. 1 req/s (cliente), nunca sobrescreve coords existentes, só preenche `latitude`/
 * `longitude` nulas; grava proveniência em `clubs.metadata`
 *   { coordSource:'nominatim', coordPrecision:'approximate', coordResolvedAt, nominatimPlaceId,
 *     nominatimDisplayName, coordAttribution }
 * NÃO toca `importedFrom`/`sourceUrl`. Default DRY. `--apply` em produção exige `--allow-production`.
 *
 * Uso:
 *   tsx src/scripts/geocode-clubs-nominatim.ts [--country=SE] [--limit=N] [--interval-ms=1100]
 *       [--cache-file=/tmp/geo-cache.json] [--apply --allow-production] [--manifest-out=path]
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { NominatimClient, type NominatimResult } from '../lib/geocoding/nominatim-client.js';
import { buildQuery, isPlausibleResult } from '../lib/geocoding/geocode-clubs.js';

const UA =
  'AlmanaqueDosClubes-Geocoder/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)';
const ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

function argStr(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : undefined;
}
function argNum(name: string, def: number): number {
  const n = Number.parseInt(argStr(name) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

type CacheEntry = NominatimResult | null;
type Cache = Record<string, CacheEntry>;

function loadCache(path?: string): Cache {
  if (!path || !existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Cache;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const country = argStr('country');
  const limit = argNum('limit', 0);
  const intervalMs = argNum('interval-ms', 1100);
  const cacheFile = argStr('cache-file');

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
        AND: [{ latitude: null }, { longitude: null }],
      },
      select: { id: true, qid: true, name: true, fullName: true, country: true, metadata: true },
      orderBy: { id: 'asc' },
    });
    if (limit) clubs = clubs.slice(0, limit);

    const cache = loadCache(cacheFile);
    const client = new NominatimClient({ userAgent: UA, minIntervalMs: intervalMs });

    const plans: Array<{
      club: (typeof clubs)[number];
      r: NominatimResult;
    }> = [];
    const skipped: Record<string, number> = {
      no_country: 0,
      no_name: 0,
      no_match: 0,
      implausible: 0,
    };

    for (const c of clubs) {
      const iso2 = (c.country ?? '').toLowerCase();
      if (!/^[a-z]{2}$/.test(iso2)) {
        skipped.no_country += 1;
        continue;
      }
      const q = buildQuery((c.name ?? '').trim());
      if (!q) {
        skipped.no_name += 1;
        continue;
      }
      const key = `${iso2}|${q}`;
      let raw: NominatimResult | null;
      if (Object.prototype.hasOwnProperty.call(cache, key)) {
        raw = cache[key];
      } else {
        raw = await client.search(q, iso2);
        cache[key] = raw;
      }
      if (!raw) {
        skipped.no_match += 1;
        continue;
      }
      if (!isPlausibleResult(raw)) {
        skipped.implausible += 1;
        continue;
      }
      plans.push({ club: c, r: raw });
    }

    if (cacheFile) writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');

    const sampleOut = argStr('sample-out');
    if (sampleOut) {
      const sample = plans
        .slice(0, 300)
        .map(
          (p) =>
            `${p.club.country}|${p.club.name}|${p.r.lat},${p.r.lon}|${p.r.class}/${p.r.type}|${p.r.displayName}`,
        );
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
            requests: client.requestCount,
            skipped,
            errors: [],
          },
          null,
          2,
        ),
      );
      return;
    }

    const now = new Date().toISOString();
    let totalUpdated = 0;
    const chunkSize = 100;
    for (let i = 0; i < plans.length; i += chunkSize) {
      const chunk = plans.slice(i, i + chunkSize);
      await prisma.$transaction(
        async (tx) => {
          for (const { club, r } of chunk) {
            const meta = { ...((club.metadata as Record<string, unknown> | null) ?? {}) };
            meta.coordSource = 'nominatim';
            meta.coordPrecision = 'approximate';
            meta.coordResolvedAt = now;
            meta.nominatimPlaceId = r.placeId;
            meta.nominatimDisplayName = r.displayName;
            meta.coordAttribution = ATTRIBUTION;
            const res = await tx.club.updateMany({
              where: {
                id: club.id,
                deletedAt: null,
                AND: [{ latitude: null }, { longitude: null }],
              },
              data: { latitude: r.lat, longitude: r.lon, metadata: meta as Prisma.InputJsonValue },
            });
            if (res.count === 1) totalUpdated += 1;
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    const manifestPath = argStr('manifest-out');
    const summary = {
      mode: 'APPLY',
      country: country ?? null,
      totalUpdated,
      requests: client.requestCount,
      skipped,
      errors: 0,
      hardDeletes: 0,
      migrations: 0,
      overwroteExistingCoords: 0,
      attribution: ATTRIBUTION,
      manifestPath: manifestPath ?? null,
    };
    if (manifestPath) writeFileSync(manifestPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/geocode-clubs-nominatim\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
