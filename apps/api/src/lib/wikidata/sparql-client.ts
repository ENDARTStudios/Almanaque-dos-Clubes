/**
 * Cliente SPARQL do Wikidata (CC0) — consultas em lote com backoff, timeout e retry.
 *
 * ── POR QUE UM CLIENTE NOVO, SE JÁ EXISTE `wikidata-client.ts` ─────────────────────────────
 * O cliente existente usa `wbgetentities`, que busca entidades POR ID: para descobrir as
 * subdivisões de um país seria preciso 1 requisição no país + 1 a cada N subdivisões (lote de 50).
 * O Brasil sozinho tem 27 unidades, a Austrália 8, e são 220 países — daria mais de mil
 * requisições, com risco real de bloqueio por abuso.
 *
 * O SPARQL responde a mesma pergunta em UMA requisição por país: "quais itens têm código ISO
 * 3166-2 começando com `XX-`". São ~220 requisições no total, e cada resposta já vem com código,
 * rótulo e coordenada.
 *
 * O que este cliente NÃO substitui: `fetchEntities` continua sendo o certo para buscar entidades
 * por QID. São ferramentas diferentes para perguntas diferentes.
 *
 * ── CUIDADO COM O SERVIÇO PÚBLICO ─────────────────────────────────────────────────────────
 * `query.wikidata.org` é compartilhado. O padrão é UMA requisição por segundo, com backoff em
 * 429/5xx. Não existe motivo para apertar mais do que isso: são ~220 países.
 */
import { WIKIDATA_USER_AGENT } from './wikidata-client.js';

export const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/** Uma linha do resultado SPARQL — só os campos que este projeto usa. */
export interface SparqlBinding {
  [variavel: string]: { type: string; value: string } | undefined;
}

export interface QuerySparqlOptions {
  /** tentativas totais (default 4) */
  maxRetries?: number;
  /** timeout por requisição em ms (default 45_000 — SPARQL é mais lento que wbgetentities) */
  timeoutMs?: number;
  /** base do backoff em ms (default 2000 → 2s, 4s, 8s…) */
  backoffBaseMs?: number;
  /** pausa antes de cada requisição, para não abusar do serviço público (default 1000ms) */
  minIntervalMs?: number;
  /** injetável no teste: substitui fetch */
  fetchImpl?: typeof fetch;
  /** injetável no teste: substitui a espera */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Executa uma consulta e devolve as linhas.
 *
 * Lança em erro definitivo (após os retries): um país que falha não pode ser silenciosamente
 * tratado como "não tem subdivisões" — isso gravaria ausência de dado como ausência de estados.
 */
export async function querySparql(
  query: string,
  opts: QuerySparqlOptions = {},
): Promise<SparqlBinding[]> {
  const {
    maxRetries = 4,
    timeoutMs = 45_000,
    backoffBaseMs = 2_000,
    minIntervalMs = 1_000,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = opts;

  let ultimoErro: unknown = null;

  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    if (minIntervalMs > 0) await sleep(minIntervalMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
      const res = await fetchImpl(url, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': WIKIDATA_USER_AGENT,
        },
        signal: controller.signal,
      });

      /* 429 e 5xx são transitórios: vale tentar de novo.
         4xx (menos 429) é defeito da consulta — insistir não resolve. */
      if (res.status === 429 || res.status >= 500) {
        ultimoErro = new Error(`SPARQL HTTP ${res.status}`);
        await sleep(backoffBaseMs * 2 ** tentativa);
        continue;
      }
      if (!res.ok) {
        throw new Error(`SPARQL HTTP ${res.status} — consulta inválida, não vale repetir`);
      }

      const json = (await res.json()) as {
        results?: { bindings?: SparqlBinding[] };
      };
      return json.results?.bindings ?? [];
    } catch (err) {
      ultimoErro = err;
      // AbortError (timeout) é transitório; erro de consulta inválida não é.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('consulta inválida')) throw err;
      await sleep(backoffBaseMs * 2 ** tentativa);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `SPARQL falhou após ${maxRetries} tentativas: ${ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro)}`,
  );
}
