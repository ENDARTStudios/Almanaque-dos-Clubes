import { describe, it, expect } from 'vitest';
import {
  validatePairsFile,
  validateHumanPair,
  type HumanPair,
  type CompetitionRow,
} from '../../../src/lib/identity/competition-dedupe.js';

const UUID_A = '28b0f5d4-e86b-4682-ad03-ed8eb6345477';
const UUID_B = '9d50e9fa-bc31-4ea8-af77-e429f451ff52';

const row = (id: string, qid: string | null, deletedAt: Date | null = null): CompetitionRow => ({
  id,
  name: 'x',
  qid,
  deletedAt,
});

const pair: HumanPair = {
  duplicateId: UUID_A,
  canonicalId: UUID_B,
  canonicalQid: 'Q184795',
  duplicateName: 'Copa Libertadores da América',
  canonicalName: 'Copa Libertadores',
  reason: 'human_confirmed_same_competition_name_divergence',
  evidence: {
    wikidataUrl: 'https://www.wikidata.org/wiki/Q184795',
    wikidataLabels: ['Copa Libertadores'],
  },
};

describe('T448b-2i — validatePairsFile', () => {
  it('arquivo válido', () => {
    const f = {
      version: 'v1',
      source: 'human-review',
      reviewedBy: 'x',
      retrievedAt: '2026-09-27T00:00:00Z',
      pairs: [pair],
    };
    expect(validatePairsFile(f).errors).toEqual([]);
  });
  it('retrievedAt ausente/inválido', () => {
    expect(validatePairsFile({ retrievedAt: 'nope', pairs: [pair] }).errors).toContain(
      'retrievedAt_missing_or_invalid',
    );
  });
  it('duplicate == canonical', () => {
    expect(
      validatePairsFile({
        retrievedAt: '2026-09-27T00:00:00Z',
        pairs: [{ ...pair, canonicalId: UUID_A }],
      }).errors,
    ).toContain(`duplicate_equals_canonical:${UUID_A}`);
  });
  it('duplicateId repetido', () => {
    const e = validatePairsFile({
      retrievedAt: '2026-09-27T00:00:00Z',
      pairs: [pair, pair],
    }).errors;
    expect(e).toContain(`duplicate_id_repeated:${UUID_A}`);
  });
  it('evidência Wikidata ausente', () => {
    const e = validatePairsFile({
      retrievedAt: '2026-09-27T00:00:00Z',
      pairs: [{ ...pair, evidence: { wikidataUrl: '', wikidataLabels: [] } }],
    }).errors;
    expect(e.some((x) => x.startsWith('evidence_missing:'))).toBe(true);
  });
});

describe('T448b-2i — validateHumanPair', () => {
  it('par válido (nomes divergentes) → ok', () => {
    expect(validateHumanPair(pair, row(UUID_A, null), row(UUID_B, 'Q184795'))).toBe('ok');
  });
  it('same_id', () => {
    expect(validateHumanPair({ ...pair, canonicalId: UUID_A }, null, null)).toBe('same_id');
  });
  it('missing/soft-deleted/qid', () => {
    expect(validateHumanPair(pair, null, row(UUID_B, 'Q184795'))).toBe('missing_duplicate');
    expect(validateHumanPair(pair, row(UUID_A, null), null)).toBe('missing_canonical');
    expect(validateHumanPair(pair, row(UUID_A, 'Qx'), row(UUID_B, 'Q184795'))).toBe(
      'duplicate_has_qid',
    );
    expect(validateHumanPair(pair, row(UUID_A, null, new Date()), row(UUID_B, 'Q184795'))).toBe(
      'duplicate_soft_deleted',
    );
    expect(validateHumanPair(pair, row(UUID_A, null), row(UUID_B, 'Q184795', new Date()))).toBe(
      'canonical_soft_deleted',
    );
    expect(validateHumanPair(pair, row(UUID_A, null), row(UUID_B, 'Q999'))).toBe(
      'canonical_qid_mismatch',
    );
  });
});
