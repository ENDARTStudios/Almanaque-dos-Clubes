import { describe, it, expect } from 'vitest';
import {
  COLOR_NAME_HEX,
  normalizeHex,
  resolveColors,
} from '../../../src/modules/etl/enrich-media.service.js';

// T506 — cores de clube: P465 (hex) + P462 (nome) → hex validado.
// Lição T424 (4ª vez): o briefing dizia P1423, mas P1423 = "template has topic";
// a propriedade real é P462 (color) e P465 (sRGB hex triplet).

describe('normalizeHex (T506)', () => {
  it('aceita 6 dígitos com/sem # e normaliza para maiúsculas', () => {
    expect(normalizeHex('7FFFD4')).toBe('#7FFFD4');
    expect(normalizeHex('#ff0000')).toBe('#FF0000');
    expect(normalizeHex('abcdef')).toBe('#ABCDEF');
  });

  it('rejeita formato inválido (nunca inventa)', () => {
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('#FFF')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex(null)).toBeNull();
    expect(normalizeHex('12345G')).toBeNull();
  });
});

describe('resolveColors (T506)', () => {
  it('P465 tem precedência e vem primeiro', () => {
    const { colors } = resolveColors(['0000FF'], ['red']);
    expect(colors).toEqual(['#0000FF', '#FF0000']);
  });

  it('mapeia os nomes de cor observados na Wikidata (consulta 09/10)', () => {
    const { colors, unknown } = resolveColors(
      [],
      ['white', 'blue', 'black', 'red', 'green', 'yellow', 'gold', 'orange'],
    );
    expect(colors).toEqual([
      '#FFFFFF',
      '#0000FF',
      '#000000',
      '#FF0000',
      '#008000',
      '#FFFF00',
      '#FFD700',
      '#FFA500',
    ]);
    expect(unknown).toEqual([]);
  });

  it('case-insensitive e dedup', () => {
    const { colors } = resolveColors([], ['Red', 'red', 'RED']);
    expect(colors).toEqual(['#FF0000']);
  });

  it('cor desconhecida é reportada, NÃO mapeada (sem invenção)', () => {
    const { colors, unknown } = resolveColors([], ['chartreuse', 'red']);
    expect(colors).toEqual(['#FF0000']);
    expect(unknown).toEqual(['chartreuse']);
  });

  it('sem claims → sem cores (null honesto na UI)', () => {
    expect(resolveColors([], [])).toEqual({ colors: [], unknown: [] });
  });

  it('o mapa cobre as 8 cores mais frequentes do acervo', () => {
    for (const name of ['white', 'blue', 'black', 'red', 'green', 'yellow', 'gold', 'orange']) {
      expect(COLOR_NAME_HEX[name]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
