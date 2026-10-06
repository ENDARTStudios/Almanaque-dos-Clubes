/**
 * WS-C-13 — partes PURAS de social links (parse Wikidata + URLs canônicas).
 * Sem rede/Prisma — o enrich script injeta fetch; a API usa as funções de
 * validação/normalização.
 *
 * Claims Wikidata (CC0):
 *   P856 site oficial · P2397 YouTube (channel id) · P2002 Twitter/X (handle)
 *   P2013 Facebook (page id/handle) · P2003 Instagram (handle)
 */

export interface SocialLinkEntry {
  handle: string;
  url: string;
}

export type SocialLinks = {
  youtube: SocialLinkEntry | null;
  twitter: SocialLinkEntry | null;
  facebook: SocialLinkEntry | null;
  instagram: SocialLinkEntry | null;
};

export type FollowersSnapshot = {
  youtube?: number | null;
  twitter?: number | null;
  facebook?: number | null;
  instagram?: number | null;
  updatedAt?: string;
};

export interface SocialExtracted {
  officialSite: string | null;
  socialLinks: SocialLinks;
  hasAnything: boolean;
}

interface WikidataClaims {
  P856?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>;
  P2397?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>;
  P2002?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>;
  P2013?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>;
  P2003?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>;
}

/** Primeiro valor string de uma claim (rank preferido vem primeiro no payload). */
function firstString(claims: WikidataClaims, prop: keyof WikidataClaims): string | null {
  const v = claims[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

export function youtubeUrl(idOrHandle: string): string {
  return idOrHandle.startsWith('UC')
    ? `https://www.youtube.com/channel/${idOrHandle}`
    : `https://www.youtube.com/@${idOrHandle.replace(/^@/, '')}`;
}

export function twitterUrl(handle: string): string {
  return `https://x.com/${handle.replace(/^@/, '')}`;
}

export function facebookUrl(page: string): string {
  return `https://www.facebook.com/${page}`;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, '')}`;
}

/** Extrai site oficial + redes de um payload de claims Wikidata. */
export function extractSocial(claims: WikidataClaims): SocialExtracted {
  const yt = firstString(claims, 'P2397');
  const tw = firstString(claims, 'P2002');
  const fb = firstString(claims, 'P2013');
  const ig = firstString(claims, 'P2003');
  const officialSite = firstString(claims, 'P856');

  const socialLinks: SocialLinks = {
    youtube: yt ? { handle: yt, url: youtubeUrl(yt) } : null,
    twitter: tw ? { handle: tw, url: twitterUrl(tw) } : null,
    facebook: fb ? { handle: fb, url: facebookUrl(fb) } : null,
    instagram: ig ? { handle: ig, url: instagramUrl(ig) } : null,
  };

  const hasAnything =
    officialSite !== null ||
    socialLinks.youtube !== null ||
    socialLinks.twitter !== null ||
    socialLinks.facebook !== null ||
    socialLinks.instagram !== null;

  return { officialSite, socialLinks, hasAnything };
}
