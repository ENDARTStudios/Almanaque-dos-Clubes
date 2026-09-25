import { describe, it, expect } from 'vitest';
import {
  applyClubSeed,
  planClubSeed,
  validateClubSeedPack,
  ClubSeedError,
  type ClubSeedRepo,
} from '../../../../src/lib/rsssf/seeds/club-seed.js';

// T448b-2d GO/PR 2025 — micro-seed de identidade (só clubes, por QID). Puro.

const goPack = validateClubSeedPack({
  pilotScope: 'go-2025',
  source: 'wikidata',
  license: 'CC0',
  retrievedAt: '2026-09-25T16:26:51Z',
  clubs: [
    {
      qid: 'Q1513287',
      name: 'Vila Nova Futebol Clube',
      country: 'BR',
      importedFrom: 'wikidata-go-2025-pre',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1513287',
    },
  ],
  doNotTouch: ['Q10391045', 'Q10391046'],
});

function repo(over: Partial<ClubSeedRepo> = {}): ClubSeedRepo {
  let created = 0;
  return {
    findClubsByQid: async () => [],
    createClub: async () => {
      created += 1;
      return { id: `new-${created}` };
    },
    ...over,
  };
}

describe('T448b-2d seed — pack', () => {
  it('valida pack CC0 com retrievedAt estático', () => {
    expect(goPack.pilotScope).toBe('go-2025');
    expect(goPack.license).toBe('CC0');
    expect(goPack.clubs[0].qid).toBe('Q1513287');
  });
  it('rejeita clubQid em doNotTouch', () => {
    expect(() =>
      validateClubSeedPack({ ...goPack, clubs: [{ ...goPack.clubs[0], qid: 'Q10391045' }] }),
    ).toThrow(ClubSeedError);
  });
  it('rejeita retrievedAt inválido', () => {
    expect(() => validateClubSeedPack({ ...goPack, retrievedAt: 'nope' })).toThrow(/retrievedAt/);
  });
});

describe('T448b-2d seed — plano', () => {
  it('ausente ⇒ create', async () => {
    const plan = await planClubSeed(goPack, repo());
    expect(plan.entries[0]).toMatchObject({ qid: 'Q1513287', action: 'create', conflicts: [] });
    expect(plan.wouldWrite).toBe(true);
  });
  it('presente ativo ⇒ noop', async () => {
    const plan = await planClubSeed(
      goPack,
      repo({
        findClubsByQid: async (qid) => [
          { id: 'x', qid, name: 'n', country: 'BR', deletedAt: null },
        ],
      }),
    );
    expect(plan.entries[0].action).toBe('noop');
    expect(plan.wouldWrite).toBe(false);
  });
  it('>1 por qid ⇒ ambiguous_club_qid', async () => {
    const plan = await planClubSeed(
      goPack,
      repo({
        findClubsByQid: async (qid) => [
          { id: 'a', qid, name: 'n', country: 'BR', deletedAt: null },
          { id: 'b', qid, name: 'n2', country: 'BR', deletedAt: null },
        ],
      }),
    );
    expect(plan.entries[0].conflicts).toContain('ambiguous_club_qid');
  });
  it('soft-deleted ⇒ soft_deleted_club_qid', async () => {
    const plan = await planClubSeed(
      goPack,
      repo({
        findClubsByQid: async (qid) => [
          { id: 'a', qid, name: 'n', country: 'BR', deletedAt: new Date() },
        ],
      }),
    );
    expect(plan.entries[0].conflicts).toContain('soft_deleted_club_qid');
  });
});

describe('T448b-2d seed — apply', () => {
  it('cria quando ausente (não toca homônimos)', async () => {
    const calls: string[] = [];
    const res = await applyClubSeed(
      goPack,
      repo({
        createClub: async (c) => {
          calls.push(c.qid);
          return { id: 'n' };
        },
      }),
    );
    expect(res.created).toBe(1);
    expect(calls).toEqual(['Q1513287']);
  });
  it('aborta sem escrever em conflito', async () => {
    let wrote = false;
    await expect(
      applyClubSeed(
        goPack,
        repo({
          findClubsByQid: async (qid) => [
            { id: 'a', qid, name: 'n', country: 'BR', deletedAt: null },
            { id: 'b', qid, name: 'n2', country: 'BR', deletedAt: null },
          ],
          createClub: async () => {
            wrote = true;
            return { id: 'x' };
          },
        }),
      ),
    ).rejects.toThrow(ClubSeedError);
    expect(wrote).toBe(false);
  });
});
