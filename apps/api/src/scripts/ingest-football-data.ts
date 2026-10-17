/**
 * football-data.org (T450 wave 9 — DECISÃO: fonte autorizada pelo Operador,
 * chave FOOTBALL_DATA_API_KEY) — preenche lacunas declaradas:
 *
 *  1. TIMES por competição → lacunas de CLUBE (zero-overwrite):
 *     founded → foundedYear, website → website (quando NULL);
 *     clubColors/venue/teamId → metadata.fd (com sourceUrl).
 *     Match por nome normalizado + país da competição; sem criação de clubes
 *     novos (identidade do acervo = QID).
 *  2. STANDINGS (BRA/Série A) → Ranking+entries gender='men',
 *     dataSourceIds=['football-data'] — ranking NOVO e proveniençiado; não
 *     toca nos rankings existentes (EN pilot e women ficam intactos).
 *
 * Free tier: 10 req/min — throttle 6.5s. Competições acessíveis: 13 (sem
 * competições femininas no free tier).
 * Uso: tsx src/scripts/ingest-football-data.ts [--apply] [--standings] [--teams]
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const DO_TEAMS = process.argv.includes('--teams') || !process.argv.includes('--standings');
const DO_STANDINGS = process.argv.includes('--standings') || !process.argv.includes('--teams');
const KEY = process.env.FOOTBALL_DATA_API_KEY ?? '';
const UA = 'AlmanaqueDosClubes/0.1 (football-data; github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const BASE = 'https://api.football-data.org/v4';

if (!KEY) {
  console.error('FOOTBALL_DATA_API_KEY ausente');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fdGet<T>(path: string): Promise<T> {
  for (;;) {
    const res = await fetch(`${BASE}/${path}`, {
      headers: { 'X-Auth-Token': KEY, 'user-agent': UA },
    });
    if (res.status === 429) {
      await sleep(6500);
      continue;
    }
    if (!res.ok) throw new Error(`football-data HTTP ${res.status} em ${path}`);
    return (await res.json()) as T;
  }
}

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(cf|fc|sc|ec|ac|sp|ca)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  founded?: number;
  clubColors?: string;
  venue?: string;
  website?: string;
}

async function main(): Promise<void> {
  console.log(`football-data (APPLY=${APPLY})`);

  // -----------------------------------------------------------------
  // 1) TEAMS BSA → lacunas de clube
  // -----------------------------------------------------------------
  if (DO_TEAMS) {
    const d = await fdGet<{ teams: FdTeam[]; competition: { name: string; code: string } }>(
      'competitions/BSA/teams',
    );
    const teams = d.teams ?? [];
    console.log(`BSA teams: ${teams.length}`);

    let matched = 0;
    let filled = 0;
    const unmatched: string[] = [];
    for (const t of teams) {
      const norm = normalizeName(t.name);
      const candidates = await prisma.club.findMany({
        where: {
          deletedAt: null,
          country: 'BR',
          OR: [
            { name: { contains: t.name.split(' ')[0] ?? '', mode: 'insensitive' } },
            { fullName: { contains: t.name.split(' ')[0] ?? '', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, fullName: true, shortName: true },
      });
      const hit =
        candidates.find(
          (c) =>
            normalizeName(c.name) === norm ||
            normalizeName(c.fullName ?? '') === norm ||
            normalizeName(c.shortName ?? '') === norm,
        ) ?? null;
      if (!hit) {
        unmatched.push(t.name);
        continue;
      }
      matched++;
      const full = await prisma.club.findUnique({
        where: { id: hit.id },
        select: {
          website: true,
          foundedYear: true,
          metadata: true,
        },
      });
      if (!full) continue;
      const patch: Prisma.ClubUpdateInput = {};
      if (!full.website && t.website) patch.website = t.website;
      if (full.foundedYear == null && t.founded) patch.foundedYear = t.founded;
      const meta = (full.metadata as Record<string, unknown> | null) ?? {};
      const fd = (meta.fd as Record<string, unknown> | null) ?? {};
      if (!fd.clubColors && t.clubColors) fd.clubColors = t.clubColors;
      if (!fd.venue && t.venue) fd.venue = t.venue;
      fd.teamId = t.id;
      patch.metadata = { ...meta, fd } as Prisma.InputJsonValue;
      if (Object.keys(patch).length > 1 || patch.website || patch.foundedYear) {
        if (APPLY) await prisma.club.update({ where: { id: hit.id }, data: patch });
        filled++;
        if (filled <= 8) {
          console.log(
            `  ${t.name} → ${hit.name}: fund=${t.founded ?? '-'} venue=${t.venue ?? '-'} site=${t.website ? 'sim' : '-'}`,
          );
        }
      }
    }
    console.log(
      `TEAMS: matched=${matched}/${teams.length} filled=${filled} unmatched=${unmatched.length}`,
    );
    if (unmatched.length) console.log('  unmatched:', unmatched.slice(0, 10).join(' | '));
  }

  // -----------------------------------------------------------------
  // 2) STANDINGS BSA → Ranking novo (men, proveniência football-data)
  // -----------------------------------------------------------------
  if (DO_STANDINGS) {
    await sleep(7000);
    const d = await fdGet<{
      standings: Array<{ type: string; table: Array<Record<string, unknown>> }>;
      season: { startDate: string; endDate: string };
      competition: { name: string };
    }>('competitions/BSA/standings');
    const table = d.standings?.[0]?.table ?? [];
    console.log(`BSA standings: ${table.length} posições`);

    const season = d.season.startDate.slice(0, 4);
    // find-or-create da competição (por nome, gender men)
    let comp = await prisma.competition.findFirst({
      where: { name: { contains: 'Brasileiro Série A' }, country: 'BR', deletedAt: null },
      select: { id: true, name: true },
    });
    if (!comp) {
      if (!APPLY) {
        console.log('  competição BSA inexistente (dry-run não cria)');
      } else {
        comp = await prisma.competition.create({
          data: {
            name: 'Campeonato Brasileiro Série A',
            country: 'BR',
            type: 'LEAGUE',
            importedFrom: 'football-data',
            importedAt: new Date(),
          },
          select: { id: true, name: true },
        });
      }
    }
    if (!APPLY || !comp) {
      console.log('DRY-RUN standings — nada gravado (amostra acima).');
    } else {
      const rankName = `Campeonato Brasileiro Série A ${season}`;
      let ranking = await prisma.ranking.findFirst({
        where: { competitionId: comp.id, season, name: rankName },
        select: { id: true },
      });
      if (!ranking) {
        ranking = await prisma.ranking.create({
          data: {
            name: rankName,
            competitionId: comp.id,
            season,
            publishedAt: new Date(),
          },
          select: { id: true },
        });
      } else {
        await prisma.ranking.update({
          where: { id: ranking.id },
          data: { publishedAt: new Date() },
        });
      }
      let entries = 0;
      for (const row of table) {
        const tm = row.team as { name: string };
        const norm = normalizeName(tm.name);
        const candidates = await prisma.club.findMany({
          where: {
            deletedAt: null,
            country: 'BR',
            OR: [
              { name: { contains: tm.name.split(' ')[0] ?? '', mode: 'insensitive' } },
              { fullName: { contains: tm.name.split(' ')[0] ?? '', mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, fullName: true, shortName: true },
        });
        const hit =
          candidates.find(
            (c) =>
              normalizeName(c.name) === norm ||
              normalizeName(c.fullName ?? '') === norm ||
              normalizeName(c.shortName ?? '') === norm,
          ) ?? null;
        if (!hit) continue;
        await prisma.rankingEntry.upsert({
          where: { rankingId_clubId: { rankingId: ranking.id, clubId: hit.id } },
          update: {
            position: Number(row.position),
            points: Number(row.points),
            baseMatches: Number(row.playedGames),
            dataSourceIds: ['football-data'],
            gender: 'men',
            reason: null,
          },
          create: {
            rankingId: ranking.id,
            clubId: hit.id,
            position: Number(row.position),
            points: Number(row.points),
            baseMatches: Number(row.playedGames),
            dataSourceIds: ['football-data'],
            gender: 'men',
          },
        });
        entries++;
      }
      console.log(`  ranking "${rankName}": ${entries} entradas (dataSourceIds=['football-data'])`);
    }
  }

  console.log(APPLY ? 'APPLY concluído.' : 'DRY-RUN — nada gravado.');
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
