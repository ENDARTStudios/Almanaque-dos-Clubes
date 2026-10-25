/**
 * T579b — CLI DE AQUISIÇÃO DAS BANDEIRAS DO ACERVO (Wikidata P41 → Wikimedia Commons).
 *
 *   node dist/scripts/harvest-flags.js --from-json /tmp/countries.json --apply
 *   node dist/scripts/harvest-flags.js --apply                       # lê a tabela `countries`
 *   node dist/scripts/harvest-flags.js --iso2=BR,IT --apply          # um subconjunto
 *
 * Entrada canônica: a tabela `countries` do acervo (`iso2` + `qid`). O modo
 * `--from-json <arquivo>` existe para rodar SEM banco (o Postgres local não é alcançável —
 * ver skill `prod-railway`) e recebe a MESMA projeção: `[{iso2, qid, name}, …]`. Em
 * qualquer dos modos a lista vem do dado, nunca de uma lista escrita à mão neste arquivo.
 *
 * SEGUNDA FONTE, e é medição que a justifica: a tabela `countries` tem 168 linhas, mas o
 * acervo USA 220 códigos ISO2 em `Club.country`/`Player.country`/`Competition.country`/
 * `Stadium.country`. Os 52 códigos que aparecem em dado e não têm linha na tabela (NL, SS,
 * KH, LK, DO, PG…) teriam bandeira ausente numa listagem de clubes; para eles o QID é
 * resolvido pelo **P297** do Wikidata (a propriedade canônica do código ISO), sem lista
 * inventada, e o registro diz de onde veio (`qidFrom`: `countries` | `p297`). O que segue
 * faltando é linha na tabela — dívida de DADO declarada no relatório, não escondida aqui.
 *
 * O que o script produz, e é tudo versionado:
 *   - `apps/web/public/flags/<iso2 minusculo>.svg|.png` — o asset servido do NOSSO domínio;
 *   - `apps/api/src/scripts/data/flags-provenance.json` — procedência e licença POR ARQUIVO
 *     (arquivo do Commons, URL da página, licença, autor/licenciante, bytes, notas);
 *   - `apps/web/src/lib/flag-assets.generated.ts` — manifesto mínimo que o componente lê.
 *
 * Regras que a revisão cobra (mesma régua do coletor de imagens, T578):
 *  - licença LIVRE verificável POR ARQUIVO via `evaluateLicense` (política do repositório);
 *    arquivo sem licença legível é REJEITADO com motivo registrado, nunca "provavelmente PD";
 *  - `insignia`/`noresize`/`communist`/`terrorism`/`israelflag`/`trademarked` do Commons são
 *    NOTA DE USO, não copyright (lista fechada em `flags.connector`); token fora dela REJEITA;
 *  - nada é baixado de terceiro: o P41 diz qual arquivo, o Commons diz licença e URL, e o
 *    conteúdo é conferido (assinatura de SVG/PNG) antes de gravar;
 *  - o lote de `wbgetentities` é pequeno e tem watchdog de truncamento (`props=claims`);
 *    medido: 50 QIDs com labels truncam em 12 MB e o Wikidata devolve `success:1` FALTANDO
 *    itens — seis países apareceriam "sem P41" sem que nada gritasse;
 *  - ORÇAMENTO de peso é requisito: total do conjunto ≤ 2,5 MB. O que passa do teto por
 *    arquivo entra como MINIATURA renderizada pelo Commons (320 px) e o que ainda estourar o
 *    total é rebaixado para miniatura até caber — o relatório diz quais e por quê;
 *  - reexecução é NOOP: arquivo idêntico não é reescrito, JSON sai ordenado por ISO2 e
 *    asset órfão (país que saiu do acervo) é removido em modo `--apply`;
 *  - asset gravado BYTE-EXATO: `.gitattributes` marca `apps/web/public/flags/**` como `-text`
 *    porque o `* text=auto eol=lf` do repositório converteria os SVG com CRLF e o `bytes` do
 *    registro deixaria de bater com o arquivo versionado (o re-run num clone limpo reescreveria
 *    o mesmo asset sem que nada tivesse mudado).
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  fetchFlagClaims,
  fetchFlagImageInfo,
  flagExtension,
  localFlagName,
  pickFlagFile,
  resolveQidsByIso2,
  type FlagImageInfo,
} from '../modules/etl/connectors/flags.connector.js';
import { COMMONS_USER_AGENT } from '../modules/etl/connectors/commons-categories.connector.js';

const RAIZ = fileURLToPath(new URL('../../../..', import.meta.url));
const DIR_ASSETS = path.join(RAIZ, 'apps', 'web', 'public', 'flags');
const ARQ_PROVENIENCIA = path.join(
  RAIZ,
  'apps',
  'api',
  'src',
  'scripts',
  'data',
  'flags-provenance.json',
);
const ARQ_MANIFESTO = path.join(RAIZ, 'apps', 'web', 'src', 'lib', 'flag-assets.generated.ts');

/** Orçamento do conjunto inteiro — requisito do dono, não preferência. */
const LIMITE_TOTAL_BYTES = 2_500_000;
/** Acima disto o arquivo entra como MINIATURA (brasão complexo passa de centenas de KB). */
const LIMITE_ARQUIVO_BYTES = 60_000;
/** Largura da miniatura renderizada pelo Commons. */
const LARGURA_MINIATURA = 320;

interface Pais {
  iso2: string;
  /** `null` = código usado no acervo sem linha em `countries`; o QID vem do P297. */
  qid: string | null;
  name: string | null;
  /** De onde veio o código: linha canônica da tabela ou uso em dado de clube/jogador. */
  source: 'countries' | 'acervo_codes';
}

export interface FlagRecord {
  iso2: string;
  name: string | null;
  qid: string;
  /** `countries` = `Country.qid`; `p297` = item derivado do código ISO (`flags.connector`). */
  qidFrom: 'countries' | 'p297';
  /** Arquivo do Commons declarado no P41 (`Flag of Italy.svg`). */
  commonsFile: string;
  /** Id do statement do P41 (procedência fina). */
  claimId: string | null;
  rank: string;
  pageUrl: string | null;
  license: string | null;
  author: string | null;
  credit: string | null;
  usageTerms: string | null;
  /** Notas de uso do Commons (`insignia`, `noresize`, `communist`, `terrorism`): não são copyright. */
  usageRestrictions: string[];
  /** Asset local (`/flags/it.svg`). */
  src: string;
  /** true = baixamos a miniatura renderizada (320 px), não o original. */
  thumbnail: boolean;
  bytes: number;
  width: number;
  height: number;
  /** Motivo declarado quando o asset é miniatura (`tamanho` = passou o teto por arquivo). */
  thumbnailReason: string | null;
}

export interface FlagRejection {
  iso2: string;
  name: string | null;
  qid: string;
  commonsFile: string | null;
  pageUrl: string | null;
  license: string | null;
  author: string | null;
  reason: string;
}

export interface HarvestReport {
  paises: number;
  comQid: number;
  obtidas: FlagRecord[];
  miniaturas: string[];
  rejeitadas: FlagRejection[];
  semP41: Array<{ iso2: string; name: string | null; qid: string }>;
  /** Códigos usados no acervo que NÃO têm linha na tabela `countries` (QID pelo P297). */
  semLinhaEmCountries: string[];
  /** Código ISO2 sem item no Wikidata (nem pela tabela, nem pelo P297). */
  semQid: string[];
  bytesTotal: number;
  gravados: number;
  inalterados: number;
  orfaosRemovidos: string[];
}

function normalizarIso2(v: string): string {
  return v.trim().toUpperCase();
}

/**
 * Carrega a lista do banco: as linhas de `countries` (fonte canônica) MAIS os códigos que o
 * acervo usa em dado de clube/jogador/competição/estádio e que não têm linha na tabela.
 *
 * Medido: 220 códigos ISO2 em uso contra 168 linhas em `countries` — sem a segunda parte,
 * 52 países (NL, SS, KH, LK, DO…) apareceriam sem bandeira numa listagem de clubes. Os que
 * não vêm da tabela têm o QID resolvido pelo P297 e a origem fica registrada (`qidFrom`).
 */
async function paisesDoBanco(): Promise<Pais[]> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<
      Array<{ iso2: string; qid: string | null; name: string | null; source: string }>
    >`
      SELECT iso2, qid, name, 'countries' AS source FROM countries WHERE qid IS NOT NULL
      UNION
      SELECT DISTINCT upper(country), NULL, NULL, 'acervo_codes' FROM clubs
        WHERE country IS NOT NULL AND country <> ''
      UNION
      SELECT DISTINCT upper(country), NULL, NULL, 'acervo_codes' FROM players
        WHERE country IS NOT NULL AND country <> ''
      UNION
      SELECT DISTINCT upper(country), NULL, NULL, 'acervo_codes' FROM competitions
        WHERE country IS NOT NULL AND country <> ''
      UNION
      SELECT DISTINCT upper(country), NULL, NULL, 'acervo_codes' FROM stadiums
        WHERE country IS NOT NULL AND country <> ''
    `;
    return rows
      .filter((r) => /^[A-Z]{2}$/.test(r.iso2.trim().toUpperCase()))
      .map((r) => ({
        iso2: normalizarIso2(r.iso2),
        qid: r.qid,
        name: r.name,
        source: r.source === 'countries' ? ('countries' as const) : ('acervo_codes' as const),
      }));
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Carrega a projeção `[{iso2, qid?, name?}]` gravada fora do banco (modo offline declarado).
 * Aceita `qid` ausente: aí o QID é resolvido pelo P297, igual ao modo banco.
 */
async function paisesDoJson(arquivo: string): Promise<Pais[]> {
  const bruto = JSON.parse(await readFile(arquivo, 'utf8')) as Array<Partial<Pais>>;
  if (!Array.isArray(bruto)) throw new Error(`${arquivo}: esperado array [{iso2, qid, name}]`);
  return bruto
    .filter((p): p is Partial<Pais> & { iso2: string } => typeof p.iso2 === 'string')
    .map((p) => ({
      iso2: normalizarIso2(p.iso2),
      qid: typeof p.qid === 'string' && p.qid.length > 0 ? p.qid : null,
      name: typeof p.name === 'string' && p.name.length > 0 ? p.name : null,
      source: p.source === 'countries' ? ('countries' as const) : ('acervo_codes' as const),
    }));
}

/**
 * Baixa bytes de uma URL da Wikimedia com UA identificado, cadência entre downloads e
 * retry com backoff. Medido: `upload.wikimedia.org` devolve 429 quando o script pede 168
 * arquivos em rajada — a Wikimedia limita leitura por IP e o IP do Railway é compartilhado.
 */
const INTERVALO_DOWNLOAD_MS = 500;
let ultimoDownload = 0;

/** Hosts de onde este script pode baixar bytes (egress fixo — SSRF). */
const HOSTS_PERMITIDOS = new Set(['upload.wikimedia.org', 'commons.wikimedia.org']);

async function baixar(url: string, tentativas = 5): Promise<Buffer> {
  // Allowlist de egress: só Wikimedia, https. As URLs vêm do acervo/API do
  // Commons — se um dia vierem de outro lugar, o download falha aqui em vez
  // de apontar a rede do Operador para destino arbitrário.
  const destino = new URL(url);
  if (destino.protocol !== 'https:' || !HOSTS_PERMITIDOS.has(destino.hostname)) {
    throw new Error(`host fora da allowlist de download: ${destino.hostname}`);
  }
  let erro: unknown = null;
  for (let i = 0; i < tentativas; i++) {
    const espera = ultimoDownload + INTERVALO_DOWNLOAD_MS - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimoDownload = Date.now();
    try {
      const res = await fetch(destino, { headers: { 'user-agent': COMMONS_USER_AGENT } });
      if (res.status === 429 || res.status >= 500) {
        erro = new Error(`HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      erro = err;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw new Error(`download falhou: ${String(erro)}`);
}

/**
 * Confere o conteúdo baixado contra o tipo prometido. Um HTML de erro salvo com nome de
 * `.svg` é asset quebrado — e bandeira quebrada é pior que sigla em texto.
 */
export function conteudoValido(buf: Buffer, ext: 'svg' | 'png'): boolean {
  if (ext === 'png') {
    return (
      buf.length > 8 &&
      buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  const texto = buf.subarray(0, 4096).toString('utf8');
  return /<svg[\s>]/i.test(texto);
}

/** Lê os assets já publicados (para não reescrever o que é idêntico). */
async function assetsExistentes(): Promise<Map<string, Buffer>> {
  const out = new Map<string, Buffer>();
  let nomes: string[];
  try {
    nomes = await readdir(DIR_ASSETS);
  } catch {
    return out; // diretório ainda não existe: nada publicado, nada a comparar.
  }
  for (const nome of nomes) {
    if (!/\.(svg|png)$/i.test(nome)) continue;
    out.set(nome, await readFile(path.join(DIR_ASSETS, nome)));
  }
  return out;
}

/** Bytes do download escolhido para um arquivo aprovado (original ou miniatura do Commons). */
async function baixarAsset(
  info: FlagImageInfo,
  usarMiniatura: boolean,
  cache: Map<string, Buffer>,
): Promise<Buffer> {
  const url = usarMiniatura ? info.thumbUrl : info.url;
  if (!url) throw new Error(`sem URL (${usarMiniatura ? 'thumburl' : 'url'})`);
  const chave = `${usarMiniatura ? 'thumb' : 'orig'}:${url}`;
  const emCache = cache.get(chave);
  if (emCache) return emCache;
  const buf = await baixar(url);
  cache.set(chave, buf);
  return buf;
}

export interface HarvestOptions {
  apply: boolean;
  paises: Pais[];
  thumbWidth: number;
  limiteTotal: number;
  limiteArquivo: number;
  fetchImageInfo?: typeof fetchFlagImageInfo;
  fetchClaims?: typeof fetchFlagClaims;
  resolveQids?: typeof resolveQidsByIso2;
}

/** Núcleo do trabalho, com a rede injetável (os testes passam `fetch*` falsos). */
export async function harvestFlags(opts: HarvestOptions): Promise<{
  report: HarvestReport;
  assets: Map<string, { buf: Buffer; record: FlagRecord }>;
}> {
  // 1. Código sem QID na tabela `countries` tem o item resolvido pelo P297 do Wikidata —
  //    sem lista escrita à mão, e a origem vai no registro (`qidFrom`).
  const semLinha = opts.paises.filter((p) => p.qid === null).map((p) => p.iso2);
  const resolvidos =
    semLinha.length > 0
      ? await (opts.resolveQids ?? resolveQidsByIso2)(semLinha)
      : new Map<string, { qid: string; name: string | null }>();
  const paises: Pais[] = [...opts.paises]
    .map((p) => {
      const r = resolvidos.get(p.iso2);
      return r ? { ...p, qid: r.qid, name: p.name ?? r.name } : p;
    })
    .sort((a, b) => (a.iso2 < b.iso2 ? -1 : 1));
  const semQid = paises.filter((p) => p.qid === null).map((p) => p.iso2);

  const comQid = paises.filter((p): p is Pais & { qid: string } => p.qid !== null);
  const claimsPorQid = await (opts.fetchClaims ?? fetchFlagClaims)(comQid.map((p) => p.qid));
  const naoResolvidos = comQid.filter((p) => !claimsPorQid.has(p.qid));
  if (naoResolvidos.length > 0) {
    console.log(
      `[flags] aviso: ${naoResolvidos.length} QID sem resposta do Wikidata ` +
        `(${naoResolvidos.map((p) => `${p.iso2}:${p.qid}`).join(' ')}) — contados como sem P41`,
    );
  }
  const cache = new Map<string, Buffer>();

  const rejeitadas: FlagRejection[] = [];
  const semP41: HarvestReport['semP41'] = [];
  const candidatos: Array<{ pais: Pais & { qid: string }; info: FlagImageInfo }> = [];

  const escolhidos = new Map<string, { file: string; claimId: string | null; rank: string }>();
  for (const pais of comQid) {
    const escolha = pickFlagFile(claimsPorQid.get(pais.qid));
    if (!escolha) {
      semP41.push({ iso2: pais.iso2, name: pais.name, qid: pais.qid });
      continue;
    }
    escolhidos.set(pais.iso2, escolha);
  }

  const infos = await (opts.fetchImageInfo ?? fetchFlagImageInfo)(
    [...escolhidos.values()].map((e) => e.file),
    {
      thumbWidth: opts.thumbWidth,
    },
  );

  for (const pais of comQid) {
    const escolha = escolhidos.get(pais.iso2);
    if (!escolha) continue;
    const chave = `File:${escolha.file}`;
    const info = infos.get(chave) ?? infos.get(chave.replace(/_/g, ' '));
    if (!info) {
      rejeitadas.push({
        iso2: pais.iso2,
        name: pais.name,
        qid: pais.qid,
        commonsFile: escolha.file,
        pageUrl: null,
        license: null,
        author: null,
        reason: 'arquivo_inexistente_no_commons',
      });
      continue;
    }
    if (!info.license.accepted) {
      rejeitadas.push({
        iso2: pais.iso2,
        name: pais.name,
        qid: pais.qid,
        commonsFile: escolha.file,
        pageUrl: info.pageUrl,
        license: info.license.license,
        author: info.license.author,
        reason: info.license.reason ?? 'licenca_nao_aceita',
      });
      continue;
    }
    candidatos.push({ pais, info });
  }

  // Escolha do download: SVG entra como original enquanto couber no teto por arquivo; o
  // que estoura (brasão complexo) e todo raster entram como miniatura do Commons. A exceção
  // é `noresize` do Commons (predefinição "não redimensionar"): aí o original é preservado
  // mesmo grande — e só o ORÇAMENTO total pode rebaixá-lo, com o motivo registrado.
  const plano = candidatos.map(({ pais, info }) => {
    const ext = flagExtension(info.mime);
    const grande = (info.size ?? 0) > opts.limiteArquivo;
    const noresize = info.license.usageRestrictions.includes('noresize');
    const usarMiniatura = ext === 'png' || (grande && !noresize);
    return {
      pais,
      info,
      ext,
      usarMiniatura,
      thumbnailReason: usarMiniatura
        ? ext === 'png'
          ? 'raster_no_commons'
          : `tamanho:${info.size ?? '?'}B>${opts.limiteArquivo}B`
        : null,
    };
  });

  // ORÇAMENTO: baixa, mede e rebaixa para miniatura enquanto o total passar do teto.
  const assets = new Map<string, { buf: Buffer; record: FlagRecord }>();
  const registros: FlagRecord[] = [];

  const registrar = (
    item: (typeof plano)[number],
    buf: Buffer | null,
    thumbnail: boolean,
    reason: string | null,
  ): FlagRecord => {
    const ext: 'svg' | 'png' = thumbnail ? 'png' : item.ext;
    const registro = montarRegistro(item.pais, item.info, {
      escolha: escolhidos.get(item.pais.iso2)!,
      thumbnail,
      thumbnailReason: reason,
      // Em DRY-RUN o peso é o do ORIGINAL declarado pelo Commons; a miniatura ainda não foi
      // baixada e entra como 0 (chutar um número aqui seria inventar dado de auditoria).
      bytes: buf ? buf.length : item.usarMiniatura ? 0 : (item.info.size ?? 0),
      src: `/flags/${localFlagName(item.pais.iso2, ext)}`,
    });
    if (buf) assets.set(item.pais.iso2, { buf, record: registro });
    registros.push(registro);
    return registro;
  };

  for (const item of plano) {
    if (!opts.apply) {
      registrar(item, null, item.usarMiniatura, item.thumbnailReason);
      continue;
    }
    let buf = await baixarAsset(item.info, item.usarMiniatura, cache);
    let thumbnail = item.usarMiniatura;
    let reason = item.thumbnailReason;
    if (!conteudoValido(buf, thumbnail || item.ext === 'png' ? 'png' : 'svg')) {
      if (thumbnail)
        throw new Error(`${item.pais.iso2}: conteudo invalido em ${item.info.thumbUrl}`);
      // Original não é um SVG legível: tenta a miniatura renderizada antes de desistir.
      buf = await baixarAsset(item.info, true, cache);
      thumbnail = true;
      reason = 'original_ilegivel';
      if (!conteudoValido(buf, 'png')) {
        throw new Error(`${item.pais.iso2}: conteudo invalido em original e miniatura`);
      }
    }
    registrar(item, buf, thumbnail, reason);
  }

  if (opts.apply) {
    let total = registros.reduce((s, r) => s + r.bytes, 0);
    if (total > opts.limiteTotal) {
      const porTamanho = registros.filter((r) => !r.thumbnail).sort((a, b) => b.bytes - a.bytes);
      for (const registro of porTamanho) {
        if (total <= opts.limiteTotal) break;
        const item = plano.find((p) => p.pais.iso2 === registro.iso2)!;
        const buf = await baixarAsset(item.info, true, cache);
        if (!conteudoValido(buf, 'png')) continue;
        const asset = assets.get(registro.iso2)!;
        const novo = {
          ...asset.record,
          src: `/flags/${localFlagName(registro.iso2, 'png')}`,
          thumbnail: true,
          thumbnailReason: 'orcamento_total',
          bytes: buf.length,
        };
        assets.set(registro.iso2, { buf, record: novo });
        registros[registros.indexOf(registro)] = novo;
        total = registros.reduce((s, r) => s + r.bytes, 0);
      }
    }
  }

  const obtidas = registros.slice().sort((a, b) => (a.iso2 < b.iso2 ? -1 : 1));
  return {
    assets,
    report: {
      paises: paises.length,
      comQid: comQid.length,
      obtidas,
      miniaturas: obtidas.filter((f) => f.thumbnail).map((f) => f.iso2),
      rejeitadas,
      semP41,
      semLinhaEmCountries: semLinha.filter((iso2) => resolvidos.has(iso2)),
      semQid,
      bytesTotal: obtidas.reduce((s, f) => s + f.bytes, 0),
      gravados: 0,
      inalterados: 0,
      orfaosRemovidos: [],
    },
  };
}

function montarRegistro(
  pais: Pais & { qid: string },
  info: FlagImageInfo,
  extra: {
    escolha: { claimId: string | null; rank: string };
    src: string;
    thumbnail: boolean;
    bytes: number;
    thumbnailReason: string | null;
  },
): FlagRecord {
  return {
    iso2: pais.iso2,
    name: pais.name,
    qid: pais.qid,
    qidFrom: pais.source === 'countries' ? 'countries' : 'p297',
    commonsFile: info.title.replace(/^File:/, ''),
    claimId: extra.escolha.claimId,
    rank: extra.escolha.rank,
    pageUrl: info.pageUrl,
    license: info.license.license,
    author: info.license.author,
    credit: info.license.credit,
    usageTerms: info.license.usageTerms,
    usageRestrictions: info.license.usageRestrictions,
    src: extra.src,
    thumbnail: extra.thumbnail,
    bytes: extra.bytes,
    width: info.width ?? 0,
    height: info.height ?? 0,
    thumbnailReason: extra.thumbnailReason,
  };
}

/** Razão de aspecto a partir das dimensões do arquivo (default 3:2 se o Commons não informar). */
function razao(info: { width: number; height: number }): number {
  if (!info.width || !info.height) return 1.5;
  return Number((info.width / info.height).toFixed(4));
}

/** Manifesto do componente: só o que o runtime precisa (`src` + proporção). */
export function renderManifest(obtidas: FlagRecord[]): string {
  const linhas = obtidas
    .slice()
    .sort((a, b) => (a.iso2 < b.iso2 ? -1 : 1))
    .map((f) => `  ${f.iso2}: { src: '${f.src}', ratio: ${razao(f)} },`);
  return [
    '// GERADO POR apps/api/src/scripts/harvest-flags.ts — NÃO EDITE À MÃO.',
    '//',
    '// Bandeiras dos países do acervo, adquiridas do Wikimedia Commons pelo P41 do Wikidata',
    '// (ver `flags-provenance.json` para licença/autor/arquivo de cada uma). O componente',
    '// `CountryFlag` desenha a que existe AQUI; país sem entrada cai para a sigla em texto.',
    '//',
    '// `ratio` = largura/altura do arquivo, para o `<img>` não distorcer nem pular no layout.',
    '',
    'export interface FlagAsset {',
    '  /** Caminho no nosso domínio (`/flags/it.svg`). Nunca CDN de terceiro. */',
    '  src: string;',
    '  /** Largura ÷ altura do arquivo original. */',
    '  ratio: number;',
    '}',
    '',
    'export const FLAG_ASSETS: Record<string, FlagAsset> = {',
    ...linhas,
    '};',
    '',
  ].join('\n');
}

function imprimirRelatorio(rep: HarvestReport, apply: boolean, limiteTotal: number): void {
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  console.log(
    `[flags] ${apply ? 'APPLY' : 'DRY-RUN'} · paises=${rep.paises} · com-qid=${rep.comQid} · ` +
      `obtidas=${rep.obtidas.length} · miniaturas=${rep.miniaturas.length} · ` +
      `rejeitadas=${rep.rejeitadas.length} · sem-p41=${rep.semP41.length} · total=${kb(rep.bytesTotal)}`,
  );
  const porOrigem = { countries: 0, p297: 0 } as Record<string, number>;
  for (const f of rep.obtidas) porOrigem[f.qidFrom] = (porOrigem[f.qidFrom] ?? 0) + 1;
  console.log(
    `   qid: countries=${porOrigem.countries ?? 0} · p297=${porOrigem.p297 ?? 0}` +
      ` · codigos-usados-sem-linha-em-countries=${rep.semLinhaEmCountries.length}` +
      (rep.semQid.length > 0 ? ` · SEM-QID=${rep.semQid.join(',')}` : ''),
  );
  const motivos = new Map<string, number>();
  for (const r of rep.rejeitadas) {
    const chave = r.reason.split(':')[0] ?? r.reason;
    motivos.set(chave, (motivos.get(chave) ?? 0) + 1);
  }
  for (const [motivo, n] of [...motivos].sort((a, b) => b[1] - a[1])) {
    console.log(`   x ${motivo}: ${n}`);
    for (const r of rep.rejeitadas
      .filter((x) => (x.reason.split(':')[0] ?? '') === motivo)
      .slice(0, 3)) {
      console.log(
        `      - ${r.iso2} ${r.commonsFile ?? ''} :: ${r.reason} :: ${r.license ?? 'sem licenca'}`,
      );
    }
  }
  const notas = new Map<string, number>();
  for (const f of rep.obtidas)
    for (const nota of f.usageRestrictions) notas.set(nota, (notas.get(nota) ?? 0) + 1);
  if (notas.size > 0) {
    console.log(
      `   notas de uso (Commons, nao copyright): ${[...notas]
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `${n}=${c}`)
        .join(' ')}`,
    );
  }
  for (const p of rep.semP41.slice(0, 10))
    console.log(`   ? sem P41: ${p.iso2} (${p.name}) ${p.qid}`);
  if (rep.semP41.length > 10) console.log(`   ? … +${rep.semP41.length - 10} sem P41`);
  for (const f of rep.obtidas.filter((x) => x.thumbnail)) {
    console.log(`   miniatura ${f.iso2}: ${f.commonsFile} ${kb(f.bytes)} — ${f.thumbnailReason}`);
  }
  console.log(
    `   gravados=${rep.gravados} inalterados=${rep.inalterados}` +
      (rep.orfaosRemovidos.length > 0
        ? ` · orfaos removidos: ${rep.orfaosRemovidos.join(', ')}`
        : ''),
  );
  if (rep.bytesTotal > limiteTotal && apply) {
    console.log(`   !! ACIMA DO ORCAMENTO (${kb(rep.bytesTotal)} > ${kb(limiteTotal)})`);
  }
  if (!apply) {
    console.log(
      `   (DRY-RUN: o total acima soma os ORIGINAIS; as ${rep.miniaturas.length} miniaturas ` +
        'planejadas contam 0 até o --apply baixá-las — o peso real só sai no APPLY)',
    );
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      'from-json': { type: 'string' },
      iso2: { type: 'string' },
      'thumb-width': { type: 'string' },
      'limite-total': { type: 'string' },
      'limite-arquivo': { type: 'string' },
    },
  });

  const filtro = values.iso2
    ? new Set(
        values.iso2
          .split(',')
          .map(normalizarIso2)
          .filter((c) => c.length === 2),
      )
    : null;
  const todos = values['from-json']
    ? await paisesDoJson(values['from-json'])
    : await paisesDoBanco();
  const paises = filtro ? todos.filter((p) => filtro.has(p.iso2)) : todos;
  console.log(
    `[flags] fonte=${values['from-json'] ? `json:${values['from-json']}` : 'tabela countries'} ` +
      `paises=${paises.length}${filtro ? ` (filtro --iso2)` : ''}`,
  );

  const opts: HarvestOptions = {
    apply: values.apply,
    paises,
    thumbWidth: Number(values['thumb-width'] ?? LARGURA_MINIATURA),
    limiteTotal: Number(values['limite-total'] ?? LIMITE_TOTAL_BYTES),
    limiteArquivo: Number(values['limite-arquivo'] ?? LIMITE_ARQUIVO_BYTES),
  };
  const { report, assets } = await harvestFlags(opts);

  if (opts.apply) {
    mkdirSync(DIR_ASSETS, { recursive: true });
    const existentes = await assetsExistentes();
    const esperados = new Set<string>();
    for (const [iso2, asset] of assets) {
      const nome = localFlagName(iso2, asset.record.src.endsWith('.png') ? 'png' : 'svg');
      esperados.add(nome);
      const atual = existentes.get(nome);
      if (atual && atual.equals(asset.buf)) {
        report.inalterados += 1;
        continue;
      }
      await writeFile(path.join(DIR_ASSETS, nome), asset.buf);
      report.gravados += 1;
    }
    // Troca de extensão (brasão grande virou miniatura) e país que saiu do acervo: o
    // arquivo que não está na lista esperada é órfão e cai — sem sobra de asset velho.
    for (const nome of existentes.keys()) {
      if (esperados.has(nome)) continue;
      await rm(path.join(DIR_ASSETS, nome), { force: true });
      report.orfaosRemovidos.push(nome);
    }

    await writeFile(
      ARQ_PROVENIENCIA,
      `${JSON.stringify(
        {
          nota:
            'Procedencia e licenca POR ARQUIVO das bandeiras do acervo. Fonte: P41 do Wikidata + API do Commons. ' +
            'Gerado por apps/api/src/scripts/harvest-flags.ts — nao editar a mao.',
          orcamentoBytes: opts.limiteTotal,
          larguraMiniatura: opts.thumbWidth,
          limiteArquivoBytes: opts.limiteArquivo,
          totalBytes: report.bytesTotal,
          bandeiras: report.obtidas,
          rejeitadas: report.rejeitadas,
          semP41: report.semP41,
          /**
           * Códigos usados em `Club.country`/`Player.country`/`Competition.country`/
           * `Stadium.country` sem linha na tabela `countries`: a bandeira veio com QID
           * derivado do P297 do Wikidata (registrado em `qidFrom`). Conserto de DADO
           * recomendado (semear as linhas), não silenciado aqui.
           */
          codigosSemLinhaEmCountries: report.semLinhaEmCountries,
          semQid: report.semQid,
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(ARQ_MANIFESTO, renderManifest(report.obtidas));
  }

  imprimirRelatorio(report, opts.apply, opts.limiteTotal);
}

if (process.argv[1]?.includes('harvest-flags')) {
  main().catch((err) => {
    console.error(`[flags] FALHOU: ${String(err)}`);
    process.exitCode = 1;
  });
}
