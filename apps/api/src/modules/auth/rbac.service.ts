/**
 * RBAC service — Role-Based Access Control.
 *
 * Modelo:
 * - User ←(UserRole)→ Role ←(RolePermission)→ Permission
 * - Um usuário pode ter múltiplas roles
 * - Uma role pode ter múltiplas permissões
 * - Permissões são strings hierárquicas: '<resource>:<action>'
 *   ex.: 'clubs:read', 'clubs:write', 'users:manage', 'billing:refund'
 *
 * Roles padrão (seed):
 * - admin: todas as permissões
 * - pro: clubs:read + clubs:write (CRUD own clubs) + rankings:read + competitions:read
 * - free: clubs:read + competitions:read (apenas leitura)
 *
 * Cache: em memória por processo (Map). TTL 5 min. Invalidado em assignRole/revokeRole.
 * Para multi-instance: usar Redis pub/sub (Fase 6.3).
 */
import { prisma } from '../../config/prisma.js';
import type { Role, Permission } from '@prisma/client';

// =============================================================================
// CONSTANTES — Roles e Permissões padrão
// =============================================================================

export const ROLE_NAMES = {
  ADMIN: 'admin',
  PRO: 'pro',
  FREE: 'free',
} as const;

/**
 * Permissões granulares.
 * Formato: '<resource>:<action>'
 * - read: consultar, listar, buscar
 * - write: criar, atualizar (CRUD próprio)
 * - manage: CRUD de qualquer entidade (incl. de outros usuários)
 * - delete: excluir
 */
export const PERMISSIONS = {
  // Clubs
  CLUBS_READ: 'clubs:read',
  CLUBS_WRITE: 'clubs:write',
  CLUBS_MANAGE: 'clubs:manage', // admin only
  CLUBS_DELETE: 'clubs:delete',

  // Players
  PLAYERS_READ: 'players:read',
  PLAYERS_WRITE: 'players:write',
  PLAYERS_MANAGE: 'players:manage',

  // Competitions
  COMPETITIONS_READ: 'competitions:read',
  COMPETITIONS_WRITE: 'competitions:write',
  COMPETITIONS_MANAGE: 'competitions:manage',

  // Rankings
  RANKINGS_READ: 'rankings:read',
  RANKINGS_WRITE: 'rankings:write',
  RANKINGS_PUBLISH: 'rankings:publish', // publicar ranking (muda estado)

  // Users
  USERS_READ: 'users:read', // ler próprio perfil
  USERS_MANAGE: 'users:manage', // CRUD de qualquer usuário (admin)

  // Billing
  BILLINGS_READ: 'billings:read', // ler próprias cobranças
  BILLINGS_REFUND: 'billings:refund', // admin

  // Admin
  AUDIT_LOGS_READ: 'audit_logs:read',

  // Export
  EXPORT_CSV: 'export:csv',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Mapeamento role → permissões (usado no seed).
 */
export const ROLE_PERMISSIONS: Record<string, PermissionName[]> = {
  [ROLE_NAMES.ADMIN]: Object.values(PERMISSIONS),
  [ROLE_NAMES.PRO]: [
    PERMISSIONS.CLUBS_READ,
    PERMISSIONS.CLUBS_WRITE,
    PERMISSIONS.PLAYERS_READ,
    PERMISSIONS.PLAYERS_WRITE,
    PERMISSIONS.COMPETITIONS_READ,
    PERMISSIONS.RANKINGS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.BILLINGS_READ,
    PERMISSIONS.EXPORT_CSV,
  ],
  [ROLE_NAMES.FREE]: [
    PERMISSIONS.CLUBS_READ,
    PERMISSIONS.COMPETITIONS_READ,
    PERMISSIONS.RANKINGS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.BILLINGS_READ,
  ],
};

// =============================================================================
// CACHE EM MEMÓRIA
// =============================================================================

/**
 * Cache em memória: userId → Set<permission_name>
 * TTL 5 min. Em multi-instance, usar Redis (Fase 6.3).
 */
const permissionsCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Invalida o cache de um usuário.
 * Chamar após assignRole, revokeRole, ou mudança de RolePermission.
 */
function invalidateUserPermissionsCache(userId: string): void {
  permissionsCache.delete(userId);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Lista todas as permissões efetivas de um usuário (todas as suas roles combinadas).
 *
 * Usa cache em memória (TTL 5 min). Em caso de assignRole/revokeRole, cache é invalidado.
 *
 * @example
 *   const perms = await getUserPermissions(user.id);
 *   if (!perms.has('clubs:write')) {
 *     throw new ForbiddenError('Permissão necessária: clubs:write');
 *   }
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  // Cache hit?
  const cached = permissionsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  // Query: User → UserRoles → Roles → RolePermissions → Permissions
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) {
    return new Set();
  }

  // Achatamento: coleta todas as permission names
  const permissions = new Set<string>();
  for (const ur of userWithRoles.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.name);
    }
  }

  // Cacheia
  permissionsCache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return permissions;
}

/**
 * Verifica se um usuário tem uma permissão específica.
 *
 * @example
 *   const canEdit = await userHasPermission(user.id, 'clubs:write');
 */
export async function userHasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permission);
}

/**
 * Atribui uma role a um usuário.
 * Idempotente: se já tem a role, não duplica.
 * Invalida cache de permissões do usuário.
 *
 * @example
 *   await assignRole(user.id, ROLE_NAMES.ADMIN);
 */
export async function assignRole(userId: string, roleName: string): Promise<void> {
  // Encontra role por nome
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role não encontrada: ${roleName}`);
  }

  // Upsert (idempotente — UserRole tem PK composta [userId, roleId])
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });

  invalidateUserPermissionsCache(userId);
}

/**
 * Revoga uma role de um usuário.
 * Idempotente: se não tem a role, não falha.
 * Invalida cache de permissões do usuário.
 */
export async function revokeRole(userId: string, roleName: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return; // Role não existe → nada a fazer

  await prisma.userRole.deleteMany({
    where: { userId, roleId: role.id },
  });

  invalidateUserPermissionsCache(userId);
}

/**
 * Lista as roles de um usuário.
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur) => ur.role);
}

/**
 * Lista todas as permissões cadastradas.
 * Útil para painel admin de "atribuir permissões a role".
 */
export async function listAllPermissions(): Promise<Permission[]> {
  return prisma.permission.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Lista todas as roles cadastradas.
 */
export async function listAllRoles(): Promise<Role[]> {
  return prisma.role.findMany({
    include: {
      _count: {
        select: {
          userRoles: true,
          rolePermissions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}
