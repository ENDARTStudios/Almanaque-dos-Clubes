/**
 * T445 — Copyright claims (DMCA art. 512 / Lei 9.610/98): recepção pública
 * com honeypot + rate-limit (rota) e workflow admin com decisão motivada.
 * Soft-delete sempre — nenhuma função remove registros.
 */
import { prisma } from '../../config/prisma.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { assertClaimTransition, type ClaimStatus } from '../privacy/state-machine.js';

export interface CreateClaimInput {
  material: string;
  location: string;
  fundament: string;
  contactEmail: string;
}

export class ClaimNotFoundError extends Error {
  constructor(id: string) {
    super(`Claim não encontrada: ${id}`);
    this.name = 'ClaimNotFoundError';
  }
}

export class DecisionRequiresResolutionError extends Error {
  constructor() {
    super('Decisão motivada obrigatória: deferida/indeferida exige resolution.');
    this.name = 'DecisionRequiresResolutionError';
  }
}

export async function createClaim(input: CreateClaimInput) {
  const created = await prisma.copyrightClaim.create({
    data: {
      material: input.material,
      location: input.location,
      fundament: input.fundament,
      contactEmail: input.contactEmail,
      status: 'recebida',
    },
  });
  await auditLog.record({
    entityType: EntityType.COPYRIGHT_CLAIM,
    entityId: created.id,
    action: AuditAction.COPYRIGHT_CLAIM_CREATED,
    userId: null,
    metadata: { contactDomain: input.contactEmail.split('@')[1] ?? '' },
  });
  return { id: created.id, status: created.status as ClaimStatus };
}

export async function listClaims(options: { status?: string; limit?: number; offset?: number }) {
  const { status, limit = 50, offset = 0 } = options;
  const rows = await prisma.copyrightClaim.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    skip: Math.max(offset, 0),
  });
  return rows;
}

export async function transitionClaim(input: {
  id: string;
  to: ClaimStatus;
  adminUserId: string;
  resolution?: string | null;
}) {
  const claim = await prisma.copyrightClaim.findUnique({ where: { id: input.id } });
  if (!claim) throw new ClaimNotFoundError(input.id);

  assertClaimTransition(claim.status, input.to);

  if ((input.to === 'deferida' || input.to === 'indeferida') && !input.resolution) {
    throw new DecisionRequiresResolutionError();
  }

  const updated = await prisma.copyrightClaim.update({
    where: { id: claim.id },
    data: {
      status: input.to,
      resolution: input.resolution ?? claim.resolution,
      resolvedAt:
        input.to === 'deferida' || input.to === 'indeferida' || input.to === 'retirado'
          ? new Date()
          : claim.resolvedAt,
    },
  });

  await auditLog.record({
    entityType: EntityType.COPYRIGHT_CLAIM,
    entityId: claim.id,
    action: AuditAction.COPYRIGHT_CLAIM_TRANSITIONED,
    userId: input.adminUserId,
    metadata: { from: claim.status, to: input.to },
  });

  return updated;
}
