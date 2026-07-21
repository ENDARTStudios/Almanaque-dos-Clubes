/**
 * AuditLog — módulo de auditoria append-only.
 *
 * Restrições inegociáveis (PROTOCOLO_MESTRE.md Seção 3):
 * - NUNCA expor update/delete para AuditLog. Somente insert.
 * - NUNCA logar dados sensíveis (senha, token, email completo se possível).
 * - Imutabilidade: uma vez escrito, o registro não pode ser alterado.
 *
 * Ver apps/api/src/modules/audit/README.md para padrões de uso.
 */
import { prisma } from '../../config/prisma.js';

/**
 * Ações de auditoria padronizadas.
 * Adicionar novas ações aqui NÃO quebra compatibilidade (é só string),
 * mas o tipo garante autocomplete e evita typos.
 */
export const AuditAction = {
  // User lifecycle
  USER_REGISTER: 'user.register',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_REFRESH: 'user.refresh',
  USER_PASSWORD_RESET_REQUEST: 'user.password_reset.request',
  USER_PASSWORD_RESET_CONFIRM: 'user.password_reset.confirm',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_EMAIL_VERIFIED: 'user.email_verified',
  USER_SUSPENDED: 'user.suspended',
  USER_REACTIVATED: 'user.reactivated',
  // RBAC
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REVOKED: 'role.revoked',
  // Permission denied
  PERMISSION_DENIED: 'permission.denied',
  // Subscription/Billing
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PLAN_CHANGED: 'subscription.plan_changed',
  BILLING_PAID: 'billing.paid',
  BILLING_REFUNDED: 'billing.refunded',
  BILLING_FAILED: 'billing.failed',
  // Generic CRUD (entidades)
  ENTITY_CREATE: 'entity.create',
  ENTITY_UPDATE: 'entity.update',
  ENTITY_DELETE: 'entity.delete',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Tipos de entidade auditáveis. Adicionar conforme novos modelos surgirem.
 */
export const EntityType = {
  USER: 'User',
  CLUB: 'Club',
  PLAYER: 'Player',
  COMPETITION: 'Competition',
  RANKING: 'Ranking',
  SESSION: 'Session',
  SUBSCRIPTION: 'Subscription',
  BILLING: 'Billing',
  ROLE: 'Role',
  PERMISSION: 'Permission',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

/**
 * Campos de mudança para um registro de auditoria de update.
 * Cada chave mapeia para { old, new }.
 */
export type AuditChanges = Record<string, { old: unknown; new: unknown }>;

/**
 * Metadata sempre presente em eventos de auditoria.
 * Não inclui dados sensíveis — apenas contexto de rede/sessão.
 */
export interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Payload de criação de AuditLog.
 */
export interface CreateAuditLogInput {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  userId?: string | null;
  changes?: AuditChanges;
  metadata?: AuditMetadata;
}

/**
 * Campos sensíveis que NUNCA devem aparecer em changes/metadata.
 * Se chegarem aqui, são mascarados antes de persistir.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'refreshtoken',
  'accesstoken',
  'secret',
  'apikey',
  'authorization',
  'cookie',
]);

/**
 * Mascara recursivamente campos sensíveis em um objeto.
 * Substitui o valor por '***REDACTED***'.
 */
function redactSensitive<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(redactSensitive) as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Helper para registrar um evento de auditoria.
 *
 * Implementação:
 * - Apenas insert (prisma.auditLog.create). NUNCA update/delete.
 * - Falha silenciosa em produção (loga erro mas não quebra a request principal).
 * - Em desenvolvimento, propaga o erro para facilitar debugging.
 *
 * @example
 *   await auditLog.record({
 *     entityType: EntityType.USER,
 *     entityId: user.id,
 *     action: AuditAction.USER_LOGIN,
 *     userId: user.id,
 *     metadata: { ip: request.ip, userAgent: request.headers['user-agent'] },
 *   });
 */
export const auditLog = {
  async record(input: CreateAuditLogInput): Promise<void> {
    const changes = input.changes ? redactSensitive(input.changes) : undefined;
    const metadata = input.metadata ? redactSensitive(input.metadata) : undefined;

    // PostgreSQL usa Json? (JSONB nativo); SQLite usa String? (serializado).
    // O Prisma Client gerado diverge entre os dois providers — usamos um cast
    // que funciona em ambos: serialize para string apenas no caso SQLite.
    const isSQLiteProvider = process.env.PRISMA_SCHEMA_PROVIDER === 'sqlite';

    const changesValue = changes === undefined
      ? null
      : isSQLiteProvider ? JSON.stringify(changes) : (changes as never);
    const metadataValue = metadata === undefined
      ? null
      : isSQLiteProvider ? JSON.stringify(metadata) : (metadata as never);

    try {
      await prisma.auditLog.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          userId: input.userId ?? null,
          changes: changesValue as never,
          metadata: metadataValue as never,
        },
      });
    } catch (err) {
      // Em produção: logar e continuar. Auditoria não pode derrubar a request.
      // Em desenvolvimento: relançar para pegar bugs cedo.
      if (process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line no-console
        console.error('[auditLog] Falha ao registrar evento de auditoria:', err);
      } else {
        throw err;
      }
    }
  },

  /**
   * Lista eventos de auditoria para uma entidade.
   * Útil para painel admin de "histórico de alterações".
   */
  async listByEntity(entityType: EntityType, entityId: string, limit = 100, offset = 0) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
    });
  },

  /**
   * Lista eventos de auditoria por usuário (quem executou a ação).
   */
  async listByUser(userId: string, limit = 100, offset = 0) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
    });
  },

  /**
   * Conta eventos por ação em um período (para dashboard de segurança).
   */
  async countByAction(action: AuditAction, since: Date): Promise<number> {
    return prisma.auditLog.count({
      where: { action, createdAt: { gte: since } },
    });
  },
};
