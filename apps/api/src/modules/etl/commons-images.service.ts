/**
 * T578 — COLETOR DE IMAGENS do Wikimedia Commons por CATEGORIA (service).
 *
 * Fecha o buraco das DUAS fontes atuais (P18 do Wikidata e infobox do artigo): as
 * imagens também vivem nas CATEGORIAS do Commons, e é a API oficial que as entrega.
 *
 * Este módulo é o caminho de escrita COMPARTILHADO pelo CLI
 * (`scripts/harvest-commons-images.ts`) e pelo bot contínuo
 * (`enrich-bot-queues.ts`) — o mesmo lote, sem segunda implementação. O CLI só
 * imprime o relatório; o bot só normaliza o resultado para o roteador.
 *
 * Regras que este coletor respeita (e que a revisão cobra):
 *  - SÓ preenche o que está NULL (nunca sobrescreve imagem existente);
 *  - SÓ grava licença LIVRE verificável POR ARQUIVO (política em
 *    `commons-categories.connector.ts`), registrando o motivo da rejeição;
 *  - cadência (~900 ms) + backoff no connector; FALHA DE LEITURA **nunca** carimba
 *    "sem fonte" — o alvo volta na próxima volta.
 *
 * CURSOR: reusa a SELEÇÃO do cursor de tentativa compartilhado
 * (`selectPendingClubs`/`selectPendingPlayers` de `media-cursor.ts`) com uma CHAVE
 * PRÓPRIA do coletor (`commonsLogo`/`commonsPhoto`). As chaves vivem no MESMO
 * `mediaEnrichment` (JSONB) — sem migration e sem colidir com os jobs vizinhos
 * (`logo`/`profile`), que continuam donos das suas chaves. A ESCRITA é local
 * (`stampCommonsAttempt`) porque a entrada do coletor carrega proveniência
 * (licença/autor/arquivo), forma que `stampMediaAttempt` (fixa em `{at,status}`)
 * não expressa.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  selectPendingClubs,
  selectPendingPlayers,
  type MediaKey,
  type PlayerMediaKey,
} from './media-cursor.js';
import { commonsFilePath } from './connectors/wikidata-media.connector.js';
import {
  categoryCandidates,
  collectCategoryFiles,
  fetchImageInfo,
  rankFiles,
  type CommonsFetchOptions,
  type CommonsImageInfo,
  type HarvestKind,
} from './connectors/commons-categories.connector.js';

/** Chaves próprias do coletor no `mediaEnrichment`. */
export const COMMONS_CLUB_KEY: MediaKey = 'commonsLogo';
export const COMMONS_PLAYER_KEY: PlayerMediaKey = 'commonsPhoto';
export const COMMONS_CLUB_KEY_NAME = 'commonsLogo';
export const COMMONS_PLAYER_KEY_NAME = 'commonsPhoto';

/** Teto de arquivos avaliados por alvo (o primeiro que passa na licença ganha). */
export const DEFAULT_TRY_FILES = 5;

/** Parâmetros default do coletor (os mesmos do CLI) — o bot não inventa outros. */
export function defaultHarvestOptions(apply: boolean): HarvestOptions {
  return { apply, depth: 1, maxFiles: 100, tryFiles: DEFAULT_TRY_FILES };
}

export interface FoundImage {
  file: string;
  imageUrl: string;
  descriptionUrl: string | null;
  mime: string;
  license: string;
  author: string | null;
}

export interface LookupResult {
  found: FoundImage | null;
  /** true = o Commons foi consultado com sucesso (resultado DEFINITIVO, pode carimbar). */
  definitive: boolean;
  rejections: Array<{ file: string; reason: string }>;
  errors: string[];
}

export interface HarvestOptions extends CommonsFetchOptions {
  apply: boolean;
  depth: number;
  maxFiles: number;
  tryFiles: number;
}

function errMsg(err: unknown): string {
  return String(err instanceof Error ? err.message : err).slice(0, 120);
}

/**
 * Procura UM arquivo com licença livre para o alvo, varrendo as categorias
 * candidatas. Nunca lança: erro de leitura vira `definitive=false` (não carimba).
 */
export async function findFreeImage(
  kind: HarvestKind,
  name: string,
  opts: HarvestOptions,
): Promise<LookupResult> {
  const rejections: Array<{ file: string; reason: string }> = [];
  const errors: string[] = [];
  let definitivo = false;

  for (const categoria of categoryCandidates(kind, name)) {
    let coletado: Awaited<ReturnType<typeof collectCategoryFiles>>;
    try {
      coletado = await collectCategoryFiles(categoria, {
        fetchImpl: opts.fetchImpl,
        sleep: opts.sleep,
        depth: opts.depth,
        maxFiles: opts.maxFiles,
      });
      definitivo = true;
    } catch (err) {
      errors.push(`${categoria}: ${errMsg(err)}`);
      continue;
    }
    if (coletado.files.length === 0) continue;

    const ranking = rankFiles(kind, coletado.files, name).slice(0, opts.tryFiles);
    let infos: Map<string, CommonsImageInfo>;
    try {
      infos = await fetchImageInfo(ranking, { fetchImpl: opts.fetchImpl, sleep: opts.sleep });
    } catch (err) {
      errors.push(`imageinfo ${categoria}: ${errMsg(err)}`);
      continue;
    }
    for (const arquivo of ranking) {
      const info = infos.get(arquivo) ?? [...infos.values()].find((i) => i.title === arquivo);
      if (!info) continue;
      if (!info.license.accepted) {
        rejections.push({ file: arquivo, reason: info.license.reason ?? 'licenca_rejeitada' });
        continue;
      }
      if (!info.mime?.startsWith('image/') || !info.url) {
        rejections.push({ file: arquivo, reason: `mime_invalido: ${info.mime ?? 'nulo'}` });
        continue;
      }
      return {
        found: {
          file: arquivo,
          // Convenção do acervo (T506): URL direta determinística do Commons.
          imageUrl: commonsFilePath(arquivo.replace(/^File\s*:/i, '')),
          descriptionUrl: info.descriptionUrl,
          mime: info.mime,
          license: info.license.license ?? 'desconhecida',
          author: info.license.author,
        },
        definitive: true,
        rejections,
        errors,
      };
    }
  }
  // Definitivo só quando o Commons respondeu tudo (sem nenhum erro de leitura).
  return { found: null, definitive: definitivo && errors.length === 0, rejections, errors };
}

/**
 * Carimba a tentativa MESCLANDO (uma instrução atômica, `||` no JSONB) — mesma
 * garantia de `carimbarTentativa`, mas com a entrada rica do coletor. A tabela vem de
 * chamador fechado (whitelist): identificador SQL não é parametrizável.
 */
export async function stampCommonsAttempt(
  prisma: PrismaClient,
  tabela: 'clubs' | 'players',
  id: string,
  entry: Record<string, unknown>,
): Promise<void> {
  const tabelaSql = tabela === 'clubs' ? Prisma.raw('clubs') : Prisma.raw('players');
  await prisma.$executeRaw`
    UPDATE ${tabelaSql}
    SET "mediaEnrichment" = coalesce("mediaEnrichment", '{}'::jsonb) || ${JSON.stringify(entry)}::jsonb
    WHERE id = ${id}
  `;
}

export interface HarvestReport {
  kind: HarvestKind;
  processed: number;
  enriched: number;
  noSource: number;
  readErrors: number;
  rejections: Record<string, number>;
  examples: string[];
}

function novoRelatorio(kind: HarvestKind): HarvestReport {
  return {
    kind,
    processed: 0,
    enriched: 0,
    noSource: 0,
    readErrors: 0,
    rejections: {},
    examples: [],
  };
}

function contarRejeicoes(rep: HarvestReport, motivos: Array<{ reason: string }>): void {
  for (const m of motivos) {
    const chave = m.reason.split(':')[0]?.trim() || 'outro';
    rep.rejections[chave] = (rep.rejections[chave] ?? 0) + 1;
  }
}

/** CLUBES — escudo via categoria homônima do clube (logoUrl NULL). */
export async function harvestClubsBatch(
  prisma: PrismaClient,
  limit: number,
  opts: HarvestOptions & { qid?: string },
): Promise<HarvestReport> {
  const rep = novoRelatorio('club');
  let ids: string[];
  if (opts.qid) {
    ids = (
      await prisma.club.findMany({ where: { qid: opts.qid }, select: { id: true }, take: 1 })
    ).map((r) => r.id);
  } else {
    ids = (
      await selectPendingClubs(prisma, {
        limit,
        media: [COMMONS_CLUB_KEY],
        needs: Prisma.sql`"logoUrl" IS NULL`,
      })
    ).map((p) => p.id);
  }
  const clubes = ids.length
    ? await prisma.club.findMany({
        where: { id: { in: ids }, logoUrl: null, deletedAt: null },
        select: { id: true, qid: true, name: true, metadata: true },
        orderBy: { name: 'asc' },
      })
    : [];

  for (const clube of clubes) {
    rep.processed += 1;
    const lookup = await findFreeImage('club', clube.name, opts);
    contarRejeicoes(rep, lookup.rejections);
    const at = new Date().toISOString();
    if (lookup.found) {
      const f = lookup.found;
      if (opts.apply) {
        const metadata = {
          ...((clube.metadata as Record<string, unknown> | null) ?? {}),
          logoSource: 'commons-category',
          logoSourceUrl: f.descriptionUrl,
          logoResolvedAt: at,
          logoFile: f.file,
          logoLicense: f.license,
          logoAuthor: f.author,
        };
        // Guarda de não-sobrescrita: só grava se AINDA estiver NULL.
        await prisma.club.updateMany({
          where: { id: clube.id, logoUrl: null },
          data: { logoUrl: f.imageUrl, metadata: metadata as Prisma.InputJsonValue },
        });
        await stampCommonsAttempt(prisma, 'clubs', clube.id, {
          [COMMONS_CLUB_KEY_NAME]: {
            at,
            status: 'enriched',
            file: f.file,
            license: f.license,
            author: f.author,
            sourceUrl: f.descriptionUrl,
          },
        });
      }
      rep.enriched += 1;
      rep.examples.push(`${clube.name} → ${f.file} (${f.license}; ${f.author ?? 'autor n/i'})`);
    } else if (lookup.definitive) {
      if (opts.apply) {
        await stampCommonsAttempt(prisma, 'clubs', clube.id, {
          [COMMONS_CLUB_KEY_NAME]: { at, status: 'no_source' },
        });
      }
      rep.noSource += 1;
    } else {
      rep.readErrors += 1;
    }
  }
  return rep;
}

/** JOGADORES — foto na categoria do jogador (photoUrl NULL; teto de 0,8% é do P18). */
export async function harvestPlayersBatch(
  prisma: PrismaClient,
  limit: number,
  opts: HarvestOptions & { qid?: string },
): Promise<HarvestReport> {
  const rep = novoRelatorio('player');
  let ids: string[];
  if (opts.qid) {
    ids = (
      await prisma.player.findMany({ where: { qid: opts.qid }, select: { id: true }, take: 1 })
    ).map((r) => r.id);
  } else {
    ids = (
      await selectPendingPlayers(prisma, {
        limit,
        media: [COMMONS_PLAYER_KEY],
        needs: Prisma.sql`"photoUrl" IS NULL`,
      })
    ).map((p) => p.id);
  }
  const jogadores = ids.length
    ? await prisma.player.findMany({
        where: { id: { in: ids }, photoUrl: null },
        select: { id: true, qid: true, fullName: true },
        orderBy: { fullName: 'asc' },
      })
    : [];

  for (const jogador of jogadores) {
    rep.processed += 1;
    const lookup = await findFreeImage('player', jogador.fullName, opts);
    contarRejeicoes(rep, lookup.rejections);
    const at = new Date().toISOString();
    if (lookup.found) {
      const f = lookup.found;
      if (opts.apply) {
        await prisma.player.updateMany({
          where: { id: jogador.id, photoUrl: null },
          data: { photoUrl: f.imageUrl },
        });
        await stampCommonsAttempt(prisma, 'players', jogador.id, {
          [COMMONS_PLAYER_KEY_NAME]: {
            at,
            status: 'enriched',
            file: f.file,
            license: f.license,
            author: f.author,
            sourceUrl: f.descriptionUrl,
          },
        });
      }
      rep.enriched += 1;
      rep.examples.push(
        `${jogador.fullName} → ${f.file} (${f.license}; ${f.author ?? 'autor n/i'})`,
      );
    } else if (lookup.definitive) {
      if (opts.apply) {
        await stampCommonsAttempt(prisma, 'players', jogador.id, {
          [COMMONS_PLAYER_KEY_NAME]: { at, status: 'no_source' },
        });
      }
      rep.noSource += 1;
    } else {
      rep.readErrors += 1;
    }
  }
  return rep;
}

/**
 * TROFÉUS — imagem de troféu/medalha com licença livre (trophyImageUrl NULL).
 *
 * LIMITAÇÃO DECLARADA: `Competition` NÃO tem campo de cursor de tentativa (não há
 * `mediaEnrichment` nem `metadata`) e `trophyModel` é a lista de MODELOS 3D (seed
 * T526 sobrescreve por hash) — sobrecarregá-lo quebraria aquele seed. Sem tabela nova
 * (mandato do briefing), a fila é `trophyImageUrl IS NULL` ordenada por nome: os
 * SUCESSOS saem da fila, os "sem fonte" voltam na próxima passada. Correção definitiva
 * = coluna de cursor (migration fora deste escopo).
 */
export async function harvestTrophiesBatch(
  prisma: PrismaClient,
  limit: number,
  opts: HarvestOptions & { qid?: string },
): Promise<HarvestReport> {
  const rep = novoRelatorio('trophy');
  const competicoes = await prisma.competition.findMany({
    where: {
      ...(opts.qid ? { qid: opts.qid } : {}),
      trophyImageUrl: null,
      deletedAt: null,
      qid: { not: null },
    },
    select: { id: true, qid: true, name: true },
    orderBy: { name: 'asc' },
    take: limit,
  });

  for (const comp of competicoes) {
    rep.processed += 1;
    const lookup = await findFreeImage('trophy', comp.name, opts);
    contarRejeicoes(rep, lookup.rejections);
    if (lookup.found) {
      const f = lookup.found;
      if (opts.apply) {
        await prisma.competition.updateMany({
          where: { id: comp.id, trophyImageUrl: null },
          data: { trophyImageUrl: f.imageUrl },
        });
      }
      rep.enriched += 1;
      rep.examples.push(
        `${comp.name} → ${f.file} (${f.license}; ${f.author ?? 'autor n/i'}) [sem campo de proveniência em Competition]`,
      );
    } else if (lookup.definitive) {
      rep.noSource += 1;
    } else {
      rep.readErrors += 1;
    }
  }
  return rep;
}
