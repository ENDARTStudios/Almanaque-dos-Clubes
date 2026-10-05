/**
 * WS-C-10 — propostas de edição da userDescription (comunidade colaborativa).
 *
 * Qualquer usuário autenticado PROPÕE; editor ativo do clube REVISA
 * (approve/reject). Regras de moderação:
 *  - 1 proposta pending por usuário+clube (409 — anti-spam, no código);
 *  - editor que propõe tem auto-aprovação (aplica direto + registra approved);
 *  - editor NÃO revisa a própria proposta (403);
 *  - aprovar aplica o texto no clube via updateDescription (WS-C-9: sanitize,
 *    auditoria, invalidação de cache) e notifica o proponente (WS-C-8).
 *
 * Escrita na revisão roda como SERVICE (RLS: cdp_update_service) APÓS as
 * verificações de negócio no código (regra: RLS é defesa em profundidade).
 */
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { DomainError, NotFoundError } from '@almanaque/domain';
import { isActiveOwner, sanitizeDescription, updateDescription } from './club-ownership.service.js';
import type { SessionMetadata } from '../auth/session.service.js';

export interface ProposalView {
  id: string;
  proposedBy: string;
  proposerName: string | null;
  userDescription: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
}

/** Última proposta do usuário no clube (para proposalStatus no GET /clubs/:id). */
export async function latestProposalStatus(userId: string, clubId: string): Promise<string | null> {
  const p = await withRlsContext({ userId }, (tx) =>
    tx.clubDescriptionProposal.findFirst({
      where: { proposedBy: userId, clubId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    }),
  );
  return p?.status ?? null;
}

/** Quantas propostas pendentes o clube tem (para editors). */
export async function pendingCount(clubId: string): Promise<number> {
  return withRlsContext({ role: 'SERVICE' }, async (tx) =>
    tx.clubDescriptionProposal.count({ where: { clubId, status: 'pending' } }),
  );
}

/**
 * Propõe uma edição. Editor ativo → auto-aprova (aplica + registra approved).
 * Não-editor → registra pending (409 se já tem pending para o clube).
 */
export async function propose(
  userId: string,
  clubId: string,
  rawText: string,
  metadata: SessionMetadata = {},
): Promise<{ status: 'pending' | 'approved' }> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true },
  });
  if (!club) throw new NotFoundError('Clube', clubId);

  // Editor ativo: auto-aprovação — aplica direto e registra approved.
  if (await isActiveOwner(userId, clubId)) {
    await updateDescription(userId, clubId, rawText, metadata);
    await withRlsContext({ role: 'SERVICE' }, async (tx) =>
      tx.clubDescriptionProposal.create({
        data: {
          clubId,
          proposedBy: userId,
          userDescription: sanitizeDescription(rawText),
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: userId,
          reviewNote: 'auto-aprovado (editor do clube)',
        },
      }),
    );
    await auditLog.record({
      entityType: EntityType.CLUB,
      entityId: clubId,
      action: AuditAction.ENTITY_UPDATE,
      userId,
      metadata: { ip: metadata.ipAddress, kind: 'description_proposal', autoApproved: true },
    });
    return { status: 'approved' };
  }

  // Anti-spam: só 1 pending por usuário+clube.
  const existingPending = await withRlsContext({ userId }, (tx) =>
    tx.clubDescriptionProposal.findFirst({
      where: { proposedBy: userId, clubId, status: 'pending' },
      select: { id: true },
    }),
  );
  if (existingPending) {
    throw new DomainError(
      'Você já tem uma proposta pendente para este clube',
      'PROPOSAL_ALREADY_PENDING',
      409,
    );
  }

  const text = sanitizeDescription(rawText);
  await withRlsContext({ userId }, async (tx) =>
    tx.clubDescriptionProposal.create({
      data: { clubId, proposedBy: userId, userDescription: text, status: 'pending' },
    }),
  );
  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: clubId,
    action: AuditAction.ENTITY_CREATE,
    userId,
    metadata: { ip: metadata.ipAddress, kind: 'description_proposal', status: 'pending' },
  });
  return { status: 'pending' };
}

/** Pendentes do clube — SOMENTE para editor ativo (403 caso contrário). */
export async function listPendingForReview(
  userId: string,
  clubId: string,
): Promise<ProposalView[]> {
  if (!(await isActiveOwner(userId, clubId))) {
    throw new DomainError('Sem ownership ativa neste clube', 'NOT_CLUB_OWNER', 403);
  }
  const rows = await withRlsContext(
    { role: 'SERVICE' },
    (tx) =>
      tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "proposedBy", proposer_name AS "proposerName", "userDescription",
             status, "createdAt", "reviewedAt", "reviewedBy", reviewer_name AS "reviewerName",
             "reviewNote"
      FROM club_proposals_list(${clubId}, 'pending')`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    proposedBy: String(r.proposedBy),
    proposerName: (r.proposerName as string | null) ?? null,
    userDescription: String(r.userDescription),
    status: String(r.status),
    createdAt: new Date(r.createdAt as string),
    reviewedAt: r.reviewedAt ? new Date(r.reviewedAt as string) : null,
    reviewedBy: (r.reviewedBy as string | null) ?? null,
    reviewerName: (r.reviewerName as string | null) ?? null,
    reviewNote: (r.reviewNote as string | null) ?? null,
  }));
}

/**
 * Revisa (approve/reject). Exige editor ativo; bloqueia auto-revisão;
 * aprovar aplica o texto (WS-C-9 updateDescription) + notifica o proponente.
 */
export async function review(
  reviewerId: string,
  clubId: string,
  proposalId: string,
  action: 'approve' | 'reject',
  reviewNote: string | null,
  metadata: SessionMetadata = {},
): Promise<{ status: 'approved' | 'rejected' }> {
  if (!(await isActiveOwner(reviewerId, clubId))) {
    throw new DomainError('Sem ownership ativa neste clube', 'NOT_CLUB_OWNER', 403);
  }

  const proposal = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubDescriptionProposal.findUnique({ where: { id: proposalId } }),
  );
  if (!proposal || proposal.clubId !== clubId) {
    throw new NotFoundError('Proposta', proposalId);
  }
  if (proposal.status !== 'pending') {
    throw new DomainError('Proposta já revisada', 'PROPOSAL_ALREADY_REVIEWED', 409);
  }
  // Regra de moderação: editor não revisa a própria proposta.
  if (proposal.proposedBy === reviewerId) {
    throw new DomainError(
      'Editor não pode revisar a própria proposta',
      'SELF_REVIEW_FORBIDDEN',
      403,
    );
  }

  const now = new Date();
  const status = action === 'approve' ? 'approved' : 'rejected';

  if (action === 'approve') {
    // Reaproveita o pipeline do WS-C-9 (sanitize + teto + auditoria + cache).
    await updateDescription(reviewerId, clubId, proposal.userDescription, metadata);
  }

  await withRlsContext({ role: 'SERVICE' }, async (tx) =>
    tx.clubDescriptionProposal.update({
      where: { id: proposalId },
      data: { status, reviewedAt: now, reviewedBy: reviewerId, reviewNote },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: clubId,
    action: AuditAction.ENTITY_UPDATE,
    userId: reviewerId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'description_proposal_review',
      proposalId,
      status,
    },
  });

  // Fecha o loop: notifica o proponente (WS-C-8).
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  await createNotification(proposal.proposedBy, 'proposal_reviewed', {
    clubId,
    clubName: club?.name ?? null,
    status,
    reviewNote,
  });

  return { status };
}
