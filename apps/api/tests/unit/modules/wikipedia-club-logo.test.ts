/**
 * T552 — o extrator do escudo do infobox é a parte que decide QUAL arquivo entra no
 * acervo, então cada corte tem teste: o campo explícito vale, o campo ambíguo (`imagem`,
 * que em vários infoboxes é a foto do estádio) só vale com pista no nome do arquivo, e
 * URL externa nunca vale (fora do Commons = sem licença verificável).
 */
import { describe, it, expect } from 'vitest';
import {
  arquivoDoValor,
  blocoInfoboxClube,
  escudoDeWikitext,
  escudoDoInfobox,
  PERFIS_WIKI,
} from '../../../src/modules/etl/wikipedia-club-logo.js';

describe('T552 — arquivoDoValor', () => {
  it('tira o nome do arquivo do link [[Ficheiro:...]] com tamanho', () => {
    expect(arquivoDoValor('[[Ficheiro:Flamengo logo.png|120px]]')).toBe('Flamengo logo.png');
  });

  it('aceita [[Imagem:...]] e normaliza underscore em espaço', () => {
    expect(arquivoDoValor('[[Imagem:Crest_do_Clube.svg|150px|Escudo]]')).toBe('Crest do Clube.svg');
  });

  it('aceita o nome cru do arquivo', () => {
    expect(arquivoDoValor('Escudo.png')).toBe('Escudo.png');
  });

  it('recusa URL externa (fora do Commons: sem licença verificável)', () => {
    expect(arquivoDoValor('https://exemplo.com/escudo.png')).toBeNull();
  });

  it('recusa extensão que não é imagem', () => {
    expect(arquivoDoValor('[[Ficheiro:Lista.pdf]]')).toBeNull();
    expect(arquivoDoValor('')).toBeNull();
  });

  it('ignora comentário HTML dentro do valor', () => {
    expect(arquivoDoValor('<!-- rascunho -->[[Ficheiro:Crest.png]]')).toBe('Crest.png');
  });
});

describe('T552 — blocoInfoboxClube', () => {
  it('recorta o infobox inteiro mesmo com template aninhado', () => {
    const wikitext =
      'Texto antes.\n{{Info/Clube de futebol\n|nome = X\n|pais = {{flagicon|BRA}} Brasil\n|imagem = X_logo.png\n}}\nTexto depois.';
    const bloco = blocoInfoboxClube(wikitext);
    expect(bloco).not.toBeNull();
    expect(bloco).toContain('X_logo.png');
    expect(bloco).not.toContain('Texto depois');
  });

  it('sem infobox de clube devolve null', () => {
    expect(blocoInfoboxClube('Só texto, sem template.')).toBeNull();
    expect(blocoInfoboxClube('{{Info/Jogador|nome=Y}}')).toBeNull();
  });
});

describe('T552 — escudoDoInfobox', () => {
  it('campo explícito (escudo) vence a ordem', () => {
    const wikitext =
      '{{Info/Clube de futebol\n|escudo = [[Ficheiro:Brasao.png]]\n|imagem = Foto do estádio.jpg\n}}';
    expect(escudoDoInfobox(wikitext)).toBe('Brasao.png');
  });

  it('campo `imagem` vale quando o NOME do arquivo diz que é escudo', () => {
    const wikitext =
      '{{Info/Clube de futebol\n|imagem = [[Ficheiro:EC_Mogiana_escudo.png|120px]]\n}}';
    expect(escudoDoInfobox(wikitext)).toBe('EC Mogiana escudo.png');
  });

  it('campo `imagem` com foto de estádio NÃO vira escudo', () => {
    const wikitext =
      '{{Info/Clube de futebol\n|imagem = [[Ficheiro:Arena Amazônia (2014) - 2.jpg|250px]]\n}}';
    expect(escudoDoInfobox(wikitext)).toBeNull();
  });

  it('aceita `logotipo` e `brasao` como explícitos', () => {
    expect(escudoDoInfobox('{{Info/Clube de futebol\n|logotipo = Logotipo_X.svg\n}}')).toBe(
      'Logotipo X.svg',
    );
    expect(escudoDoInfobox('{{Info/Clube de futebol\n|brasao = Brasao Y.png\n}}')).toBe(
      'Brasao Y.png',
    );
  });

  it('infobox sem campo de imagem devolve null', () => {
    expect(escudoDoInfobox('{{Info/Clube de futebol\n|nome = X\n|estádio = Y\n}}')).toBeNull();
  });

  it('sem infobox devolve null', () => {
    expect(escudoDoInfobox('#REDIRECT [[Outro]]')).toBeNull();
  });
});

describe('T552 — perfis EN/DE (o acervo é internacional)', () => {
  it('EN: {{Infobox football club}} com |logo= explícito entra', () => {
    const wikitext =
      '{{Infobox football club\n| clubname = Example FC\n| logo = Example_FC_logo.png\n| fullname = Example\n}}';
    expect(escudoDeWikitext(wikitext, PERFIS_WIKI.enwiki!)).toBe('Example FC logo.png');
  });

  it('EN: |image= só vale com pista de escudo no nome', () => {
    const estadio = '{{Infobox football club\n|image = Stadium_view_2020.jpg\n}}';
    const escudo = '{{Infobox football club\n|image = Club_crest.svg\n}}';
    expect(escudoDeWikitext(estadio, PERFIS_WIKI.enwiki!)).toBeNull();
    expect(escudoDeWikitext(escudo, PERFIS_WIKI.enwiki!)).toBe('Club crest.svg');
  });

  it('DE: {{Infobox Fußballklub}} com |wappen= entra', () => {
    const wikitext = '{{Infobox Fußballklub\n|name = Beispiel\n|wappen = Wappen_Beispiel.svg\n}}';
    expect(escudoDeWikitext(wikitext, PERFIS_WIKI.dewiki!)).toBe('Wappen Beispiel.svg');
  });

  it('o perfil separa as wikis: PT não casa infobox em inglês', () => {
    const wikitext = '{{Infobox football club\n|logo = X_logo.png\n}}';
    expect(escudoDeWikitext(wikitext, PERFIS_WIKI.ptwiki!)).toBeNull();
  });
});
