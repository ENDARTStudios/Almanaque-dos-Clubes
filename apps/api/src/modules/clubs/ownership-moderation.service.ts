/**
 * WS-C-9 — moderação de posses de clube (critério C3/C4).
 * Regra de negócio fora da rota (padrão do repo: rota fina, serviço com a
 * regra) — a rota em modules/admin/club-ownership.routes.ts só traduz HTTP.
 *
 * Toda decisão registra QUEM aprovou/revogou: approvedBy/approvedAt/reviewedBy
 * na posse + auditoria append-only. Aprovação é humana — nada de automático.
 */
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { DomainError } from '@almanaque/domain';
import type { OwnershipStatus } from './club-ownership.service.js';

export interface ModerationOwnershipView {
  id: string;
  userId: string;
  clubId: string;
  role: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  reviewedBy: string | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  userEmail: string;
  userName: string | null;
  clubName: string | null;
  clubKind: string | null;
}

/**
 * Fila de moderação. Default (sem status): pendentes + ativas + suspensas —
 * revogadas saem da fila (decisão morta; fica na auditoria).
 */
export async function listOwnershipsForModeration(options: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ModerationOwnershipView[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const status = options.status && options.status !== 'all' ? options.status : undefined;
  const where = status ? { status } : { status: { in: ['pending', 'active', 'suspended'] } };

  const { rows, total } = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
    const rows = await tx.clubOwnership.findMany({
      where,
      orderBy: { requestedAt: 'asc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        clubId: true,
        role: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        approvedBy: true,
        reviewedBy: true,
        evidenceUrl: true,
        evidenceNote: true,
        user: { select: { email: true, name: true } },
        club: { select: { name: true, kind: true } },
      },
    });
    const total = await tx.clubOwnership.count({ where });
    return { rows, total };
  });

  const items = rows.map(({ user, club, ...o }) => ({
    ...o,
    userEmail: user.email,
    userName: user.name,
    clubName: club.name,
    clubKind: club.kind,
  }));
  return { items, total };
}

/** Pendente → ativo, registrando QUEM aprovou (C3). Notifica o solicitante. */
export async function approveOwnership(
  reviewerId: string,
  ownershipId: string,
): Promise<{ id: string; userId: string; clubId: string; status: OwnershipStatus }> {
  const ownership = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { id: ownershipId },
      select: { id: true, userId: true, clubId: true, status: true },
    }),
  );
  if (!ownership) throw new DomainError('Posse não encontrada', 'NOT_FOUND', 404);
  if (ownership.status !== 'pending') {
    throw new DomainError('Só posse pendente pode ser aprovada', 'OWNERSHIP_NOT_PENDING', 409);
  }

  const now = new Date();
  const updated = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubOwnership.update({
      where: { id: ownership.id },
      data: {
        status: 'active',
        approvedAt: now,
        approvedBy: reviewerId,
        reviewedBy: reviewerId,
      },
      select: { id: true, userId: true, clubId: true, status: true },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: updated.clubId,
    action: AuditAction.ENTITY_UPDATE,
    userId: reviewerId,
    metadata: {
      via: 'admin',
      kind: 'club_ownership_review',
      action: 'approve',
      ownershipId: updated.id,
      claimantUserId: updated.userId,
    },
  });

  await notifyClaimant(updated.userId, updated.clubId, 'approved', null);
  return updated as { id: string; userId: string; clubId: string; status: OwnershipStatus };
}

/**
 * Revogação imediata com motivo (C4, inclusive preventiva). Motivo registrado
 * em evidenceNote (marcado com data — preserva a evidência original) e na
 * auditoria. Histórico NUNCA é apagado.
 */
export async function revokeOwnership(
  reviewerId: string,
  ownershipId: string,
  reason: string,
): Promise<{ id: string; userId: string; clubId: string; status: OwnershipStatus }> {
  const ownership = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { id: ownershipId },
      select: { id: true, userId: true, clubId: true, status: true, evidenceNote: true },
    }),
  );
  if (!ownership) throw new DomainError('Posse não encontrada', 'NOT_FOUND', 404);
  if (ownership.status === 'revoked') {
    throw new DomainError('Posse já revogada', 'OWNERSHIP_ALREADY_REVOKED', 409);
  }

  const stamped = `[revogado ${new Date().toISOString()}] motivo: ${reason}`;
  const evidenceNote = ownership.evidenceNote ? `${ownership.evidenceNote}\n${stamped}` : stamped;

  const updated = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubOwnership.update({
      where: { id: ownership.id },
      data: { status: 'revoked', reviewedBy: reviewerId, evidenceNote },
      select: { id: true, userId: true, clubId: true, status: true },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: updated.clubId,
    action: AuditAction.ENTITY_UPDATE,
    userId: reviewerId,
    metadata: {
      via: 'admin',
      kind: 'club_ownership_review',
      action: 'revoke',
      ownershipId: updated.id,
      claimantUserId: updated.userId,
      reason,
    },
  });

  await notifyClaimant(updated.userId, updated.clubId, 'revoked', reason);
  return updated as { id: string; userId: string; clubId: string; status: OwnershipStatus };
}

/** Fecha o loop: notifica o solicitante da decisão (WS-C-8). */
async function notifyClaimant(
  userId: string,
  clubId: string,
  status: 'approved' | 'revoked',
  reviewNote: string | null,
): Promise<void> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  await createNotification(userId, 'proposal_reviewed', {
    kind: 'club_ownership',
    clubId,
    clubName: club?.name ?? null,
    status,
    reviewNote,
  });
}
