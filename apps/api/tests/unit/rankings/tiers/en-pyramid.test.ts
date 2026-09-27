import { describe, it, expect } from 'vitest';
import {
  EN_PYRAMID_TIERS,
  EN_PYRAMID_TIERS_BY_QID,
  EN_DIVISION_QID_BY_RSSSF_NAME,
  EN_PYRAMID_TIER_VERSION,
} from '../../../../src/lib/rankings/tiers/en-pyramid.js';
import {
  getEnDivisionTierByCompetitionQid,
  resolveCompetitionTier,
} from '../../../../src/lib/rankings/tiers/resolve-tier.js';

// T449c-v1 — pirâmide EN (mapeamento puro/versionado).

describe('T449c-v1 — en-pyramid', () => {
  it('tem exatamente 5 divisões, QIDs únicos e levels 1..5 únicos', () => {
    expect(EN_PYRAMID_TIERS).toHaveLength(5);
    const qids = EN_PYRAMID_TIERS.map((t) => t.competitionQid);
    expect(new Set(qids).size).toBe(5);
    const levels = EN_PYRAMID_TIERS.map((t) => t.level).sort((a, b) => a - b);
    expect(levels).toEqual([1, 2, 3, 4, 5]);
    for (const t of EN_PYRAMID_TIERS) {
      expect(t.divisionLabel.trim().length).toBeGreaterThan(0);
      expect(t.source).toBe('rsssf-england-pilot');
      expect(t.country).toBe('GB');
    }
  });

  it('versão estável e índice por QID consistente', () => {
    expect(EN_PYRAMID_TIER_VERSION).toBe('t449c-v1-en-pyramid-2026-09-27');
    for (const t of EN_PYRAMID_TIERS) {
      expect(EN_PYRAMID_TIERS_BY_QID[t.competitionQid]).toBe(t);
    }
  });

  it('mapa nome-RSSSF→QID casa exatamente com os QIDs das divisões', () => {
    const mapped = Object.values(EN_DIVISION_QID_BY_RSSSF_NAME).sort();
    const tierQids = EN_PYRAMID_TIERS.map((t) => t.competitionQid).sort();
    expect(mapped).toEqual(tierQids);
    // nomes públicos: Division 1 → League One (Q19565); Division 2 → League Two (Q48837)
    expect(EN_DIVISION_QID_BY_RSSSF_NAME['Division 1']).toBe('Q19565');
    expect(EN_DIVISION_QID_BY_RSSSF_NAME['Division 2']).toBe('Q48837');
  });

  it('getEnDivisionTierByCompetitionQid resolve só por QID exato', () => {
    expect(getEnDivisionTierByCompetitionQid('Q9448')?.level).toBe(1);
    expect(getEnDivisionTierByCompetitionQid('Q18504')?.divisionLabel).toBe('National League');
    expect(getEnDivisionTierByCompetitionQid('Q_UNKNOWN')).toBeNull();
    expect(getEnDivisionTierByCompetitionQid(null)).toBeNull();
  });
});

describe('T449c-v1 — resolveCompetitionTier', () => {
  it('level persistido + QID mapeado ⇒ tier completo', () => {
    const v = resolveCompetitionTier({ qid: 'Q9448', level: 1 });
    expect(v).toEqual({
      level: 1,
      divisionLabel: 'Premier League',
      tierSource: 'rsssf-england-pilot',
      tierVersion: EN_PYRAMID_TIER_VERSION,
    });
  });

  it('QID desconhecido ⇒ level do banco, label null (sem inferência por nome)', () => {
    const v = resolveCompetitionTier({ qid: 'Q999', level: 3 });
    expect(v).toEqual({ level: 3, divisionLabel: null, tierSource: null, tierVersion: null });
  });

  it('level NULL (rollback) ⇒ tudo null mesmo com QID mapeado', () => {
    const v = resolveCompetitionTier({ qid: 'Q9448', level: null });
    expect(v).toEqual({ level: null, divisionLabel: null, tierSource: null, tierVersion: null });
    expect(resolveCompetitionTier(null)).toEqual({
      level: null,
      divisionLabel: null,
      tierSource: null,
      tierVersion: null,
    });
  });
});
