'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, normalizeLocale, type Locale } from './config';
import { getDictionary } from './getDictionary';
import type { Dictionary } from './types';

type Params = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  t: (key: string, params?: Params) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(initialLocale));

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.cookie = LOCALE_COOKIE + '=' + encodeURIComponent(next) + ';path=/;max-age=31536000;samesite=lax';
      document.documentElement.lang = next;
    }
  }, []);

  // T493/T472 — override por URL (?locale=): dá endereço distinto por idioma
  // aos <link hreflang> das páginas legais (pt-BR/en-US/es-ES). Só aceita
  // locale válido; vence o cookie apenas naquela visita.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const param = new URLSearchParams(window.location.search).get('locale');
    if (param && isLocale(param) && param !== locale) {
      setLocale(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dict,
      t: (key, params) => {
        const resolved = resolve(dict, key);
        return typeof resolved === 'string' ? interpolate(resolved, params) : key;
      },
      setLocale,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
