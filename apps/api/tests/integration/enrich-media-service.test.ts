/**
 * T506 — integração do service de enrichment de mídia (cobre o batch, não só
 * as funções puras de cor). `globalThis.fetch` é mockado com o shape do
 * wbgetentities; o banco é o de teste (guarda padrão do repo).
 *
 * Casos: W1 (logo/estádio/cores + idempotência) e W2 (foto/posição/país).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { cache } from '../../src/services/cache.js';
import {
  enrichClubsMediaBatch,
  enrichPlayersMediaBatch,
} from '../../src/modules/etl/enrich-media.service.js';

let dbOk = true;
const suffix = Date.now();
let clubId = '';
let playerId = '';
const CLUB_QID = `Q9900${suffix % 1000}`;
const PLAYER_QID = `Q8800${suffix % 1000}`;
const STADIUM_QID = `Q7700${suffix % 1000}`;
const COLOR_QID = `Q6600${suffix % 1000}`;
const POS_QID = `Q5500${suffix % 1000}`;
const COUNTRY_QID = `Q4400${suffix % 1000}`;

/** Resposta wbgetentities com 1 entidade. */
function entityResponse(qid: string, claims: Record<string, unknown>) {
  return {
    entities: {
      [qid]: {
        labels: { en: { language: 'en', value: `Label ${qid}` } },
        claims,
      },
    },
  };
}

function claim(pid: string, value: unknown) {
  return { [pid]: [{ mainsnak: { datavalue: { value } } }] };
}

beforeAll(async () => {
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  const club = await prisma.club.create({
    data: { name: `Clube Mídia ${suffix}`, qid: CLUB_QID, country: 'BR', importedFrom: 'test' },
  });
  clubId = club.id;
  const player = await prisma.player.create({
    data: { fullName: `Jogador Mídia ${suffix}`, qid: PLAYER_QID, importedFrom: 'test' },
  });
  playerId = player.id;
  // País do T466 para o P27→ISO
  await prisma.country.upsert({
    where: { iso2: 'BR' },
    update: {},
    create: { iso2: 'BR', name: 'Brasil', qid: COUNTRY_QID },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  if (dbOk) {
    if (clubId) await prisma.club.deleteMany({ where: { id: clubId } });
    if (playerId) await prisma.player.deleteMany({ where: { id: playerId } });
    await cache.invalidate('clubs:profile:*').catch(() => {});
  }
});

describe('enrichClubsMediaBatch (T506 W1)', () => {
  it('aplica logo/estádio/cores via wbgetentities e é idempotente', async () => {
    if (!dbOk) return;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        const json = u.includes(STADIUM_QID)
          ? entityResponse(STADIUM_QID, {
              ...claim('P625', { latitude: -23.55, longitude: -46.63 }),
              ...claim('P1083', 78000),
              ...claim('P18', 'Arena_Test.jpg'),
            })
          : u.includes(COLOR_QID)
            ? entityResponse(COLOR_QID, {}) // label "Label Q…" não é cor conhecida
            : entityResponse(CLUB_QID, {
                ...claim('P154', 'Escudo_Test.svg'),
                ...claim('P115', { id: STADIUM_QID, 'entity-type': 'item' }),
                ...claim('P465', 'FF0000'),
                ...claim('P462', { id: COLOR_QID, 'entity-type': 'item' }),
              });
        return { ok: true, status: 200, json: async () => json } as unknown as Response;
      }),
    );

    const out = await enrichClubsMediaBatch(50, { apply: true });
    expect(out.processed).toBeGreaterThan(0);
    expect(out.updated).toBeGreaterThan(0);
    // cor não mapeada é REPORTADA (não inventada)
    expect(Array.isArray(out.unknownColors)).toBe(true);

    const row = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        logoUrl: true,
        stadiumName: true,
        stadiumCapacity: true,
        teamColors: true,
        stadiumLat: true,
      },
    });
    expect(row?.logoUrl).toContain('Escudo_Test.svg');
    expect(row?.stadiumCapacity).toBe(78000);
    expect(row?.stadiumLat).toBeCloseTo(-23.55, 2);
    expect(row?.teamColors).toEqual(['#FF0000']);

    // 2ª execução: nada a atualizar (só preenche NULL)
    const noop = await enrichClubsMediaBatch(50, { apply: true });
    const stillThere = await prisma.club.findUnique({
      where: { id: clubId },
      select: { logoUrl: true },
    });
    expect(stillThere?.logoUrl).toContain('Escudo_Test.svg');
    expect(noop.updated).toBeLessThanOrEqual(out.updated);
  });
});

describe('enrichPlayersMediaBatch (T506 W2)', () => {
  it('aplica foto/posição/país via wbgetentities', async () => {
    if (!dbOk) return;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        const json = u.includes(POS_QID)
          ? entityResponse(POS_QID, {})
          : entityResponse(PLAYER_QID, {
              ...claim('P18', 'Retrato_Test.jpg'),
              ...claim('P27', { id: COUNTRY_QID, 'entity-type': 'item' }),
              ...claim('P413', { id: POS_QID, 'entity-type': 'item' }),
            });
        return { ok: true, status: 200, json: async () => json } as unknown as Response;
      }),
    );

    const out = await enrichPlayersMediaBatch(50, { apply: true });
    expect(out.processed).toBeGreaterThan(0);
    expect(out.updated).toBeGreaterThan(0);

    const row = await prisma.player.findUnique({
      where: { id: playerId },
      select: { photoUrl: true },
    });
    expect(row?.photoUrl).toContain('Retrato_Test.jpg');
  });
});
