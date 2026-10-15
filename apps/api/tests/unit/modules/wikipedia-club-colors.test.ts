/**
 * T553 — extração de cores do infobox. Validado contra clubes reais antes do CI:
 * Juventus → branco+preto, Flamengo → vermelho+preto, Palmeiras → #035F30+branco,
 * Manchester United → vermelho+branco+preto.
 *
 * O que estes testes protegem é a HONESTIDADE: nome de cor desconhecido não vira chute, o
 * valor malformado é descartado, e o que sai é o que a fonte declarou (hex quando a fonte
 * dá hex — o infobox PT costuma dar, e aí a cor é EXATA em vez de aproximada pela paleta).
 */
import { describe, it, expect } from 'vitest';
import {
  coresDoWikitext,
  nomesParaHex,
  normalizarHex,
} from '../../../src/modules/etl/wikipedia-club-colors.js';

describe('T553 — normalizarHex', () => {
  it('aceita #RRGGBB, RRGGBB e minúsculas → normaliza com # e maiúsculas', () => {
    expect(normalizarHex('#035f30')).toBe('#035F30');
    expect(normalizarHex('FFFFFF')).toBe('#FFFFFF');
    expect(normalizarHex(' 000000 ')).toBe('#000000');
  });

  it('recusa o que não é hex de 6 dígitos', () => {
    expect(normalizarHex('xyz')).toBeNull();
    expect(normalizarHex('#FFF')).toBeNull();
    expect(normalizarHex('')).toBeNull();
    expect(normalizarHex(null)).toBeNull();
    expect(normalizarHex('https://x.com/a.png')).toBeNull();
  });
});

describe('T553 — nomesParaHex', () => {
  it('traduz nomes em pt/es/it/en', () => {
    expect(nomesParaHex('preto')).toEqual(['#000000']);
    expect(nomesParaHex('Bianco')).toEqual(['#FFFFFF']);
    expect(nomesParaHex('rosso')).toEqual(['#FF0000']);
  });

  it('aceita lista separada por "e"/"y"/vírgula/barra', () => {
    expect(nomesParaHex('azul e branco')).toEqual(['#0000FF', '#FFFFFF']);
    expect(nomesParaHex('blanco y negro')).toEqual(['#FFFFFF', '#000000']);
    expect(nomesParaHex('verde, amarelo')).toEqual(['#008000', '#FFFF00']);
  });

  it('nome desconhecido NÃO vira chute', () => {
    expect(nomesParaHex('verde-limão')).toEqual([]);
    expect(nomesParaHex('sei lá')).toEqual([]);
  });
});

describe('T553 — coresDoWikitext', () => {
  it('esquema de uniforme em HEX (EN/IT): body1 + shorts1', () => {
    expect(coresDoWikitext('|body1 = FFFFFF\n|shorts1 = 000000')).toEqual(['#FFFFFF', '#000000']);
  });

  it('esquema PT com HEX exato (caso Palmeiras: #035F30)', () => {
    expect(coresDoWikitext('|corpo1 = 035F30\n|meias1 = FFFFFF')).toEqual(['#035F30', '#FFFFFF']);
  });

  it('esquema PT com NOME de cor (caso Flamengo)', () => {
    expect(coresDoWikitext('|corpo1 = vermelho\n|calções1 = preto')).toEqual([
      '#FF0000',
      '#000000',
    ]);
  });

  it('campo explícito de cor do clube entra', () => {
    expect(coresDoWikitext('|cor1 = Vermelho\n|cor2 = Preto')).toEqual(['#FF0000', '#000000']);
  });

  it('não repete a mesma cor e para em 3', () => {
    expect(coresDoWikitext('|corpo1 = preto\n|calções1 = preto\n|meias1 = Preto')).toEqual([
      '#000000',
    ]);
    const cinco =
      '|body1=FF0000\n|leftarm1=FFFFFF\n|rightarm1=000000\n|shorts1=0000FF\n|socks1=FFFF00';
    expect(coresDoWikitext(cinco)).toHaveLength(3);
  });

  it('artigo sem campo de cor devolve lista vazia', () => {
    expect(coresDoWikitext('{{Info/Clube de futebol\n|nome = X\n|estádio = Y\n}}')).toEqual([]);
  });
});
