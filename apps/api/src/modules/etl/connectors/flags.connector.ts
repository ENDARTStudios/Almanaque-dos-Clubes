/**
 * T579b — BANDEIRA DE PAÍS como ASSET PRÓPRIO (SVG do Wikimedia Commons).
 *
 * Por que este módulo existe: a bandeira do acervo nasceu EMOJI (derivado do ISO2 em
 * `apps/web/src/lib/country-flag.ts`, PR #681). Medido: em Windows — o sistema do dono e
 * do público doméstico — o glifo de bandeira NÃO existe e o usuário vê as duas letras
 * regionais ("IT"). Emoji de bandeira só é confiável no macOS/iOS. A decisão do dono é
 * que a bandeira seja SEMPRE visível, e isso só se garante com o asset servido do nosso
 * domínio.
 *
 * A FONTE é só Wikimedia: o P41 do Wikidata (item "bandeira do país") diz QUAL arquivo do
 * Commons é a bandeira, e o arquivo é julgado e baixado pela API do Commons.
 *
 * A POLÍTICA DE LICENÇA não é nova: reusa `evaluateLicense` (`commons-categories.connector`),
 * a MESMA função do coletor de imagens — licença LIVRE verificável por arquivo (CC0, CC BY,
 * CC BY-SA, domínio público `PD-*`, GFDL), com o motivo da rejeição registrado e a ausência
 * de licença tratada como REJEIÇÃO (ausência não é licença livre).
 *
 * A ÚNICA diferença em relação ao coletor de imagens, e é ela que justifica este wrapper:
 * o campo `Restrictions` do Commons mistura DUAS coisas — restrição de COPYRIGHT
 * (`trademarked`, `personality rights`) e nota de USO/RENDER (`insignia`, `noresize`, as
 * predefinições "esta imagem mostra um símbolo oficial" e "não redimensionar"). Medido:
 * quase toda bandeira nacional carrega `insignia` (`Flag of Brazil.svg`, `Flag of Mexico.svg`,
 * `Flag of Switzerland.svg`), e `insignia|noresize` aparece junto (`Flag of Palestine.svg`).
 * Rejeitar por isso descartaria a bandeira do Brasil por causa de uma nota de uso — e
 * `evaluateLicense` rejeita QUALQUER `Restrictions` não vazio (regra correta para o acervo
 * de fotos). `decideFlagLicense` separa os tokens: os da lista fechada `RESTRICOES_DE_USO`
 * viram NOTA no registro de proveniência; qualquer token FORA dela continua sendo restrição
 * e REJEITA o arquivo.
 *
 * PURAS de propósito (exceto o `fetch` explícito em `fetchFlagImageInfo`): a rede é injetável
 * e os testes não tocam o Commons.
 */
import { z } from 'zod';
import {
  MEDIA_USER_AGENT,
  WIKIDATA_API,
  parseBindings,
  sparql,
  type ClaimSnak,
} from './wikidata-media.connector.js';
import {
  cleanMetadataValue,
  evaluateLicense,
  IMAGEINFO_BATCH,
  commonsApi,
  type CommonsFetchOptions,
  type MediaLicenseDecision,
} from './commons-categories.connector.js';

/**
 * Tokens de `Restrictions` do Commons que NÃO são restrição de copyright: são predefinições
 * de USO/RENDER do símbolo — o Commons as documenta como avisos INDEPENDENTES do copyright.
 * LISTA FECHADA e medida nos 168 países do acervo, sempre ao lado de
 * `LicenseShortName: Public domain`:
 *
 *  - `insignia` — símbolo oficial, quase toda bandeira nacional;
 *  - `noresize` — não redimensionar (`Flag of Palestine.svg`);
 *  - `communist`, `terrorism` — lei de exibição local (`Flag of Angola.svg`,
 *    `Flag of the Taliban.svg`);
 *  - `israelflag` — aviso específico do Commons (`Flag of Israel.svg`);
 *  - `trademarked` — proteção de marca do símbolo (`Flag of Canada (Pantone).svg`).
 *
 * A lista é fechada de propósito: token NOVO (personality rights, "sem licença"…) não é
 * reconhecido, vira restrição e o arquivo é REJEITADO. Na dúvida, rejeita.
 */
const RESTRICOES_DE_USO = new Set([
  'insignia',
  'noresize',
  'communist',
  'terrorism',
  'israelflag',
  'trademarked',
]);
/** Separador do campo `Restrictions` no Commons (medido: `insignia|noresize`). */
const SEPARADOR_RESTRICOES = /\s*[|,;]\s*/;

interface ClaimComQualificador extends ClaimSnak {
  /** Id do statement (`q38$574446A6-…`) — procedência fina do P41 escolhido. */
  id?: string;
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
}

function dataDoQualificador(claim: ClaimComQualificador, pid: string): string | null {
  const v = claim.qualifiers?.[pid]?.[0]?.datavalue?.value;
  if (v == null || typeof v !== 'object') return null;
  const time = (v as { time?: unknown }).time;
  return typeof time === 'string' ? time.replace(/^\+/, '').slice(0, 10) : null;
}

export interface ChosenFlag {
  /** Nome do arquivo no Commons, sem o prefixo `File:` (`Flag of Italy.svg`). */
  file: string;
  /** Id do statement do P41 em que o nome foi achado (null quando o mainsnak não traz id). */
  claimId: string | null;
  rank: string;
}

/**
 * Qual arquivo do Commons é a BANDEIRA do país, segundo o P41 do Wikidata, e qual é o
 * statement que o diz.
 *
 * O P41 de um país tem HISTÓRICO: `Flag of Mexico.svg` (preferred) convive com sete versões
 * antigas da mesma bandeira, e `Flag of Spain.svg` com nove. Regra de escolha, nesta ordem:
 *
 *  1. só o que tem `rank=preferred` — é o rank que declara "esta é a atual"; se não houver
 *     nenhum preferred, cai para o rank normal;
 *  2. entre os do passo 1, descarta o que tem P582 (fim) — bandeira que acabou não é a
 *     bandeira de hoje;
 *  3. entre os que sobraram, o P580 (início) mais RECENTE — a bandeira em vigor;
 *  4. empate sem P580: mantém a ordem da API (estável para a mesma revisão do item), sempre
 *     a MESMA resposta para o mesmo dado — sem sorteio.
 */
export function pickFlagFile(claims: ClaimSnak[] | null | undefined): ChosenFlag | null {
  const candidatos = (claims ?? [])
    .map((c) => c as ClaimComQualificador)
    .map((c) => {
      const valor = c.mainsnak?.datavalue?.value;
      if (typeof valor !== 'string' || valor.trim().length === 0) return null;
      return {
        file: valor.trim(),
        claimId: typeof c.id === 'string' ? c.id : null,
        rank: c.rank ?? 'normal',
        inicio: dataDoQualificador(c, 'P580'),
        fim: dataDoQualificador(c, 'P582'),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (candidatos.length === 0) return null;

  const vigentes = candidatos.filter((c) => c.fim === null);
  const preferidos = vigentes.filter((c) => c.rank === 'preferred');
  const pool = preferidos.length > 0 ? preferidos : vigentes.length > 0 ? vigentes : candidatos;
  const comInicio = pool
    .filter((c) => c.inicio !== null)
    .sort((a, b) => (a.inicio! < b.inicio! ? 1 : a.inicio! > b.inicio! ? -1 : 0));
  const escolhido = comInicio[0] ?? pool[0];
  return { file: escolhido.file, claimId: escolhido.claimId, rank: escolhido.rank };
}

export interface FlagRestrictionNotes {
  /** Notas de USO do Commons (`insignia`, `noresize`, `communist`, `terrorism`). */
  usage: string[];
  /** Restrições que SOBRARAM (copyright/trademark/personality): qualquer uma rejeita. */
  restante: string | null;
}

/**
 * Separa o campo `Restrictions` em notas de uso e restrições de verdade. PURA.
 *
 * Sem token nenhum devolve tudo vazio — e aí o campo segue intacto para `evaluateLicense`,
 * que já sabe rejeitar restrição não vazia.
 */
export function splitFlagRestrictions(raw: string | null | undefined): FlagRestrictionNotes {
  const valor = cleanMetadataValue(raw);
  if (!valor) return { usage: [], restante: null };
  const tokens = valor.split(SEPARADOR_RESTRICOES).filter((t) => t.length > 0);
  const uso: string[] = [];
  const restante: string[] = [];
  for (const token of tokens) {
    if (RESTRICOES_DE_USO.has(token.toLowerCase())) {
      const normalizado = token.toLowerCase();
      if (!uso.includes(normalizado)) uso.push(normalizado);
    } else {
      restante.push(token);
    }
  }
  return { usage: uso, restante: restante.length > 0 ? restante.join(', ') : null };
}

export interface FlagLicenseDecision extends MediaLicenseDecision {
  /** Notas de uso do Commons (ex.: `insignia`) — informativas, não são copyright. */
  usageRestrictions: string[];
}

/**
 * Decisão de licença de UMA bandeira: as notas de uso saem do campo `Restrictions` e a
 * decisão de copyright fica com `evaluateLicense` (uma política só no repositório).
 */
export function decideFlagLicense(
  extmetadata: Record<string, { value?: string }> | null | undefined,
): FlagLicenseDecision {
  const bruto = extmetadata?.['Restrictions']?.value;
  const notas = splitFlagRestrictions(bruto);
  const copia: Record<string, { value?: string }> = { ...(extmetadata ?? {}) };

  if (notas.restante === null) {
    // Só `insignia`/`noresize` (ou nada): não há restrição de copyright a declarar.
    delete copia['Restrictions'];
  } else {
    // Sobrou restrição de verdade: ela fica no campo e `evaluateLicense` rejeita.
    copia['Restrictions'] = { value: notas.restante };
  }

  const decisao = evaluateLicense(copia);
  return { ...decisao, usageRestrictions: notas.usage };
}

/** Título canônico no Commons (`Flag of Italy.svg` → `File:Flag of Italy.svg`). */
export function flagFileTitle(file: string): string {
  const nome = file.trim().replace(/^File\s*:\s*/i, '');
  return `File:${nome}`;
}

/** Nome do asset no nosso domínio: ISO2 em MINÚSCULAS + extensão (`it.svg`, `us.png`). */
export function localFlagName(iso2: string, ext: string): string {
  return `${iso2.trim().toLowerCase()}.${ext}`;
}

/** Extensão do asset a partir do mime do Commons. Raster entra como `png` (o que baixamos é o thumb). */
export function flagExtension(mime: string | null): 'svg' | 'png' {
  return mime === 'image/svg+xml' ? 'svg' : 'png';
}

export interface FlagImageInfo {
  title: string;
  /** URL do ORIGINAL (`upload.wikimedia.org`). */
  url: string | null;
  /** URL da MINIATURA RENDERIZADA pelo Commons (`thumb.wikimedia.org`). */
  thumbUrl: string | null;
  thumbWidth: number | null;
  thumbHeight: number | null;
  pageUrl: string | null;
  mime: string | null;
  /** Bytes do ORIGINAL. */
  size: number | null;
  width: number | null;
  height: number | null;
  license: FlagLicenseDecision;
}

/**
 * Forma do `prop=imageinfo` que este módulo consome. `formatversion=2` devolve `pages`
 * como ARRAY; tudo é opcional porque o Commons omite campo que não tem — e o que falta
 * vira `null` no registro, nunca zero inventado.
 *
 * `value` aceita QUALQUER primitivo de propósito: o Commons mistura os tipos no MESMO
 * `extmetadata` (medido: `CommonsMetadataExtension.value` = `1.2`, número). Exigir string
 * ali faz o `safeParse` do lote inteiro falhar — e um lote que falha em silêncio devolve
 * "nenhum arquivo", que é o pior resultado possível para quem audita licença. Só o que é
 * string é lido; o resto é ignorado.
 */
const flagImageInfoShape = z
  .object({
    query: z
      .object({
        pages: z
          .array(
            z
              .object({
                title: z.string(),
                missing: z.boolean().optional(),
                imageinfo: z
                  .array(
                    z
                      .object({
                        url: z.string().optional(),
                        thumburl: z.string().optional(),
                        thumbwidth: z.number().optional(),
                        thumbheight: z.number().optional(),
                        descriptionurl: z.string().optional(),
                        mime: z.string().optional(),
                        size: z.number().optional(),
                        width: z.number().optional(),
                        height: z.number().optional(),
                        extmetadata: z
                          .record(
                            z.string(),
                            z.object({
                              value: z.union([z.string(), z.number(), z.boolean()]).optional(),
                            }),
                          )
                          .optional(),
                      })
                      .passthrough(),
                  )
                  .optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

/** `extmetadata` só com os campos de texto — o que não for string não é licença legível. */
function apenasTexto(
  em: Record<string, { value?: string | number | boolean }> | undefined,
): Record<string, { value?: string }> {
  const out: Record<string, { value?: string }> = {};
  for (const [campo, valor] of Object.entries(em ?? {})) {
    if (typeof valor?.value === 'string') out[campo] = { value: valor.value };
  }
  return out;
}

/** Interpreta a resposta de `prop=imageinfo` — sem rede, para os testes. */
export function parseFlagImageInfo(payload: unknown): Map<string, FlagImageInfo> {
  const parsed = flagImageInfoShape.safeParse(payload);
  const out = new Map<string, FlagImageInfo>();
  if (!parsed.success) return out;
  for (const pagina of parsed.data.query?.pages ?? []) {
    const ii = pagina.imageinfo?.[0];
    if (pagina.missing || !ii) continue;
    out.set(pagina.title, {
      title: pagina.title,
      url: ii.url ?? null,
      thumbUrl: ii.thumburl ?? null,
      thumbWidth: ii.thumbwidth ?? null,
      thumbHeight: ii.thumbheight ?? null,
      pageUrl: ii.descriptionurl ?? null,
      mime: ii.mime ?? null,
      size: ii.size ?? null,
      width: ii.width ?? null,
      height: ii.height ?? null,
      license: decideFlagLicense(apenasTexto(ii.extmetadata)),
    });
  }
  return out;
}

/**
 * Licença + URL + miniatura renderizada pelo próprio Commons, em lotes de 50 (`titles=`
 * limita a 50). `iiurlwidth` é o que devolve `thumburl`: a miniatura é RENDERIZADA pelo
 * Commons, nós só guardamos o PNG — nenhuma CDN de terceiro serve assets em runtime.
 */ export async function fetchFlagImageInfo(
  files: string[],
  opts: CommonsFetchOptions & { thumbWidth?: number } = {},
): Promise<Map<string, FlagImageInfo>> {
  const { thumbWidth = 320, ...fetchOpts } = opts;
  const out = new Map<string, FlagImageInfo>();
  const unicos = [...new Set(files)];
  for (let i = 0; i < unicos.length; i += IMAGEINFO_BATCH) {
    const lote = unicos.slice(i, i + IMAGEINFO_BATCH);
    const payload = (await commonsApi(
      {
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'extmetadata|url|mime|size',
        iiurlwidth: String(thumbWidth),
        titles: lote.map(flagFileTitle).join('|'),
      },
      fetchOpts,
    )) as unknown;
    for (const [title, info] of parseFlagImageInfo(payload)) out.set(title, info);
  }
  return out;
}

// ---------------------------------------------------------------------------
// P41 do Wikidata (wbgetentities, só `claims`)
// ---------------------------------------------------------------------------

/**
 * Lote de `wbgetentities`: lê SÓ o `P41` de cada QID.
 *
 * Duas decisões medidas, e as duas são de confiabilidade:
 *
 *  1. `props=claims` (NUNCA `labels|claims`): a resposta com labels de 50 países passa de
 *     12 MB e o Wikidata a **trunca em silêncio** — a resposta vem com `success:1` e sem os
 *     últimos itens. Medido no lote AD…MD: seis países (DZ, EC, EE, EG, ES, ET) voltaram
 *     ausentes e o resultado seria "seis países sem P41", que é FALSO (todos têm).
 *  2. watchdog de truncamento: se `warnings.result` disser "truncated", o lote é repetido
 *     pela METADE até 1 id — e aí o erro é explícito. Lote pequeno + propriedade única
 *     mantém a resposta na casa dos KB.
 */
const claimsBatchShape = z
  .object({
    warnings: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    entities: z
      .record(
        z.string(),
        z
          .object({
            claims: z.record(z.string(), z.array(z.custom<ClaimSnak>()).optional()).optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/** O aviso de truncamento do MediaWiki, se veio. */
export function respostaTruncada(warnings: unknown): boolean {
  const texto = (warnings as { result?: Record<string, string> } | undefined)?.result?.['*'];
  return typeof texto === 'string' && /truncat/i.test(texto);
}

export interface FlagClaimsOptions {
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
  /** Ids por requisição. Default 20: acima disso a resposta cresce e o watchdog entra. */
  batchSize?: number;
}

/** `Map<qid, claims do P41>` — QID ausente do mapa não tem P41 (ou não existe mais). */
export async function fetchFlagClaims(
  qids: string[],
  opts: FlagClaimsOptions = {},
): Promise<Map<string, ClaimSnak[]>> {
  const {
    fetchImpl = globalThis.fetch,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = 500,
    batchSize = 20,
  } = opts;
  const unicos = [...new Set(qids)];
  const out = new Map<string, ClaimSnak[]>();
  let i = 0;
  let tamanho = Math.max(1, batchSize);
  while (i < unicos.length) {
    const lote = unicos.slice(i, i + tamanho);
    const url = `${WIKIDATA_API}?action=wbgetentities&ids=${lote.join('|')}&format=json&props=claims`;
    const res = await fetchImpl(url, { headers: { 'user-agent': MEDIA_USER_AGENT } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const parsed = claimsBatchShape.safeParse(await res.json());
    if (!parsed.success) throw new Error('wbgetentities payload inválido');
    if (respostaTruncada(parsed.data.warnings)) {
      if (tamanho <= 1) throw new Error('wbgetentities truncado mesmo com lote de 1 id');
      tamanho = Math.max(1, Math.floor(tamanho / 2));
      continue; // repete o MESMO lote, agora menor
    }
    for (const [qid, entity] of Object.entries(parsed.data.entities ?? {})) {
      out.set(qid, entity.claims?.['P41'] ?? []);
    }
    i += lote.length;
    if (i < unicos.length) await sleep(minIntervalMs);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ISO2 → QID pelo P297 (para código usado no acervo que não tem linha em `countries`)
// ---------------------------------------------------------------------------

/**
 * Resolve o item do Wikidata de cada código ISO2 pelo **P297** ("ISO 3166-1 alpha-2 code") —
 * a propriedade canônica do próprio dado, não uma lista escrita à mão.
 *
 * Por que isto existe: medido no acervo, `Club.country`/`Player.country`/`Competition.country`/
 * `Stadium.country` usam 220 códigos ISO2 distintos, e a tabela `countries` tem só 168 — 52
 * países aparecem em dado de clube sem linha na tabela (NL, SS, KH, LK, DO, PG…). Sem esta
 * passagem, esses 52 cairiam para a sigla em texto numa listagem de clubes. O registro de
 * proveniência diz de onde veio o QID (`qidFrom`), então a origem não se confunde com a
 * tabela canônica.
 *
 * `ORDER BY ?iso2 ?country` + primeiro vence: se algum dia dois itens disputarem o mesmo
 * código, o resultado continua DETERMINÍSTICO (e o chamador conta os empates no relatório).
 */
export async function resolveQidsByIso2(
  codes: string[],
  opts: { fetchImpl?: typeof globalThis.fetch; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Map<string, { qid: string; name: string | null }>> {
  const unicos = [...new Set(codes.map((c) => c.trim().toUpperCase()))].filter((c) =>
    /^[A-Z]{2}$/.test(c),
  );
  const out = new Map<string, { qid: string; name: string | null }>();
  if (unicos.length === 0) return out;

  const query = `SELECT ?iso2 ?country ?countryLabel WHERE {
  VALUES ?iso2 { ${unicos.map((c) => `"${c}"`).join(' ')} }
  ?country wdt:P297 ?iso2 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
} ORDER BY ?iso2 ?country`;

  const json = await sparql(query, { fetchImpl: opts.fetchImpl, sleep: opts.sleep });
  for (const linha of parseBindings(json)) {
    const iso2 = linha.iso2?.trim().toUpperCase();
    const qid = linha.country?.split('/').pop();
    if (!iso2 || !qid || !/^Q\d+$/.test(qid)) continue;
    if (out.has(iso2)) continue; // primeiro vence (ver doc acima)
    out.set(iso2, { qid, name: linha.countryLabel?.trim() || null });
  }
  return out;
}
