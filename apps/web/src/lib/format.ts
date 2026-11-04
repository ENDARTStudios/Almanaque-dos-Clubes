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
 * Formata data ISO (yyyy-mm-dd) no formato do idioma. Datas do acervo vêm como
 * string ISO (ou Date serializado); inválida → o próprio ISO de volta (honesto).
 */
export function formatDate(value: string | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(INTL_TAG[locale] ?? 'pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Idade relativa ("há 5 min", "5 min. ago") para timestamps operacionais.
 *
 * `numeric: 'always'` é intencional: `auto` responderia "anteontem" para 2 dias,
 * o que é preciso para calendário e vago para staleness — aqui a pergunta é
 * "quanto tempo atrás", não "que dia foi". Abaixo de 10 s usamos o modo `auto`
 * só para ganhar o "agora"/"now" nativo do idioma. Valor inválido volta como
 * string, igual ao `formatDate` (honesto em vez de `Invalid Date`).
 */
export function formatRelativeTime(value: string | Date, locale: Locale, now = Date.now()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const tag = INTL_TAG[locale] ?? 'pt-BR';
  const diffMs = date.getTime() - now;
  const abs = Math.abs(diffMs);
  if (abs < 10_000) {
    return new Intl.RelativeTimeFormat(tag, { numeric: 'auto', style: 'short' }).format(
      0,
      'second',
    );
  }
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'always', style: 'short' });
  const sign = diffMs < 0 ? -1 : 1;
  if (abs < 60_000) return rtf.format(sign * Math.round(abs / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(sign * Math.round(abs / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(sign * Math.round(abs / 3_600_000), 'hour');
  return rtf.format(sign * Math.round(abs / 86_400_000), 'day');
}
