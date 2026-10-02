/**
 * T443 — Restore de backup JSON (drill mensal / desastre).
 *
 * Uso:
 *   DATABASE_URL=<alvo> npx tsx scripts/restore-json-backup.ts backup.json
 *
 * Upsert por id (idempotente). Respeita a mesma minimização do dump:
 * users restauram SEM passwordHash (senha redefinível via forgot).
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const path = process.argv[2];
if (!path) {
  console.error('uso: restore-json-backup.ts <backup.json>');
  process.exit(1);
}

const backup = JSON.parse(readFileSync(path, 'utf8')) as {
  tables: Record<string, Array<Record<string, unknown>>>;
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tables = backup.tables;
  // Ordem respeita FKs (favorites → clubs/users; rankingEntries → rankings/clubs).
  const order = [
    'clubs',
    'players',
    'competitions',
    'seasons',
    'rankings',
    'rankingEntries',
    'users',
    'favorites',
  ] as const;

  for (const name of order) {
    const rows = tables[name] ?? [];
    let ok = 0;
    for (const row of rows) {
      try {
        await upsert(name, row);
        ok += 1;
      } catch (err) {
        console.error(
          `falha em ${name} id=${(row as { id?: string }).id}:`,
          (err as Error).message,
        );
      }
    }
    console.log(`${name}: ${ok}/${rows.length} restaurados`);
  }
}

async function upsert(name: string, row: Record<string, unknown>): Promise<void> {
  const { id } = row;
  const data = { ...row };
  delete (data as { id?: string }).id;
  // Datas em string → Date (Prisma exige Date para colunas DateTime).
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      (data as Record<string, unknown>)[k] = new Date(v);
    }
  }
  switch (name) {
    case 'clubs':
      await prisma.club.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'players':
      await prisma.player.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'competitions':
      await prisma.competition.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'seasons':
      await prisma.season.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'rankings':
      await prisma.ranking.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'rankingEntries':
      await prisma.rankingEntry.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    case 'users':
      await prisma.user.upsert({
        where: { id: id as string },
        update: { ...data, passwordHash: 'RESET-VIA-FORGET' },
        create: {
          ...(data as object),
          id: id as string,
          passwordHash: 'RESET-VIA-FORGET',
        } as never,
      });
      break;
    case 'favorites':
      await prisma.favorite.upsert({
        where: { id: id as string },
        update: data,
        create: { ...(data as object), id: id as string } as never,
      });
      break;
    default:
      throw new Error(`tabela desconhecida: ${name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
