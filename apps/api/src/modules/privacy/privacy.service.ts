/**
 * T445 — Direitos do titular (LGPD art. 18): criação pública, acompanhamento
 * por token, workflow admin e fulfillment com segregação.
 *
 * Decisões do HANDOFF-T445 (vinculantes):
 * - SLA: imediato para confirmação/acesso; 15 dias ANPD para os demais.
 * - Token único para não-usuários confirmarem identidade (requesterId null).
 * - deferredUntil = prorrogação do art. 18 §3 (notificação ANPD em 15 dias).
 * - Soft-delete SEMPRE: eliminação anonimiza os dados do titular e preserva
 *   o registro do workflow (nunca DELETE físico de privacy_requests).
 */
import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import {
  ANPD_SLA_DAYS,
  IMMEDIATE_RIGHTS,
  PRIVACY_RIGHT_TYPES,
  assertPrivacyTransition,
  type PrivacyRightType,
  type PrivacyStatus,
} from './state-machine.js';

export interface CreatePrivacyInput {
  rightType: string;
  email: string;
  requesterId?: string | null;
  notes?: string | null;
}

export function isKnownRightType(rightType: string): rightType is PrivacyRightType {
  return (PRIVACY_RIGHT_TYPES as readonly string[]).includes(rightType);
}

/** Prazo: imediato (agora) para confirmação/acesso; 15 dias ANPD para os demais. */
export function computeSlaDueAt(rightType: string, now = new Date()): Date {
  return IMMEDIATE_RIGHTS.includes(rightType)
    ? now
    : new Date(now.getTime() + ANPD_SLA_DAYS * 86_400_000);
}

export async function createPrivacyRequest(input: CreatePrivacyInput) {
  const token = randomBytes(24).toString('hex');
  const slaDueAt = computeSlaDueAt(input.rightType);
  const created = await prisma.privacyRequest.create({
    data: {
      rightType: input.rightType,
      email: input.email,
      requesterId: input.requesterId ?? null,
      notes: input.notes ?? null,
      token,
      slaDueAt,
      status: 'recebido',
    },
  });
  await auditLog.record({
    entityType: EntityType.PRIVACY_REQUEST,
    entityId: created.id,
    action: AuditAction.PRIVACY_REQUEST_CREATED,
    userId: input.requesterId ?? null,
    metadata: { rightType: input.rightType, authenticated: Boolean(input.requesterId) },
  });
  return {
    id: created.id,
    token,
    rightType: created.rightType,
    status: created.status as PrivacyStatus,
    slaDueAt: created.slaDueAt,
  };
}

/** Projeção pública para o titular acompanhar via token (sem dados internos). */
export async function getRequestStatusByToken(token: string) {
  const req = await prisma.privacyRequest.findUnique({ where: { token } });
  if (!req) return null;
  return {
    id: req.id,
    rightType: req.rightType,
    status: req.status as PrivacyStatus,
    createdAt: req.createdAt,
    slaDueAt: req.slaDueAt,
    deferredUntil: req.deferredUntil,
  };
}

export async function listPrivacyRequests(options: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { status, limit = 50, offset = 0 } = options;
  const rows = await prisma.privacyRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    skip: Math.max(offset, 0),
  });
  return rows;
}

export class DecisionRequiresNotesError extends Error {
  constructor() {
    super('Decisão motivada obrigatória: indeferido exige notes.');
    this.name = 'DecisionRequiresNotesError';
  }
}

export class RequestNotFoundError extends Error {
  constructor(id: string) {
    super(`Solicitação não encontrada: ${id}`);
    this.name = 'RequestNotFoundError';
  }
}

/**
 * Transição admin. Em `atendido`, executa o fulfillment com segregação:
 * eliminação com requesterId → anonimiza o titular (email/nome) e revoga
 * sessões, preservando workflow e registros financeiros (obrigação legal).
 */
export async function transitionPrivacyRequest(input: {
  id: string;
  to: PrivacyStatus;
  adminUserId: string;
  notes?: string | null;
  deferredUntil?: Date | null;
}) {
  const req = await prisma.privacyRequest.findUnique({ where: { id: input.id } });
  if (!req) throw new RequestNotFoundError(input.id);

  assertPrivacyTransition(req.status, input.to);

  if (input.to === 'indeferido' && !input.notes) throw new DecisionRequiresNotesError();

  const updated = await prisma.privacyRequest.update({
    where: { id: req.id },
    data: {
      status: input.to,
      notes: input.notes ?? req.notes,
      deferredUntil: input.deferredUntil ?? req.deferredUntil,
      fulfilledAt: input.to === 'atendido' ? new Date() : req.fulfilledAt,
    },
  });

  await auditLog.record({
    entityType: EntityType.PRIVACY_REQUEST,
    entityId: req.id,
    action: AuditAction.PRIVACY_REQUEST_TRANSITIONED,
    userId: input.adminUserId,
    metadata: { from: req.status, to: input.to, rightType: req.rightType },
  });

  if (input.to === 'atendido' && req.rightType === 'eliminação' && req.requesterId) {
    await anonymizeRequester(req.requesterId, input.adminUserId);
  }

  return updated;
}

/** Soft-segregação do titular (art. 18, VI): anonimiza PII, mantém registros. */
export async function anonymizeRequester(userId: string, adminUserId: string): Promise<void> {
  const anonEmail = `anon+${userId.slice(0, 8)}@removido.local`;
  await prisma.user.update({
    where: { id: userId },
    data: { email: anonEmail, name: 'Titular removido (LGPD art. 18)' },
  });
  await prisma.session.deleteMany({ where: { userId } });
  await auditLog.record({
    entityType: EntityType.USER,
    entityId: userId,
    action: AuditAction.PRIVACY_USER_ANONYMIZED,
    userId: adminUserId,
    metadata: { reason: 'privacy_request.eliminação' },
  });
}
