import { describe, it, expect } from 'vitest';
import {
  GoSeedError,
  applyGoSeed,
  loadGoSeedPack,
  planGoSeed,
  validateGoSeedPack,
  type GoSeedRepo,
  type GoSeedCompetitionRef,
} from '../../../../src/lib/rsssf/go/index.js';

// T448b-2d GO — seed de identidade reduzido (2023–2024). Sem rede/DB.

const pack = loadGoSeedPack();

const compRef = (over: Partial<GoSeedCompetitionRef> = {}): GoSeedCompetitionRef => ({
  id: 'c1',
  qid: 'Q931386',
  name: 'Campeonato Goiano de Futebol',
  type: 'LEAGUE',
  country: 'BR',
  importedFrom: null,
  sourceUrl: null,
  ...over,
});

function mockRepo(over: Partial<GoSeedRepo> = {}): GoSeedRepo {
  let created = 0;
  return {
    findCompetitionsByQid: async () => [],
    findCompetitionsByNameLike: async () => [],
    findClubsByQid: async (qid) =>
      qid === 'Q198034'
        ? [{ id: 'club1', qid, name: 'Atlético Clube Goianiense', country: 'BR', deletedAt: null }]
        : [],
    createCompetition: async () => {
      created += 1;
      return { id: `new-${created}` };
    },
    ...over,
  };
}

describe('T448b-2d GO — pack', () => {
  it('escopo, licença, retrievedAt estático e proveniência', () => {
    expect(pack.pilotScope).toBe('go-2023-2024');
    expect(pack.license).toBe('CC0');
    expect(pack.retrievedAt).toBe('2026-09-24T14:49:12Z');
    expect(pack.competition).toEqual(
      expect.objectContaining({
        qid: 'Q931386',
        type: 'LEAGUE',
        country: 'BR',
        importedFrom: 'wikidata-go-pre',
        sourceUrl: 'https://www.wikidata.org/wiki/Q931386',
      }),
    );
    expect(pack.competition).not.toHaveProperty('metadata');
  });

  it('Q198034 é noop_if_present e não tem metadata', () => {
    const c = pack.clubs.find((x) => x.qid === 'Q198034');
    expect(c?.action).toBe('noop_if_present');
    expect(c).not.toHaveProperty('metadata');
    expect(c?.sourceUrl).toBe('https://www.wikidata.org/wiki/Q198034');
  });

  it('Q1513287 aparece SÓ em excluded (nunca em clubs)', () => {
    expect(pack.clubs.some((c) => c.qid === 'Q1513287')).toBe(false);
    expect(pack.excluded.find((e) => e.qid === 'Q1513287')?.reason).toBe(
      'club_name_unique_conflict',
    );
  });

  it('homônimos Q10391045/Q10391046 e Q1513287 estão em doNotTouch', () => {
    expect(pack.doNotTouch).toEqual(expect.arrayContaining(['Q10391045', 'Q10391046', 'Q1513287']));
  });

  it('rejeita pack inválido e retrievedAt não-ISO', () => {
    expect(() => validateGoSeedPack({ pilotScope: 'go-2023-2024' })).toThrow(GoSeedError);
    const bad = { ...pack, retrievedAt: 'not-a-date' };
    expect(() => validateGoSeedPack(bad)).toThrow(/retrievedAt/);
  });
});

describe('T448b-2d GO — plano', () => {
  it('competição ausente ⇒ create; Q198034 ⇒ noop', async () => {
    const plan = await planGoSeed(pack, mockRepo());
    expect(plan.errors).toEqual([]);
    expect(plan.competition).toMatchObject({ qid: 'Q931386', action: 'create', conflicts: [] });
    expect(plan.clubs).toEqual([{ qid: 'Q198034', action: 'noop', conflicts: [] }]);
    expect(plan.wouldWrite).toBe(true);
  });

  it('competição existente ⇒ noop', async () => {
    const plan = await planGoSeed(
      pack,
      mockRepo({ findCompetitionsByQid: async () => [compRef()] }),
    );
    expect(plan.competition.action).toBe('noop');
  });

  it('conflito de nome de competição ⇒ conflicting_competition_name', async () => {
    const plan = await planGoSeed(
      pack,
      mockRepo({
        findCompetitionsByNameLike: async () => [
          compRef({ id: 'other', qid: 'Q999', name: 'Campeonato Goiano X' }),
        ],
      }),
    );
    expect(plan.competition.conflicts).toContain('conflicting_competition_name');
    expect(plan.wouldWrite).toBe(false);
  });

  it('Q198034 ausente ⇒ missing_required_club', async () => {
    const plan = await planGoSeed(pack, mockRepo({ findClubsByQid: async () => [] }));
    expect(plan.clubs[0].conflicts).toContain('missing_required_club');
  });

  it('Q198034 soft-deleted ⇒ soft_deleted_required_club', async () => {
    const plan = await planGoSeed(
      pack,
      mockRepo({
        findClubsByQid: async (qid) => [
          { id: 'x', qid, name: 'Atlético', country: 'BR', deletedAt: new Date() },
        ],
      }),
    );
    expect(plan.clubs[0].conflicts).toContain('soft_deleted_required_club');
  });

  it('pack com Q1513287 em clubs ⇒ forbidden_excluded_club_in_seed_plan', async () => {
    const badPack = {
      ...pack,
      clubs: [
        ...pack.clubs,
        {
          qid: 'Q1513287',
          action: 'noop_if_present' as const,
          name: 'Vila Nova',
          country: 'BR',
          sourceUrl: 'https://www.wikidata.org/wiki/Q1513287',
        },
      ],
    };
    const plan = await planGoSeed(badPack, mockRepo());
    expect(plan.errors).toContain('forbidden_excluded_club_in_seed_plan:Q1513287');
  });

  it('nunca produz link-by-name/rename (ações só create|noop; sem campo de nome)', async () => {
    const plan = await planGoSeed(pack, mockRepo());
    const actions = [plan.competition.action, ...plan.clubs.map((c) => c.action)];
    for (const a of actions) expect(['create', 'noop']).toContain(a);
    expect(plan.competition).not.toHaveProperty('rename');
    expect(plan.competition).not.toHaveProperty('name');
  });
});

describe('T448b-2d GO — apply', () => {
  it('cria apenas a competição; clubes noop; idempotente', async () => {
    let created: string[] = [];
    const repo = mockRepo({
      createCompetition: async (input) => {
        created.push(input.qid);
        return { id: 'new' };
      },
    });
    const res = await applyGoSeed(pack, repo);
    expect(created).toEqual(['Q931386']);
    expect(res.created).toBe(1);
    expect(res.noop).toBe(1);

    // re-run com a competição já existente ⇒ noop
    const repo2 = mockRepo({ findCompetitionsByQid: async () => [compRef()] });
    const res2 = await applyGoSeed(pack, repo2);
    expect(res2.created).toBe(0);
  });

  it('aborta (sem escrever) em conflito', async () => {
    let wrote = false;
    const repo = mockRepo({
      findCompetitionsByNameLike: async () => [compRef({ id: 'o', qid: 'Q999', name: 'X Goiano' })],
      createCompetition: async () => {
        wrote = true;
        return { id: 'x' };
      },
    });
    await expect(applyGoSeed(pack, repo)).rejects.toThrow(GoSeedError);
    expect(wrote).toBe(false);
  });
});
