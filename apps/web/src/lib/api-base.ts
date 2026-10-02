export const PROD_API_URL = 'https://api.almanaquedosclubes.com/api/v1';
export const DEV_API_URL = 'http://localhost:3000/api/v1';

function isTrusted(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === 'api.almanaquedosclubes.com' || host.endsWith('.almanaquedosclubes.com');
  } catch {
    return false;
  }
}

/**
 * Resolve a base da API.
 * - Produção: usa NEXT_PUBLISHABLE_API_URL (ou NEXT_PUBLIC_API_URL, por compatibilidade) se confiável;
 *   senão o domínio público. No browser, variáveis sem prefixo NEXT_PUBLIC_* NÃO são injetadas pelo Next,
 *   então ele cai no domínio público (correto). Em server-side, NEXT_PUBLISHABLE_API_URL está disponível.
 * - Dev: env de override ou localhost.
 */
export function getApiBase(): string {
  const override = (process.env.NEXT_PUBLISHABLE_API_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (process.env.NODE_ENV === 'production') {
    return override && isTrusted(override) ? override : PROD_API_URL;
  }
  return override || DEV_API_URL;
}
