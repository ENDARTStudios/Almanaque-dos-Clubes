import type { Dictionary } from './types';
import type { Locale } from './config';
import { normalizeLocale } from './config';
import pt from './dictionaries/pt-br';
import en from './dictionaries/en-us';
import es from './dictionaries/es-es';

const dictionaries: Record<Locale, Dictionary> = {
  'pt-br': pt,
  'en-us': en,
  'es-es': es,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[normalizeLocale(locale)];
}

export { dictionaries };
