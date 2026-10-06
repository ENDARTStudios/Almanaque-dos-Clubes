/**
 * WS-C-13 — partes puras de social links: extração de claims Wikidata,
 * URLs canônicas e validação Zod do PATCH social.
 */
import { describe, it, expect } from 'vitest';
import {
  extractSocial,
  youtubeUrl,
  twitterUrl,
  facebookUrl,
  instagramUrl,
} from '../../src/modules/social/social-links.js';
import { SocialPatchSchema } from '../../src/modules/clubs/social.schema.js';

describe('WS-C-13 extração de social (puro)', () => {
  it('extrai P856/P2397/P2002/P2013/P2003 e constrói URLs canônicas', () => {
    const out = extractSocial({
      P856: [{ mainsnak: { datavalue: { value: 'https://flamengo.com.br' } } }],
      P2397: [{ mainsnak: { datavalue: { value: 'UCflamengo' } } }],
      P2002: [{ mainsnak: { datavalue: { value: '@Flamengo' } } }],
      P2013: [{ mainsnak: { datavalue: { value: 'FlamengoOficial' } } }],
      P2003: [{ mainsnak: { datavalue: { value: 'flamengo' } } }],
    });
    expect(out.officialSite).toBe('https://flamengo.com.br');
    expect(out.socialLinks.youtube).toEqual({
      handle: 'UCflamengo',
      url: 'https://www.youtube.com/channel/UCflamengo',
    });
    expect(out.socialLinks.twitter?.url).toBe('https://x.com/Flamengo');
    expect(out.socialLinks.facebook?.url).toBe('https://www.facebook.com/FlamengoOficial');
    expect(out.socialLinks.instagram?.url).toBe('https://www.instagram.com/flamengo');
    expect(out.hasAnything).toBe(true);
  });

  it('YouTube com @handle vira URL @; sem nada → tudo null', () => {
    expect(youtubeUrl('@canal')).toBe('https://www.youtube.com/@canal');
    expect(twitterUrl('@x')).toBe('https://x.com/x');
    expect(facebookUrl('page')).toBe('https://www.facebook.com/page');
    expect(instagramUrl('@ig')).toBe('https://www.instagram.com/ig');
    const empty = extractSocial({});
    expect(empty.hasAnything).toBe(false);
    expect(empty.officialSite).toBeNull();
  });
});

describe('WS-C-13 Zod do PATCH social', () => {
  it('payload completo válido', () => {
    const ok = SocialPatchSchema.safeParse({
      officialSite: 'https://flamengo.com.br',
      socialLinks: {
        youtube: { handle: 'UCfla', url: 'https://www.youtube.com/channel/UCfla' },
        twitter: null,
      },
      followersSnapshot: { youtube: 1000, instagram: null, updatedAt: '2026-10-06' },
    });
    expect(ok.success).toBe(true);
  });

  it('bloqueia handle com HTML e url não-URL e contagem negativa', () => {
    expect(
      SocialPatchSchema.safeParse({
        socialLinks: { twitter: { handle: '<script>', url: 'https://x.com/x' } },
      }).success,
    ).toBe(false);
    expect(SocialPatchSchema.safeParse({ officialSite: 'não-é-url' }).success).toBe(false);
    expect(SocialPatchSchema.safeParse({ followersSnapshot: { youtube: -5 } }).success).toBe(false);
  });
});
