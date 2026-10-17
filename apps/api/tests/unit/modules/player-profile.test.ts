/**
 * T-22.3 — Unit: `age` derivado de birthDate (nunca armazenado) e o
 * getProfileExtras v2 (carreira com endYear/apps/goals, metrics somados e
 * individualAwards ordenados por ano desc).
 *
 * O serviço instancia queries via `prisma` de src/config/prisma — mockado
 * (o teste só exerce o mapeamento; sem banco). O relógio é congelado com
 * vi.useFakeTimers({ toFake: ['Date'] }) para a virada do aniversário.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    player: { findUnique: vi.fn() },
    knowledgeGraph: { findMany: vi.fn() },
    club: { findMany: vi.fn() },
    competition: { findMany: vi.fn() },
  },
}));

vi.mock('../../../src/config/prisma.js', () => ({ prisma: prismaMock }));

import { ageFromBirthDate, playersService } from '../../../src/modules/players/service.js';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('T-22.3 — ageFromBirthDate (derivado, com relógio congelado)', () => {
  it('um dia ANTES do aniversário ainda tem a idade anterior', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    expect(ageFromBirthDate(new Date('1990-10-18T00:00:00Z'))).toBe(35);
  });

  it('NO DIA do aniversário a idade vira', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T00:00:00Z'));
    expect(ageFromBirthDate(new Date('1990-10-18T00:00:00Z'))).toBe(36);
  });

  it('sem birthDate (ou data inválida) = null — a UI declara o gap', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T00:00:00Z'));
    expect(ageFromBirthDate(null)).toBeNull();
    expect(ageFromBirthDate(new Date('data-inválida'))).toBeNull();
  });

  it('nascimento no futuro = null (guarda de plausibilidade)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T00:00:00Z'));
    expect(ageFromBirthDate(new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });
});

describe('T-22.3 — getProfileExtras v2', () => {
  const player = {
    id: 'p1',
    fullName: 'Jogador Exemplo',
    birthDate: new Date('1990-10-18T00:00:00Z'),
    individualAwards: [
      {
        qid: 'Q1',
        label: 'Bola de Ouro',
        year: 2020,
        sourceUrl: 'https://www.wikidata.org/wiki/Q1',
      },
      {
        qid: 'Q2',
        label: 'Prêmio Antigo',
        year: 2022,
        sourceUrl: 'https://www.wikidata.org/wiki/Q2',
      },
      { quebra: true }, // malformado é descartado
    ],
  };

  it('carreira ganha endYear/apps/goals do metadata; metrics somam; awards ordenam desc', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.knowledgeGraph.findMany.mockResolvedValue([
      // stint com dado completo (bot enrich-player-profiles)
      {
        relation: 'PLAYED_FOR',
        targetId: 'c1',
        targetType: 'Club',
        metadata: { year: 2018, endYear: 2021, apps: 100, goals: 40 },
      },
      // stint sem fim/gols (gols fora de faixa é descartado na leitura também)
      {
        relation: 'PLAYED_FOR',
        targetId: 'c2',
        targetType: 'Club',
        metadata: { year: 2022, apps: 50, goals: 99999 },
      },
      // sem ano → não vira linha de carreira, mas soma apps
      { relation: 'PLAYED_FOR', targetId: 'c2', targetType: 'Club', metadata: { apps: 10 } },
      // título
      { relation: 'WON', targetId: 'k1', targetType: 'Competition', metadata: { year: 2019 } },
    ]);
    prismaMock.club.findMany.mockResolvedValue([
      { id: 'c1', name: 'Clube A', country: 'BR' },
      { id: 'c2', name: 'Clube B', country: null },
    ]);
    prismaMock.competition.findMany.mockResolvedValue([{ id: 'k1', name: 'Liga Exemplo' }]);

    const extras = await playersService.getProfileExtras('p1');

    expect(extras.career).toEqual([
      { year: 2022, endYear: null, apps: 50, goals: null, clubId: 'c2', clubName: 'Clube B' },
      { year: 2018, endYear: 2021, apps: 100, goals: 40, clubId: 'c1', clubName: 'Clube A' },
    ]);
    expect(extras.metrics).toEqual({
      totalApps: 160, // 100 + 50 + 10 (stint sem ano também soma)
      totalGoals: 40, // 99999 fora de faixa é ignorado
      titlesCount: 1,
      awardsCount: 2,
    });
    expect(extras.individualAwards.map((a) => a.qid)).toEqual(['Q2', 'Q1']);
    expect(extras.individualAwards[0]).toEqual({
      qid: 'Q2',
      label: 'Prêmio Antigo',
      year: 2022,
      sourceUrl: 'https://www.wikidata.org/wiki/Q2',
    });
    // getById continua devolvendo a idade derivada (mesma chamada interna).
    const detail = await playersService.getById('p1');
    expect(detail.age).toBe(35); // aniversário é 18/10; hoje é 17/10
  });

  it('jogador sem nada no grafo nem coluna ⇒ vazio honesto (zeros, arrays vazios)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p2',
      fullName: 'Vazio',
      individualAwards: null,
    });
    prismaMock.knowledgeGraph.findMany.mockResolvedValue([]);

    const extras = await playersService.getProfileExtras('p2');
    expect(extras.career).toEqual([]);
    expect(extras.achievements).toEqual([]);
    expect(extras.clubs).toEqual([]);
    expect(extras.individualAwards).toEqual([]);
    expect(extras.currentClub).toBeNull();
    expect(extras.metrics).toEqual({ totalApps: 0, totalGoals: 0, titlesCount: 0, awardsCount: 0 });
  });
});
