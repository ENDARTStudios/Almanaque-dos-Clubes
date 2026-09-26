/**
 * T448b-2h — Unit: plano puro de dedupe de identidade.
 * Pré-condições por entry (dup/canon ativos) e classificação plan/skipped.
 */
import { describe, it, expect } from 'vitest';
import { buildDedupePlan } from '../../../src/scripts/t448b2h-dedupe-identity.js';

const PACK = {
  task: 'T448b-2h' as const,
  retrievedAt: '2026-09-26',
  mappings: [
    {
      name: 'Clube A',
      dupId: '11111111-1111-4111-8111-111111111111',
      canonId: '22222222-2222-4222-8222-222222222222',
      canonName: 'Clube A Oficial',
      qid: 'Q1',
    },
    {
      name: 'Clube B',
      dupId: '33333333-3333-4333-8333-333333333333',
      canonId: '44444444-4444-4444-8444-444444444444',
      canonName: 'Clube B Oficial',
      qid: 'Q2',
    },
  ],
};

describe('T448b-2h — buildDedupePlan', () => {
  it('entry com dup e canon ativos entra no plano com as referências medidas', () => {
    const refs = new Map([
      ['11111111-1111-4111-8111-111111111111', { rankingEntries: 2, favorites: 1 }],
    ]);
    const checks = new Map([
      ['11111111-1111-4111-8111-111111111111', { dupOk: true, canonOk: true }],
      ['33333333-3333-4333-8333-333333333333', { dupOk: true, canonOk: true }],
    ]);
    const { plan, skipped } = buildDedupePlan(PACK, refs, checks);
    expect(plan).toHaveLength(2);
    expect(skipped).toHaveLength(0);
    expect(plan[0].rankingEntries).toBe(2);
    expect(plan[0].favorites).toBe(1);
    expect(plan[1].rankingEntries).toBe(0); // sem refs → soft-delete só
  });

  it('dup ausente/inativa → PULADA com blocker (nunca aplica parcial sem sinalizar)', () => {
    const checks = new Map([
      ['11111111-1111-4111-8111-111111111111', { dupOk: false, canonOk: true }],
      ['33333333-3333-4333-8333-333333333333', { dupOk: true, canonOk: true }],
    ]);
    const { plan, skipped } = buildDedupePlan(PACK, new Map(), checks);
    expect(plan).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].blockers).toContain('dup ausente/inativa');
  });

  it('canon ausente → PULADA (não deixa a dup sem destino)', () => {
    const checks = new Map([
      ['11111111-1111-4111-8111-111111111111', { dupOk: true, canonOk: false }],
      ['33333333-3333-4333-8333-333333333333', { dupOk: true, canonOk: true }],
    ]);
    const { plan, skipped } = buildDedupePlan(PACK, new Map(), checks);
    expect(plan).toHaveLength(1);
    expect(skipped[0].blockers).toContain('canon ausente/inativo');
  });

  it('sem refs medidas → zeros default (determinístico, nunca undefined)', () => {
    const checks = new Map([
      ['11111111-1111-4111-8111-111111111111', { dupOk: true, canonOk: true }],
      ['33333333-3333-4333-8333-333333333333', { dupOk: true, canonOk: true }],
    ]);
    const { plan } = buildDedupePlan(PACK, new Map(), checks);
    for (const p of plan) {
      expect(p.rankingEntries).toBe(0);
      expect(p.favorites).toBe(0);
      expect(p.blockers).toEqual([]);
    }
  });
});
