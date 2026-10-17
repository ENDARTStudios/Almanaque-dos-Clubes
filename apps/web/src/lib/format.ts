import type { Locale } from '@/i18n/config';

/** Locale interno (`pt-br`) → tag BCP 47 que o `Intl` aceita (`pt-BR`). */
const INTL_TAG: Record<Locale, string> = {
  'pt-br': 'pt-BR',
  'en-us': 'en-US',
  'es-es': 'es-ES',
};

/**
 * Formata contagem do acervo com separador de milhar do idioma (11.987 / 11,987).
 * Usa `Intl` em vez de `toLocaleString(locale)` porque a tag interna ('pt-br') não é
 * uma tag BCP 47 válida e o Intl a rejeita em runtime.
 */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_TAG[locale] ?? 'pt-BR').format(value);
}

/**
 * Formata data ISO (da API) com calendário do idioma (17/10/2026 · Oct 17, 2026).
 * Sem horário: o acervo registra o dia da partida, não o minuto.
 */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(INTL_TAG[locale] ?? 'pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
