/**
 * WS-D M1a — Enriquecimento de atributos de clubes via Wikidata (CC0). Default DRY.
 * Preenche APENAS campos nulos (city/latitude/longitude/fullName) por QID; nunca sobrescreve;
 * nunca cria/apaga clubes. `--apply` exige `--allow-production`. Rollback por importedFrom.
 *
 * Uso:
 *   node dist/scripts/enrich-clubs-attributes.js --dry-run
 *   node dist/scripts/enrich-clubs-attributes.js --apply --allow-production
 *   Flags: --chunk-size=100 --limit=N
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { fetchEntities, type WikidataEntity } from '../lib/wikidata/wikidata-client.js';
import {
  extractCoordinate,
  extractP131Qid,
  extractCityLabel,
  extractFullName,
  isCity,
  type Coord,
} from '../lib/wikidata/enrich-attributes.js';

const IMPORTED_FROM = 'wikidata-enrich-v1';

function argNum(name: string, def: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  const n = a ? Number.parseInt(a.slice(name.length + 3), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

interface Plan {
  clubId: string;
  qid: string;
  city: string | null;
  coord: Coord | null;
  fullName: string | null;
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
        OR: [{ city: null }, { latitude: null }, { fullName: null }],
      },
      select: { id: true, qid: true, city: true, latitude: true, fullName: true },
      orderBy: { id: 'asc' },
    });
    if (limit) clubs = clubs.slice(0, limit);

    // 1) busca em lote das entidades dos clubes
    const entities = await fetchEntities(clubs.map((c) => c.qid as string));
    // 2) P131 necessários (quando falta coord/cidade)
    const p131Needed = new Set<string>();
    for (const c of clubs) {
      const e = entities.get(c.qid as string) ?? null;
      const p131 = extractP131Qid(e);
      if (p131 && (!extractCoordinate(e) || !c.city)) p131Needed.add(p131);
    }
    const adminEntities = await fetchEntities([...p131Needed]);

    const plans: Plan[] = [];
    const skipped = { no_coordinates: 0, no_city: 0, no_fullname: 0 };
    for (const c of clubs) {
      const qid = c.qid as string;
      const e = entities.get(qid) ?? null;
      let coord = extractCoordinate(e);
      const p131 = extractP131Qid(e);
      const admin: WikidataEntity | null = p131 ? (adminEntities.get(p131) ?? null) : null;
      if (!coord && admin) coord = extractCoordinate(admin);
      const city = !c.city && admin && isCity(admin) ? extractCityLabel(admin) : null;
      const fullName = !c.fullName ? extractFullName(e) : null;
      if (!coord) skipped.no_coordinates += 1;
      if (!city) skipped.no_city += 1;
      if (!fullName) skipped.no_fullname += 1;
      if (city || coord || fullName) plans.push({ clubId: c.id, qid, city, coord, fullName });
    }

    const wouldUpdate = {
      city: plans.filter((p) => p.city).length,
      coordinates: plans.filter((p) => p.coord).length,
      fullName: plans.filter((p) => p.fullName).length,
    };

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

    const updated = { city: 0, coordinates: 0, fullName: 0 };
    let totalUpdated = 0;
    for (let i = 0; i < plans.length; i += chunkSize) {
      const chunk = plans.slice(i, i + chunkSize);
      await prisma.$transaction(
        async (tx) => {
          for (const p of chunk) {
            const res = await tx.club.updateMany({
              where: {
                id: p.clubId,
                deletedAt: null,
                OR: [{ city: null }, { latitude: null }, { fullName: null }],
              },
              data: {
                ...(p.city ? { city: p.city } : {}),
                ...(p.coord ? { latitude: p.coord.lat, longitude: p.coord.lng } : {}),
                ...(p.fullName ? { fullName: p.fullName } : {}),
                importedFrom: IMPORTED_FROM,
              },
            });
            if (res.count === 1) {
              totalUpdated += 1;
              if (p.city) updated.city += 1;
              if (p.coord) updated.coordinates += 1;
              if (p.fullName) updated.fullName += 1;
            }
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await new Promise((r) => setTimeout(r, 100));
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

const invoked = /scripts\/enrich-clubs-attributes\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
