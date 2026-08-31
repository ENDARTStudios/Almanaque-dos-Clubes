export const LOCALES = ['pt-br', 'en-us', 'es-es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt-br';
export const LOCALE_COOKIE = 'almanaque_locale';
export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-br': 'Português (BR)',
  'en-us': 'English (US)',
  'es-es': 'Español (ES)',
};
export const LOCALE_FLAGS: Record<Locale, string> = {
  'pt-br': '🇧🇷',
  'en-us': '🇺🇸',
  'es-es': '🇪🇸',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
