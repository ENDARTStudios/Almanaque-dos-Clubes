/**
 * WS-C-11 — denúncias (moderação defensiva).
 *
 * Usuário autenticado REPORTA (club_description | proposal); admin com a
 * permissão `reports:moderate` lista pendentes, resolve (remove_content/
 * warn_user/suspend_user/no_action) ou descarta.
 *
 * - Criação valida o alvo (clube com userDescription / proposta pending);
 * - Moderação (listar/resolver/descartar) roda como SERVICE após o gate
 *   `requirePermission(REPORTS_MODERATE)` na rota (RLS = defesa em
 *   profundidade; regra D-2026-10-02);
 * - remove_content: club_description → limpa userDescription (NULL nas 3
 *   colunas + invalida cache); proposal → deleta a proposta;
 * - Toda moderação gera auditoria append-only.
 */
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { cache } from '../../services/cache.js';
import { DomainError, NotFoundError } from '@almanaque/domain';
import type { SessionMetadata } from '../auth/session.service.js';

export type ReportTargetType = 'club_description' | 'proposal';

interface PendingRow {
  id: string;
  reporterId: string;
  reporterName: string | null;
  targetType: string;
  targetId: string;
  targetClubName: string | null;
  reason: string;
  details: string | null;
  createdAt: Date;
  reportCount: number;
}

/** Cria a denúncia após validar o alvo. */
export async function createReport(
  reporterId: string,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    details?: string | null;
  },
  metadata: SessionMetadata = {},
): Promise<{ id: string }> {
  if (input.targetType === 'club_description') {
    const club = await prisma.club.findUnique({
      where: { id: input.targetId },
      select: { id: true, userDescription: true },
    });
    if (!club) throw new NotFoundError('Clube', input.targetId);
    if (!club.userDescription) {
      throw new DomainError(
        'Este clube não tem descrição comunitária para denunciar',
        'NOTHING_TO_REPORT',
        400,
      );
    }
  } else {
    const proposal = await prisma.clubDescriptionProposal.findUnique({
      where: { id: input.targetId },
      select: { id: true, status: true },
    });
    if (!proposal) throw new NotFoundError('Proposta', input.targetId);
    if (proposal.status !== 'pending') {
      throw new DomainError(
        'Só propostas pendentes podem ser denunciadas',
        'NOTHING_TO_REPORT',
        400,
      );
    }
  }

  const report = await withRlsContext({ userId: reporterId }, async (tx) =>
    tx.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        status: 'pending',
      },
      select: { id: true },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: input.targetId,
    action: AuditAction.ENTITY_CREATE,
    userId: reporterId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'report',
      reportId: report.id,
      targetType: input.targetType,
      reason: input.reason,
    },
  });
  return { id: report.id };
}

/** Pendentes para moderação (admin — gate na rota). Ordena por report_count. */
export async function listPending(): Promise<{ reports: PendingRow[]; total: number }> {
  const rows = await withRlsContext(
    { role: 'SERVICE' },
    (tx) =>
      tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "reporterId", reporter_name AS "reporterName", "targetType", "targetId",
             target_club_name AS "targetClubName", reason, details, "createdAt", report_count
      FROM reports_pending_list()`,
  );
  const reports = rows.map((r) => ({
    id: String(r.id),
    reporterId: String(r.reporterId),
    reporterName: (r.reporterName as string | null) ?? null,
    targetType: String(r.targetType),
    targetId: String(r.targetId),
    targetClubName: (r.targetClubName as string | null) ?? null,
    reason: String(r.reason),
    details: (r.details as string | null) ?? null,
    createdAt: new Date(r.createdAt as string),
    reportCount: Number(r.report_count),
  }));
  return { reports, total: reports.length };
}

/** O alvo ainda existe/é denunciável? (usado antes do remove_content) */
async function applyRemoveContent(targetType: string, targetId: string): Promise<void> {
  if (targetType === 'club_description') {
    await prisma.club.update({
      where: { id: targetId },
      data: {
        userDescription: null,
        userDescriptionSource: null,
        userDescriptionUpdatedAt: null,
      },
    });
    await cache.invalidate(`clubs:byId:${targetId}`);
  } else {
    await prisma.clubDescriptionProposal.deleteMany({ where: { id: targetId } });
  }
}

/**
 * Resolve a denúncia (admin). remove_content aplica a remoção do conteúdo.
 */
export async function resolveReport(
  adminId: string,
  reportId: string,
  action: 'remove_content' | 'warn_user' | 'suspend_user' | 'no_action',
  reviewNote: string | null,
  metadata: SessionMetadata = {},
): Promise<{ status: 'resolved' }> {
  const report = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.report.findUnique({ where: { id: reportId } }),
  );
  if (!report) throw new NotFoundError('Denúncia', reportId);
  if (report.status !== 'pending') {
    throw new DomainError('Denúncia já revisada', 'REPORT_ALREADY_REVIEWED', 409);
  }

  if (action === 'remove_content') {
    await applyRemoveContent(report.targetType, report.targetId);
  }
  // warn_user / suspend_user: M4 (requer notificação ao afetado / fluxo de ban).

  await withRlsContext({ role: 'SERVICE' }, async (tx) =>
    tx.report.update({
      where: { id: reportId },
      data: {
        status: 'resolved',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewAction: action,
        reviewNote,
      },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: report.targetId,
    action: AuditAction.ENTITY_UPDATE,
    userId: adminId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'report_resolve',
      reportId,
      action,
      targetType: report.targetType,
    },
  });
  return { status: 'resolved' };
}

/** Descarta a denúncia (admin) — conteúdo permanece. */
export async function dismissReport(
  adminId: string,
  reportId: string,
  reviewNote: string | null,
  metadata: SessionMetadata = {},
): Promise<{ status: 'dismissed' }> {
  const report = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.report.findUnique({ where: { id: reportId } }),
  );
  if (!report) throw new NotFoundError('Denúncia', reportId);
  if (report.status !== 'pending') {
    throw new DomainError('Denúncia já revisada', 'REPORT_ALREADY_REVIEWED', 409);
  }

  await withRlsContext({ role: 'SERVICE' }, async (tx) =>
    tx.report.update({
      where: { id: reportId },
      data: { status: 'dismissed', reviewedAt: new Date(), reviewedBy: adminId, reviewNote },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: report.targetId,
    action: AuditAction.ENTITY_UPDATE,
    userId: adminId,
    metadata: { ip: metadata.ipAddress, kind: 'report_dismiss', reportId },
  });
  return { status: 'dismissed' };
}

/** O usuário já reportou este alvo? (GET /clubs/:id — hasReported) */
export async function hasReported(
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<boolean> {
  const r = await withRlsContext({ userId }, (tx) =>
    tx.report.findFirst({
      where: { reporterId: userId, targetType, targetId },
      select: { id: true },
    }),
  );
  return r !== null;
}
