import { prisma } from '../../config/prisma.js';

// PostgreSQL usa Json (JSONB nativo); SQLite usa String (serializado) —
// o Prisma Client gerado diverge entre os providers. Mesmo padrão do
// audit-log.service.ts: serialize no SQLite, objeto no Postgres.
const isSQLiteProvider = process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite';

function serializeJson(value: unknown): unknown {
  return isSQLiteProvider ? JSON.stringify(value) : (value as never);
}

function parseJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (!isSQLiteProvider) return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

export const consentRepository = {
  async create(data: {
    visitorId: string;
    version: string;
    categories: unknown;
    userAgent?: string | null;
    ipHash?: string | null;
    metadata?: unknown;
  }) {
    const row = await prisma.cookieConsent.create({
      data: {
        visitorId: data.visitorId,
        version: data.version,
        categories: serializeJson(data.categories) as never,
        userAgent: data.userAgent ?? null,
        ipHash: data.ipHash ?? null,
        metadata: (data.metadata === undefined ? null : serializeJson(data.metadata)) as never,
      },
    });
    // Normaliza a saída para o mesmo formato nos dois providers (SQLite
    // serializa; Postgres devolve objeto).
    return {
      ...row,
      categories: parseJson(row.categories as unknown),
      metadata: parseJson(row.metadata as unknown),
    };
  },

  async findCurrentByVisitorId(visitorId: string) {
    const row = await prisma.cookieConsent.findFirst({
      where: { visitorId, revokedAt: null },
      orderBy: { consentedAt: 'desc' },
    });
    if (!row) return null;
    return {
      ...row,
      categories: parseJson(row.categories as unknown),
      metadata: parseJson(row.metadata as unknown),
    };
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
