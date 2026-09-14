import { prisma } from '../../config/prisma.js';

export const consentRepository = {
  async create(data: {
    visitorId: string;
    version: string;
    categories: unknown;
    userAgent?: string | null;
    ipHash?: string | null;
    metadata?: unknown;
  }) {
    return prisma.cookieConsent.create({ data: data as never });
  },

  async findCurrentByVisitorId(visitorId: string) {
    return prisma.cookieConsent.findFirst({
      where: { visitorId, revokedAt: null },
      orderBy: { consentedAt: 'desc' },
    }) as Promise<unknown>;
  },

  async countByVisitorId(visitorId: string) {
    return prisma.cookieConsent.count({ where: { visitorId } });
  },
};

export const policyVersionRepository = {
  async findByVersion(version: string) {
    return prisma.cookiePolicyVersion.findUnique({ where: { version } });
  },

  async upsert(version: string, checksum?: string) {
    return prisma.cookiePolicyVersion.upsert({
      where: { version },
      create: { version, checksum: checksum ?? null },
      update: {},
    });
  },
};
