/**
 * T528 — enriquecimento de mídia em LOTE, unificado (kits + hino + flâmula) e o
 * CURSOR do lote.
 *
 * Por que existe (diagnóstico medido em 12-10-2026):
 *  - os jobs de enriquecimento do scheduler selecionavam clubes por `campo IS NULL`
 *    + `orderBy: name ASC`. Como a quase-totalidade dos clubes NUNCA sai do filtro
 *    (nenhum dos 11.987 tem os 5 campos de mídia preenchidos → `com_os_5_campos=0`),
 *    o mesmo primeiro lote alfabético era reprocessado toda noite: escudo parado em
 *    290/11.987 (2,4%) e texto editorial em 858, parado na letra "E".
 *  - a curadoria dos T523-T526 era manual (11 clubes de uniforme, 13 de hino,
 *    2 flâmulas, 0 modelos 3D) — 0,02%-0,11% de cobertura.
 *
 * O que este módulo muda: cada clube processado recebe um REGISTRO DE TENTATIVA em
 * `clubs.mediaEnrichment` (`{ "<media>": { at, status } }`). O cursor passa a ser
 * esse registro, então o lote AVANÇA sempre — inclusive quando a fonte não tem o
 * dado, que vira gap DECLARADO por clube (auditável), nunca retrabalho silencioso.
 *
 * Honestidade (regras duras): nada é inferido. Uniforme só com composição na fonte
 * e cada peça verificada AO VIVO no Commons (existe + licença + sem pedido de
 * exclusão); áudio só em arquivo de áudio citado pela própria página e verificado
 * ao vivo; flâmula só com nome de arquivo que É flâmula (categoria do clube, nunca
 * busca textual solta) e licença verificada; LETRA DE HINO nunca é publicada
 * (direito autoral) — `lyrics` fica null por desenho (T524).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  buildParts,
  decodeSeason,
  fetchWikitext,
  isNonKitCall,
  parseInfoboxKits,
  parseKitCalls,
  recomputeOrdinals,
  stripUtm,
  typeFromCall,
  type KitEntry,
  type KitPart,
} from '../../lib/wikipedia/kit-composition.js';
import { sitelinksFromEntity } from './connectors/wikipedia-editorial.connector.js';
import { stampMediaAttempts } from './media-cursor.js';

export const ALL_MEDIA_USER_AGENT =
  'AlmanaqueDosClubes/1.0 (https://almanaquedosclubes.com; contato@almanaquedosclubes.com)';

export type MediaKind = 'kits' | 'anthem' | 'pennants';
export const ALL_MEDIA_KINDS: readonly MediaKind[] = ['kits', 'anthem', 'pennants'];

/** Status de uma mídia tentada — vira o registro auditável do cursor. */
export type MediaStatus = 'enriched' | 'no_source' | 'already_present' | 'error';

export interface AnthemRecord {
  composer: null;
  lyricist: null;
  year: null;
  official: null;
  label: null;
  note: null;
  audioUrl: string;
  audioLicense: string;
  audioSourceUrl: string;
  lyrics: null;
  lyricsSource: null;
  lyricsLicense: null;
  lyricsRestricted: true;
  sourceUrl: string;
  attribution: string;
}

export interface PennantRecord {
  imageUrl: string;
  sourceUrl: string;
  license: string;
  description: null;
  year: null;
  type: null;
  curiosities: null;
}

/** Valores NOVOS descobertos para o clube (só o que a fonte tinha). */
export interface ClubMediaValues {
  kits?: KitEntry[];
  anthem?: AnthemRecord;
  pennants?: PennantRecord[];
}

export interface ClubMediaOutcome {
  /** false = falha de IO na fonte (registrada como `error`, não trava a fila). */
  ok: boolean;
  /** true = há pelo menos um campo novo para gravar. */
  updated: boolean;
  media: Record<MediaKind, MediaStatus>;
  values: ClubMediaValues;
}

export interface AllMediaBatchResult {
  processed: number;
  /** Clubes com pelo menos um campo novo gravado. */
  enriched: number;
  /** Clubes processados em que a fonte não tinha nada (gap declarado). */
  gaps: number;
  byMedia: Record<MediaKind, { found: number; gap: number; already: number }>;
  errors: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const emptyByMedia = (): AllMediaBatchResult['byMedia'] => ({
  kits: { found: 0, gap: 0, already: 0 },
  anthem: { found: 0, gap: 0, already: 0 },
  pennants: { found: 0, gap: 0, already: 0 },
});

// ---------------------------------------------------------------------------
// Seleção de candidatos (PURO, testável) — o coração da mudança de método
// ---------------------------------------------------------------------------

export interface MediaCandidate {
  kits: boolean;
  anthem: boolean;
  pennants: boolean;
}

/**
 * Decide, por clube, o que ainda falta TENTAR. `seen` = registro de tentativa já
 * gravado (mediaEnrichment). Campo já com dado nunca é retentado (não sobrescreve a
 * curadoria dos T523-T526); campo tentado e vazio também não (o gap já foi
 * declarado) — é isso que faz o lote AVANÇAR em vez de refazer o mesmo lote.
 */
export function pendingMedia(
  current: { kitHistory: unknown; anthem: unknown; pennants: unknown },
  seen: Record<string, unknown> | null,
): MediaCandidate {
  const attempted = (k: MediaKind) => Boolean(seen && k in seen);
  return {
    kits: current.kitHistory == null && !attempted('kits'),
    anthem: current.anthem == null && !attempted('anthem'),
    pennants: current.pennants == null && !attempted('pennants'),
  };
}

/** "Nada a fazer": as três mídias já têm dado ou tentativa registrada. */
export function isFullyAttempted(
  current: { kitHistory: unknown; anthem: unknown; pennants: unknown },
  seen: Record<string, unknown> | null,
): boolean {
  const c = pendingMedia(current, seen);
  return !c.kits && !c.anthem && !c.pennants;
}

/** JSON de tentativa (o cursor). Grava TODAS as mídias, inclusive as vazias. */
export function attemptRecord(
  media: Record<MediaKind, MediaStatus>,
  at: string,
): Record<string, { at: string; status: MediaStatus }> {
  const out: Record<string, { at: string; status: MediaStatus }> = {};
  for (const k of ALL_MEDIA_KINDS) out[k] = { at, status: media[k] };
  return out;
}

// ---------------------------------------------------------------------------
// Descoberta estrita no wikitexto (PURO, testável)
// ---------------------------------------------------------------------------

const AUDIO_EXT_RE = /\.(ogg|oga|opus|flac|wav|mp3|mid|midi)$/i;
const FILE_REF_RE = /\[\[\s*(?:Ficheiro|File|Imagem|Image)\s*:\s*([^\]|]+?)\s*(?:\||\])/gi;
const AUDIO_TEMPLATE_RE = /\{\{\s*(?:Áudio|Audio|Som|Sound)\s*\|([^}]*)\}\}/gi;

/**
 * Candidatos de áudio: arquivos de áudio CITADOS pela própria página cujo nome a
 * liga a "hino". Sem o vínculo com hino seria chute — e chute não entra.
 */
export function audioFileCandidates(wikitext: string): string[] {
  const out = new Set<string>();
  const add = (raw: string) => {
    const name = raw.trim().replace(/^File:/i, '');
    if (!name || !AUDIO_EXT_RE.test(name)) return;
    out.add(`File:${name}`);
  };
  for (const m of wikitext.matchAll(FILE_REF_RE)) add(m[1] ?? '');
  for (const m of wikitext.matchAll(AUDIO_TEMPLATE_RE)) {
    for (const piece of (m[1] ?? '').split('|')) {
      add(piece.replace(/^\s*[\w-]+\s*=/, '').trim());
    }
  }
  return [...out].filter((f) => /hino|anthem/i.test(f));
}

const PENNANT_TITLE_RE = /fl[aâ]mul|pennant|wimpel|bandeirinha|gr[ií]mpola/i;

/** Um arquivo do Commons só é flâmula se o TÍTULO diz que é (sem inferência). */
export function isPennantFile(title: string): boolean {
  return PENNANT_TITLE_RE.test(title.replace(/^File:/i, ''));
}

// ---------------------------------------------------------------------------
// IO — Commons / Wikipédia / Wikidata
// ---------------------------------------------------------------------------

interface CommonsFileInfo {
  url: string | null;
  license: string | null;
  deleted: boolean;
}

/** Verificação AO VIVO de arquivo do Commons (existe + licença + sem exclusão). */
export async function verifyCommonsFile(fileTitle: string): Promise<CommonsFileInfo | null> {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      titles: fileTitle,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      format: 'json',
    });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': ALL_MEDIA_USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              imageinfo?: Array<{
                url?: string;
                extmetadata?: Record<string, { value?: string }>;
              }>;
            }
          >;
        };
      };
      for (const p of Object.values(json.query?.pages ?? {})) {
        const ii = p.imageinfo?.[0];
        if (!ii) return { url: null, license: null, deleted: true };
        const em = ii.extmetadata ?? {};
        const clean = (k: string) =>
          em[k]?.value ? em[k].value.replace(/<[^>]+>/g, '').trim() : null;
        return {
          url: ii.url ? stripUtm(ii.url) : null,
          license: clean('LicenseShortName'),
          deleted: Boolean(clean('DeletionReason')),
        };
      }
      return null;
    } catch {
      await sleep(1200);
    }
  }
  return null;
}

/** Arquivos da categoria do clube no Commons (uma requisição; sem busca textual). */
export async function commonsCategoryFiles(category: string): Promise<string[]> {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmtype: 'file',
      cmlimit: '100',
      format: 'json',
    });
  try {
    const res = await fetch(url, { headers: { 'user-agent': ALL_MEDIA_USER_AGENT } });
    if (!res.ok) return [];
    const json = (await res.json()) as { query?: { categorymembers?: Array<{ title?: string }> } };
    return (json.query?.categorymembers ?? [])
      .map((m) => m.title)
      .filter((t): t is string => Boolean(t));
  } catch {
    return [];
  }
}

/** Sitelinks pt/en em lotes de 50 (mesmo padrão do job editorial). */
export async function fetchSitelinkTitles(qids: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  for (let i = 0; i < qids.length; i += 50) {
    const chunk = qids.slice(i, i + 50);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&format=json&props=sitelinks`;
    try {
      const res = await fetch(url, { headers: { 'user-agent': ALL_MEDIA_USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        entities?: Record<string, { sitelinks?: Record<string, { title?: string } | undefined> }>;
      };
      for (const [qid, e] of Object.entries(json.entities ?? {})) {
        const links = sitelinksFromEntity(e);
        const t = links.pt ?? links.en;
        if (t) titles.set(qid, t);
      }
    } catch {
      // Lote falhou: os clubes dele viram gap declarado, não travam a fila.
    }
    if (i + 50 < qids.length) await sleep(800);
  }
  return titles;
}

// ---------------------------------------------------------------------------
// Pipeline por clube
// ---------------------------------------------------------------------------

export interface ClubRow {
  id: string;
  qid: string | null;
  name: string;
  kitHistory: unknown;
  anthem: unknown;
  pennants: unknown;
  mediaEnrichment: unknown;
}

export interface ClubDeps {
  getWikiTitle: (qid: string) => string | undefined;
  wikitext: (title: string) => Promise<string | null>;
  /** Cache de peças por run (o mesmo padrão do arquivo é comum a vários clubes). */
  fileCache: Map<string, KitPart>;
  // IO injetável: em produção são as funções reais; nos testes, doubles — assim o
  // caminho de DECISÃO (o que aceitamos e o que vira gap) é testável sem rede.
  buildPartsFn?: typeof buildParts;
  verifyFileFn?: typeof verifyCommonsFile;
  categoryFilesFn?: typeof commonsCategoryFiles;
}

/** Processa UM clube. IO injetado — testável sem rede. */
export async function enrichOneClub(club: ClubRow, deps: ClubDeps): Promise<ClubMediaOutcome> {
  const media: Record<MediaKind, MediaStatus> = {
    kits: 'no_source',
    anthem: 'no_source',
    pennants: 'no_source',
  };
  const values: ClubMediaValues = {};
  const seen = (club.mediaEnrichment ?? null) as Record<string, unknown> | null;
  const pending = pendingMedia(club, seen);
  if (isFullyAttempted(club, seen)) {
    return {
      ok: true,
      updated: false,
      media: { kits: 'already_present', anthem: 'already_present', pennants: 'already_present' },
      values,
    };
  }

  const title = club.qid ? deps.getWikiTitle(club.qid) : undefined;
  if (!title) {
    // Sem página na Wikipédia não há composição/hino a ler — gap declarado.
    return { ok: true, updated: false, media, values };
  }
  const sourceUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const wikitext = await deps.wikitext(title);
  if (!wikitext) return { ok: false, updated: false, media, values };

  // ---- kits: composição na fonte + CADA peça verificada ao vivo no Commons ----
  if (pending.kits) {
    const calls = [...parseKitCalls(wikitext, sourceUrl), ...parseInfoboxKits(wikitext, sourceUrl)]
      .filter((c) => !isNonKitCall(c))
      .sort((a, b) => a.start - b.start);
    recomputeOrdinals(calls);
    const entries: KitEntry[] = [];
    for (const call of calls) {
      const parts = await (deps.buildPartsFn ?? buildParts)(call.params, deps.fileCache);
      if (!parts) continue;
      const patterns = Object.values(parts).map((p) => p.pattern);
      entries.push({
        season: decodeSeason(patterns),
        type: typeFromCall(call, patterns),
        label: call.title || call.section,
        parts,
        sourceUrl: call.sourceUrl,
      });
    }
    const seenKey = new Set<string>();
    const dedup = entries.filter((e) => {
      const k = `${e.season}|${e.type}|${e.parts.body.pattern ?? e.parts.body.color ?? e.label}`;
      if (seenKey.has(k)) return false;
      seenKey.add(k);
      return true;
    });
    if (dedup.length > 0) {
      values.kits = dedup;
      media.kits = 'enriched';
    }
  }

  // ---- hino: só áudio CITADO pela página e verificado ao vivo ----
  if (pending.anthem) {
    for (const file of audioFileCandidates(wikitext)) {
      const info = await (deps.verifyFileFn ?? verifyCommonsFile)(file);
      if (!info || info.deleted || !info.url || !info.license) continue;
      values.anthem = {
        composer: null,
        lyricist: null,
        year: null,
        official: null,
        label: null,
        note: null,
        audioUrl: info.url,
        audioLicense: info.license,
        audioSourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(file.replace(/ /g, '_'))}`,
        // Letra NUNCA é publicada sem licença livre explícita (T524).
        lyrics: null,
        lyricsSource: null,
        lyricsLicense: null,
        lyricsRestricted: true,
        sourceUrl,
        attribution: 'pt.Wikipédia (CC BY-SA 4.0)',
      };
      media.anthem = 'enriched';
      break;
    }
  }

  // ---- flâmula: só arquivo da CATEGORIA do clube cujo título É flâmula ----
  if (pending.pennants) {
    const files = (await (deps.categoryFilesFn ?? commonsCategoryFiles)(title)).filter(
      isPennantFile,
    );
    for (const file of files.slice(0, 5)) {
      const info = await (deps.verifyFileFn ?? verifyCommonsFile)(file);
      if (!info || info.deleted || !info.url || !info.license) continue;
      values.pennants = [
        {
          imageUrl: info.url,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(file.replace(/ /g, '_'))}`,
          license: info.license,
          description: null,
          year: null,
          type: null,
          curiosities: null,
        },
      ];
      media.pennants = 'enriched';
      break;
    }
  }

  return { ok: true, updated: Object.keys(values).length > 0, media, values };
}

// ---------------------------------------------------------------------------
// Lote
// ---------------------------------------------------------------------------

/**
 * Enriquece até `limit` clubes com kit/hino/flâmula.
 * `recheck: true` reprocessa os JÁ TENTADOS (prova de idempotência: `enriched=0`)
 * em vez de avançar o cursor.
 */
export async function enrichAllMediaBatch(
  limit: number,
  opts: {
    apply: boolean;
    prisma?: PrismaClient;
    recheck?: boolean;
    /** T535 — requisições em voo por rodada (default 4). O gargalo é rede, não CPU. */
    concurrency?: number;
    /** T535 — callback de progresso (o `--full` usa para reportar a cada N clubes). */
    onProgress?: (feitos: number, total: number) => void;
  } = { apply: false },
): Promise<AllMediaBatchResult> {
  const concurrency = Math.max(1, Math.min(8, opts.concurrency ?? 4));
  const prisma = opts.prisma ?? new PrismaClient();
  const own = !opts.prisma;
  const result: AllMediaBatchResult = {
    processed: 0,
    enriched: 0,
    gaps: 0,
    byMedia: emptyByMedia(),
    errors: 0,
  };
  try {
    // A seleção do cursor é feita em SQL EXPLÍCITO: `not: Prisma.DbNull` em campo
    // JSON não é confiável (em 12-10-2026 o modo `recheck` acabou pegando os PRÓXIMOS
    // 500 em vez dos já tentados e avançou o cursor de novo). Aqui o predicado é
    // literal — `IS NULL` / `IS NOT NULL` — sem depender da tradução do ORM.
    const cursorRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM clubs
      WHERE "deletedAt" IS NULL AND qid IS NOT NULL
        AND "mediaEnrichment" IS ${opts.recheck ? Prisma.sql`NOT NULL` : Prisma.sql`NULL`}
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    const ids = cursorRows.map((r) => r.id);
    const clubs = (
      ids.length
        ? await prisma.club.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              qid: true,
              name: true,
              kitHistory: true,
              anthem: true,
              pennants: true,
              mediaEnrichment: true,
            },
            orderBy: { name: 'asc' },
          })
        : []
    ) as ClubRow[];
    if (clubs.length === 0) return result;

    const qids = clubs.map((c) => c.qid).filter((q): q is string => Boolean(q));
    const titles = await fetchSitelinkTitles(qids);
    const fileCache = new Map<string, KitPart>();
    const at = new Date().toISOString();

    // T535 — pool de concorrência: o gargalo é I/O de rede (wikitext da Wikipédia +
    // verificação no Commons), não CPU. Rodar em série media ~1,1 req/s; o Wikimedia
    // atende bem um cliente identificado com poucas requisições em voo. `concurrency`
    // é configurável (default 4) e o UA é identificado — e cada fetch já tem retry.
    const perClub = async (club: ClubRow): Promise<void> => {
      result.processed += 1;
      let outcome: ClubMediaOutcome;
      try {
        outcome = await enrichOneClub(club, {
          getWikiTitle: (qid) => titles.get(qid),
          wikitext: fetchWikitext,
          fileCache,
        });
      } catch {
        result.errors += 1;
        outcome = {
          ok: false,
          updated: false,
          media: { kits: 'error', anthem: 'error', pennants: 'error' },
          values: {},
        };
      }
      for (const k of ALL_MEDIA_KINDS) {
        const s = outcome.media[k];
        if (s === 'enriched') result.byMedia[k].found += 1;
        else if (s === 'already_present') result.byMedia[k].already += 1;
        else result.byMedia[k].gap += 1;
      }
      if (outcome.updated) result.enriched += 1;
      else result.gaps += 1;

      if (!opts.apply) return;
      const data: Prisma.ClubUpdateInput = {};
      // Nunca sobrescreve campo já preenchido (preserva a curadoria T523-T526).
      if (outcome.values.kits && club.kitHistory == null) {
        data.kitHistory = outcome.values.kits as unknown as Prisma.InputJsonValue;
      }
      if (outcome.values.anthem && club.anthem == null) {
        data.anthem = outcome.values.anthem as unknown as Prisma.InputJsonValue;
      }
      if (outcome.values.pennants && club.pennants == null) {
        data.pennants = outcome.values.pennants as unknown as Prisma.InputJsonValue;
      }
      if (Object.keys(data).length > 0) {
        await prisma.club.update({ where: { id: club.id }, data });
      }
      // T547 — a tentativa vai por MESCLA atômica (`||` no JSONB), não por substituição:
      // os jobs de escudo/estádio/cores e de texto gravam as chaves DELES no mesmo
      // objeto, e uma escrita inteira apagaria os cursores vizinhos (cada job voltaria
      // ao início). `attemptRecord` continua sendo a fonte do formato.
      await stampMediaAttempts(prisma, club.id, outcome.media, at);
    };

    for (let i = 0; i < clubs.length; i += concurrency) {
      const chunk = clubs.slice(i, i + concurrency);
      await Promise.all(chunk.map((c) => perClub(c)));
      opts.onProgress?.(i + chunk.length, clubs.length);
    }
    return result;
  } finally {
    if (own) await prisma.$disconnect();
  }
}
