/**
 * Bot P18 (`scripts/enrich-club-crests-p18.ts`) — T596, item 36.
 *
 * As duas funções testadas são as que decidem SE um arquivo do Wikidata pode virar
 * escudo no acervo:
 *
 *   1. `escolheP18` — escolher o arquivo ERRADO é erro factual num campo de identidade
 *      visual do clube; rank preferred vence, deprecated nunca entra.
 *   2. `pareceEscudo` — P18 é "imagem do item": para clube quase sempre é o escudo,
 *      mas pode ser FOTO DE ESTÁDIO. A extensão é a guard barata: jpg/jpeg ficam fora.
 */
import { describe, it, expect } from 'vitest';
import { escolheP18, pareceEscudo } from '../../src/scripts/enrich-club-crests-p18.js';

describe('pareceEscudo', () => {
  it('aceita vetorial e transparente — o formato de escudo', () => {
    expect(pareceEscudo('File:FC Barcelona.svg')).toBe(true);
    expect(pareceEscudo('File:Palmeiras_logo.png')).toBe(true);
    expect(pareceEscudo('File:Old badge.GIF')).toBe(true);
  });

  it('RECUSA jpg/jpeg — quase sempre foto de estádio, não escudo', () => {
    /* O erro que este teste trava: aceitar a única imagem P18 do clube mesmo sendo
       foto. Escudo errado é pior que escudo ausente (honestidade do acervo). */
    expect(pareceEscudo('File:Estádio do Maracanã.jpg')).toBe(false);
    expect(pareceEscudo('File:Team photo 1994.jpeg')).toBe(false);
  });
});

describe('escolheP18', () => {
  it('devolve null sem claim, com snak vazio ou sem valor textual', () => {
    expect(escolheP18(undefined)).toBeNull();
    expect(escolheP18([])).toBeNull();
    expect(escolheP18([{ mainsnak: { snaktype: 'somevalue' } }])).toBeNull();
    expect(
      escolheP18([{ mainsnak: { datavalue: { value: 42 as unknown as string } } }]),
    ).toBeNull();
  });

  it('preferred vence o normal, mesmo vindo depois', () => {
    const claims = [
      { rank: 'normal', mainsnak: { datavalue: { value: 'File:Escudo antigo.svg' } } },
      { rank: 'preferred', mainsnak: { datavalue: { value: 'File:Escudo vigente.svg' } } },
    ];
    expect(escolheP18(claims as never)).toBe('File:Escudo vigente.svg');
  });

  it('deprecated nunca entra — nem quando é o único', () => {
    const soDeprecated = [{ rank: 'deprecated', mainsnak: { datavalue: { value: 'File:X.svg' } } }];
    expect(escolheP18(soDeprecated as never)).toBeNull();
  });

  it('aceita valor sem prefixo File: (grava normalizado) e forma objeto {text}', () => {
    const semPrefixo = [{ mainsnak: { datavalue: { value: 'Escudo.svg' } } }];
    expect(escolheP18(semPrefixo as never)).toBe('File:Escudo.svg');
    const objeto = [{ mainsnak: { datavalue: { value: { text: 'Escudo.svg' } } } }];
    expect(escolheP18(objeto as never)).toBe('File:Escudo.svg');
  });
});
