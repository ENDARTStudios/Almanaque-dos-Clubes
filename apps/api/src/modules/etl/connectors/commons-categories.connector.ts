/**
 * T578 — COLETOR DE IMAGENS do Wikimedia Commons por CATEGORIA.
 *
 * Por que existe: o acervo usa só duas fontes de imagem — o P18 do Wikidata (foto
 * declarada) e o infobox do artigo. As imagens de fato vivem nas CATEGORIAS do
 * Commons, e é exatamente esse conjunto que ficava de fora.
 *
 * Fonte: SOMENTE a API oficial (`commons.wikimedia.org/w/api.php`). Nunca raspagem de
 * HTML de terceiro — a API devolve a MESMA informação com contrato estável e o
 * `extmetadata` com licença/autor por arquivo.
 *
 * A POLÍTICA DE LICENÇA é uma função PURA (`evaluateLicense`): testável sem rede e
 * com um só lugar para endurecer/afrouxar. Regra do acervo: só entra licença LIVRE
 * verificável (CC0, CC BY, CC BY-SA, domínio público `PD-*`, GFDL) e SEM restrição
 * declarada; na dúvida, REJEITA e registra o motivo — nunca grava imagem duvidosa.
 */
import { z } from 'zod';

/** Endpoint oficial. Nada além dele é chamado por este módulo. */
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/**
 * User-Agent que identifica o projeto com contato — exigido pela política de UA da
 * Wikimedia (UA genérico/ausente recebe 403/429). O contato é o do próprio repositório.
 */
export const COMMONS_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (commons categories harvest; +https://github.com/ENDARTStudios/Almanaque-dos-Clubes; contato: endart.studios@gmail.com)';

/**
 * Cadência entre REQUISIÇÕES à API do Commons. O IP do Railway é compartilhado e a
 * Wikimedia limita leitura por IP: 900 ms é o mesmo valor já validado no job de
 * infobox (T553) para não tomar 429.
 */
export const COMMONS_MIN_INTERVAL_MS = 900;

/** Máximo de títulos por chamada de `imageinfo` (limite do `titles=`). */
export const IMAGEINFO_BATCH = 50;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface CommonsFetchOptions {
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
  /** Tentativas TOTAIS (a primeira inclusive). Default 4. */
  maxAttempts?: number;
}

/** Instante da última requisição — a cadência é global ao processo. */
let ultimoFetchCommons = 0;

/** Só para os testes: zera o relógio da cadência. */
export function resetCommonsCadence(): void {
  ultimoFetchCommons = 0;
}

/**
 * Uma chamada à API do Commons, com cadência global e backoff exponencial em 429/5xx.
 *
 * Em falha EXAURIDA lança — e quem chama NÃO pode carimbar "sem fonte": falha de
 * leitura não é prova de ausência (a lição do T551 no infobox). O alvo volta na
 * próxima volta.
 */
export async function commonsApi(
  params: Record<string, string>,
  opts: CommonsFetchOptions = {},
): Promise<unknown> {
  const {
    fetchImpl = globalThis.fetch,
    sleep = defaultSleep,
    minIntervalMs = COMMONS_MIN_INTERVAL_MS,
    maxAttempts = 4,
  } = opts;
  const url = `${COMMONS_API}?${new URLSearchParams({
    ...params,
    format: 'json',
    formatversion: '2',
  })}`;
  let ultimoErro: unknown = null;
  for (let tentativa = 0; tentativa < maxAttempts; tentativa++) {
    const espera = ultimoFetchCommons + minIntervalMs - Date.now();
    if (espera > 0) await sleep(espera);
    ultimoFetchCommons = Date.now();
    try {
      const res = await fetchImpl(url, { headers: { 'user-agent': COMMONS_USER_AGENT } });
      if (res.status === 429 || res.status >= 500) {
        ultimoErro = new Error(`Commons HTTP ${res.status}`);
        if (tentativa < maxAttempts - 1) await sleep(2 ** tentativa * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      ultimoErro = err;
      if (tentativa < maxAttempts - 1) await sleep(2 ** tentativa * 1000);
    }
  }
  throw new Error(`Commons API falhou apos ${maxAttempts} tentativas: ${String(ultimoErro)}`);
}

// ---------------------------------------------------------------------------
// Leitura de categorias (list=categorymembers)
// ---------------------------------------------------------------------------

const categoryMembersShape = z
  .object({
    query: z
      .object({
        categorymembers: z.array(z.object({ title: z.string() })).optional(),
      })
      .optional(),
    continue: z.object({ cmcontinue: z.string().optional() }).optional(),
  })
  .passthrough();

export interface CategoryMembers {
  /** Títulos no formato `File:...` (quando `type=file`). */
  files: string[];
  /** Títulos no formato `Category:...` (quando `type=subcat`). */
  subcategories: string[];
  /** Token de continuação (`cmcontinue`), ou null quando a categoria terminou. */
  next: string | null;
}

/** Normaliza um nome de categoria para o título canônico `Category:Nome`. */
export function toCategoryTitle(name: string): string {
  const limpo = name.trim();
  return /^Category\s*:/i.test(limpo) ? limpo : `Category:${limpo}`;
}

/** Uma página de membros de uma categoria (`cmtype=file` ou `cmtype=subcat`). */
export async function listCategoryMembers(
  category: string,
  type: 'file' | 'subcat',
  opts: CommonsFetchOptions & { cmcontinue?: string } = {},
): Promise<CategoryMembers> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: toCategoryTitle(category),
    cmtype: type,
    cmlimit: '500',
  };
  if (opts.cmcontinue) params.cmcontinue = opts.cmcontinue;
  const parsed = categoryMembersShape.safeParse(await commonsApi(params, opts));
  const members = parsed.success ? (parsed.data.query?.categorymembers ?? []) : [];
  const titles = members.map((m) => m.title);
  return {
    files: type === 'file' ? titles : [],
    subcategories: type === 'subcat' ? titles : [],
    next: parsed.success ? (parsed.data.continue?.cmcontinue ?? null) : null,
  };
}

export interface CollectCategoryOptions extends CommonsFetchOptions {
  /** Níveis de SUBCATEGORIA a descer (0 = só a categoria dada). Default 1. */
  depth?: number;
  /** Teto de arquivos coletados (o alvo só precisa de um bom). Default 100. */
  maxFiles?: number;
  /** Teto de categorias visitadas — trava de segurança contra árvore gigante. Default 25. */
  maxCategories?: number;
}

export interface CollectedFiles {
  files: string[];
  categoriesVisited: number;
  /** true quando um teto (arquivos/categorias) interrompeu a varredura. */
  truncated: boolean;
}

/**
 * Varredura em LARGURA da categoria e das suas subcategorias até `depth`, juntando os
 * arquivos. Deduplica por título e respeita os tetos — uma categoria pode ser enorme
 * ("Category:Pelé" tem poucos itens, "Category:Brazil" não; o teto evita caminhar o
 * Commons inteiro por causa de um clube).
 */
export async function collectCategoryFiles(
  category: string,
  opts: CollectCategoryOptions = {},
): Promise<CollectedFiles> {
  const { depth = 1, maxFiles = 100, maxCategories = 25 } = opts;
  const files = new Set<string>();
  const visitadas = new Set<string>();
  let truncated = false;
  let fila: Array<{ titulo: string; nivel: number }> = [
    { titulo: toCategoryTitle(category), nivel: 0 },
  ];

  while (fila.length > 0) {
    if (visitadas.size >= maxCategories) {
      truncated = true;
      break;
    }
    const atual = fila.shift()!;
    if (visitadas.has(atual.titulo)) continue;
    visitadas.add(atual.titulo);

    // Arquivos da categoria (paginando até o teto).
    let token: string | null = null;
    do {
      const pagina = await listCategoryMembers(atual.titulo, 'file', {
        ...opts,
        ...(token ? { cmcontinue: token } : {}),
      });
      for (const f of pagina.files) {
        if (files.size >= maxFiles) {
          truncated = true;
          break;
        }
        files.add(f);
      }
      token = pagina.next;
    } while (token && files.size < maxFiles);

    // Subcategorias (só até a profundidade pedida).
    if (atual.nivel < depth) {
      let token: string | null = null;
      do {
        const pagina = await listCategoryMembers(atual.titulo, 'subcat', {
          ...opts,
          ...(token ? { cmcontinue: token } : {}),
        });
        for (const s of pagina.subcategories) {
          fila.push({ titulo: s, nivel: atual.nivel + 1 });
        }
        token = pagina.next;
      } while (token);
    }
  }
  return { files: [...files], categoriesVisited: visitadas.size, truncated };
}

// ---------------------------------------------------------------------------
// Licença e crédito (prop=imageinfo&iiprop=extmetadata)
// ---------------------------------------------------------------------------

/** Remove HTML/entidades do `extmetadata` (o Commons devolve `<a href=…>` no Artist). */
export function cleanMetadataValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const semTags = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return semTags.length > 0 ? semTags : null;
}

/** Licenças LIVRES aceitas. Cobre `CC0`, `CC BY`, `CC BY-SA`, PD/domínio público e GFDL. */
const LICENCA_LIVRE =
  /\bCC0\b|\bCC[ -]?BY(?:[ -]?SA)?(?:\b|[ -]?\d)|\bpublic domain\b|\bPD(?:-|\b)|\bGFDL\b|dom[ií]nio p[úu]blico/i;

/** Marcadores de licença RESTRITA — rejeição imediata, mesmo junto de um CC. */
const LICENCA_RESTRITA =
  /fair[ -]?use|non[ -]?free|non[ -]?commercial|all rights reserved|sem licen[çc]a|no license/i;

export interface MediaLicenseDecision {
  accepted: boolean;
  /** Rótulo curto da licença (`LicenseShortName` → `License` → `UsageTerms`). */
  license: string | null;
  author: string | null;
  credit: string | null;
  usageTerms: string | null;
  restrictions: string | null;
  /** Motivo da REJEIÇÃO (null quando aceita) — auditoria por registro. */
  reason: string | null;
}

/**
 * Decide se o arquivo pode entrar no acervo, lendo os campos que importam do
 * `extmetadata`. PURA: só depende do objeto recebido.
 *
 * ORDEM DE REJEIÇÃO (importa): restrição declarada vence tudo; depois marcador de
 * licença restrita; depois "sem licença legível". A ausência de licença NÃO é "livre".
 */
export function evaluateLicense(
  extmetadata: Record<string, { value?: string }> | null | undefined,
): MediaLicenseDecision {
  const em = extmetadata ?? {};
  const campo = (k: string) => cleanMetadataValue(em[k]?.value);

  const restrictions = campo('Restrictions');
  const licenseShort = campo('LicenseShortName');
  const licenseLong = campo('License');
  const usageTerms = campo('UsageTerms');
  const artist = campo('Artist');
  const credit = campo('Credit');
  const attribution = campo('Attribution');

  const decision: MediaLicenseDecision = {
    accepted: false,
    license: licenseShort ?? licenseLong ?? usageTerms,
    author: artist ?? attribution ?? credit,
    credit,
    usageTerms,
    restrictions,
    reason: null,
  };

  // 1. Restrição declarada (personality rights, trademark, etc.) → nunca grava.
  if (restrictions) {
    decision.reason = `restricao: ${restrictions}`;
    return decision;
  }

  // 2. Nenhuma licença legível → rejeita (ausência NÃO é licença livre).
  const candidatos = [licenseShort, licenseLong, usageTerms].filter((v): v is string => !!v);
  if (candidatos.length === 0) {
    decision.reason = 'sem_licenca_legivel';
    return decision;
  }
  const texto = candidatos.join(' | ');

  // 3. Marcador explícito de licença restrita vence o allowlist.
  const restrita = LICENCA_RESTRITA.exec(texto);
  if (restrita) {
    decision.reason = `licenca_restrita: ${restrita[0]}`;
    return decision;
  }

  // 4. Só entra o que casa com licença livre conhecida.
  if (!LICENCA_LIVRE.test(texto)) {
    decision.reason = `licenca_nao_reconhecida: ${texto.slice(0, 80)}`;
    return decision;
  }

  decision.accepted = true;
  decision.license = licenseShort ?? licenseLong ?? usageTerms;
  return decision;
}

// ---------------------------------------------------------------------------
// imageinfo (licença + url + mime por arquivo)
// ---------------------------------------------------------------------------

const imageInfoShape = z
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
                        descriptionurl: z.string().optional(),
                        mime: z.string().optional(),
                        width: z.number().optional(),
                        height: z.number().optional(),
                        size: z.number().optional(),
                        extmetadata: z
                          .record(z.string(), z.object({ value: z.string().optional() }))
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

export interface CommonsImageInfo {
  /** Título canônico do arquivo (`File:...`), como veio da API. */
  title: string;
  url: string | null;
  descriptionUrl: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  license: MediaLicenseDecision;
}

/**
 * Licença, URL e tipo de cada arquivo, em lotes de 50 (`titles=` limita a 50).
 * O `extmetadata` traz o que interessa: `LicenseShortName`, `Artist`, `Credit`,
 * `UsageTerms`, `Restrictions`.
 */
export async function fetchImageInfo(
  files: string[],
  opts: CommonsFetchOptions = {},
): Promise<Map<string, CommonsImageInfo>> {
  const out = new Map<string, CommonsImageInfo>();
  const unicos = [...new Set(files)];
  for (let i = 0; i < unicos.length; i += IMAGEINFO_BATCH) {
    const lote = unicos.slice(i, i + IMAGEINFO_BATCH);
    const parsed = imageInfoShape.safeParse(
      await commonsApi(
        {
          action: 'query',
          prop: 'imageinfo',
          iiprop: 'extmetadata|url|mime|size',
          titles: lote.join('|'),
        },
        opts,
      ),
    );
    if (!parsed.success) continue;
    for (const pagina of parsed.data.query?.pages ?? []) {
      const ii = pagina.imageinfo?.[0];
      if (pagina.missing || !ii) continue;
      out.set(pagina.title, {
        title: pagina.title,
        url: ii.url ?? null,
        descriptionUrl: ii.descriptionurl ?? null,
        mime: ii.mime ?? null,
        width: ii.width ?? null,
        height: ii.height ?? null,
        size: ii.size ?? null,
        license: evaluateLicense(ii.extmetadata),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Escolha do arquivo certo por tipo de alvo
// ---------------------------------------------------------------------------

export type HarvestKind = 'club' | 'player' | 'trophy';

/**
 * Pista FORTE de escudo no NOME do arquivo (mesma ideia do infobox, T552).
 * Sem o termo solto `arm` de propósito: casava `army`/`armando` e trazia foto avulsa
 * (medido na sonda: um JPEG de cartaz entrou como "escudo" do Flamengo).
 */
const HINT_ESCUDO =
  /escudo|bras[aã]o|logo|logotipo|wappen|crest|badge|shield|emblem|stemma|coat of arms/i;
/**
 * Pista de TROFÉU FÍSICO no nome do arquivo. De propósito NÃO inclui `cup`/`copa`:
 * essas palavras estão no NOME da competição e por isso aparecem em qualquer arquivo
 * sobre ela ("X Cup appearances.png", "X Cup participants.png"). Medido na sonda —
 * com `cup` no hint, gráfico/pôster entravam como troféu.
 */
const HINT_TROFEU = /tro(fé|fe)u|trophy|ta[çc]a|medal|medalha|statuette|estatueta/i;
/** Arquivos que NÃO são foto do jogador (assinatura, túmulo, estátua, arte de rua…). */
const NAO_FOTO =
  /autograph|assinatura|signature|grave|tomb|t[úu]mulo|statue|est[áa]tua|plaque|placa|graffiti|mural|street art|coat of arms|escudo|logo|crest|badge|emblem/i;
/**
 * Arquivos que NÃO são o ESCUDO do clube, apesar de o nome casar: gráfico de
 * desempenho ("X League Performance.svg"), estádio, torcida, kit. Medido na sonda —
 * "Accrington Stanley FC League Performance.svg" entrou como escudo sem este filtro.
 */
const NAO_ESCUDO =
  /performance|chart|graph|table|season|statistic|attendance|result|kit|uniform|diagram|timeline|panorama|stadium|est[áa]dio|torcida|fan|map/i;
/**
 * Arquivos que NÃO são o TROFÉU, apesar de o nome casar ("X Cup appearances.png",
 * "X winners.svg"): gráfico de campanhas, mapa de títulos, logo do torneio, estádio.
 * Medido na sonda — esses entraram como troféu sem este filtro.
 */
const NAO_TROFEU =
  /appearance|winner|champion|chart|graph|map|table|diagram|timeline|season|result|statistic|stadium|est[áa]dio|cabinet|vitrine/i;

function semPrefixo(title: string): string {
  return title.replace(/^File\s*:/i, '');
}

/** Minúsculas e sem acento, para comparar nomes de arquivo com o nome do alvo. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Tokens significativos (≥3 chars) do nome do alvo. */
function tokensDoAlvo(alvo?: string): string[] {
  if (!alvo) return [];
  return normalizar(alvo)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** O nome do arquivo contém ALGUM token do alvo (sem tokens → não filtra). */
function casaAlvo(nomeArquivo: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const n = normalizar(nomeArquivo);
  return tokens.some((t) => n.includes(t));
}

/**
 * Arquivos candidatos ORDENADOS por aderência ao tipo de alvo. Não é busca textual
 * aberta (a lição do T509): os candidatos vêm da CATEGORIA dedicada e aqui só se
 * ordena pelo que o campo espera — o primeiro que PASSAR NA LICENÇA é o escolhido.
 *
 * CONSERVADOR de propósito: sem candidato ADERENTE devolve lista vazia em vez de cair
 * para "qualquer imagem". A sonda contra produção mostrou que o fallback livre gravava
 * cartaz/partida como se fosse escudo/foto — melhor `sem-fonte` do que imagem errada.
 * O `alvo` (nome do clube/jogador) é casado com o nome do arquivo.
 */
export function rankFiles(kind: HarvestKind, files: string[], alvo?: string): string[] {
  if (files.length === 0) return [];
  const tokens = tokensDoAlvo(alvo);
  const nomeados = files.map((f) => ({ title: f, nome: semPrefixo(f) }));
  const ehImagem = (n: string) => /\.(jpe?g|png|gif|webp|tiff?|svg)$/i.test(n);
  const ehSvg = (n: string) => /\.svg$/i.test(n);

  const ordenar = (grupos: string[][]): string[] => {
    const vistos = new Set<string>();
    const saida: string[] = [];
    for (const grupo of grupos) {
      for (const t of grupo) {
        if (vistos.has(t)) continue;
        vistos.add(t);
        saida.push(t);
      }
    }
    return saida;
  };
  const porNome = (pred: (n: string) => boolean) =>
    nomeados.filter((x) => pred(x.nome)).map((x) => x.title);

  if (kind === 'club') {
    // 1) pista de escudo E nome casando com o clube; 2) pista de escudo; 3) SVG que
    // casa com o clube (escudo vetorial nomeado só com o nome do clube). NUNCA arquivo
    // que o NAO_ESCUDO marca (gráfico de desempenho, estádio, torcida, kit).
    const ehCrest = (n: string) => ehImagem(n) && !NAO_ESCUDO.test(n);
    return ordenar([
      porNome((n) => ehCrest(n) && HINT_ESCUDO.test(n) && casaAlvo(n, tokens)),
      porNome((n) => ehCrest(n) && HINT_ESCUDO.test(n)),
      porNome((n) => ehCrest(n) && ehSvg(n) && casaAlvo(n, tokens)),
    ]);
  }
  if (kind === 'player') {
    // Foto do jogador: exige casar com o nome do alvo; JPEG primeiro, sem SVG.
    return ordenar([
      porNome((n) => /\.jpe?g$/i.test(n) && !NAO_FOTO.test(n) && casaAlvo(n, tokens)),
      porNome((n) => ehImagem(n) && !ehSvg(n) && !NAO_FOTO.test(n) && casaAlvo(n, tokens)),
    ]);
  }
  // Troféu: pista de troféu/medalha; casar com o alvo é preferência, não exigência
  // (a categoria já é do troféu: "Trophy of X"). NAO_TROFEU derruba gráfico de
  // campanhas/mapa de títulos que casariam por "Cup"/"winners".
  const ehTrofeu = (n: string) => ehImagem(n) && !NAO_FOTO.test(n) && !NAO_TROFEU.test(n);
  return ordenar([
    porNome((n) => ehTrofeu(n) && HINT_TROFEU.test(n) && casaAlvo(n, tokens)),
    porNome((n) => ehTrofeu(n) && HINT_TROFEU.test(n)),
  ]);
}

/** Escolhe o MELHOR arquivo da categoria para o tipo de alvo (topo do ranking). */
export function pickBestFile(kind: HarvestKind, files: string[], alvo?: string): string | null {
  return rankFiles(kind, files, alvo)[0] ?? null;
}

/**
 * Categorias candidatas para um alvo, na ordem de tentativa. São os rótulos NATURAIS
 * usados no Commons (categoria homônima do clube/jogador; para troféu, os padrões
 * "X trophy" / "Trophy of X" já vistos na curadoria T511).
 */
export function categoryCandidates(kind: HarvestKind, name: string): string[] {
  const limpo = name.trim();
  if (!limpo) return [];
  if (kind === 'trophy') return [`${limpo} trophy`, `Trophy of ${limpo}`, limpo];
  return [limpo];
}
