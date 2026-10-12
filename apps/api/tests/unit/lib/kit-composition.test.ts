import { describe, it, expect } from 'vitest';
import {
  parseKitCalls,
  parseInfoboxKits,
  typeFromCall,
  decodeSeason,
  isNonKitCall,
  recomputeOrdinals,
} from '../../../src/lib/wikipedia/kit-composition.js';

// T523-kits — parser das duas convenções da pt.Wikipédia. Os trechos são
// recortes LITERAIS do wikitexto real (Fluminense subpredefinição e infobox do
// Palmeiras, conferidos na fonte em 12-10-2026).

const FLA_SUBTEMPLATE = `; Uniformes dos jogadores
{|style="width:50%;text-align:center;"
 |align=left bg color=#ffffff|{{CamisaFutebol
 |pattern_la = _fluminense23h
 |pattern_b  = _fluminense23h
 |pattern_ra = _fluminense23h
 |pattern_sh = _sport23a
 |pattern_so = _fluminense22h
 |leftarm    = FFFFFF
 |body       = FFFFFF
 |rightarm   = FFFFFF
 |shorts     = FFFFFF
 |socks      = FFFFFF
 |title      = Primeiro
}}
|
{{CamisaFutebol
 |pattern_la = _fluminense23a
 |pattern_b  = _fluminense23a
 |pattern_ra = _fluminense23a
 |pattern_sh = _fluminense23a
 |pattern_so = 
 |leftarm    = FFFFFF
 |body       = FFFFFF
 |rightarm   = FFFFFF
 |shorts     = FFFFFF
 |socks      = A00101
 |title      = Segundo
}}
|}

; Uniformes dos goleiros
{|style="width:50%;text-align:center;"
 |align=left bg color=#ffffff|{{CamisaFutebol
 |pattern_la = _fluminense23g1 
 |pattern_b  = _fluminense23g1
 |pattern_ra = _fluminense23g1 
 |pattern_sh = _negro
 |pattern_so = _negro
 |leftarm    = FFFFFF
 |body       = FFFFFF
 |rightarm   = FFFFFF
 |shorts     = FFFFFF
 |socks      = FFFFFF
 |title      = 1
}}
|}`;

const PALMEIRAS_INFOBOX = `| modelo = padrão
| skin1 = _palmeiras26h
| skin_be1 = 
| skin_bd1 = 
| skin_calção1 = _valencia2526h2
| skin_meia1 = 
| braçoesquerdo1 = 035F30
| corpo1 = 035F30
| braçodireito1 = 035F30
| calções1 = FFFFFF
| meias1 = 035F30
| skin2 = _palmeiras26a
| skin_calção2 = _palmeiras26a
| corpo2 = FFFFFF
| calções2 = FFFFFF`;

describe('parseKitCalls (T523-kits)', () => {
  const calls = parseKitCalls(FLA_SUBTEMPLATE, 'src://fla');

  it('extrai as 3 chamadas com a seção certa', () => {
    expect(calls).toHaveLength(3);
    expect(calls[0].section).toBe('players');
    expect(calls[2].section).toBe('goalkeepers');
  });

  it('lê padrão, cor e título de cada parte', () => {
    const p = calls[0].params;
    expect(p['pattern_b']).toBe('_fluminense23h');
    expect(p['pattern_sh']).toBe('_sport23a'); // peça emprestada de outro clube: mantida
    expect(p['body']).toBe('FFFFFF');
    expect(p['title']).toBe('Primeiro');
  });

  it('ordinais: chamadas contíguas são colunas da mesma tabela', () => {
    // A chamada de goleiro é contígua (a seção vem logo depois) — o tipo dela
    // vem da SEÇÃO, não do ordinal, então a numeração contínua é inofensiva.
    expect(calls.map((c) => c.ordinal)).toEqual([0, 1, 2]);
  });

  it('tipo: título primeiro, depois seção', () => {
    expect(typeFromCall(calls[0], ['fluminense23h'])).toBe('home');
    expect(typeFromCall(calls[1], ['fluminense23a'])).toBe('away');
    expect(typeFromCall(calls[2], ['fluminense23g1'])).toBe('goalkeeper');
  });

  it('chamada "Ver evolução" não é kit', () => {
    expect(isNonKitCall({ ...calls[0], title: '[[commons:X kits|Ver evolução]]' })).toBe(true);
  });

  it('recomputeOrdinals renumera sobre a lista filtrada', () => {
    const filtered = calls.slice(2);
    recomputeOrdinals(filtered);
    expect(filtered[0].ordinal).toBe(0);
  });
});

describe('parseInfoboxKits (T523-kits)', () => {
  const calls = parseInfoboxKits(PALMEIRAS_INFOBOX, 'src://pal');

  it('extrai os uniformes numerados da infobox', () => {
    expect(calls).toHaveLength(2);
    expect(calls[0].params['pattern_b']).toBe('_palmeiras26h');
    expect(calls[0].params['pattern_sh']).toBe('_valencia2526h2');
    expect(calls[0].params['body']).toBe('035F30');
    expect(calls[1].params['pattern_b']).toBe('_palmeiras26a');
  });

  it('N=1 titular, N=2 reserva', () => {
    expect(typeFromCall(calls[0], [calls[0].params['pattern_la']])).toBe('home');
    expect(typeFromCall(calls[1], [calls[1].params['pattern_la']])).toBe('away');
  });
});

describe('decodeSeason (T523-kits)', () => {
  it('código de 2 dígitos = 20yy', () => {
    expect(decodeSeason(['fluminense23h'])).toBe('2023');
    expect(decodeSeason(['santos26a'])).toBe('2026');
    expect(decodeSeason(['ecj08h'])).toBe('2008');
  });

  it('ano de 4 dígitos plausível = ano', () => {
    expect(decodeSeason(['corinthians1910h'])).toBe('1910');
    expect(decodeSeason(['gremio1903'])).toBe('1903');
  });

  it('duas dezenas consecutivas = temporada cruzada', () => {
    expect(decodeSeason(['corinthians2627h'])).toBe('2026-27');
    expect(decodeSeason(['adidas2223black'])).toBe('2022-23');
    expect(decodeSeason(['brentford0809h'])).toBe('2008-09');
  });

  it('sem ano no código → null (uniforme corrente da fonte)', () => {
    expect(decodeSeason(['fluminense120y'])).toBeNull();
    expect(decodeSeason([null, null])).toBeNull();
  });
});
