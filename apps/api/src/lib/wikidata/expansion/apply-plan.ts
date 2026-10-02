/**
 * WS-D M1b-conservadora — Apply do plano: SOMENTE INSERT (nunca update/merge/rename/reativar).
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { M1B_IMPORTED_FROM, type ClubPlanRow, type CompetitionPlanRow } from './types.js';

export interface ApplyResult {
  createdClubIds: string[];
  createdClubQids: string[];
  createdCompetitionIds: string[];
  createdCompetitionQids: string[];
}

export async function applyClubPlan(
  prisma: PrismaClient,
  rows: ClubPlanRow[],
  retrievedAt: string,
  chunk = 100,
): Promise<{ createdClubIds: string[]; createdClubQids: string[] }> {
  const toCreate = rows.filter((r) => r.action === 'create');
  const createdClubIds: string[] = [];
  const createdClubQids: string[] = [];
  for (let i = 0; i < toCreate.length; i += chunk) {
    const slice = toCreate.slice(i, i + chunk);
    await prisma.$transaction(
      async (tx) => {
        for (const r of slice) {
          const c = await tx.club.create({
            data: {
              name: r.name!,
              fullName: r.fullName ?? null,
              country: r.country ?? null,
              city: r.city ?? null,
              state: r.state ?? null,
              latitude: r.latitude ?? null,
              longitude: r.longitude ?? null,
              foundedYear: r.foundedYear ?? null,
              status: 'ACTIVE',
              qid: r.qid,
              importedFrom: M1B_IMPORTED_FROM,
              importedAt: new Date(retrievedAt),
              sourceUrl: `https://www.wikidata.org/wiki/${r.qid}`,
            },
            select: { id: true },
          });
          createdClubIds.push(c.id);
          createdClubQids.push(r.qid);
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  return { createdClubIds, createdClubQids };
}

export async function applyCompetitionPlan(
  prisma: PrismaClient,
  rows: CompetitionPlanRow[],
  retrievedAt: string,
  chunk = 100,
): Promise<{ createdCompetitionIds: string[]; createdCompetitionQids: string[] }> {
  const toCreate = rows.filter((r) => r.action === 'create');
  const createdCompetitionIds: string[] = [];
  const createdCompetitionQids: string[] = [];
  for (let i = 0; i < toCreate.length; i += chunk) {
    const slice = toCreate.slice(i, i + chunk);
    await prisma.$transaction(
      async (tx) => {
        for (const r of slice) {
          const c = await tx.competition.create({
            data: {
              name: r.name!,
              country: r.country ?? null,
              qid: r.qid,
              importedFrom: M1B_IMPORTED_FROM,
              importedAt: new Date(retrievedAt),
              sourceUrl: `https://www.wikidata.org/wiki/${r.qid}`,
            },
            select: { id: true },
          });
          createdCompetitionIds.push(c.id);
          createdCompetitionQids.push(r.qid);
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  return { createdCompetitionIds, createdCompetitionQids };
}
