import { describe, it, expect } from 'vitest';
import {
  filterClub,
  filterCompetition,
  validFoundedYear,
} from '../../../src/lib/wikidata/expansion/filters.js';
import {
  buildClubPlan,
  buildCompetitionPlan,
  type ExistingIndex,
} from '../../../src/lib/wikidata/expansion/plan-builder.js';
import type { RawCandidate } from '../../../src/lib/wikidata/expansion/types.js';

const FOOTBALL = 'Q476028';
const cand = (over: Partial<RawCandidate>): RawCandidate => ({
  qid: 'Q100',
  labelPt: 'Clube X',
  labelEn: 'Club X',
  description: 'clube de futebol',
  p31: [FOOTBALL],
  p17: ['Q45'], // PT
  p576: [],
  ...over,
});

function emptyIdx(): ExistingIndex {
  return {
    activeClubByQid: new Map(),
    softDeletedClubQids: new Set(),
    activeClubNameCountry: new Map(),
    activeCompetitionByQid: new Map(),
    softDeletedCompetitionQids: new Set(),
    activeCompetitionNameCountry: new Map(),
  };
}

describe('M1b — filterClub', () => {
  it('inclui clube masculino válido', () => {
    expect(filterClub(cand({}))).toMatchObject({ include: true, iso2: 'PT' });
  });
  it('exclui feminino / reserva / futsal / seleção / não-futebol / extinto', () => {
    expect(filterClub(cand({ description: 'clube de futebol feminino' })).reason).toBe(
      'excluded_type',
    );
    expect(filterClub(cand({ labelPt: 'Sporting CP B' })).reason).toBe('excluded_type');
    expect(filterClub(cand({ description: 'futsal club' })).reason).toBe('excluded_type');
    expect(filterClub(cand({ labelPt: 'Seleção Portuguesa' })).reason).toBe('excluded_type');
    expect(filterClub(cand({ p31: ['Q5'] })).reason).toBe('excluded_type');
    expect(filterClub(cand({ p576: ['2020-01-01'] })).reason).toBe('dissolved');
  });
  it('exclui label/country ausentes', () => {
    expect(filterClub(cand({ labelPt: null, labelEn: null })).reason).toBe('missing_label');
    expect(filterClub(cand({ p17: ['Q999999'] })).reason).toBe('missing_country_iso');
  });
});

describe('M1b — filterCompetition', () => {
  it('inclui liga (whitelist) e exclui fora da whitelist / feminina', () => {
    expect(filterCompetition(cand({ p31: ['Q15991303'] }))).toMatchObject({
      include: true,
      iso2: 'PT',
    });
    expect(filterCompetition(cand({ p31: ['Q999'] })).reason).toBe('excluded_type');
    expect(
      filterCompetition(cand({ p31: ['Q8463186'], description: 'copa feminina' })).reason,
    ).toBe('excluded_gender');
  });
});

describe('M1b — buildClubPlan (create-only, dedupe por QID)', () => {
  const attrs = new Map([['Q100', { latitude: 1, longitude: 2, city: 'Lisboa' }]]);

  it('cria candidato novo; coords reportadas', () => {
    const p = buildClubPlan([cand({})], attrs, emptyIdx());
    expect(p.wouldCreate).toBe(1);
    expect(p.rows[0]).toMatchObject({
      action: 'create',
      country: 'PT',
      city: 'Lisboa',
      latitude: 1,
    });
    expect(p.coordinateCoverage).toMatchObject({ with_coords: 1, percent: 100 });
  });
  it('skip existing_qid e soft_deleted_qid_reserved', () => {
    const ex = emptyIdx();
    ex.activeClubByQid.set('Q100', 'Clube X');
    expect(buildClubPlan([cand({})], attrs, ex).skips.existing_qid).toBe(1);
    const ex2 = emptyIdx();
    ex2.softDeletedClubQids.add('Q100');
    expect(buildClubPlan([cand({})], attrs, ex2).skips.soft_deleted_qid_reserved).toBe(1);
  });
  it('possível homônimo (name+country, QID diferente) → skip', () => {
    const ex = emptyIdx();
    ex.activeClubNameCountry.set('clube x|PT', 'Q999');
    expect(buildClubPlan([cand({})], attrs, ex).skips.possible_homonym).toBe(1);
  });
  it('excluído não vira create; coords ausentes contadas', () => {
    const p = buildClubPlan(
      [cand({ qid: 'Q101', labelPt: 'Clube Feminino Y' })],
      new Map(),
      emptyIdx(),
    );
    expect(p.wouldCreate).toBe(0);
    expect(p.skips.excluded_type).toBe(1);
  });
});

describe('M1b — buildCompetitionPlan + validFoundedYear', () => {
  it('competição nova create; existente skip', () => {
    const c = cand({ qid: 'Q200', labelPt: 'Liga PT', p31: ['Q15991303'] });
    expect(buildCompetitionPlan([c], emptyIdx()).wouldCreate).toBe(1);
    const ex = emptyIdx();
    ex.activeCompetitionByQid.set('Q200', 'Liga PT');
    expect(buildCompetitionPlan([c], ex).skips.existing_qid).toBe(1);
  });
  it('validFoundedYear', () => {
    expect(validFoundedYear(1904)).toBe(1904);
    expect(validFoundedYear(1800)).toBeNull();
    expect(validFoundedYear(2999)).toBeNull();
    expect(validFoundedYear(null)).toBeNull();
  });
});
