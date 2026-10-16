import type { Locale } from './config';

/**
 * Ícones autorais — strings do RÓTULO DE ILUSTRAÇÃO e dos nomes de posição.
 *
 * Módulo ADITIVO (regra 4 do design system): NÃO altera o `Dictionary` global nem
 * `i18n/types.ts` — os dicionários são arquivo quente de outras sessões. Todo texto
 * que aparece junto de um ícone autoral vive aqui.
 *
 * Honestidade (skill `conversion-copy`): quando não há imagem oficial no acervo, a
 * tela DIZ que o desenho é uma ilustração. O ícone nunca se apresenta como o escudo,
 * a foto ou o troféu oficial — só como forma genérica da categoria.
 */
export interface WIconsStrings {
  /** Rótulo do escudo genérico (clube/seleção sem logo no acervo). */
  clubCrest: string;
  /** Rótulo do placeholder de atleta (jogador sem foto no acervo). */
  playerPhoto: string;
  /** Complemento do placeholder de atleta quando a posição é conhecida. */
  playerPhotoWithPosition: string;
  /** Rótulo do troféu genérico (competição sem imagem oficial do troféu). */
  competitionTrophy: string;
  /** Nome acessível do ícone de posição. */
  positions: {
    GOALKEEPER: string;
    DEFENDER: string;
    MIDFIELDER: string;
    FORWARD: string;
  };
}

export const wIconsStrings: Record<Locale, WIconsStrings> = {
  'pt-br': {
    clubCrest: 'Ilustração — o acervo ainda não tem o escudo oficial deste clube.',
    playerPhoto: 'Ilustração genérica — o acervo ainda não tem foto oficial deste atleta.',
    playerPhotoWithPosition: 'Ilustração genérica de {position} — sem foto oficial no acervo.',
    competitionTrophy: 'Ilustração — o acervo ainda não tem a imagem oficial deste troféu.',
    positions: {
      GOALKEEPER: 'goleiro',
      DEFENDER: 'defensor',
      MIDFIELDER: 'meio-campista',
      FORWARD: 'atacante',
    },
  },
  'en-us': {
    clubCrest: 'Illustration — the archive does not have this club’s official crest yet.',
    playerPhoto:
      'Generic illustration — the archive does not have an official photo of this player.',
    playerPhotoWithPosition:
      'Generic illustration of a {position} — no official photo in the archive.',
    competitionTrophy:
      'Illustration — the archive does not have the official image of this trophy.',
    positions: {
      GOALKEEPER: 'goalkeeper',
      DEFENDER: 'defender',
      MIDFIELDER: 'midfielder',
      FORWARD: 'forward',
    },
  },
  'es-es': {
    clubCrest: 'Ilustración — el archivo aún no tiene el escudo oficial de este club.',
    playerPhoto: 'Ilustración genérica — el archivo aún no tiene foto oficial de este jugador.',
    playerPhotoWithPosition:
      'Ilustración genérica de un {position} — sin foto oficial en el archivo.',
    competitionTrophy: 'Ilustración — el archivo aún no tiene la imagen oficial de este trofeo.',
    positions: {
      GOALKEEPER: 'portero',
      DEFENDER: 'defensa',
      MIDFIELDER: 'centrocampista',
      FORWARD: 'delantero',
    },
  },
};

/** Nome localizado da posição, ou `null` quando a posição não está no enum do domínio. */
export function positionLabel(locale: Locale, position?: string | null): string | null {
  const key = position?.trim().toUpperCase();
  if (!key || !(key in wIconsStrings[locale].positions)) return null;
  return wIconsStrings[locale].positions[key as keyof WIconsStrings['positions']];
}
