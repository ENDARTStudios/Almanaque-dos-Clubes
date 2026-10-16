/**
 * T551 (extraído no T575) — vincula JOGADOR → CLUBE ATUAL a partir do P54 do Wikidata.
 *
 * A regra de "clube atual" (inferência, não campo direto) mora em `player-current-club.ts`.
 * Este módulo é só o LOTE: seleciona quem ainda não teve a tentativa (`media: ['club']`),
 * resolve o P54, escreve `players."clubId"` quando o alvo é clube DO ACERVO e carimba a
 * tentativa em TODOS os caminhos de saída — inclusive "sem contrato aberto" e "time fora
 * do acervo", que são gaps declarados. Sem o carimbo o jogador reencabeça a fila para
 * sempre (o defeito que congelou o lote de mídia no T528).
 *
 * Por que virou service (T575): era lógica embutida no `main()` do script
 * `link-players-clubs-t551.ts`, e o bot de enriquecimento contínuo precisa da MESMA fila.
 * Reescrever a inferência no bot seria a segunda implementação do mesmo predicado — foi
 * exatamente o que divergiu no T536 (CLI e service com lógicas separadas). O script agora
 * é wrapper fino daqui e o comportamento do CLI não muda.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as prismaSingleton } from '../../config/prisma.js';
import { fetchEntities, MEDIA_USER_AGENT } from './connectors/wikidata-media.connector.js';
import { currentTeamQid, type P54StatementLike } from './player-current-club.js';
import { selectPendingPlayers, stampPlayerAttempt } from './media-cursor.js';

export interface LinkPlayersClubsOptions {
  apply: boolean;
  prisma?: PrismaClient;
  /** Reprocessar quem foi tentado há mais de N dias (transferência muda o clube atual). */
  refreshDays?: number;
  /** Janela de recência do P580, em anos (default 5). */
  maxAgeYears?: number;
  /**
   * IO injetável: em produção é `fetchEntities` (Wikidata em lotes de 50); nos testes, um
   * double. O caminho de DECISÃO (o que vincula, o que vira gap declarado e o que NÃO
   * carimba em falha de leitura) precisa ser provável sem rede — mesmo princípio do
   * `ClubDeps` do lote unificado.
   */
  fetchFn?: typeof fetchEntities;
}

export interface LinkPlayersClubsResult {
  /** Jogadores que saíram da fila nesta rodada. */
  processed: number;
  /** Jogadores que ganharam `clubId` nesta rodada. */
  linked: number;
  /** Sem contrato em aberto confiável (aposentado/aberto velho/sem data) — gap declarado. */
  noOpenContract: number;
  /** Time atual é real, mas não está no acervo — gap declarado (e curável numa ingestão). */
  outsideArchive: number;
  /** QIDs-alvo distintos encontrados pelo P54. */
  targetQids: number;
  /** Quantos desses QIDs são clubes do acervo (`kind='club'`). */
  targetClubsFound: number;
  /** Falha de LEITURA na fonte (429/5xx/rede): nada foi carimbado, a fila não andou. */
  failures: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Processa até `limit` jogadores da fila de vínculo. Nunca sobrescreve `clubId` já
 * preenchido (`needs: clubId IS NULL`), nunca escreve clube que não esteja no acervo, e
 * nunca carimba tentativa quando a leitura da fonte falhou.
 */
export async function linkPlayersClubsBatch(
  limit: number,
  opts: LinkPlayersClubsOptions,
): Promise<LinkPlayersClubsResult> {
  const prisma = opts.prisma ?? prismaSingleton;
  const maxAgeYears = opts.maxAgeYears ?? 5;
  const vazio: LinkPlayersClubsResult = {
    processed: 0,
    linked: 0,
    noOpenContract: 0,
    outsideArchive: 0,
    targetQids: 0,
    targetClubsFound: 0,
    failures: 0,
  };

  // Cursor próprio (`club`): a fila avança por tentativa, não por "campo vazio".
  const pendentes = await selectPendingPlayers(prisma, {
    limit,
    media: ['club'],
    needs: Prisma.sql`"clubId" IS NULL`,
    refreshDays: opts.refreshDays,
  });
  if (pendentes.length === 0) return vazio;

  const entities = new Map<string, { claims?: Record<string, unknown> }>();
  const qids = pendentes.map((p) => p.qid);
  const buscar = opts.fetchFn ?? fetchEntities;
  try {
    for (let i = 0; i < qids.length; i += 50) {
      const res = await buscar(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) entities.set(qid, e as { claims?: Record<string, unknown> });
    }
  } catch {
    // Falha de LEITURA não é "sem clube": devolver a rodada sem carimbar deixa a fila
    // intacta para a próxima volta (carimbar aqui gravaria gap falso para o lote inteiro).
    return { ...vazio, processed: 0, failures: pendentes.length };
  }

  const alvo = new Map<string, string>();
  let semContratoAberto = 0;
  for (const p of pendentes) {
    const t = currentTeamQid(entities.get(p.qid)?.claims?.P54 as P54StatementLike[] | undefined, {
      maxAgeYears,
    });
    if (t) alvo.set(p.id, t);
    else semContratoAberto += 1;
  }

  // Só vincula a clube DO ACERVO, e só se for clube de verdade (P54 aponta para seleção
  // e time juvenil também; `kind` filtra).
  const qidsAlvo = [...new Set(alvo.values())];
  const clubes = qidsAlvo.length
    ? await prisma.club.findMany({
        where: { qid: { in: qidsAlvo }, deletedAt: null, kind: 'club' },
        select: { id: true, qid: true },
      })
    : [];
  const porQid = new Map(clubes.map((c) => [c.qid as string, c.id]));

  let vinculados = 0;
  let foraDoAcervo = 0;
  for (const p of pendentes) {
    const alvoQid = alvo.get(p.id);
    const clubId = alvoQid ? porQid.get(alvoQid) : undefined;
    if (clubId) {
      if (opts.apply) {
        await prisma.player.update({ where: { id: p.id }, data: { clubId } });
        await stampPlayerAttempt(prisma, p.id, 'club', 'enriched');
      }
      vinculados += 1;
      continue;
    }
    // Nada gravado: carimba a TENTATIVA (senão o jogador volta à cabeça da fila sempre).
    if (opts.apply) await stampPlayerAttempt(prisma, p.id, 'club', 'no_source');
    if (alvoQid) foraDoAcervo += 1;
  }

  return {
    processed: pendentes.length,
    linked: vinculados,
    noOpenContract: semContratoAberto,
    outsideArchive: foraDoAcervo,
    targetQids: qidsAlvo.length,
    targetClubsFound: porQid.size,
    failures: 0,
  };
}
