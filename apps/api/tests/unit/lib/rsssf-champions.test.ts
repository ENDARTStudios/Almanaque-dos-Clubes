import { describe, it, expect } from 'vitest';
import {
  decodeLatin1,
  htmlToTokens,
  parseChampionsPage,
} from '../../../src/lib/rsssf/champions-parser.js';

// T035 — parser de palmares RSSSF Brasil (amostras reais das páginas).

const RIO_SP_SNIPPET = `<td>1933</td><td> - Palestra Itália (São Paulo)</td>
<td>1934</td><td> - not realized</td>
<td>1940</td><td> - not decided</td>
<td>1950</td><td> - Sport Club Corinthians Paulista (São Paulo)</td>
<td>1956</td><td> - no effect</td>
<td>1957</td><td> - Fluminense Football Club (Rio de Janeiro)</td>
<td>1959</td><td> - Santos Futebol Clube (Santos)</td>`;

const TACA_SNIPPET = `<td>1959</td><td> - Esporte Clube Bahia (Salvador)</td>
<td>1960</td><td> - Sociedade Esportiva Palmeiras (São Paulo)</td>
<td>1961</td><td> - Santos Futebol Clube (Santos)</td>
<td>1962</td><td> - Santos Futebol Clube (Santos)</td>
<td>1966</td><td> - Cruzeiro Esporte Clube (Belo Horizonte)</td>
<td>1968</td><td> - Botafogo de Futebol e Regatas (Rio de Janeiro)</td>`;

const ROBERTAO_SNIPPET = `<td>1967</td><td>-Sociedade Esportiva Palmeiras (São Paulo-SP)</td>
<td>1968</td><td>-Botafogo de Futebol e Regatas (Rio de Janeiro-RJ)</td>
<td>1969</td><td>-Santos Futebol Clube (Santos-SP)</td>
<td>1970</td><td>-Palmeiras (São Paulo-SP)</td>`;

describe('htmlToTokens (T035)', () => {
  it('remove tags e separa em tokens por |', () => {
    expect(htmlToTokens('<td>1933</td><td> - Palestra Itália</td>')).toEqual([
      '1933',
      '- Palestra Itália',
    ]);
  });
});

describe('parseChampionsPage (T035)', () => {
  it('Rio-SP: extrai campeões, pula anos sem torneio com status', () => {
    const out = parseChampionsPage(RIO_SP_SNIPPET);
    expect(out).toHaveLength(7);
    expect(out[0]).toEqual({
      year: 1933,
      championName: 'Palestra Itália',
      city: 'São Paulo',
      status: 'champion',
    });
    expect(out[1]).toEqual({
      year: 1934,
      championName: 'not realized',
      city: null,
      status: 'not_realized',
    });
    expect(out[2].status).toBe('not_decided');
    expect(out[3].championName).toBe('Sport Club Corinthians Paulista');
    expect(out[4].status).toBe('no_effect');
    expect(out[5].championName).toBe('Fluminense Football Club');
  });

  it('Taça Brasil: 10 edições históricas extraídas', () => {
    const out = parseChampionsPage(TACA_SNIPPET);
    expect(out.map((e) => e.year)).toEqual([1959, 1960, 1961, 1962, 1966, 1968]);
    expect(out[0].championName).toBe('Esporte Clube Bahia');
    // Santos repetido (1961-65) é mantido — cada ano é uma edição
  });

  it('Robertão: formato com UF no lugar da cidade', () => {
    const out = parseChampionsPage(ROBERTAO_SNIPPET);
    expect(out[0].championName).toBe('Sociedade Esportiva Palmeiras');
    expect(out[0].city).toBe('São Paulo-SP');
    expect(out[1].championName).toBe('Botafogo de Futebol e Regatas');
  });

  it('decodeLatin1 converte bytes cp1252 (Taça com ç)', () => {
    const bytes = Uint8Array.from([0x54, 0x61, 0xe7, 0x61]); // "Taça"
    expect(decodeLatin1(bytes)).toBe('Taça');
  });
});
