/**
 * T428 — Helper compartilhado de resiliência HTTP para ETL/scripts.
 * Extrai a política definida no T426 (retry com backoff exponencial
 * 1s/2s/4s + timeout por request) para eliminar as duplicatas entre
 * ingest-clubs-wikidata.ts (API) e wikidata-connector.ts (worker).
 *
 * Contrato: UMA função exportada. O fetcher é injetável (testes mockam
 * sem tocar na rede); os headers usam tipo estrutural local porque o
 * ESLint root (globals Node, sem lib DOM) não conhece `RequestInit`.
 */
import pino from 'pino';

export const log = pino({ name: 'etl-http' });

/** Headers + signal (injetado pelo timeout) — estrutural, evita global DOM no lint Node. */
export type FetchInit = { headers: Record<string, string>; signal?: AbortSignal };

export type Fetcher = (url: string, init: FetchInit) => Promise<Response>;

/** Políticas padrão (T426): 3 tentativas com backoff 1s/2s/4s, timeout 30s. */
export const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];
export const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchWithRetryOptions {
  retryDelaysMs?: number[];
  timeoutMs?: number;
  /** Injeção para testes (mock de rede); default = fetch global. */
  fetcher?: Fetcher;
  /** Contexto extra para os logs (offset, batch, host...) — nunca segredos. */
  logContext?: Record<string, unknown>;
  /** Rótulo do chamador nos logs (ex.: 'ingest-clubs'). */
  label?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetcher default — o signal do timeout é aplicado pelo fetchWithTimeout. */
const defaultFetcher: Fetcher = (url, init) => {
  const { headers, signal } = init;
  return fetch(url, { headers, signal });
};

export async function fetchWithTimeout(
  url: string,
  init: FetchInit,
  ms: number,
  fetcher: Fetcher = defaultFetcher,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET com retry exponencial + timeout. Lança o último erro após esgotar
 * as tentativas (contrato de "falha ruidosa" — o chamador decide se
 * degrada para [] ou aborta a rodada).
 */
export async function fetchWithRetry(
  url: string,
  init: FetchInit,
  opts: FetchWithRetryOptions = {},
): Promise<Response> {
  const retryDelays = opts.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const label = opts.label ?? 'etl';
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs, opts.fetcher);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt === retryDelays.length) break;
      const delay = retryDelays[attempt];
      log.warn(
        {
          label,
          url: url.slice(0, 120),
          attempt: attempt + 1,
          delayMs: delay,
          err: (err as Error).message,
          ...opts.logContext,
        },
        'HTTP request failed — retrying',
      );
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}
