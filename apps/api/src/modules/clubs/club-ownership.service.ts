/**
 * WS-C-9 Modo Clube — ownerships e descrição comunitária.
 *
 * Um usuário autenticado pode "representar" um clube (ownership auto-aprovado
 * nesta fase — status 'active' direto) e editar a userDescription do clube.
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
import { DomainError, NotFoundError } from '@almanaque/domain';
import type { SessionMetadata } from '../auth/session.service.js';

export const USER_DESCRIPTION_MAX = 2000;

export interface OwnershipView {
  name: string | null;
  role: string;
  since: string;
}

/** Sanitização mínima: sem HTML/scripts, sem espaços das pontas. */
function sanitizeDescription(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function assertClubExists(clubId: string): Promise<void> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (!club) throw new NotFoundError('Clube', clubId);
}

/** Cria a ownership do usuário no clube (idempotente). Retorna se foi criada agora. */
export async function ownClub(
  userId: string,
  clubId: string,
  metadata: SessionMetadata = {},
): Promise<{ created: boolean }> {
  await assertClubExists(clubId);

  const existing = await withRlsContext({ userId }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { id: true, status: true },
    }),
  );
  if (existing) {
    // Idempotente: já é editor (ativo ou não) → nada a fazer.
    return { created: false };
  }

  await withRlsContext({ userId }, async (tx) =>
    tx.clubOwnership.create({
      data: {
        userId,
        clubId,
        role: 'editor',
        status: 'active', // fase inicial: auto-aprovado (aprovação manual = futuro)
        approvedAt: new Date(),
        approvedBy: null,
      },
    }),
  );

  await auditLog.record({
    entityType: EntityType.CLUB,
    entityId: clubId,
    action: AuditAction.ENTITY_CREATE,
    userId,
    metadata: { ip: metadata.ipAddress, kind: 'club_ownership', role: 'editor' },
  });
  return { created: true };
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

/** Editores ativos do clube (nome público se disponível; userId NUNCA exposto). */
export async function listOwners(clubId: string): Promise<OwnershipView[]> {
  const rows = await prisma.clubOwnership.findMany({
    where: { clubId, status: 'active' },
    select: {
      role: true,
      approvedAt: true,
      requestedAt: true,
      user: { select: { name: true } },
    },
    orderBy: { requestedAt: 'asc' },
    take: 50,
  });
  return rows.map((r) => ({
    name: r.user.name,
    role: r.role,
    since: (r.approvedAt ?? r.requestedAt).toISOString(),
  }));
}

/** O usuário tem ownership ATIVA no clube? */
export async function isActiveOwner(userId: string, clubId: string): Promise<boolean> {
  const ownership = await withRlsContext({ userId }, (tx) =>
    tx.clubOwnership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { status: true },
    }),
  );
  return ownership?.status === 'active';
}

/**
 * Edita a userDescription do clube. Exige ownership ATIVA (403 caso contrário).
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

  const isOwner = await isActiveOwner(userId, clubId);
  if (!isOwner) {
    throw new DomainError('Sem ownership ativa neste clube', 'NOT_CLUB_OWNER', 403);
  }

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

  return { userDescription: text, updatedAt };
}
