/**
 * T502 — connector genérico de MÍDIA Wikidata (logo P154, foto P18, estádio
 * P115→P625/P1083/P18, cores) para os enrich scripts W1/W2/W3.
 *
 * wbgetentities em lotes de 50 (1 req/s) — mesmo padrão T034/T499.
 * URLs de imagem: endpoint oficial Special:FilePath do Commons (nunca URL
 * inventada). Claims extraídos de datavalue.value (objeto com .id ou .time
 * ou string) conforme o tipo da propriedade.
 */
import { z } from 'zod';
import { createHash } from 'node:crypto';

export const MEDIA_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata media enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

export interface ClaimSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
  /**
   * T551 — qualifiers do statement (P580 início / P582 fim, nas P54 de jogador). O
   * `wbgetentities&props=claims` já os devolve junto do mainsnak; sem declarar aqui o
   * zod os descartava e o "clube atual" não podia ser inferido.
   */
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
  rank?: string;
}

const entityShape = z
  .object({
    entities: z.record(
      z.string(),
      z.object({
        labels: z
          .record(z.string(), z.object({ language: z.string(), value: z.string() }))
          .optional(),
        claims: z.record(z.string(), z.array(z.custom<ClaimSnak>()).optional()).optional(),
        // T552 — sitelinks (título do artigo por wiki) para o fallback do infobox.
        // Sem declarar aqui, o zod DESCARTA o campo e o extrator do escudo nunca teria
        // o artigo para ler.
        sitelinks: z.record(z.string(), z.object({ title: z.string() }).passthrough()).optional(),
      }),
    ),
  })
  .passthrough();

export type EntityShape = NonNullable<z.infer<typeof entityShape>['entities']>[string];

export function qidFromValue(v: unknown): string | null {
  if (v == null || typeof v !== 'object') return null;
  const id = (v as { id?: unknown }).id;
  return typeof id === 'string' && /^Q\d+$/.test(id) ? id : null;
}

/** Extrai valores de uma claim: .id para entidades, .time para datas, string puro para strings. */
export function claimScalar(entity: EntityShape, pid: string): string | null {
  const v = (entity.claims?.[pid] ?? [])[0]?.mainsnak?.datavalue?.value;
  if (v == null) return null;
  if (typeof v === 'object') {
    const o = v as { id?: unknown; time?: unknown };
    if (typeof o.id === 'string') return o.id;
    if (typeof o.time === 'string') return o.time.replace(/^\+/, '').slice(0, 10);
    return null;
  }
  return String(v);
}

export function claimAll(entity: EntityShape, pid: string): string[] {
  return (entity.claims?.[pid] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v): v is NonNullable<typeof v> => v != null)
    .map((v) => {
      if (typeof v === 'object') {
        const o = v as { id?: unknown; time?: unknown };
        if (typeof o.id === 'string') return o.id;
        if (typeof o.time === 'string') return o.time.replace(/^\+/, '').slice(0, 10);
      }
      return String(v);
    });
}

/** Rótulo com precedência pt > en > es > qualquer. */
export function bestLabel(entity: EntityShape): string | null {
  let name: string | null = null;
  let rank = -1;
  for (const [lang, l] of Object.entries(entity.labels ?? {})) {
    const r =
      lang === 'pt-br' || lang === 'pt'
        ? 3
        : lang === 'en' || lang === 'en-us'
          ? 2
          : lang === 'es'
            ? 1
            : 0;
    if (r > rank) {
      name = l.value;
      rank = r;
    }
  }
  return name;
}

/**
 * URL DIRETA do Commons (sem redirect) para um nome de arquivo.
 *
 * T506 — o endpoint Special:FilePath devolve 302->301->arquivo; no browser a
 * cadeia de redirects atrasa/trava em alguns ambientes (validado em producao:
 * o arquivo direto carrega 200 image/svg+xml, o redirect da timeout). O caminho
 * e DETERMINISTICO: 1o char + 2 primeiros chars do md5 do nome normalizado.
 *   md5('Gremio_Prudente_Emblem.svg') = '66e1ca...' -> /wikipedia/commons/6/66/...
 * SVG usa o original (escala); rasters usam o thumb deterministico (Wpx-N.png).
 * Nada e inventado: o nome vem do claim P154/P18.
 */
export function commonsFilePath(filename: string, width?: number): string {
  const clean = filename
    .trim()
    .replace(/ /g, '_')
    .replace(/^./, (c) => c.toUpperCase());
  const hash = createHash('md5').update(clean).digest('hex');
  const a = hash[0];
  const ab = hash.slice(0, 2);
  const enc = encodeURIComponent(clean);
  const base = 'https://upload.wikimedia.org/wikipedia/commons/';
  // T506 — o Commons RESTRINGIU as larguras de thumb (400/640/800 → HTTP 400;
  // validado em produção: só 120 é aceito na lista canônica). Servimos sempre o
  // ORIGINAL (200 garantido) e deixamos a escala para o navegador — um thumb
  // quebrado é pior que um arquivo um pouco maior num avatar de perfil.
  void width;
  return base + a + '/' + ab + '/' + enc;
}

/**
 * Falha de LEITURA do lote: o `wbgetentities` respondeu 200 + `success: 1` mas não
 * devolveu ids que foram pedidos, e repartir o lote até o limite não resolveu.
 *
 * Existe porque a alternativa era MENTIR: quem chama `entities.get(qid)` e recebe
 * `undefined` conclui "a fonte não tem o dado", carimba `no_source` no cursor e o clube/
 * jogador NUNCA volta para a fila. Ausência de resposta é falha de leitura, NÃO ausência
 * de dado (mesma lição do 429 e do `IS NULL` do registro inteiro).
 */
export class WikidataBatchError extends Error {
  constructor(
    message: string,
    readonly qidsAusentes: string[],
  ) {
    super(message);
    this.name = 'WikidataBatchError';
  }
}

/** Aviso de truncamento do MediaWiki (o teto é `12.582.912` bytes por resposta). */
const AVISO_TRUNCAMENTO = /truncat/i;

export interface LoteInspecionado {
  /** O que a resposta realmente trouxe, como veio (inclusive alvos de redirect). */
  entidades: Record<string, EntityShape>;
  /** qid PEDIDO → chave existente em `entidades` (redirect/normalização). */
  alias: Map<string, string>;
  /** qids pedidos que a resposta simplesmente NÃO menciona — sem motivo legítimo. */
  ausentes: string[];
  /** Texto do aviso de truncamento do MediaWiki, quando o payload veio cortado. */
  avisoTruncamento: string | null;
}

/**
 * PARTE PURA do contrato do lote — provável sem rede (é aqui que o teste de regressão
 * mira). Três motivos LEGÍTIMOS para um qid pedido não estar em `entities`:
 *
 * 1. `missing` — a entidade não existe (e aí a chave VEM, com o marcador);
 * 2. redirect — o item foi mesclado; o alvo está em `entities` e o mapa `redirects`
 *    (ou `normalized`) liga o pedido ao alvo;
 * 3. normalização de caixa do id (`q30` → `Q30`).
 *
 * Qualquer outra ausência é GAP MUDO da resposta e não pode ser lida como "não tem".
 */
export function inspecionarLote(json: unknown, pedidos: string[]): LoteInspecionado {
  const j = json as {
    entities?: Record<string, EntityShape>;
    redirects?: Array<{ from?: string; to?: string }>;
    normalized?: Array<{ from?: string; to?: string }>;
    warnings?: { result?: Record<string, unknown> };
  };
  const entidades = j.entities ?? {};
  const alias = new Map<string, string>();
  for (const par of [...(j.normalized ?? []), ...(j.redirects ?? [])]) {
    const de = par?.from;
    const para = par?.to;
    if (de && para && entidades[para] && !entidades[de]) alias.set(de, para);
  }
  const ausentes = pedidos.filter((q) => !entidades[q] && !alias.has(q));
  // O MediaWiki aninha o aviso por MÓDULO (`warnings.result['*']` hoje, mas o nome do
  // módulo não é contrato) — varre os valores string do objeto, um nível dentro.
  let avisoTruncamento: string | null = null;
  const varrer = (no: unknown, nivel: number): void => {
    if (avisoTruncamento != null || no == null || typeof no !== 'object') return;
    for (const v of Object.values(no as Record<string, unknown>)) {
      if (typeof v === 'string') {
        if (AVISO_TRUNCAMENTO.test(v)) avisoTruncamento = v;
      } else if (nivel < 2) {
        varrer(v, nivel + 1);
      }
    }
  };
  varrer(j.warnings, 0);
  return { entidades, alias, ausentes, avisoTruncamento };
}

/**
 * Lote de wbgetentities: Map<qid, EntityShape normalizado>.
 *
 * CONTRATO (reforçado depois do defeito do lote cortado em 12 MB):
 *  - todo qid PEDIDO ou vem no Map, ou o motivo da ausência é legítimo (`missing` /
 *    redirect), ou esta função LANÇA `WikidataBatchError` — nunca devolve silêncio;
 *  - resposta com aviso de truncamento (`success: 1` + `entities` faltando gente) é
 *    repartida ao meio e refeita, com backoff e `minIntervalMs` entre requisições;
 *  - o limite de repartição (`maxSplitDepth`) impede laço infinito: no fundo, o lote de
 *    1 id que não volta vira erro de leitura (jamais `no_source`).
 *
 * Assinatura e tipo de retorno continuam os mesmos: os chamadores que iteram o Map e
 * fazem `entities.get(qid)` não precisaram mudar. O que muda é que agora podem receber
 * exceção em vez de um Map incompleto — e é isso que os impede de carimbar gap falso.
 */
export async function fetchEntities(
  qids: string[],
  opts: {
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    minIntervalMs?: number;
    batchSize?: number;
    /** T552 — pedir também os sitelinks (título do artigo por wiki). */
    withSitelinks?: boolean;
    /** Quantas vezes o lote pode ser repartido antes de virar erro de leitura. */
    maxSplitDepth?: number;
    /** Observabilidade: truncamento detectado (o erro segue sendo lançado no fundo). */
    onTruncation?: (info: {
      qidsAusentes: string[];
      aviso: string | null;
      profundidade: number;
      tamanhoLote: number;
    }) => void;
  } = {},
): Promise<Map<string, EntityShape>> {
  const {
    userAgent = MEDIA_USER_AGENT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = 1000,
    batchSize = 50,
    withSitelinks = false,
    maxSplitDepth = 5,
    onTruncation,
  } = opts;
  const out = new Map<string, EntityShape>();
  const props = withSitelinks ? 'labels|claims|sitelinks' : 'labels|claims';
  // Ids repetidos no pedido não podem virar "ausente" na conferência: a API deduplica.
  const unicos = [...new Set(qids)];

  /** Uma requisição + conferência do que voltou. NÃO engole erro nenhum. */
  async function buscarLote(chunk: string[], profundidade: number): Promise<void> {
    const url = `${WIKIDATA_API}?action=wbgetentities&ids=${chunk.join('|')}&format=json&props=${props}`;
    const res = await fetchImpl(url, { headers: { 'user-agent': userAgent } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const json: unknown = await res.json();
    const erro = (json as { error?: { code?: string; info?: string } }).error;
    if (erro)
      throw new Error(`wbgetentities ${erro.code ?? 'erro'}: ${erro.info ?? 'sem detalhe'}`);
    const parsed = entityShape.safeParse(json);
    if (!parsed.success) throw new Error('wbgetentities payload inválido');
    const lote = inspecionarLote(json, chunk);
    for (const [qid, e] of Object.entries(lote.entidades)) out.set(qid, e);
    // Redirect/normalização: o chamador pediu `qid` e é por `qid` que ele consulta o Map.
    for (const [qid, destino] of lote.alias) {
      const e = lote.entidades[destino];
      if (e) out.set(qid, e);
    }
    if (lote.avisoTruncamento == null && lote.ausentes.length === 0) return;

    const suspeitos = lote.ausentes.length > 0 ? lote.ausentes : chunk;
    onTruncation?.({
      qidsAusentes: suspeitos,
      aviso: lote.avisoTruncamento,
      profundidade,
      tamanhoLote: chunk.length,
    });
    // Fundo do poço: nem o lote mínimo veio confiável → FALHA DE LEITURA, e o erro sobe.
    if (chunk.length <= 1 || profundidade >= maxSplitDepth) {
      const detalhe =
        lote.ausentes.length > 0
          ? `não devolveu ${suspeitos.length} de ${chunk.length} ids pedidos ` +
            `(${suspeitos.slice(0, 5).join(',')}${suspeitos.length > 5 ? ',…' : ''})`
          : `marcou o payload como truncado mesmo com os ${chunk.length} ids pedidos presentes ` +
            '(dados da própria entidade podem estar cortados)';
      throw new WikidataBatchError(
        `wbgetentities ${detalhe}` +
          (lote.avisoTruncamento ? ` — ${lote.avisoTruncamento}` : '') +
          ' — tratado como falha de LEITURA, não como ausência de dado',
        suspeitos,
      );
    }
    // Backoff antes de repartir (a resposta anterior é descartada, não mesclada como completa).
    await sleep(minIntervalMs * 2 ** profundidade);
    const meio = Math.ceil(chunk.length / 2);
    await buscarLote(chunk.slice(0, meio), profundidade + 1);
    await sleep(minIntervalMs);
    await buscarLote(chunk.slice(meio), profundidade + 1);
  }

  for (let i = 0; i < unicos.length; i += batchSize) {
    await buscarLote(unicos.slice(i, i + batchSize), 0);
    if (i + batchSize < unicos.length) await sleep(minIntervalMs);
  }
  return out;
}

/** SPARQL com retry 3× (backoff 2/4s). */
export async function sparql(
  query: string,
  opts: {
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<unknown> {
  const {
    userAgent = MEDIA_USER_AGENT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
  } = opts;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
      });
      if (res.ok) return await res.json();
    } catch (err) {
      if (attempt === 2) throw err;
    }
    if (attempt < 2) await sleep(2000 * 2 ** attempt);
  }
  throw new Error('SPARQL falhou após retries');
}

/** Extrai bindings como pares qid→valor. */
export function parseBindings(json: unknown): Array<Record<string, string>> {
  const b =
    (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })?.results
      ?.bindings ?? [];
  return b.map((row) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) if (v?.value != null) o[k] = v.value;
    return o;
  });
}
