/**
 * WS-C-9 Modo Clube — ownerships e descrição comunitária.
 *
 * Critérios C1–C4 (docs/EDITORES-DE-CLUBES-CRITERIOS.md), aprovados pelo
 * Operador em 18-10-2026:
 *  - C1 Plano: exige Elite ATIVO (pago ou concedido) no momento da posse e no
 *    ato de publicar. Perdeu o Elite → posse suspende (status 'suspended',
 *    histórico preservado); renovou → reativa (a aprovação humana anterior
 *    permanece válida; reativação registrada em auditoria).
 *  - C2 Evidência: prova de vínculo verificável por terceiro — evidenceUrl
 *    e/ou evidenceNote não-vazios (validados por humano na moderação).
 *  - C3 Revisão humana: toda posse nasce 'pending' — NUNCA 'active'
 *    automático. Aprovação pelo Operador (área admin), registrada em
 *    approvedBy/approvedAt/reviewedBy. SLA prometido na UI: 5 dias úteis.
 *  - C4 Conduta: teto de 1 editor + 3 curadores por clube; seleção nacional
 *    NÃO aceita auto-serviço (clubs.kind = 'national_team' → curadoria manual
 *    fora deste fluxo); revogação imediata com motivo registrado.
 *
 * A userDescription é ADITIVA aos dados oficiais (Wikidata): nunca sobrescreve
 * name/city/etc. Sanitização: strip de tags HTML + teto de 2000 chars.
 * Toda edição gera auditoria append-only.
 *
 * Escrita em "ClubOwnership" via withRlsContext (userId no contexto — policy
 * owner-only); leitura de owners é pública na UI (policy SELECT autenticado).
 * UPDATE em clubs é restrito por GRANT de colunas + verificação de ownership
 * AQUI (defesa em profundidade: RLS na ownership, regra de negócio no serviço).
 */
import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { cache } from '../../services/cache.js';
import { DomainError, NotFoundError } from '@almanaque/domain';
import type { SessionMetadata } from '../auth/session.service.js';

export const USER_DESCRIPTION_MAX = 2000;

/** Status de ciclo de vida da posse (C3/C4 + suspensão por plano — C1). */
export type OwnershipStatus = 'pending' | 'active' | 'suspended' | 'revoked';

/**
 * C4 — teto de posses NÃO-revogadas por clube: 1 editor + 3 curadores
 * (decisão do Operador, 18-10-2026). A 4ª claim recebe CLUB_EDITORS_FULL.
 */
export const MAX_OWNERSHIPS_PER_CLUB = 4;

export interface OwnershipView {
  name: string | null;
  role: string;
  since: string;
}

/** C2 — prova de vínculo enviada no claim (uma das duas basta). */
export interface OwnershipEvidence {
  evidenceUrl?: string | null;
  evidenceNote?: string | null;
}

/** Sanitização mínima: sem HTML/scripts, sem espaços das pontas. */
export function sanitizeDescription(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * C1 — Elite ativo AGORA (pago ou concedido — ex.: presente de aniversário usa
 * o mesmo changePlan('ELITE')). Mesma leitura do billing: a linha única em
 * `subscriptions` com plan ELITE, status ACTIVE e ciclo corrente válido
 * (currentPeriodEnd futuro — changePlan/markBillingPaid sempre carimbam para
 * plano pago; o gate do billing em isActiveSubscription exige o mesmo).
 */
export async function hasActiveElite(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });
  if (!sub || sub.plan !== 'ELITE' || sub.status !== 'ACTIVE') return false;
  return sub.currentPeriodEnd !== null && sub.currentPeriodEnd > new Date();
}

/** Status da posse do usuário no clube (null = nunca reivindicou). */
export async function getOwnershipStatus(
  userId: string,
  clubId: string,
): Promise<OwnershipStatus | null> {
  const ownership = await withRlsContext({ userId }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { status: true },
    }),
  );
  return (ownership?.status as OwnershipStatus | undefined) ?? null;
}

/**
 * Reivindica a posse do clube (C1–C4). Nasce 'pending' — a aprovação é humana
 * (área admin). Idempotente para posse pending/active; posse suspensa reativa
 * se o Elite voltou; posse revogada não é reivindicável por este fluxo.
 */
export async function ownClub(
  userId: string,
  clubId: string,
  evidence: OwnershipEvidence = {},
  metadata: SessionMetadata = {},
): Promise<{ created: boolean; status: OwnershipStatus }> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, kind: true },
  });
  if (!club) throw new NotFoundError('Clube', clubId);

  const existing = await withRlsContext({ userId }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { id: true, status: true },
    }),
  );

  if (existing) {
    // Idempotente: já em revisão ou já ativo → nada a fazer.
    if (existing.status === 'pending' || existing.status === 'active') {
      return { created: false, status: existing.status as OwnershipStatus };
    }
    if (existing.status === 'revoked') {
      // C4 — revogação é decisão registrada da moderação; reabrir por aqui
      // anularia a revogação. Caminho de volta: contato com o Operador.
      throw new DomainError(
        'Sua posse neste clube foi revogada pela moderação. Se discorda, entre em contato com o suporte.',
        'OWNERSHIP_REVOKED',
        403,
      );
    }
    // suspended → C1: o Elite voltou? Reativa (a aprovação humana anterior
    // permanece; a única causa da suspensão era o plano). Registro na auditoria.
    if (await hasActiveElite(userId)) {
      await withRlsContext({ userId }, (tx) =>
        tx.clubOwnership.update({ where: { id: existing.id }, data: { status: 'active' } }),
      );
      await auditLog.record({
        entityType: EntityType.CLUB,
        entityId: clubId,
        action: AuditAction.ENTITY_UPDATE,
        userId,
        metadata: { ip: metadata.ipAddress, kind: 'club_ownership', resumed: true },
      });
      return { created: false, status: 'active' };
    }
    throw new DomainError(
      'Sua posse está suspensa: o plano Elite não está ativo. Assine ou renove o Elite para reativar.',
      'OWNERSHIP_SUSPENDED',
      403,
    );
  }

  // C4 — seleção nacional: entidade pública de alto risco de captura; NÃO há
  // auto-serviço. Detectável pelo campo legado clubs.kind (schema: 'club' |
  // 'national_team' | 'federation'); a curadoria é manual do Operador.
  if (club.kind === 'national_team') {
    throw new DomainError(
      'Seleções nacionais não aceitam auto-serviço — a curadoria é manual do Operador.',
      'MANUAL_CURATION_REQUIRED',
      403,
    );
  }

  // C1 — barreira de plano (pago ou concedido vale).
  if (!(await hasActiveElite(userId))) {
    throw new DomainError(
      'Editor de clube exige plano Elite ativo (pago ou concedido).',
      'PLAN_REQUIRED',
      422,
    );
  }

  // C2 — barreira de evidência (verificável por terceiro; a validade é julgada
  // na moderação — aqui só se exige que exista).
  const evidenceUrl = evidence.evidenceUrl?.trim() || null;
  const evidenceNote = evidence.evidenceNote?.trim() || null;
  if (!evidenceUrl && !evidenceNote) {
    throw new DomainError(
      'Prova de vínculo obrigatória: informe um link (evidenceUrl) ou uma nota verificável (evidenceNote).',
      'EVIDENCE_REQUIRED',
      422,
    );
  }

  // C4 — teto de 1 editor + 3 curadores (contam pending/active/suspended;
  // revogadas não ocupam vaga).
  const occupying = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.clubOwnership.count({ where: { clubId, status: { not: 'revoked' } } }),
  );
  if (occupying >= MAX_OWNERSHIPS_PER_CLUB) {
    throw new DomainError(
      'Este clube já atingiu o limite de 1 editor + 3 curadores.',
      'CLUB_EDITORS_FULL',
      409,
    );
  }

  // C3 — nasce 'pending'; approvedAt/approvedBy ficam nulos até a moderação.
  await withRlsContext({ userId }, async (tx) =>
    tx.clubOwnership.create({
      data: {
        userId,
        clubId,
        role: 'editor',
        status: 'pending',
        evidenceUrl,
        evidenceNote,
      },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: clubId,
    action: AuditAction.ENTITY_CREATE,
    userId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'club_ownership',
      role: 'editor',
      status: 'pending',
      hasEvidenceUrl: evidenceUrl !== null,
      hasEvidenceNote: evidenceNote !== null,
    },
  });
  return { created: true, status: 'pending' };
}

/** Remove a ownership do usuário no clube. Retorna se algo foi removido. */
export async function unownClub(
  userId: string,
  clubId: string,
  metadata: SessionMetadata = {},
): Promise<{ removed: boolean }> {
  const deleted = await withRlsContext({ userId }, async (tx) =>
    tx.clubOwnership.deleteMany({ where: { userId, clubId } }),
  );
  if (deleted.count > 0) {
    await auditLog.record({
      entityType: EntityType.CLUB,
      entityId: clubId,
      action: AuditAction.ENTITY_DELETE,
      userId,
      metadata: { ip: metadata.ipAddress, kind: 'club_ownership' },
    });
  }
  return { removed: deleted.count > 0 };
}

/**
 * Editores ativos do clube (nome público se disponível; userId NUNCA exposto).
 * A leitura passa pela função SECURITY DEFINER `club_owners_list` (padrão
 * T442): app_user não tem GRANT na tabela users, então o join nome↔ownership
 * não pode sair do cliente direto — e o RLS da ownership é 'leitura
 * autenticada', não pública.
 */
export async function listOwners(clubId: string): Promise<OwnershipView[]> {
  const result = await prisma.$queryRaw<
    Array<{ name: string | null; role: string; since: Date }>
  >`SELECT "name", "role", "since" FROM club_owners_list(${clubId})`;
  return result.map((r) => ({
    name: r.name,
    role: r.role,
    since: new Date(r.since).toISOString(),
  }));
}

/** O usuário tem ownership ATIVA no clube? */
export async function isActiveOwner(userId: string, clubId: string): Promise<boolean> {
  return (await getOwnershipStatus(userId, clubId)) === 'active';
}

/**
 * C1/C3 no ato de publicar — gate compartilhado por updateDescription (PATCH
 * /description e auto-aprovação do editor em propose()).
 *  - sem posse            → NOT_CLUB_OWNER (403)
 *  - pending              → OWNERSHIP_PENDING_REVIEW (409)
 *  - revoked              → OWNERSHIP_REVOKED (403)
 *  - suspended + Elite ok → reativa (audit) e segue
 *  - suspended sem Elite  → OWNERSHIP_SUSPENDED (403)
 *  - active sem Elite     → suspende (histórico preservado; audit) e rejeita
 */
async function assertCanPublish(userId: string, clubId: string, metadata: SessionMetadata) {
  const ownership = await withRlsContext({ userId }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { id: true, status: true },
    }),
  );
  if (!ownership) {
    throw new DomainError('Sem ownership ativa neste clube', 'NOT_CLUB_OWNER', 403);
  }
  const status = ownership.status as OwnershipStatus;
  if (status === 'pending') {
    throw new DomainError(
      'Sua posse está em revisão (até 5 dias úteis) — após aprovada, suas edições publicam direto.',
      'OWNERSHIP_PENDING_REVIEW',
      409,
    );
  }
  if (status === 'revoked') {
    throw new DomainError(
      'Sua posse neste clube foi revogada pela moderação.',
      'OWNERSHIP_REVOKED',
      403,
    );
  }

  const eliteOk = await hasActiveElite(userId);

  if (status === 'suspended') {
    if (!eliteOk) {
      throw new DomainError(
        'Posse suspensa: o plano Elite não está ativo. Renove o Elite para publicar.',
        'OWNERSHIP_SUSPENDED',
        403,
      );
    }
    // "até renovar" — Elite de volta reativa a posse aprovada (audit).
    await withRlsContext({ userId }, (tx) =>
      tx.clubOwnership.update({ where: { id: ownership.id }, data: { status: 'active' } }),
    );
    await auditLog.record({
      entityType: EntityType.CLUB,
      entityId: clubId,
      action: AuditAction.ENTITY_UPDATE,
      userId,
      metadata: { ip: metadata.ipAddress, kind: 'club_ownership', resumed: true },
    });
    return;
  }

  // active → o Elite precisa continuar ativo no ato de publicar (C1).
  if (!eliteOk) {
    await withRlsContext({ userId }, (tx) =>
      tx.clubOwnership.update({ where: { id: ownership.id }, data: { status: 'suspended' } }),
    );
    await auditLog.record({
      entityType: EntityType.CLUB,
      entityId: clubId,
      action: AuditAction.ENTITY_UPDATE,
      userId,
      metadata: { ip: metadata.ipAddress, kind: 'club_ownership', suspended: true },
    });
    throw new DomainError(
      'Posse suspensa: o plano Elite deixou de estar ativo. Renove o Elite para publicar — seu histórico foi preservado.',
      'OWNERSHIP_SUSPENDED',
      403,
    );
  }
}

/**
 * Edita a userDescription do clube. Exige posse publicável (gate C1/C3 acima).
 * Texto sanitizado (sem HTML) e limitado a 2000 chars (400 se exceder).
 * Toda edição registrada em auditoria (userId, clubId, timestamp, tamanho).
 */
export async function updateDescription(
  userId: string,
  clubId: string,
  rawText: string,
  metadata: SessionMetadata = {},
): Promise<{ userDescription: string; updatedAt: Date }> {
  await assertClubExists(clubId);
  await assertCanPublish(userId, clubId, metadata);

  const text = sanitizeDescription(rawText);
  if (text.length === 0) {
    throw new DomainError('Descrição não pode ficar vazia', 'DESCRIPTION_EMPTY', 400);
  }
  if (text.length > USER_DESCRIPTION_MAX) {
    throw new DomainError(
      `Descrição excede o máximo de ${USER_DESCRIPTION_MAX} caracteres`,
      'DESCRIPTION_TOO_LONG',
      400,
    );
  }

  const updatedAt = new Date();
  await withRlsContext({ userId, role: 'USER' }, async (tx) =>
    tx.club.update({
      where: { id: clubId },
      data: {
        userDescription: text,
        userDescriptionSource: 'community',
        userDescriptionUpdatedAt: updatedAt,
      },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: clubId,
    action: AuditAction.ENTITY_UPDATE,
    userId,
    metadata: {
      ip: metadata.ipAddress,
      kind: 'user_description',
      length: text.length,
      requestId: randomUUID(),
    },
  });

  // Cache do GET /clubs/:id — sem invalidar, o perfil fica stale até o TTL.
  await cache.invalidate(`clubs:byId:${clubId}`);

  return { userDescription: text, updatedAt };
}

async function assertClubExists(clubId: string): Promise<void> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (!club) throw new NotFoundError('Clube', clubId);
}
