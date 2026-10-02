/**
 * Pricing — moeda por localização real.
 *
 * Regra de negócio (decisão do produto):
 * - A moeda é definida pela localização real do usuário, NUNCA pelo idioma
 *   selecionado e NUNCA por escolha do usuário.
 * - América do Sul + América Central (zona LATAM): BRL
 * - América do Norte + países que usam dólar oficialmente: USD
 * - Europa (incluindo não-Eurozona, conforme regra do produto): EUR
 * - Demais países (resto do mundo): USD (default neutro)
 */

export type BillingCurrency = 'BRL' | 'USD' | 'EUR';

export const BILLING_CURRENCIES: readonly BillingCurrency[] = ['BRL', 'USD', 'EUR'] as const;

/** Moeda usada quando a localização não pôde ser determinada (fallback). */
export const DEFAULT_BILLING_CURRENCY: BillingCurrency = 'BRL';

/** Países que usam o dólar americano como moeda oficial/de facto (zona USD). */
const DOLLAR_COUNTRIES = new Set<string>([
  // América do Norte (núcleo)
  'US',
  'CA',
  // Países/territórios dolarizados
  'EC',
  'SV',
  'PA',
  'TL',
  'PR',
  'VI',
  'GU',
  'AS',
  'MP',
  'UM',
  'TC',
  'KY',
  'VG',
  'AI',
  'BM',
  'CW',
  'SX',
  'MF',
  'BL',
  'BQ',
]);

/** Europa (zona EUR) — por regra do produto, inclui países fora da Eurozona. */
const EUROPE_COUNTRIES = new Set<string>([
  // União Europeia
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  // Não-Eurozona / Europa alargada
  'GB',
  'UK',
  'CH',
  'NO',
  'IS',
  'LI',
  'MC',
  'AD',
  'SM',
  'VA',
  'AL',
  'BA',
  'MK',
  'ME',
  'RS',
  'XK',
  'MD',
  'BY',
  'UA',
  'AM',
  'GE',
  'AZ',
  'TR',
  'RU',
]);

/** América do Sul + América Central (zona LATAM → BRL). */
const LATAM_COUNTRIES = new Set<string>([
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'GY',
  'PY',
  'PE',
  'SR',
  'UY',
  'VE',
  'BZ',
  'CR',
  'GT',
  'HN',
  'NI',
]);

/**
 * Resolve a moeda a partir do código de país (ISO 3166-1 alpha-2).
 * @param countryCode código do país ou null/undefined quando desconhecido.
 */
export function mapCountryToCurrency(countryCode?: string | null): BillingCurrency {
  if (!countryCode) return DEFAULT_BILLING_CURRENCY;
  const c = countryCode.trim().toUpperCase();
  if (DOLLAR_COUNTRIES.has(c)) return 'USD';
  if (EUROPE_COUNTRIES.has(c)) return 'EUR';
  if (LATAM_COUNTRIES.has(c)) return 'BRL';
  return 'USD';
}

/** Símbolo de moeda para exibição. */
export function currencySymbol(currency: BillingCurrency): string {
  switch (currency) {
    case 'BRL':
      return 'R$';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return 'R$';
  }
}

/**
 * Formata um preço na moeda e convenção numérica de um locale.
 * Ex.: (BRL,'pt-br',490) -> 'R$ 4,90' ; (USD,'en-us',490) -> '$ 4.90'.
 * @param amountCentavos valor em centavos (ex.: 490 = 4,90).
 * @param locale locale de exibição ('pt-br' | 'en-us' | 'es-es').
 */
export function formatPrice(
  currency: BillingCurrency,
  amountCentavos: number,
  locale: string = 'pt-br',
): string {
  const symbol = currencySymbol(currency);
  const value = amountCentavos / 100;
  const decimalSep = locale === 'en-us' ? '.' : ',';
  const [intStr, decStr] = value.toFixed(2).split('.');
  return symbol + ' ' + intStr + decimalSep + decStr;
}
