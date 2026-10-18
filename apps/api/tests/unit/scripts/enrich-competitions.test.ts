/**
 * T-24/25 — extratores puros do bot `enrich-competitions` (Wikidata CC0).
 *
 * Cada guarda que existe por uma razão tem teste: precisão do P571 (≥ 9) e faixa
 * de ano, precisão do P576 (11 = dia, 9 = ano → 1º de jan, < 1850 descarta),
 * descriptions pt/en/es não-vazias e o caminho da bandeira em DOIS saltos
 * (P163 → item → P18 → URL determinística do Commons) — shape validado por probe
 * real D-2026-10-17 (Q119158 = DF → Q2329426 → "Bandeira do Distrito Federal
 * (Brasil).svg").
 *
 * O módulo do bot NÃO instancia PrismaClient no import (guarda de invocação
 * direta) — o teste importa sem mock de banco.
 */
import { describe, it, expect } from 'vitest';
import {
  extractDescriptions,
  extractInceptionYear,
  extractDissolvedAt,
  extractFlagItemQid,
  extractFlagFileFromItem,
  flagUrlFromFile,
} from '../../../src/scripts/enrich-competitions.js';

/** Claim de tempo no shape real do wbgetentities: precision DENTRO do value. */
const timeClaim = (prop: string, time: string, precision: number) => ({
  claims: { [prop]: [{ mainsnak: { datavalue: { value: { time, precision } } } }] },
});

describe('T-24/25 — extractDescriptions (pt/en/es não-vazias)', () => {
  it('mantém só os três idiomas, sem vazios, com trim', () => {
    expect(
      extractDescriptions({
        descriptions: {
          pt: { language: 'pt', value: '  campeonato nacional brasileiro  ' },
          en: { language: 'en', value: 'association football league' },
          es: { language: 'es', value: 'máxima categoría' },
          de: { language: 'de', value: 'não pedido' },
          it: { language: 'it', value: '' },
        },
      }),
    ).toEqual({
      pt: 'campeonato nacional brasileiro',
      en: 'association football league',
      es: 'máxima categoría',
    });
  });

  it('nada utilizável = objeto vazio (o bot declara o gap)', () => {
    expect(extractDescriptions({ descriptions: { pt: { value: '   ' } } })).toEqual({});
    expect(extractDescriptions({})).toEqual({});
    expect(extractDescriptions(undefined)).toEqual({});
  });
});

describe('T-24/25 — extractInceptionYear (P571, precisão ≥ 9)', () => {
  it('aceita precisão de dia (11) e de ano (9)', () => {
    expect(extractInceptionYear(timeClaim('P571', '+1959-08-23T00:00:00Z', 11))).toBe(1959);
    expect(extractInceptionYear(timeClaim('P571', '+1959-00-00T00:00:00Z', 9))).toBe(1959);
  });

  it('precisão 10 (mês) ainda é ≥ ano → aceita; década (8) = null (nunca fabrica)', () => {
    expect(extractInceptionYear(timeClaim('P571', '+1959-08-00T00:00:00Z', 10))).toBe(1959);
    expect(extractInceptionYear(timeClaim('P571', '+1950-00-00T00:00:00Z', 8))).toBeNull();
  });

  it('fora da faixa 1850..atual+1 = null (guard de plausibilidade)', () => {
    expect(extractInceptionYear(timeClaim('P571', '+1800-01-01T00:00:00Z', 11))).toBeNull();
    expect(extractInceptionYear(timeClaim('P571', '+2999-01-01T00:00:00Z', 9))).toBeNull();
  });

  it('sem claim = null', () => {
    expect(extractInceptionYear({ claims: {} })).toBeNull();
  });
});

describe('T-24/25 — extractDissolvedAt (P576, precisão 11/9)', () => {
  it('precisão 11 = dia exato', () => {
    expect(extractDissolvedAt(timeClaim('P576', '+2008-12-19T00:00:00Z', 11))).toEqual(
      new Date('2008-12-19T00:00:00Z'),
    );
  });

  it('precisão 9 = ano → 1º de janeiro', () => {
    expect(extractDissolvedAt(timeClaim('P576', '+2008-00-00T00:00:00Z', 9))).toEqual(
      new Date('2008-01-01T00:00:00Z'),
    );
  });

  it('precisão 10 (mês) = null (gap declarado, não fabrica dia)', () => {
    expect(extractDissolvedAt(timeClaim('P576', '+2008-12-00T00:00:00Z', 10))).toBeNull();
  });

  it('antes de 1850 = null (guard de plausibilidade)', () => {
    expect(extractDissolvedAt(timeClaim('P576', '+1705-06-01T00:00:00Z', 11))).toBeNull();
  });

  it('sem claim = null', () => {
    expect(extractDissolvedAt({ claims: {} })).toBeNull();
  });
});

describe('T-24/25 — bandeira do estado (P163 → item → P18 → Commons)', () => {
  it('P163 devolve o QID do ITEM (não é arquivo — probe real)', () => {
    const df = {
      claims: {
        P163: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q2329426' } } } }],
      },
    };
    expect(extractFlagItemQid(df)).toBe('Q2329426');
    expect(extractFlagItemQid({ claims: {} })).toBeNull();
    expect(
      extractFlagItemQid({
        claims: { P163: [{ mainsnak: { datavalue: { value: { id: 'lixo' } } } }] },
      }),
    ).toBeNull();
  });

  it('P18 do item devolve o nome do ARQUIVO', () => {
    expect(
      extractFlagFileFromItem({
        claims: {
          P18: [
            { mainsnak: { datavalue: { value: 'Bandeira do Distrito Federal (Brasil).svg' } } },
          ],
        },
      }),
    ).toBe('Bandeira do Distrito Federal (Brasil).svg');
    expect(extractFlagFileFromItem({ claims: {} })).toBeNull();
  });

  it('URL determinística = MESMO pipeline do trophyImageUrl (T506/T509)', () => {
    expect(flagUrlFromFile('Bandeira do Distrito Federal (Brasil).svg')).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/3/3c/Bandeira_do_Distrito_Federal_(Brasil).svg',
    );
    // prefixo "File:" e espaços são normalizados como no T509
    expect(flagUrlFromFile('File:A B.svg')).toBe(flagUrlFromFile('A B.svg'));
  });
});
