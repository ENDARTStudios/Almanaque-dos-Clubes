import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { matchClub } from '../../../src/scripts/seed-competition-seasons.js';

// T510 — match de clube com a REGRA DO QID RESOLVIDO. Regressão do falso
// positivo visto em produção 10/10: "Liverpool" (Q113013, ausente do acervo)
// casava com "A.F.C. Liverpool" (Q18552) — o campeão da Premier League 2024-25
// sairia errado. Quando o artigo da Wikipédia aponta um QID que NÃO está no
// acervo, o match por nome é PROIBIDO (só nome exato de clube sem QID).

interface Row {
  id: string;
  name: string;
  qid: string | null;
  country?: string | null;
  gender?: string;
  kind?: string;
}

/** Prisma falso em memória: interpreta os `where` que o matchClub usa. */
function makePrisma(rows: Row[]) {
  const ok = (r: Row, where: Record<string, unknown>): boolean => {
    if ('deletedAt' in where && where.deletedAt !== null) return false;
    const qid = where.qid as string | null | undefined;
    if (qid !== undefined && r.qid !== (qid ?? null)) return false;
    const kind = where.kind as { not?: string } | undefined;
    if (kind?.not && r.kind === kind.not) return false;
    const gender = where.gender as { not?: string } | undefined;
    if (gender?.not && r.gender === gender.not) return false;
    if (typeof where.country === 'string' && r.country !== where.country) return false;
    const name = where.name as { equals?: string; contains?: string } | undefined;
    if (name?.equals) {
      if ((r.name ?? '').toLowerCase() !== name.equals.toLowerCase()) return false;
    }
    if (name?.contains) {
      if (!(r.name ?? '').toLowerCase().includes(name.contains.toLowerCase())) return false;
    }
    return true;
  };
  return {
    club: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => ok(r, where)) ?? null,
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((r) => ok(r, where)),
    },
  } as unknown as PrismaClient;
}

const CLUBS: Row[] = [
  {
    id: 'afc',
    name: 'A.F.C. Liverpool',
    qid: 'Q18552',
    country: 'GB',
    gender: 'men',
    kind: 'club',
  },
  {
    id: 'mci',
    name: 'Manchester City F.C.',
    qid: 'Q50602',
    country: 'GB',
    gender: 'men',
    kind: 'club',
  },
  { id: 'sao', name: 'São Paulo', qid: null, country: 'BR', gender: 'men', kind: 'club' },
];

describe('matchClub — regra do QID resolvido', () => {
  it('casa pelo QID quando o clube existe', async () => {
    const prisma = makePrisma(CLUBS);
    const r = await matchClub(prisma, {
      rawName: 'Manchester City',
      article: 'Manchester City F.C.',
      qid: 'Q50602',
      country: 'GB',
    });
    expect(r?.id).toBe('mci');
  });

  it('NÃO casa "Liverpool" (Q113013 ausente) com "A.F.C. Liverpool" (Q18552)', async () => {
    const prisma = makePrisma(CLUBS);
    // sem a regra, a normalização "liverpool" === "liverpool" casaria o clube errado
    const r = await matchClub(prisma, {
      rawName: 'Liverpool',
      article: 'Liverpool F.C.',
      qid: 'Q113013',
      country: 'GB',
    });
    expect(r).toBeNull();
  });

  it('aceita nome EXATO de clube SEM QID quando o artigo tem QID não cadastrado', async () => {
    const prisma = makePrisma(CLUBS);
    const r = await matchClub(prisma, { rawName: 'São Paulo', qid: 'Q1812999', country: 'BR' });
    expect(r?.id).toBe('sao');
  });

  it('sem QID, usa a cadeia normalizada (grafias equivalentes)', async () => {
    const prisma = makePrisma(CLUBS);
    const r = await matchClub(prisma, { rawName: 'Manchester City', country: 'GB' });
    expect(r?.id).toBe('mci');
  });
});
