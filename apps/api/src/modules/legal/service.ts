/**
 * T470 — WS-L: serviço de direitos do titular (LGPD art. 18) e notificação
 * autoral (Lei 9.610/98 + análoga; SEM safe harbor formal).
 *
 * Todos os acessos a dados do titular rodam em `withRlsContext` (owner=USER;
 * transições/admin= SERVICE). Sem SMTP: nada de envio de e-mail.
 */
import { randomBytes } from 'node:crypto';
import { DomainError, NotFoundError } from '@almanaque/domain';
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { verifyPassword } from '../../config/crypto.js';
import { revokeAllUserSessions } from '../auth/session.service.js';
import { blockAccessToken } from '../auth/access-blocklist.service.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { legalRepository } from './repository.js';
import {
  sanitizeText,
  type CreateRightsRequestInput,
  type CreateNoticeInput,
  type CreateCounterNoticeInput,
} from './schema.js';

const BR_DAYS = 15;
const OTHER_DAYS = 30;

function newProtocol(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

/** Prazo: BR = 15 dias; EEA_UK/OTHER = 30 dias (prudência; não promete GDPR). */
export function deadlineFor(jurisdiction: 'BR' | 'EEA_UK' | 'OTHER', now = new Date()): Date {
  const days = jurisdiction === 'BR' ? BR_DAYS : OTHER_DAYS;
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Projeção pública de um pedido — NUNCA expõe internalNote. */
function toPublicDsr(r: {
  id: string;
  protocol: string;
  type: string;
  jurisdiction: string;
  status: string;
  description: string | null;
  requestedFields: unknown;
  deadlineAt: Date | null;
  completedAt: Date | null;
  responseSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    protocol: r.protocol,
    type: r.type,
    jurisdiction: r.jurisdiction,
    status: r.status,
    description: r.description,
    requestedFields: r.requestedFields,
    deadlineAt: r.deadlineAt,
    completedAt: r.completedAt,
    responseSummary: r.responseSummary,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toPublicNotice(n: {
  protocol: string;
  type: string;
  status: string;
  workTitle: string;
  workUrl: string | null;
  materialUrl: string;
  originalNoticeId: string | null;
  jurisdiction: string;
  responseSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    protocol: n.protocol,
    type: n.type,
    status: n.status,
    workTitle: n.workTitle,
    workUrl: n.workUrl,
    materialUrl: n.materialUrl,
    originalNoticeId: n.originalNoticeId,
    jurisdiction: n.jurisdiction,
    responseSummary: n.responseSummary,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

export const legalService = {
  // ----- Direitos do titular (autenticado) -----
  async createRightsRequest(userId: string, input: CreateRightsRequestInput) {
    const protocol = newProtocol('dsr');
    const deadlineAt = deadlineFor(input.jurisdiction);
    const created = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.createDsr(tx, {
        protocol,
        userId,
        type: input.type,
        jurisdiction: input.jurisdiction,
        description: sanitizeText(input.description),
        requestedFields: input.requestedFields ?? null,
        deadlineAt,
      }),
    );
    await auditLog.record({
      entityType: EntityType.DATA_SUBJECT_REQUEST,
      entityId: created.id,
      action: AuditAction.LEGAL_REQUEST_CREATED,
      userId,
      metadata: { protocol, type: input.type, jurisdiction: input.jurisdiction },
    });
    return toPublicDsr(created);
  },

  async listRightsRequests(userId: string) {
    const rows = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.listDsrByUser(tx, userId),
    );
    return rows.map(toPublicDsr);
  },

  async getRightsRequest(userId: string, protocol: string) {
    const row = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.findDsrByProtocol(tx, protocol),
    );
    if (!row || row.userId !== userId) throw new NotFoundError('Solicitação', protocol);
    return toPublicDsr(row);
  },

  /** Cancelamento pelo titular (transição → SERVICE; usuário não escreve status direto). */
  async cancelRightsRequest(userId: string, protocol: string) {
    const result = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const row = await legalRepository.findDsrByProtocol(tx, protocol);
      if (!row || row.userId !== userId) throw new NotFoundError('Solicitação', protocol);
      if (!['received', 'needs_verification', 'in_progress'].includes(row.status)) {
        throw new DomainError(
          'Pedido não pode ser cancelado no status atual',
          'INVALID_TRANSITION',
          409,
        );
      }
      return legalRepository.updateDsr(tx, row.id, { status: 'cancelled' });
    });
    await auditLog.record({
      entityType: EntityType.DATA_SUBJECT_REQUEST,
      entityId: protocol,
      action: AuditAction.LEGAL_REQUEST_CANCELLED,
      userId,
      metadata: { protocol },
    });
    return toPublicDsr(result);
  },

  /** Correção de perfil (somente nome; e-mail exige verificação — sem SMTP → pedido manual). */
  async updateProfile(userId: string, name: string | null | undefined) {
    const updated = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      tx.user.update({
        where: { id: userId },
        data: { name: name === undefined ? undefined : sanitizeText(name, 120) },
        select: { id: true, email: true, name: true },
      }),
    );
    await auditLog.record({
      entityType: EntityType.USER,
      entityId: userId,
      action: AuditAction.LEGAL_REQUEST_UPDATED,
      userId,
    });
    return updated;
  },

  // ----- Exportação pessoal -----
  async exportPersonalData(userId: string) {
    const data = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.gatherPersonalData(tx, userId),
    );
    await auditLog.record({
      entityType: EntityType.USER,
      entityId: userId,
      action: AuditAction.LEGAL_EXPORT_GENERATED,
      userId,
    });
    return data;
  },

  // ----- Exclusão de conta (soft + anonimização) -----
  async deleteAccount(userId: string, password: string) {
    const user = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      tx.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } }),
    );
    if (!user) throw new NotFoundError('Usuário', userId);
    const ok = await verifyPassword(password, user.passwordHash).catch(() => false);
    if (!ok) throw new DomainError('Senha inválida', 'INVALID_CREDENTIALS', 401);

    // T470b — blocklist PRIMEIRO (fail-loud): se o Redis falhar, aborta SEM
    // alterar nada (nem anonimiza, nem bloqueia) — nunca "anonimizei mas não
    // bloqueei o access token" (gap pior). Cobre TODOS os devices.
    try {
      await blockAccessToken(userId);
    } catch {
      throw new DomainError(
        'Não foi possível invalidar a sessão; nada foi alterado. Tente novamente.',
        'ACCESS_REVOKE_FAILED',
        502,
      );
    }

    await revokeAllUserSessions(userId);

    const anonEmail = `deleted_${userId}@almanaquedosclubes.invalid`;
    const protocol = newProtocol('dsr');
    const result = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: null,
          status: 'INACTIVE',
          deletedAt: new Date(),
          // Hash inválido ⇒ login impossível (não é argon2 válido).
          passwordHash: `deleted_${randomBytes(24).toString('hex')}`,
        },
      });
      const req = await legalRepository.createDsr(tx, {
        protocol,
        userId,
        type: 'anonymization_blockage_deletion',
        jurisdiction: 'BR',
        description: null,
        requestedFields: ['account'],
        deadlineAt: new Date(),
      });
      return legalRepository.updateDsr(tx, req.id, {
        status: 'completed',
        completedAt: new Date(),
        responseSummary: 'Conta anonimizada (e-mail não reutilizável) e sessões revogadas.',
      });
    });

    await auditLog.record({
      entityType: EntityType.USER,
      entityId: userId,
      action: AuditAction.LEGAL_ACCOUNT_DELETED,
      userId,
      metadata: { protocol },
    });
    // Preserva billings/audit (obrigação fiscal/defesa); nada é hard-deleted.
    return { protocol: result.protocol, status: result.status };
  },

  // ----- Notificação autoral -----
  async createNotice(userId: string, input: CreateNoticeInput) {
    const protocol = newProtocol('cr');
    const created = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.createNotice(tx, {
        protocol,
        userId,
        type: 'infringement_notice',
        workTitle: input.workTitle,
        workUrl: input.workUrl ?? null,
        materialUrl: input.materialUrl,
        description: sanitizeText(input.description, 2000) as string,
        goodFaithDeclaration: input.goodFaithDeclaration,
        accuracyDeclaration: input.accuracyDeclaration,
        signatureText: input.signatureText,
        jurisdiction: 'BR',
      }),
    );
    await auditLog.record({
      entityType: EntityType.COPYRIGHT_NOTICE,
      entityId: created.id,
      action: AuditAction.LEGAL_NOTICE_CREATED,
      userId,
      metadata: { protocol, type: 'infringement_notice' },
    });
    return toPublicNotice(created);
  },

  async createCounterNotice(
    userId: string,
    originalProtocol: string,
    input: CreateCounterNoticeInput,
  ) {
    const protocol = newProtocol('cr');
    const created = await withRlsContext({ userId, role: 'USER' }, async (tx) => {
      const original = await legalRepository.findNoticeByProtocol(tx, originalProtocol);
      if (!original) throw new NotFoundError('Notificação', originalProtocol);
      return legalRepository.createNotice(tx, {
        protocol,
        userId,
        type: 'counter_notice',
        originalNoticeId: original.id,
        workTitle: original.workTitle,
        workUrl: original.workUrl,
        materialUrl: original.materialUrl,
        description: sanitizeText(input.description, 2000) as string,
        goodFaithDeclaration: input.goodFaithDeclaration,
        accuracyDeclaration: input.accuracyDeclaration,
        signatureText: input.signatureText,
        jurisdiction: original.jurisdiction,
      });
    });
    await auditLog.record({
      entityType: EntityType.COPYRIGHT_NOTICE,
      entityId: created.id,
      action: AuditAction.LEGAL_NOTICE_CREATED,
      userId,
      metadata: { protocol, type: 'counter_notice', original: originalProtocol },
    });
    return toPublicNotice(created);
  },

  async listNotices(userId: string) {
    const rows = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.listNoticesByUser(tx, userId),
    );
    return rows.map(toPublicNotice);
  },

  async getNotice(userId: string, protocol: string) {
    const row = await withRlsContext({ userId, role: 'USER' }, (tx) =>
      legalRepository.findNoticeByProtocol(tx, protocol),
    );
    if (!row || row.userId !== userId) throw new NotFoundError('Notificação', protocol);
    return toPublicNotice(row);
  },

  // ----- Admin (SERVICE) -----
  async adminListDsr(filter: {
    status?: string;
    type?: string;
    jurisdiction?: string;
    limit: number;
    offset: number;
  }) {
    return withRlsContext({ role: 'SERVICE' }, (tx) => legalRepository.listDsrAdmin(tx, filter));
  },

  async adminUpdateDsr(
    protocol: string,
    data: { status: string; responseSummary?: string; internalNote?: string },
    adminUserId: string,
  ) {
    const updated = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const row = await legalRepository.findDsrByProtocol(tx, protocol);
      if (!row) throw new NotFoundError('Solicitação', protocol);
      return legalRepository.updateDsr(tx, row.id, {
        status: data.status as never,
        responseSummary:
          data.responseSummary === undefined ? undefined : sanitizeText(data.responseSummary),
        internalNote: data.internalNote === undefined ? undefined : sanitizeText(data.internalNote),
        completedAt:
          data.status === 'completed' || data.status === 'rejected' ? new Date() : undefined,
      });
    });
    await auditLog.record({
      entityType: EntityType.DATA_SUBJECT_REQUEST,
      entityId: protocol,
      action: AuditAction.LEGAL_REQUEST_UPDATED,
      userId: adminUserId,
      changes: { status: { old: null, new: data.status } },
    });
    return updated;
  },

  async adminListNotices(filter: {
    status?: string;
    type?: string;
    limit: number;
    offset: number;
  }) {
    return withRlsContext({ role: 'SERVICE' }, (tx) =>
      legalRepository.listNoticesAdmin(tx, filter),
    );
  },

  async adminUpdateNotice(
    protocol: string,
    data: { status: string; responseSummary?: string; internalNote?: string },
    adminUserId: string,
  ) {
    const updated = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const row = await legalRepository.findNoticeByProtocol(tx, protocol);
      if (!row) throw new NotFoundError('Notificação', protocol);
      return legalRepository.updateNotice(tx, row.id, {
        status: data.status as never,
        responseSummary:
          data.responseSummary === undefined ? undefined : sanitizeText(data.responseSummary),
        internalNote: data.internalNote === undefined ? undefined : sanitizeText(data.internalNote),
      });
    });
    await auditLog.record({
      entityType: EntityType.COPYRIGHT_NOTICE,
      entityId: protocol,
      action: AuditAction.LEGAL_NOTICE_UPDATED,
      userId: adminUserId,
      changes: { status: { old: null, new: data.status } },
    });
    return updated;
  },
};

// `prisma` é usado indiretamente via session/audit; referência mantida p/ clareza.
void prisma;
