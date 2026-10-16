/**
 * T575 — as FILAS reais do bot: um adaptador por gap de fonte aberta.
 *
 * Cada adaptador é uma casca fina sobre o lote que JÁ existe (`enrich-media.service.ts`,
 * `enrich-all-media.service.ts`, `link-players-clubs.service.ts`) + o connector de
 * coordenadas (`extractClubCoordinatesBulk`). O bot não reimplementa nenhum caminho de
 * escrita: se a regra de aceitação mudar no serviço, o bot muda com ela.
 *
 * O que o adaptador acrescenta é o contrato que o ROTEADOR precisa:
 *   - `progress()` → `total` (universo do gap) e `pending` (ainda não tentado);
 *   - `run()` → resultado normalizado (processados/atualizados/sem-fonte/falhas).
 *
 * NOTA DE HONESTIDADE sobre `gaps`: onde o lote de baixo não separa "a fonte não tem" de
 * "já estava preenchido" (é o caso do `skipped` do T506/T550), o adaptador reporta o
 * superconjunto e o comentário DIZ isso. Inventar um número mais bonito seria pior.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  countPendingClubs,
  countPendingPlayers,
  selectPendingClubs,
  stampMediaAttempt,
} from './media-cursor.js';
import {
  enrichClubsEditorialBatch,
  enrichClubsMediaBatch,
  enrichPlayersMediaBatch,
} from './enrich-media.service.js';
import { enrichAllMediaBatch } from './enrich-all-media.service.js';
import { linkPlayersClubsBatch } from './link-players-clubs.service.js';
import {
  extractClubCoordinatesBulk,
  type ClubCoordinateResult,
} from '../../lib/wikidata/extract-club-coordinates.js';
import { ZERO_RESULT, type EnrichQueueAdapter, type QueueRunResult } from './enrich-bot.service.js';

/** Condição do próprio job — delimita o DENOMINADOR do progresso (o gap real). */
const NEEDS_CLUB_MEDIA = Prisma.sql`("logoUrl" IS NULL OR "stadiumName" IS NULL OR "teamColors" IS NULL)`;
const NEEDS_EDITORIAL = Prisma.sql`"editorialText" IS NULL`;
const NEEDS_EXTRA_MEDIA = Prisma.sql`("kitHistory" IS NULL OR anthem IS NULL OR pennants IS NULL)`;
const NEEDS_COORDINATES = Prisma.sql`(latitude IS NULL OR longitude IS NULL)`;
const NEEDS_PLAYER_CLUB = Prisma.sql`"clubId" IS NULL`;

const somar = (base: QueueRunResult, extra: QueueRunResult): QueueRunResult => ({
  processed: base.processed + extra.processed,
  updated: base.updated + extra.updated,
  gaps: base.gaps + extra.gaps,
  failures: base.failures + extra.failures,
});

export interface BuildAdaptersOptions {
  /** Revisita de mídia já tentada (dias). 0/undefined = só nunca tentado (noop no re-run). */
  refreshDays?: number;
  /** Janela de recência do P54, em anos (fila `player-club`). */
  maxAgeYears?: number;
  /**
   * IO injetável da fila de coordenadas. Em produção é o connector real
   * (`extractClubCoordinatesBulk`); nos testes, um double — mesmo princípio do `ClubDeps`
   * do lote unificado: o caminho de DECISÃO (o que carimba e o que NÃO carimba) tem de ser
   * provável sem rede.
   */
  resolverCoordenadas?: typeof extractClubCoordinatesBulk;
}

/** As seis filas, na ordem canônica do roteador. */
export function buildEnrichQueueAdapters(
  prisma: PrismaClient,
  opts: BuildAdaptersOptions = {},
): EnrichQueueAdapter[] {
  const refreshDays = opts.refreshDays && opts.refreshDays > 0 ? opts.refreshDays : undefined;

  const clubMedia: EnrichQueueAdapter = {
    id: 'club-media',
    label: 'mídia de clube (escudo, estádio, cores)',
    keys: ['logo', 'stadium', 'colors'],
    progress: () =>
      countPendingClubs(prisma, {
        media: ['logo', 'stadium', 'colors'],
        needs: NEEDS_CLUB_MEDIA,
        refreshDays,
      }),
    run: async (limit, { apply }) => {
      const out = await enrichClubsMediaBatch(limit, { apply, prisma, refreshDays });
      return {
        processed: out.processed,
        updated: out.updated,
        // `skipped` do T506 = nada gravado (sem fonte OU já preenchido) — superconjunto
        // declarado; o batch não separa os dois casos.
        gaps: out.skipped,
        // Falha de leitura de artigo (429/5xx/rede) NÃO carimba: volta na próxima volta.
        failures: out.infoboxFetchFailures ?? 0,
      };
    },
  };

  const clubEditorial: EnrichQueueAdapter = {
    id: 'club-editorial',
    label: 'texto editorial do clube (Wikipédia pt/en/es)',
    keys: ['editorial'],
    progress: () =>
      countPendingClubs(prisma, { media: ['editorial'], needs: NEEDS_EDITORIAL, refreshDays }),
    run: async (limit, { apply }) => {
      const out = await enrichClubsEditorialBatch(limit, { apply, prisma, refreshDays });
      return { processed: out.processed, updated: out.updated, gaps: out.skipped, failures: 0 };
    },
  };

  const clubExtraMedia: EnrichQueueAdapter = {
    id: 'club-extra-media',
    label: 'mídia extra do clube (uniforme, hino, flâmula)',
    keys: ['kits', 'anthem', 'pennants'],
    progress: () =>
      countPendingClubs(prisma, {
        media: ['kits', 'anthem', 'pennants'],
        needs: NEEDS_EXTRA_MEDIA,
        refreshDays,
      }),
    run: async (limit, { apply }) => {
      const out = await enrichAllMediaBatch(limit, { apply, prisma, refreshDays });
      return {
        processed: out.processed,
        updated: out.enriched,
        gaps: out.gaps,
        failures: out.errors,
      };
    },
  };

  const playerProfile: EnrichQueueAdapter = {
    id: 'player-profile',
    label: 'perfil de jogador (foto, país, posição)',
    keys: ['profile'],
    progress: () => countPendingPlayers(prisma, { media: ['profile'], refreshDays }),
    run: async (limit, { apply }) => {
      const out = await enrichPlayersMediaBatch(limit, { apply, prisma, refreshDays });
      return { processed: out.processed, updated: out.updated, gaps: out.skipped, failures: 0 };
    },
  };

  const playerClub: EnrichQueueAdapter = {
    id: 'player-club',
    label: 'vínculo jogador → clube atual (P54 do Wikidata)',
    keys: ['club'],
    progress: () =>
      countPendingPlayers(prisma, { media: ['club'], needs: NEEDS_PLAYER_CLUB, refreshDays }),
    run: async (limit, { apply }) => {
      const out = await linkPlayersClubsBatch(limit, {
        apply,
        prisma,
        refreshDays,
        maxAgeYears: opts.maxAgeYears,
      });
      return {
        processed: out.processed,
        updated: out.linked,
        // "sem contrato aberto confiável" e "time fora do acervo" são gaps DECLARADOS
        // (carimbados) — a diferença fica no log do serviço, não como dado inventado.
        gaps: out.noOpenContract + out.outsideArchive,
        failures: out.failures,
      };
    },
  };

  const clubCoordinates: EnrichQueueAdapter = {
    id: 'club-coordinates',
    label: 'coordenadas do clube (latitude/longitude)',
    keys: ['coordinates'],
    progress: () =>
      countPendingClubs(prisma, {
        media: ['coordinates'],
        needs: NEEDS_COORDINATES,
        refreshDays,
      }),
    run: (limit, { apply }) => coordenadasBatch(prisma, limit, apply, opts.resolverCoordenadas),
  };

  return [clubMedia, clubEditorial, clubExtraMedia, playerProfile, playerClub, clubCoordinates];
}

/**
 * Fila de coordenadas — reusa `extractClubCoordinatesBulk` (Wikidata CC0: P625 direto >
 * P159 sede > P115 estádio > P131 administrativo), o mesmo connector dos scripts
 * `enrich-clubs-coordinates-m1a2`/`resolve-club-coordinates-m1a3`.
 *
 * O que este caminho acrescenta em relação aos scripts: o CURSOR por tentativa. Os
 * scripts selecionam `latitude/longitude IS NULL` com `orderBy: id ASC` e — como clube
 * sem coordenada na fonte nunca sai do filtro — reprocessariam o mesmo começo para
 * sempre (é literalmente o defeito do T536/T547/T554). Aqui o clube sem fonte recebe
 * `no_source` e sai da fila; o gap fica DECLARADO em `clubs.mediaEnrichment.coordinates`.
 *
 * Procedência: grava `metadata.coordSource/coordPrecision/coordResolvedAt` (as chaves do
 * m1a3). NÃO toca `importedFrom` — isso é procedência da INGESTÃO, e o m1a3 registra a
 * mesma decisão. Nunca sobrescreve: o `updateMany` só casa com campo nulo.
 */
export async function coordenadasBatch(
  prisma: PrismaClient,
  limit: number,
  apply: boolean,
  resolver: typeof extractClubCoordinatesBulk = extractClubCoordinatesBulk,
): Promise<QueueRunResult> {
  const pendentes = await selectPendingClubs(prisma, { limit, media: ['coordinates'] });
  if (pendentes.length === 0) return { ...ZERO_RESULT };

  const clubs = await prisma.club.findMany({
    where: { id: { in: pendentes.map((p) => p.id) } },
    select: { id: true, qid: true, latitude: true, longitude: true, city: true, metadata: true },
    orderBy: { name: 'asc' },
  });

  let resultado: QueueRunResult = { ...ZERO_RESULT };
  const semCoordenada = clubs.filter((c) => c.latitude == null || c.longitude == null);

  // Clube que JÁ tem coordenada não consome requisição: sai da fila com o carimbo do
  // caso (o cursor registra o que aconteceu, sem inventar "enriquecido").
  for (const club of clubs) {
    if (club.latitude != null && club.longitude != null) {
      resultado = somar(resultado, { processed: 1, updated: 0, gaps: 0, failures: 0 });
      if (apply) await stampMediaAttempt(prisma, club.id, 'coordinates', 'already_present');
    }
  }

  if (semCoordenada.length === 0) return resultado;

  let resolvidas: Map<string, ClubCoordinateResult | null>;
  try {
    resolvidas = await resolver(
      semCoordenada.map((c) => c.qid!).filter((q): q is string => Boolean(q)),
    );
  } catch {
    // Falha de LEITURA (429/5xx/rede/batch): devolve a volta SEM carimbar — carimbar aqui
    // gravaria "sem coordenada na fonte" para o lote inteiro a partir de um timeout.
    return somar(resultado, { processed: 0, updated: 0, gaps: 0, failures: semCoordenada.length });
  }

  const agora = new Date().toISOString();
  for (const club of semCoordenada) {
    const r = club.qid ? (resolvidas.get(club.qid) ?? null) : null;
    if (!r) {
      // A entidade não existe na fonte OU não tem coordenada resolvível — é o mesmo
      // desfecho para o acervo: gap DECLARADO, carimbado, e a fila avança.
      if (apply) await stampMediaAttempt(prisma, club.id, 'coordinates', 'no_source');
      resultado = somar(resultado, { processed: 1, updated: 0, gaps: 1, failures: 0 });
      continue;
    }
    if (apply) {
      const meta = { ...((club.metadata as Record<string, unknown> | null) ?? {}) };
      meta.coordSource = r.source;
      meta.coordPrecision = r.confidence;
      meta.coordResolvedAt = agora;
      const res = await prisma.club.updateMany({
        where: { id: club.id, deletedAt: null, OR: [{ latitude: null }, { longitude: null }] },
        data: {
          ...(club.latitude == null ? { latitude: r.lat } : {}),
          ...(club.longitude == null ? { longitude: r.lng } : {}),
          ...(!club.city && r.cityLabel ? { city: r.cityLabel } : {}),
          metadata: meta as Prisma.InputJsonValue,
        },
      });
      await stampMediaAttempt(
        prisma,
        club.id,
        'coordinates',
        res.count === 1 ? 'enriched' : 'already_present',
      );
      resultado = somar(resultado, {
        processed: 1,
        updated: res.count === 1 ? 1 : 0,
        gaps: 0,
        failures: 0,
      });
      continue;
    }
    resultado = somar(resultado, { processed: 1, updated: 0, gaps: 0, failures: 0 });
  }
  return resultado;
}
