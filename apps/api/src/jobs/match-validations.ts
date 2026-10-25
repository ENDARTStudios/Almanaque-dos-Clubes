/**
 * T599/DQ-04 — VALIDAÇÕES DE PARTIDA + sincronização com a fila de revisão.
 *
 * ── O QUE FAZ ─────────────────────────────────────────────────────────────────────
 * Roda as checagens de consistência de `matches` (read-only), devolve anomalias e
 * ALIMENTA `review_queue` (idempotente: 1 linha PENDENTE por entidade+checagem —
 * o índice parcial UNIQUE da migration é quem garante; re-run não duplica).
 * Uma pessoa resolve ou descarta na tela de admin — nada aqui corrige dado.
 *
 * ── AS CHECAGENS ──────────────────────────────────────────────────────────────────
 * match_finished_without_score   — FINISHED sem placar (high)
 * match_negative_score           — placar negativo (high; nunca é legítimo)
 * match_same_club                — mandante == visitante (high)
 * match_future_not_scheduled     — data futura com status de jogo encerrado (high)
 * match_past_still_scheduled     — data passou e segue SCHEDULED (medium; ingestão
 *                                  pendente ou resultado ausente)
 * match_without_competition      — partida encerrada sem competição (medium; o
 *                                  acervo tem amistosos, então é sinal, não erro)
 */
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export interface MatchAnomaly {
  check: string;
  severity: 'high' | 'medium';
  title: string;
  count: number;
  sample: Array<{ id: string; detail: string }>;
}

const SAMPLE_SIZE = 10;

const CHECKS: ReadonlyArray<{
  check: string;
  severity: 'high' | 'medium';
  title: string;
  where: string;
  sample: string;
}> = [
  {
    check: 'match_finished_without_score',
    severity: 'high',
    title: 'Partida FINISHED sem placar preenchido',
    where: `status = 'FINISHED' AND ("homeScore" IS NULL OR "awayScore" IS NULL)`,
    sample: `SELECT id, "homeClubId", "awayClubId", date FROM matches
             WHERE status = 'FINISHED' AND ("homeScore" IS NULL OR "awayScore" IS NULL)
             ORDER BY date DESC LIMIT ${SAMPLE_SIZE}`,
  },
  {
    check: 'match_negative_score',
    severity: 'high',
    title: 'Partida com placar negativo',
    where: `("homeScore" < 0 OR "awayScore" < 0)`,
    sample: `SELECT id, "homeScore", "awayScore" FROM matches
             WHERE "homeScore" < 0 OR "awayScore" < 0 LIMIT ${SAMPLE_SIZE}`,
  },
  {
    check: 'match_same_club',
    severity: 'high',
    title: 'Partida com mandante = visitante',
    where: `"homeClubId" = "awayClubId"`,
    sample: `SELECT id, "homeClubId", date FROM matches
             WHERE "homeClubId" = "awayClubId" LIMIT ${SAMPLE_SIZE}`,
  },
  {
    check: 'match_future_not_scheduled',
    severity: 'high',
    title: 'Partida com data futura e status de jogo encerrado/ao vivo',
    where: `date > now() AND status IN ('FINISHED', 'LIVE')`,
    sample: `SELECT id, status, date FROM matches
             WHERE date > now() AND status IN ('FINISHED', 'LIVE')
             ORDER BY date LIMIT ${SAMPLE_SIZE}`,
  },
  {
    check: 'match_past_still_scheduled',
    severity: 'medium',
    title: 'Partida no passado ainda SCHEDULED (ingestão pendente ou resultado ausente)',
    where: `date < now() - interval '1 day' AND status = 'SCHEDULED'`,
    sample: `SELECT id, date FROM matches
             WHERE date < now() - interval '1 day' AND status = 'SCHEDULED'
             ORDER BY date DESC LIMIT ${SAMPLE_SIZE}`,
  },
  {
    check: 'match_without_competition',
    severity: 'medium',
    title: 'Partida encerrada sem competição associada',
    where: `"competitionId" IS NULL AND status = 'FINISHED'`,
    sample: `SELECT id, date FROM matches
             WHERE "competitionId" IS NULL AND status = 'FINISHED'
             ORDER BY date DESC LIMIT ${SAMPLE_SIZE}`,
  },
];

/** Roda as checagens (READ-ONLY). */
export async function runMatchValidations(): Promise<MatchAnomaly[]> {
  const anomalies: MatchAnomaly[] = [];
  for (const c of CHECKS) {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*) AS n FROM matches WHERE ${c.where}`,
    );
    const count = Number(rows[0]?.n ?? 0);
    if (count === 0) continue;
    const sampleRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(c.sample);
    anomalies.push({
      check: c.check,
      severity: c.severity,
      title: c.title,
      count,
      sample: sampleRows.map((r) => ({
        id: String(r.id),
        detail: Object.entries(r)
          .filter(([k]) => k !== 'id')
          .map(([k, v]) => `${k}=${v === null ? 'null' : String(v)}`)
          .join(' · '),
      })),
    });
  }
  return anomalies;
}

/**
 * Alimenta a fila (idempotente): 1 linha PENDENTE por (entityType, entityId,
 * check) — a UNIQUE parcial da migration é quem impede duplicata; violação
 * (P2002) é o caminho feliz do re-run e é ignorada.
 */
export async function syncAnomaliesToQueue(anomalies: MatchAnomaly[]): Promise<{
  queued: number;
  alreadyPending: number;
}> {
  let queued = 0;
  let alreadyPending = 0;
  for (const anomaly of anomalies) {
    for (const sample of anomaly.sample) {
      const reason = `${anomaly.title} — ${sample.detail}`;
      const exists = await prisma.reviewQueue.findFirst({
        where: {
          entityType: 'Match',
          entityId: sample.id,
          check: anomaly.check,
          status: 'PENDING',
        },
        select: { id: true },
      });
      if (exists) {
        alreadyPending += 1;
        continue;
      }
      try {
        await prisma.reviewQueue.create({
          data: {
            entityType: 'Match',
            entityId: sample.id,
            check: anomaly.check,
            reason,
            severity: anomaly.severity,
          },
        });
        queued += 1;
      } catch {
        // Corrida benigna (duas execuções simultâneas): a UNIQUE parcial decide.
        alreadyPending += 1;
      }
    }
  }
  if (queued + alreadyPending > 0) {
    logger.info(
      { queued, alreadyPending, checks: anomalies.map((a) => a.check) },
      'match-validations → review_queue',
    );
  }
  return { queued, alreadyPending };
}
