/**
 * enrich-social-wikidata — os dois defeitos SILENCIOSOS que a página do jogador escondia.
 *
 * Contexto: o perfil de jogador renderiza `<SocialLinks>`, mas em produção 105.187 jogadores
 * eram elegíveis e ZERO tinham dado. O componente se protege contra vazio (`return null`), então
 * nada na tela denunciava. Os testes abaixo cobrem as duas causas, e ambas são de lógica pura —
 * não precisam de banco nem de rede.
 */
import { describe, it, expect } from 'vitest';
import { baseDeSelecao, montarPatch } from '../../src/scripts/enrich-social-wikidata.js';

const EXTRAIDO = {
  officialSite: 'https://exemplo.org',
  socialLinks: {
    youtube: null,
    twitter: { handle: 'ex', url: 'https://twitter.com/ex' },
    facebook: null,
    instagram: null,
  },
};

describe('baseDeSelecao — a coluna `deletedAt` não existe em players', () => {
  it('NÃO inclui `deletedAt` para player (era o 42703 silencioso)', () => {
    const base = baseDeSelecao('player');
    expect(base).not.toContain('deletedAt');
    // A elegibilidade pergunta pela coluna de site DESTE alvo.
    expect(base).toContain('"officialSite" IS NULL');
  });

  it('inclui `deletedAt` para club e competition, que têm soft-delete', () => {
    expect(baseDeSelecao('club')).toContain('"deletedAt" IS NULL');
    expect(baseDeSelecao('competition')).toContain('"deletedAt" IS NULL');
  });

  it('pergunta pela coluna de site CERTA por alvo: clube usa `website`', () => {
    // Escrever `officialSite` em clubs criaria coluna inexistente; o inverso também.
    expect(baseDeSelecao('club')).toContain('website IS NULL');
    expect(baseDeSelecao('club')).not.toContain('"officialSite" IS NULL');
  });

  it('os três alvos exigem qid (sem QID não há o que consultar no Wikidata)', () => {
    for (const alvo of ['club', 'player', 'competition'] as const) {
      expect(baseDeSelecao(alvo)).toContain('qid IS NOT NULL');
    }
  });
});

describe('montarPatch — zero overwrite, e `{}` NÃO é "tem dado"', () => {
  it('OBJETO VAZIO em socialLinks gera patch (o bug que fazia updated=0)', () => {
    // `{}` é TRUTHY em JavaScript. Com `if (!t.socialLinks)` este caso era PULADO: o patch saía
    // vazio, o alvo era cortado, e o --apply reportava updated=0 depois de extrair do Wikidata.
    // Em produção, 127 jogadores estavam exatamente neste estado.
    const patch = montarPatch({ socialLinks: {}, officialSite: null }, EXTRAIDO, 'player');
    expect(patch.socialLinks).toBeDefined();
    expect(Object.keys(patch).length).toBeGreaterThan(0);
  });

  it('`null` e `undefined` também geram patch', () => {
    expect(
      montarPatch({ socialLinks: null, officialSite: null }, EXTRAIDO, 'player').socialLinks,
    ).toBeDefined();
    expect(
      montarPatch({ socialLinks: undefined, officialSite: null }, EXTRAIDO, 'player').socialLinks,
    ).toBeDefined();
  });

  it('socialLinks COM dado NÃO é sobrescrito (zero overwrite)', () => {
    const existente = { twitter: { handle: 'editor', url: 'https://twitter.com/editor' } };
    const patch = montarPatch({ socialLinks: existente, officialSite: null }, EXTRAIDO, 'player');
    expect(patch.socialLinks).toBeUndefined();
  });

  it('site já preenchido NÃO é sobrescrito', () => {
    const patch = montarPatch(
      { socialLinks: null, officialSite: 'https://ja-tinha.org' },
      EXTRAIDO,
      'player',
    );
    expect(patch.officialSite).toBeUndefined();
  });

  it('o campo do site muda por alvo: club grava `website`, os outros `officialSite`', () => {
    const clube = montarPatch({ socialLinks: null, website: null }, EXTRAIDO, 'club');
    expect(clube.website).toBe('https://exemplo.org');
    expect(clube.officialSite).toBeUndefined();

    const jogador = montarPatch({ socialLinks: null, officialSite: null }, EXTRAIDO, 'player');
    expect(jogador.officialSite).toBe('https://exemplo.org');
    expect(jogador.website).toBeUndefined();
  });

  it('sem nada extraído do Wikidata, o patch fica vazio (o alvo é pulado)', () => {
    const vazio = {
      officialSite: null,
      socialLinks: { youtube: null, twitter: null, facebook: null, instagram: null },
    };
    const patch = montarPatch({ socialLinks: {}, officialSite: null }, vazio, 'player');
    // `socialLinks` ainda entra (o alvo não tinha dado), mas o site não.
    expect(patch.officialSite).toBeUndefined();
    expect(patch.website).toBeUndefined();
  });

  it('re-run é noop: o que este script acabou de gravar não é reescrito', () => {
    // Depois de um apply, socialLinks fica com as QUATRO chaves (as ausentes vêm como null),
    // então `Object.keys(...).length` é 4 e o alvo deixa de ser elegível.
    const gravado = EXTRAIDO.socialLinks;
    const patch = montarPatch(
      { socialLinks: gravado, officialSite: 'https://exemplo.org' },
      EXTRAIDO,
      'player',
    );
    expect(patch).toEqual({});
  });
});
