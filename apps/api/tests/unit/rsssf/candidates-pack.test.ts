import { describe, it, expect } from 'vitest';
import {
  CandidatePackError,
  CANDIDATE_PACK_VERSION,
  loadPilotCandidates,
  validateCandidates,
} from '../../../src/lib/rsssf/candidates-pack.js';

// T448b-2b FIX-PACK (#197) — pack de candidates empacotado (runtime de produção).
// Sem rede, sem DB. Garante que o writer de prod carrega o pack de `src/`.

describe('T448b-2b #197 — pack de candidates empacotado', () => {
  it('versão do pack declarada', () => {
    expect(CANDIDATE_PACK_VERSION).toBe('t448b2b-mg-pilot-candidates-v1');
  });

  it('carrega exatamente 3 candidates válidos com atribuição completa', () => {
    const c = loadPilotCandidates();
    expect(c).toHaveLength(3);
    for (const x of c) {
      expect(x.relation).toBe('WON');
      expect(x.competitionQid).toBe('Q731877');
      expect(x.clubQid).toBe('Q270995');
      expect(x.hierarchy).toBe('estadual');
      expect(x.gender).toBe('men');
      expect(x.source).toBe('rsssf');
      expect(x.attributionRequired).toBe(true);
      expect(x.authorCredit).toContain('Copyright Claudio Freati');
      expect(x.licenseText).toContain('acknowledgement');
      expect(x.sourceUrl).toMatch(/^https:\/\/rsssfbrasil\.com\/tablesfq\/mg\d{4}\.htm$/);
      expect(x.metadataExtras.parserVersion).toBe('t448b2b-fase1-v1');
    }
  });

  it('anos 2023/2024/2025 e dedupKeys únicas/factual', () => {
    const c = loadPilotCandidates();
    expect(c.map((x) => x.seasonYear)).toEqual([2023, 2024, 2025]);
    const keys = c.map((x) => x.dedupKey);
    expect(keys).toEqual([
      'Q731877|2023|Q270995|WON',
      'Q731877|2024|Q270995|WON',
      'Q731877|2025|Q270995|WON',
    ]);
    expect(new Set(keys).size).toBe(3);
    // dedupKey NÃO contém hash de URL (R1)
    for (const k of keys) expect(k).not.toContain('http');
  });

  it('determinismo: retrievedAt estático (não Date.now)', () => {
    const a = loadPilotCandidates();
    const b = loadPilotCandidates();
    expect(a).toEqual(b);
    expect(a[0].retrievedAt).toBe('2026-09-23T22:59:09Z');
  });

  it('fail-fast: estrutura inválida', () => {
    expect(() => validateCandidates([{ relation: 'WON' }])).toThrow(CandidatePackError);
    expect(() => validateCandidates('nope')).toThrow(CandidatePackError);
  });

  it('fail-fast: atribuição ausente', () => {
    const [first] = loadPilotCandidates();
    // '' é barrado pelo Zod (.min(1)); whitespace-only exercita a checagem manual.
    expect(() => validateCandidates([{ ...first, licenseText: '   ' }])).toThrow(
      /attribution ausente/,
    );
    expect(() => validateCandidates([{ ...first, licenseText: '' }])).toThrow(CandidatePackError);
  });

  it('fail-fast: dedupKey duplicada', () => {
    const [first] = loadPilotCandidates();
    expect(() => validateCandidates([first, first])).toThrow(/dedupKey duplicada/);
  });
});
