/**
 * Escudos com licença verificada (`scripts/enrich-club-crests.ts`) — T32.
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * Escudo de clube é MARCA REGISTRADA. As duas funções testadas aqui são as que decidem se um
 * arquivo pode entrar no acervo:
 *
 *   1. `licencaAceita` — o padrão é RECUSAR. Um `true` errado coloca no produto uma imagem que
 *      não podíamos usar, e isso é problema jurídico, não bug de tela.
 *   2. `tituloDoArquivo` — se a extração errar, consultamos a licença de OUTRO arquivo e
 *      gravamos a licença errada junto da imagem certa. Pior que não ter licença: parece
 *      auditado.
 *
 * O caso que mais importa em (1) é CC-BY-**NC**: começa com "CC BY", então um teste de prefixo
 * ingênuo aceitaria — e NC proíbe uso comercial, que é exatamente o que o Almanaque é.
 */
import { describe, it, expect } from 'vitest';
import {
  licencaAceita,
  paginaDeOrigem,
  periodo,
  tituloDoArquivo,
} from '../../src/scripts/enrich-club-crests.js';

describe('licencaAceita', () => {
  it('aceita domínio público e CC0', () => {
    expect(licencaAceita('Public domain')).toBe(true);
    expect(licencaAceita('CC0')).toBe(true);
  });

  it('aceita CC BY e CC BY-SA nas versões conhecidas', () => {
    expect(licencaAceita('CC BY 4.0')).toBe(true);
    expect(licencaAceita('CC BY-SA 4.0')).toBe(true);
    expect(licencaAceita('cc by-sa 3.0')).toBe(true);
  });

  it('ACEITA CC BY-NC desde 2026-11-02 (plataforma gratuita, mantida por doações)', () => {
    /* Mudança de modelo (D-2026-11-02): o acervo não vende acesso, dado nem anúncio.
       A licença é gravada verbatim, então a atribuição segue auditável por arquivo.
       Se o produto voltar a monetizar, este teste DEVE voltar a esperar false. */
    expect(licencaAceita('CC BY-NC 4.0')).toBe(true);
    expect(licencaAceita('CC BY-NC-SA 4.0')).toBe(true);
    expect(licencaAceita('CC BY-NC-ND 4.0')).toBe(false); // ND continua fora
  });

  it('RECUSA CC BY-ND — sem derivadas não dá para recortar/redimensionar', () => {
    expect(licencaAceita('CC BY-ND 4.0')).toBe(false);
  });

  it('RECUSA licença ausente, vazia ou desconhecida', () => {
    expect(licencaAceita(null)).toBe(false);
    expect(licencaAceita(undefined)).toBe(false);
    expect(licencaAceita('')).toBe(false);
    expect(licencaAceita('All rights reserved')).toBe(false);
    expect(licencaAceita('Fair use')).toBe(false);
  });

  it('"NonCommercial" por extenso segue a mesma régua do sufixo -NC', () => {
    // Mesma decisão do teste acima: NC aceita (plataforma gratuita); o que NÃO
    // pode acontecer é a grafia por extenso escapar da checagem.
    expect(licencaAceita('Creative Commons NonCommercial')).toBe(true);
  });

  it('RECUSA licença desconhecida/restritiva — o padrão continua sendo recusar', () => {
    expect(licencaAceita('All rights reserved')).toBe(false);
    expect(licencaAceita('Fair use')).toBe(false);
  });
});

describe('tituloDoArquivo', () => {
  it('extrai o título de uma URL de thumbnail do Commons', () => {
    expect(
      tituloDoArquivo(
        'https://upload.wikimedia.org/wikipedia/commons/5/50/FC_Helsing%C3%B8r_logo.svg',
      ),
    ).toBe('File:FC Helsingør logo.svg');
  });

  it('troca sublinhado por espaço (o Commons usa espaço no título)', () => {
    expect(
      tituloDoArquivo(
        'https://upload.wikimedia.org/wikipedia/commons/a/ab/Newton_heath_logo_1878.png',
      ),
    ).toBe('File:Newton heath logo 1878.png');
  });

  it('devolve null para URL que não é do Commons', () => {
    /* Se devolvesse um título inventado, consultaríamos a licença de outro arquivo e
       gravaríamos a licença errada junto da imagem certa. */
    expect(tituloDoArquivo('https://exemplo.com/logo.svg')).toBeNull();
    expect(tituloDoArquivo('')).toBeNull();
    expect(tituloDoArquivo('https://upload.wikimedia.org/wikipedia/commons/5/50/')).toBeNull();
  });

  it('devolve null em vez de explodir com percent-encoding inválido', () => {
    expect(
      tituloDoArquivo('https://upload.wikimedia.org/wikipedia/commons/5/50/%E0%A4%A.svg'),
    ).toBeNull();
  });
});

describe('paginaDeOrigem', () => {
  it('monta a URL da página de descrição, não a do arquivo', () => {
    /* `sourceUrl` precisa apontar para a página onde a licença está declarada — a URL do
       arquivo não mostra licença nenhuma, e um link que não comprova nada não é auditoria. */
    expect(paginaDeOrigem('File:Newton heath logo 1878.png')).toBe(
      'https://commons.wikimedia.org/wiki/File%3ANewton_heath_logo_1878.png',
    );
  });
});

describe('periodo', () => {
  it('com os dois anos, fecha a faixa', () => {
    expect(periodo(1902, 1970, false)).toBe('1902–1970');
  });

  it('sem ano final e vigente, diz "hoje"', () => {
    expect(periodo(2017, null, true)).toBe('2017–hoje');
  });

  it('sem ano final e NÃO vigente, deixa a interrogação — não inventa', () => {
    expect(periodo(1902, null, false)).toBe('1902–?');
  });

  it('sem ano inicial, deixa a interrogação', () => {
    expect(periodo(null, 1902, false)).toBe('? –1902');
  });

  it('sem nenhum ano devolve null, em vez de "? –?"', () => {
    expect(periodo(null, null, true)).toBeNull();
  });
});
