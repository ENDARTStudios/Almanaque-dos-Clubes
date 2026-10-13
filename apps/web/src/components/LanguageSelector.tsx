'use client';
import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/Provider';
import { LOCALES, LOCALE_NAMES, LOCALE_FLAGS, type Locale } from '@/i18n/config';

/**
 * Seletor de idioma COMPACTO.
 *
 * Antes ele ocupava 235 px na barra — mais que o dobro do campo de busca (208 px) — porque
 * renderizava o `<select>` nativo com o nome completo ("Português (BR)"): o `<select>` tem
 * largura intrínseca do maior `<option>`, então "Português (BR)", "English (US)" e
 * "Español (ES)" cabiam todos ao mesmo tempo e o controle inchava. Num menu horizontal isso
 * empurrava a navegação para o limite (895 px de 1280) e ainda assim as etiquetas quebravam
 * em duas linhas.
 *
 * Agora: o rótulo visível é a SIGLA (`PT` / `EN` / `ES`) e o nome completo continua sendo o
 * rótulo acessível do controle (`aria-label`) e o texto de cada opção no dropdown nativo. O
 * gatilho tem largura fixa de 2,25rem e o `<select>` é sobreposto em `opacity-0` para não
 * influenciar o layout — comportamento nativo preservado (teclado, mobile picker), pegada
 * visual pequena.
 */
export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <label
      className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground/80 transition-colors duration-200 hover:border-primary-ink/50 hover:text-primary-ink"
      title={LOCALE_NAMES[locale]}
    >
      <Globe className="h-4 w-4 -translate-y-0.5" aria-hidden="true" />
      <span className="sr-only">{LOCALE_NAMES[locale]}</span>
      {/* O badge fica na base do controle, CENTRADO. Antes ele ficava no canto inferior direito
          e colidia com o globo em 8×2 px (medido) — o globo tem 16 px num controle de 36 px, então
          sobra pouca folga lateral. Centrado e deslocado para baixo, os dois não se tocam. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold uppercase leading-none tracking-wider text-foreground/60"
      >
        {locale.split('-')[0]}
      </span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={LOCALE_NAMES[locale]}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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
