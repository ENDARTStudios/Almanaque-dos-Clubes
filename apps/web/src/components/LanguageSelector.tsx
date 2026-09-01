'use client';
import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/Provider';
import { LOCALES, LOCALE_NAMES, LOCALE_FLAGS, type Locale } from '@/i18n/config';

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground/80 cursor-pointer">
      <Globe className="w-4 h-4 text-foreground/60" aria-hidden="true" />
      <span className="sr-only">{LOCALE_NAMES[locale]}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language / Idioma / Idioma"
        className="bg-transparent appearance-none outline-none text-sm font-medium cursor-pointer [&>option]:text-foreground"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_FLAGS[l]} {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
