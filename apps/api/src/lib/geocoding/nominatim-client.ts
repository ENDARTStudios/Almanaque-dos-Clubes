/**
 * WS-D M1a-3 — Cliente Nominatim/OSM (geocodificação externa opcional).
 *
 * Respeita a usage policy: **máx. 1 req/s** (serial), `User-Agent` identificável com contato,
 * sem parasitação. Retry com backoff em 429/5xx; 403 = bloqueio (aborta, não insiste).
 * Cache em memória por `iso2|nome`. `fetch`/`sleep` injetáveis para teste.
 *
 * Dado resultante é APROXIMADO (ODbL) — nunca sobrescreve coordenada existente.
 */
export interface NominatimResult {
  lat: number;
  lon: number;
  displayName: string;
  placeId: number;
  type: string;
  class: string;
  countryCode: string | null;
}

export interface NominatimClientOptions {
  userAgent: string;
  minIntervalMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  baseUrl?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class NominatimClient {
  private readonly ua: string;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly baseUrl: string;
  private readonly cache = new Map<string, NominatimResult | null>();
  private lastCallAt = 0;
  public requestCount = 0;

  constructor(opts: NominatimClientOptions) {
    this.ua = opts.userAgent;
    this.minIntervalMs = opts.minIntervalMs ?? 1100;
    this.maxRetries = opts.maxRetries ?? 3;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleepImpl ?? defaultSleep;
    this.baseUrl = opts.baseUrl ?? 'https://nominatim.openstreetmap.org';
  }

  private async throttle(): Promise<void> {
    const wait = this.lastCallAt + this.minIntervalMs - Date.now();
    if (wait > 0) await this.sleep(wait);
    this.lastCallAt = Date.now();
  }

  /** Busca `q` restrito a `iso2`; devolve o melhor resultado ou null (sem match). */
  async search(q: string, iso2: string): Promise<NominatimResult | null> {
    const key = `${iso2.toLowerCase()}|${q}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    const cc = iso2.toLowerCase();
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      limit: '1',
      countrycodes: cc,
      addressdetails: '0',
      'accept-language': 'pt,en',
    });
    const url = `${this.baseUrl}/search?${params.toString()}`;

    let attempt = 0;
    for (;;) {
      await this.throttle();
      this.requestCount += 1;
      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          headers: { 'User-Agent': this.ua, Accept: 'application/json' },
        });
      } catch (err) {
        if (attempt++ >= this.maxRetries) throw err;
        await this.sleep(2000 * attempt);
        continue;
      }
      if (res.status === 403) {
        throw new Error('Nominatim 403: acesso bloqueado (verifique User-Agent/uso).');
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt++ >= this.maxRetries) {
          throw new Error(
            `Nominatim ${res.status}: falha persistente após ${this.maxRetries} retries.`,
          );
        }
        await this.sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) {
        this.cache.set(key, null);
        return null;
      }
      const json = (await res.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
        place_id?: number;
        type?: string;
        class?: string;
      }>;
      const first = Array.isArray(json) ? json[0] : undefined;
      const result = this.toResult(first);
      this.cache.set(key, result);
      return result;
    }
  }

  private toResult(raw?: {
    lat?: string;
    lon?: string;
    display_name?: string;
    place_id?: number;
    type?: string;
    class?: string;
  }): NominatimResult | null {
    if (!raw || raw.lat == null || raw.lon == null) return null;
    const lat = Number.parseFloat(raw.lat);
    const lon = Number.parseFloat(raw.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return {
      lat,
      lon,
      displayName: raw.display_name ?? '',
      placeId: raw.place_id ?? 0,
      type: raw.type ?? '',
      class: raw.class ?? '',
      countryCode: null,
    };
  }
}
