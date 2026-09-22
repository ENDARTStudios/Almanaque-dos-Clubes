/**
 * T466 — Repositório Prisma para a sincronização geográfica (implementa `GeoRepository`).
 * Separado do conector (que é puro) para permitir teste com repositório em memória.
 */
import { prisma } from '../../config/prisma.js';
import type {
  CityCreateInput,
  ClubGeoUpdate,
  CountryCreateInput,
  GeoRepository,
  StateCreateInput,
} from './connectors/wikidata-geo.connector.js';

export function prismaGeoRepository(): GeoRepository {
  return {
    findCountryByIso2: (iso2) =>
      prisma.country.findUnique({
        where: { iso2 },
        select: { id: true, name: true, continent: true, qid: true },
      }),
    createCountry: (input: CountryCreateInput) =>
      prisma.country.create({ data: input, select: { id: true } }),
    updateCountry: async (iso2, input) => {
      await prisma.country.update({ where: { iso2 }, data: input });
    },
    findStateByCode: (code) =>
      prisma.state.findUnique({
        where: { code },
        select: { id: true, name: true, countryId: true, qid: true },
      }),
    createState: (input: StateCreateInput) =>
      prisma.state.create({ data: input, select: { id: true } }),
    updateState: async (code, input) => {
      await prisma.state.update({ where: { code }, data: input });
    },
    findCityByQid: (qid) =>
      prisma.city.findUnique({
        where: { qid },
        select: { id: true, name: true, countryId: true, stateId: true },
      }),
    createCity: (input: CityCreateInput) =>
      prisma.city.create({ data: input, select: { id: true } }),
    updateCity: async (qid, input) => {
      await prisma.city.update({ where: { qid }, data: input });
    },
    findClubByQid: (qid) =>
      prisma.club.findUnique({
        where: { qid },
        select: {
          id: true,
          countryId: true,
          stateId: true,
          cityId: true,
          latitude: true,
          longitude: true,
        },
      }),
    updateClubGeo: async (clubId: string, update: ClubGeoUpdate) => {
      await prisma.club.update({ where: { id: clubId }, data: update });
    },
  };
}
