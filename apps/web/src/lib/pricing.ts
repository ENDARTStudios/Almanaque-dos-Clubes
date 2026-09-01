/**
 * Pricing — moeda por localização real (espelho do resolvedor em @almanaque/domain).
 *
 * Regra: a moeda é definida pela localização real do usuário, NUNCA pelo idioma
 * e NUNCA por escolha do usuário. Mantido em sincronia com packages/domain/src/pricing.ts.
 * (O web não declara dependência do domínio para não onerar o build; ver nota no monorepo.)
 */

export type BillingCurrency = 'BRL' | 'USD' | 'EUR';

export const DEFAULT_BILLING_CURRENCY: BillingCurrency = 'BRL';

const DOLLAR_COUNTRIES = new Set<string>([
  'US', 'CA', 'EC', 'SV', 'PA', 'TL', 'PR', 'VI', 'GU', 'AS', 'MP', 'UM',
  'TC', 'KY', 'VG', 'AI', 'BM', 'CW', 'SX', 'MF', 'BL', 'BQ',
]);

const EUROPE_COUNTRIES = new Set<string>([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'GB', 'UK', 'CH', 'NO', 'IS', 'LI', 'MC', 'AD', 'SM', 'VA', 'AL', 'BA', 'MK',
  'ME', 'RS', 'XK', 'MD', 'BY', 'UA', 'AM', 'GE', 'AZ', 'TR', 'RU',
]);

const LATAM_COUNTRIES = new Set<string>([
  'AR', 'BO', 'BR', 'CL', 'CO', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE',
  'BZ', 'CR', 'GT', 'HN', 'NI',
]);

export function mapCountryToCurrency(countryCode?: string | null): BillingCurrency {
  if (!countryCode) return DEFAULT_BILLING_CURRENCY;
  const c = countryCode.trim().toUpperCase();
  if (DOLLAR_COUNTRIES.has(c)) return 'USD';
  if (EUROPE_COUNTRIES.has(c)) return 'EUR';
  if (LATAM_COUNTRIES.has(c)) return 'BRL';
  return 'USD';
}

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

export function formatPrice(
  currency: BillingCurrency,
  amountCentavos: number,
  locale: string = 'pt-br',
): string {
  const symbol = currencySymbol(currency);
  const decimalSep = locale === 'en-us' ? '.' : ',';
  const [intStr, decStr] = (amountCentavos / 100).toFixed(2).split('.');
  return symbol + ' ' + intStr + decimalSep + decStr;
}

/** Valores em centavos (preço de tabela mensal). */
export const PLAN_CENTS = { FREE: 0, PRO: 490, ELITE: 990 } as const;
