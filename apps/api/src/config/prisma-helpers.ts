/**
 * Helpers de tipagem para repositórios Prisma.
 * Converte strings (domain types) para os tipos enum gerados pelo Prisma.
 * Necessário porque PostgreSQL exige tipos enum estritos (SQLite aceita string).
 */
import type { Prisma } from '@prisma/client';

export function enumClubFilter(status: string): Prisma.EnumClubStatusFilter {
  return status as Prisma.EnumClubStatusFilter;
}

export function enumCompetitionTypeFilter(type: string): Prisma.EnumCompetitionTypeNullableFilter {
  return type as Prisma.EnumCompetitionTypeNullableFilter;
}

export function enumSeasonFilter(status: string): Prisma.EnumSeasonStatusFilter {
  return status as Prisma.EnumSeasonStatusFilter;
}

export function enumMatchFilter(status: string): Prisma.EnumMatchStatusFilter {
  return status as Prisma.EnumMatchStatusFilter;
}
