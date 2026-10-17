export const LOCALES = ['pt-br', 'en-us', 'es-es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt-br';
export const LOCALE_COOKIE = 'almanaque_locale';
export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-br': 'Português (BR)',
  'en-us': 'English (US)',
  'es-es': 'Español (ES)',
};
/**
 * T579b — país que representa cada idioma oferecido. SUBSTITUI o mapa de bandeira emoji
 * (`🇧🇷/🇺🇸/🇪🇸`), que no Windows degrada para as duas letras regionais: as bandeiras agora
 * vêm do mesmo asset próprio do acervo (`/flags/<iso2>.svg`, via `components/LocaleFlag.tsx`)
 * e a sigla ISO2 é a ponte entre idioma e arquivo.
 */
export const LOCALE_COUNTRY: Record<Locale, string> = {
  'pt-br': 'BR',
  'en-us': 'US',
  'es-es': 'ES',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
