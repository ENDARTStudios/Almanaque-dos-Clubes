/**
 * Geo — resolução do país a partir do IP do cliente (localização real).
 *
 * Usa ipwho.is (sem chave) apenas durante o checkout (baixa frequência),
 * com cache em memória (TTL) para evitar chamadas repetidas.
 *
 * IMPORTANTE (LGPD): o IP do usuário é enviado a um provedor de geolocalização
 * para determinar o país e, assim, a moeda. Esse processamento deve estar
 * descrito na Política de Privacidade.
 */

interface GeoCacheEntry {
  country: string;
  expiresAt: number;
}

const cache = new Map<string, GeoCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE = 5000;

function cacheSet(ip: string, country: string): void {
  if (cache.size >= MAX_CACHE) {
    // descarta a entrada mais antiga
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(ip, { country, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Resolve o código do país (ISO 3166-1 alpha-2) a partir do IP.
 * Retorna null quando não for possível determinar (IP privado, falha de rede etc.).
 */
export async function resolveCountryForIp(ip: string | undefined): Promise<string | null> {
  const address = ip?.trim();
  if (!address) return null;

  const hit = cache.get(address);
  if (hit && hit.expiresAt > Date.now()) return hit.country;

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; country_code?: string };
    const code = body.success && body.country_code ? body.country_code.toUpperCase() : null;
    if (code) cacheSet(address, code);
    return code;
  } catch {
    return null;
  }
}
