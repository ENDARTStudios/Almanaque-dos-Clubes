// Entity resolver — resolves Wikidata entities to internal database records by QID

import type { PrismaClient } from '@prisma/client';
import type {
  WikidataClub,
  WikidataPlayer,
  WikidataCompetition,
  WikidataStadium,
} from './wikidata-connector.js';

const SOURCE = 'wikidata';

async function resolveClubQid(prisma: PrismaClient, qid: string): Promise<string | null> {
  const club = await prisma.club.findFirst({ where: { qid }, select: { id: true } });
  return club?.id ?? null;
}

export async function upsertClubFromWikidata(
  prisma: PrismaClient,
  club: WikidataClub,
): Promise<string> {
  const log = (msg: string) => console.log(`[EntityResolver] ${msg}`);

  try {
    let existing = await prisma.club.findFirst({ where: { qid: club.qid } });

    if (!existing) {
      existing = await prisma.club.findFirst({
        where: { name: club.name, country: club.country ?? null },
      });
    }

    const data = {
      name: club.name,
      fullName: club.fullName,
      shortName: club.shortName,
      city: club.city,
      country: club.country,
      foundedYear: club.foundedYear,
      website: club.website,
      qid: club.qid,
      importedFrom: SOURCE,
      importedAt: new Date(),
    };

    if (existing) {
      await prisma.club.update({
        where: { id: existing.id },
        data: {
          ...Object.fromEntries(
            Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'importedFrom'),
          ),
        },
      });
      log(`Updated club: ${club.name} (${club.qid})`);
      return existing.id;
    }

    const created = await prisma.club.create({ data });
    log(`Created club: ${club.name} (${club.qid})`);
    return created.id;
  } catch (error) {
    console.error(
      `[EntityResolver] Failed to upsert club "${club.name}" (${club.qid}):`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export async function upsertPlayerFromWikidata(
  prisma: PrismaClient,
  player: WikidataPlayer,
): Promise<string> {
  const log = (msg: string) => console.log(`[EntityResolver] ${msg}`);

  try {
    let clubId: string | undefined;
    if (player.clubQid) {
      clubId = (await resolveClubQid(prisma, player.clubQid)) ?? undefined;
      if (!clubId) {
        console.warn(
          `[EntityResolver] Club QID ${player.clubQid} not found for player ${player.fullName}`,
        );
      }
    }

    let existing = await prisma.player.findFirst({ where: { qid: player.qid } });

    const birthDate = player.birthDate ? new Date(`${player.birthDate}T00:00:00.000Z`) : undefined;

    const data = {
      fullName: player.fullName,
      birthDate,
      country: player.country,
      position: player.position,
      clubId,
      qid: player.qid,
      importedFrom: SOURCE,
      importedAt: new Date(),
    };

    if (existing) {
      const updateFields = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'importedFrom'),
      );
      if (Object.keys(updateFields).length > 0) {
        await prisma.player.update({ where: { id: existing.id }, data: updateFields });
      }
      log(`Updated player: ${player.fullName} (${player.qid})`);
      return existing.id;
    }

    const created = await prisma.player.create({ data });
    log(`Created player: ${player.fullName} (${player.qid})`);
    return created.id;
  } catch (error) {
    console.error(
      `[EntityResolver] Failed to upsert player "${player.fullName}" (${player.qid}):`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export async function upsertCompetitionFromWikidata(
  prisma: PrismaClient,
  comp: WikidataCompetition,
): Promise<string> {
  const log = (msg: string) => console.log(`[EntityResolver] ${msg}`);

  try {
    let existing = await prisma.competition.findFirst({ where: { qid: comp.qid } });

    const data = {
      name: comp.name,
      country: comp.country,
      type: comp.type as import('@prisma/client').CompetitionType | undefined,
      qid: comp.qid,
      importedFrom: SOURCE,
      importedAt: new Date(),
    };

    if (existing) {
      const updateFields = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'importedFrom'),
      );
      if (Object.keys(updateFields).length > 0) {
        await prisma.competition.update({ where: { id: existing.id }, data: updateFields });
      }
      log(`Updated competition: ${comp.name} (${comp.qid})`);
      return existing.id;
    }

    const created = await prisma.competition.create({ data });
    log(`Created competition: ${comp.name} (${comp.qid})`);
    return created.id;
  } catch (error) {
    console.error(
      `[EntityResolver] Failed to upsert competition "${comp.name}" (${comp.qid}):`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export async function upsertStadiumFromWikidata(
  prisma: PrismaClient,
  stadium: WikidataStadium,
): Promise<string> {
  const log = (msg: string) => console.log(`[EntityResolver] ${msg}`);

  try {
    let existing = await prisma.stadium.findFirst({ where: { qid: stadium.qid } });

    const data = {
      name: stadium.name,
      city: stadium.city,
      country: stadium.country,
      latitude: stadium.latitude,
      longitude: stadium.longitude,
      capacity: stadium.capacity,
      surface: stadium.surface,
      qid: stadium.qid,
      importedFrom: SOURCE,
      importedAt: new Date(),
    };

    if (existing) {
      const updateFields = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'importedFrom'),
      );
      if (Object.keys(updateFields).length > 0) {
        await prisma.stadium.update({ where: { id: existing.id }, data: updateFields });
      }
      log(`Updated stadium: ${stadium.name} (${stadium.qid})`);
      return existing.id;
    }

    const created = await prisma.stadium.create({ data });
    log(`Created stadium: ${stadium.name} (${stadium.qid})`);
    return created.id;
  } catch (error) {
    console.error(
      `[EntityResolver] Failed to upsert stadium "${stadium.name}" (${stadium.qid}):`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export async function resolveQidBatch(
  _prisma: PrismaClient,
  _source: string,
  _items: Array<{ qid: string } & Record<string, unknown>>,
): Promise<{ created: number; updated: number }> {
  return { created: 0, updated: 0 };
}
