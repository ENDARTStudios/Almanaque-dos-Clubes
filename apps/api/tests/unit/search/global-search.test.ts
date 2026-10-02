import { describe, it, expect } from 'vitest';
import {
  buildSubtitle,
  clampLimit,
  foldAccents,
  normalizeQuery,
  scoreName,
} from '../../../src/modules/search/global-search.service.js';

// WS-C-1 — normalizador/relevância da busca global.

describe('foldAccents / normalizeQuery', () => {
  it('remove acentos e baixa caixa', () => {
    expect(foldAccents('São Paulo')).toBe('sao paulo');
    expect(foldAccents('Grêmio')).toBe('gremio');
    expect(foldAccents('AÇORIANO')).toBe('acoriano');
  });
  it('colapsa espaços', () => {
    expect(normalizeQuery('  São   Paulo  ')).toBe('sao paulo');
  });
});

describe('scoreName', () => {
  it('exato = 1, prefixo = 0.8, contém = 0.5, nada = 0', () => {
    expect(scoreName('Flamengo', 'flamengo')).toBe(1);
    expect(scoreName('Flamengo FC', 'flamengo')).toBe(0.8);
    expect(scoreName('Clube de Regatas Flamengo', 'flamengo')).toBe(0.5);
    expect(scoreName('Palmeiras', 'flamengo')).toBe(0);
  });
  it('ignora acento/caixa no nome', () => {
    expect(scoreName('São Paulo', 'sao paulo')).toBe(1);
  });
});

describe('buildSubtitle', () => {
  it('junta partes não vazias e ignora nulas', () => {
    expect(buildSubtitle(['Rio de Janeiro', null, 'BR'])).toBe('Rio de Janeiro, BR');
    expect(buildSubtitle([null, undefined, ''])).toBeNull();
  });
});

describe('clampLimit', () => {
  it('default 20, máx 50, mín 1', () => {
    expect(clampLimit(undefined)).toBe(20);
    expect(clampLimit(1000)).toBe(50);
    expect(clampLimit(0)).toBe(20);
    expect(clampLimit(7)).toBe(7);
  });
});
