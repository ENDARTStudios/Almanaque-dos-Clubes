/**
 * T602 — FILA DE INGESTÃO CONTÍNUA (`ingest_backlog`).
 *
 * ── O PROBLEMA QUE RESOLVE ────────────────────────────────────────────────────────
 * O acervo tinha enrichers e um bot de lacunas, mas quem decidia "o que rodar agora"
 * era uma pessoa. Isto transforma a decisão em FILA: o planejador lê a MATRIZ DE
 * COBERTURA (DQ-01), compara com as temporadas que a fonte publica e cria itens de
 * trabalho. O job consome a fila um lote por vez, com teto e com retry — sem
 * aprovação a cada rodada.
 *
 * ── REGRAS QUE NÃO SE NEGOCIAM (lições T528) ─────────────────────────────────────
 * 1. **Falha transitória NÃO marca DONE.** Item volta a PENDING com `attempts+1`; só
 *    sucesso comprovado fecha. Marcar concluído no erro foi o bug que perdeu 250
 *    registros em 11-2026.
 * 2. **Back-pressure:** um item por vez, com pausa; rate limit é por rajada.
 * 3. **Fonte bloqueada não vira item** — o registro de fontes decide antes.
 * 4. **Idempotente:** a chave (sourceKey, season) é única; re-planejar é noop.
 */
import type { PrismaClient } from '@prisma/client';
import { isAutomationAllowed } from './source-registry.js';

/** Razão de cobertura de `scorers` abaixo da qual a temporada volta para a fila.
 * 0,95 = meta P0 (docs/META-DADOS-COMPLETOS.md). */
export const SCORERS_TARGET_RATIO = 0.95;

export interface PlannedItem {
  sourceKey: string;
  seasonLabel: string;
  competitionQid: string;
  /** Por que este item existe (auditoria: "nunca ingerida" × "sem placar" × "sem autor de gol"). */
  reason: 'never_ingested' | 'missing_scores' | 'missing_scorers';
  /** Temporadas já presentes no acervo para a competição (contagem por ano). */
  seasonLabelYear: number | null;
}

export interface SourceSeasonRef {
  sourceKey: string;
  competitionQid: string;
  seasons: Array<{ label: string }>;
}

export interface CoverageStat {
  qid: string | null;
  year: number;
  matchesTotal: number;
  matchesWithScore: number;
  matchesWithScorers: number;
}

/** Ano da temporada a partir do rótulo ("2023" → 2023; "2018-19" → 2018). */
export function seasonYear(label: string): number | null {
  const m = /(\d{4})/.exec(label);
  if (!m) return null;
  const y = Number.parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * PURA — planeja a fila a partir das temporadas publicadas pela fonte e da
 * cobertura já existente. Não cria item para fonte bloqueada, nem para temporada
 * já completa.
 */
export function planBacklog(sources: SourceSeasonRef[], coverage: CoverageStat[]): PlannedItem[] {
  const porQidAno = new Map<string, CoverageStat[]>();
  for (const c of coverage) {
    if (!c.qid) continue;
    const key = `${c.qid}:${c.year}`;
    porQidAno.set(key, [...(porQidAno.get(key) ?? []), c]);
  }

  const items: PlannedItem[] = [];
  for (const src of sources) {
    if (!isAutomationAllowed(src.sourceKey)) continue;
    for (const season of src.seasons) {
      const ano = seasonYear(season.label);
      if (ano === null) continue;
      const stats = porQidAno.get(`${src.competitionQid}:${ano}`) ?? [];
      if (stats.length === 0) {
        items.push({
          sourceKey: src.sourceKey,
          seasonLabel: season.label,
          competitionQid: src.competitionQid,
          reason: 'never_ingested',
          seasonLabelYear: ano,
        });
        continue;
      }
      const total = stats.reduce((n, s) => n + s.matchesTotal, 0);
      const comPlacar = stats.reduce((n, s) => n + s.matchesWithScore, 0);
      const comGols = stats.reduce((n, s) => n + s.matchesWithScorers, 0);
      // Temporada existe mas tem partida sem placar: vale revisitar a fonte.
      if (total > 0 && comPlacar < total) {
        items.push({
          sourceKey: src.sourceKey,
          seasonLabel: season.label,
          competitionQid: src.competitionQid,
          reason: 'missing_scores',
          seasonLabelYear: ano,
        });
      } else if (total > 0 && comGols < total * SCORERS_TARGET_RATIO) {
        // O MAIOR gap do acervo: 126 de 17.265 partidas têm autor do gol — e é o
        // dado que alimenta o ranking de jogador. Placar completo NÃO significa
        // temporada completa: sem esta checagem a fila nascia vazia.
        items.push({
          sourceKey: src.sourceKey,
          seasonLabel: season.label,
          competitionQid: src.competitionQid,
          reason: 'missing_scorers',
          seasonLabelYear: ano,
        });
      }
    }
  }
  return items;
}

/** Prioridade: mais recente primeiro (o produto vive do presente). */
export function orderBacklog<T extends { seasonLabelYear: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.seasonLabelYear ?? 0) - (a.seasonLabelYear ?? 0));
}

/**
 * Sincroniza a fila no banco: cria os PENDING que faltam, deixa o resto intocado
 * (item DONE não volta; item FAILED vira PENDING para nova tentativa).
 */
export async function syncBacklog(
  prisma: PrismaClient,
  items: PlannedItem[],
): Promise<{
  created: number;
  requeued: number;
  skipped: number;
}> {
  let created = 0;
  let requeued = 0;
  let skipped = 0;
  for (const item of orderBacklog(items)) {
    const existing = await prisma.ingestBacklog.findUnique({
      where: {
        sourceKey_season: { sourceKey: item.sourceKey, season: item.seasonLabel },
      },
      select: { id: true, status: true },
    });
    if (!existing) {
      await prisma.ingestBacklog.create({
        data: {
          sourceKey: item.sourceKey,
          season: item.seasonLabel,
          competitionQid: item.competitionQid,
          status: 'PENDING',
          reason: item.reason,
        },
      });
      created += 1;
      continue;
    }
    if (existing.status === 'FAILED') {
      await prisma.ingestBacklog.update({
        where: { id: existing.id },
        data: { status: 'PENDING' },
      });
      requeued += 1;
      continue;
    }
    skipped += 1;
  }
  return { created, requeued, skipped };
}

/** Teto de tentativas antes de exigir olho humano (não fica tentando para sempre). */
export const MAX_ATTEMPTS = 4;

/** Lote: pega PENDING por prioridade de temporada (mais recente primeiro). */
export async function nextBatch(prisma: PrismaClient, limit: number) {
  const rows = await prisma.ingestBacklog.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: [{ createdAt: 'asc' }],
    take: limit,
  });
  return rows;
}

export interface ItemOutcome {
  ok: boolean;
  /** `true` só quando a fonte respondeu e o parse rodou; transitório = false. */
  transient: boolean;
  detail: string;
}

/** Fecha o item: sucesso = DONE; falha transitória = PENDING (nunca DONE). */
export async function closeItem(
  prisma: PrismaClient,
  id: string,
  outcome: ItemOutcome,
): Promise<void> {
  if (outcome.ok) {
    await prisma.ingestBacklog.update({
      where: { id },
      data: {
        status: 'DONE',
        finishedAt: new Date(),
        lastError: null,
        attempts: { increment: 1 },
      },
    });
    return;
  }
  const current = await prisma.ingestBacklog.findUnique({
    where: { id },
    select: { attempts: true },
  });
  const attempts = (current?.attempts ?? 0) + 1;
  await prisma.ingestBacklog.update({
    where: { id },
    data: {
      // Transitória volta para a fila; definitiva (ou teto de tentativas) vira FAILED.
      status: !outcome.transient || attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
      attempts,
      lastError: outcome.detail.slice(0, 500),
    },
  });
}
