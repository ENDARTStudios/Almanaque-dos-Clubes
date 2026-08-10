/**
 * Auth service — orquestra registro, login e logout.
 *
 * Camada entre rotas (auth.routes.ts) e módulos de baixo nível:
 * - crypto.ts (hashPassword, verifyPassword)
 * - session.service.ts (createSession, revokeSession)
 * - rbac.service.ts (assignRole, getUserPermissions, getUserRoles)
 * - subscription.service.ts (createFreeSubscription)
 * - audit-log.service.ts (registra eventos)
 *
 * Princípios:
 * - Mensagens de erro genéricas para login ("Credenciais inválidas") — não revela se email existe
 * - Falta de usuário existente → mesma latência de usuário existente (timing attack prevention)
 * - Toda operação sensível é registrada no AuditLog
 * - Senha NUNCA aparece em logs, respostas, ou serializações (redaction automática em audit)
 */
import { prisma } from '../../config/prisma.js';
import { hashPassword, verifyPassword } from '../../config/crypto.js';
import { createSession, revokeSession, type SessionMetadata } from './session.service.js';
import { assignRole, getUserPermissions, getUserRoles, ROLE_NAMES } from './rbac.service.js';
import { createFreeSubscription } from '../billing/subscription.service.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import type { AuthUser } from './jwt.service.js';

// =============================================================================
// ERROS
// =============================================================================

/**
 * Erro de autenticação — sempre 401 com mensagem genérica.
 * NÃO revelar se email existe ou senha está errada (timing attack).
 */
export class AuthError extends Error {
  statusCode = 401;
  code = 'INVALID_CREDENTIALS';

  constructor(message = 'Credenciais inválidas') {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Erro de conflito (email já cadastrado).
 * Para register: é OK revelar que email existe (usuário pode ter esquecido).
 */
export class ConflictAuthError extends Error {
  statusCode = 409;
  code = 'EMAIL_ALREADY_REGISTERED';

  constructor(message = 'Email já cadastrado') {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Erro de validação de entrada (Zod).
 */
export class ValidationAuthError extends Error {
  statusCode = 422;
  code = 'VALIDATION_ERROR';
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

// =============================================================================
// TIPOS
// =============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthUser;
  refreshToken: string;
  sessionId: string;
}

// =============================================================================
// REGISTRO
// =============================================================================

/**
 * Cria novo usuário com:
 * - Email normalizado (lowercase)
 * - Senha hasheada com argon2id
 * - Role FREE atribuída por padrão
 * - Subscription FREE criada
 * - Sessão criada (auto-login)
 *
 * @example
 *   const { user, refreshToken } = await register({
 *     email: 'user@example.com',
 *     password: 'StrongPass123',
 *     name: 'João Silva',
 *   }, { userAgent: '...', ipAddress: '...' });
 */
export async function register(
  input: RegisterInput,
  metadata: SessionMetadata = {},
): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();
  const name = input.name?.trim() || null;

  // 1. Verifica se email já existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictAuthError(`Email já cadastrado: ${email}`);
  }

  // 2. Hash da senha (argon2id)
  const passwordHash = await hashPassword(input.password);

  // 3. Cria usuário
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  // 4. Atribui role FREE (idempotente)
  await assignRole(user.id, ROLE_NAMES.FREE);

  // 5. Cria subscription FREE (idempotente)
  await createFreeSubscription(user.id);

  // 6. Cria sessão (auto-login)
  const { refreshToken, session } = await createSession(user.id, metadata);

  // 7. Auditoria
  await auditLog.record({
    entityType: EntityType.USER,
    entityId: user.id,
    action: AuditAction.USER_REGISTER,
    userId: user.id,
    metadata: {
      ip: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  // 8. Carrega roles e permissions para o AuthUser
  const roles = (await getUserRoles(user.id)).map((r) => r.name);
  const permissions = Array.from(await getUserPermissions(user.id));

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    roles,
    permissions,
  };

  return {
    user: authUser,
    refreshToken,
    sessionId: session.id,
  };
}

// =============================================================================
// LOGIN
// =============================================================================

/**
 * Autentica usuário por email + senha.
 *
 * TIMING ATTACK PREVENTION:
 * Se email não existe, ainda assim chamamos verifyPassword com hash dummy
 * para manter latência similar ao caso de usuário existente.
 *
 * Mensagem de erro sempre genérica "Credenciais inválidas".
 */
export async function login(
  input: LoginInput,
  metadata: SessionMetadata = {},
): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();

  // 1. Busca usuário por email
  const user = await prisma.user.findUnique({ where: { email } });

  // Hash dummy para timing attack prevention
  // (se usuário não existe, ainda assim executamos verifyPassword)
  const DUMMY_HASH =
    '$argon2id$v=19$m=65536,t=12,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  // 2. Verifica senha
  let passwordValid = false;
  if (user) {
    passwordValid = await verifyPassword(input.password, user.passwordHash);
  } else {
    // Executa verifyPassword com hash dummy para gastar tempo similar
    await verifyPassword(input.password, DUMMY_HASH);
  }

  // 3. Verifica status do usuário
  if (user && user.status !== 'ACTIVE') {
    // Registra falha
    await auditLog.record({
      entityType: EntityType.USER,
      entityId: user.id,
      action: AuditAction.USER_LOGIN_FAILED,
      userId: user.id,
      metadata: { ip: metadata.ipAddress, reason: 'inactive' },
    });
    throw new AuthError('Credenciais inválidas');
  }

  // 4. Se senha inválida ou usuário não existe
  if (!passwordValid || !user) {
    // Registra falha (userId null se usuário não existe)
    await auditLog.record({
      entityType: EntityType.USER,
      entityId: user?.id ?? 'unknown',
      action: AuditAction.USER_LOGIN_FAILED,
      userId: user?.id ?? null,
      metadata: { ip: metadata.ipAddress },
    });
    throw new AuthError('Credenciais inválidas');
  }

  // 5. Sucesso: atualiza lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 6. Cria sessão
  const { refreshToken, session } = await createSession(user.id, metadata);

  // 7. Carrega roles e permissions
  const roles = (await getUserRoles(user.id)).map((r) => r.name);
  const permissions = Array.from(await getUserPermissions(user.id));

  // 8. Auditoria
  await auditLog.record({
    entityType: EntityType.USER,
    entityId: user.id,
    action: AuditAction.USER_LOGIN,
    userId: user.id,
    metadata: {
      ip: metadata.ipAddress,
      userAgent: metadata.userAgent,
      sessionId: session.id,
    },
  });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    roles,
    permissions,
  };

  return {
    user: authUser,
    refreshToken,
    sessionId: session.id,
  };
}

// =============================================================================
// LOGOUT
// =============================================================================

/**
 * Invalida sessão no banco (revoga refresh token) — true mesmo se token não existe.
 * Não limpa cookies aqui — isso é responsabilidade da rota.
 */
export async function logout(refreshToken: string | undefined): Promise<boolean> {
  if (!refreshToken) {
    // Sem token: já está "logout" do ponto de vista do cliente
    return true;
  }

  // Tenta encontrar a sessão para auditoria
  // (verifySession não revela o motivo — usamos revokeSession que é idempotente)
  await revokeSession(refreshToken);

  // Auditoria: não temos mais userId aqui (sessão foi revogada)
  // Em produção, poderíamos buscar session por tokenHash ANTES de revogar
  // para registrar userId no audit log. Por ora, registramos ação genérica.
  await auditLog.record({
    entityType: EntityType.SESSION,
    entityId: 'logout',
    action: AuditAction.USER_LOGOUT,
    userId: null,
    metadata: { timestamp: new Date().toISOString() },
  });

  return true;
}

// =============================================================================
// REFRESH TOKEN ROTATION
// =============================================================================

/**
 * Verifica refresh token e emite novo par (access + novo refresh).
 *
 * Implementa rotação: sessão antiga é revogada, nova sessão criada.
 *
 * @example
 *   const { user, refreshToken } = await refreshSession(oldRefreshToken);
 *   // setar novos cookies
 */
export async function refreshSession(
  oldRefreshToken: string,
  metadata: SessionMetadata = {},
): Promise<AuthResult> {
  // Importa aqui para evitar circular dependency no módulo
  const { verifySession, revokeSession: revokeSess } = await import('./session.service.js');

  // 1. Verifica se token corresponde a sessão ativa
  const session = await verifySession(oldRefreshToken);
  if (!session) {
    // Token inválido, expirado, ou sessão revogada
    // Detecta possível reuso: busca mesmo sabendo que está revogada
    const { findSessionByToken } = await import('./session.service.js');
    const existingSession = await findSessionByToken(oldRefreshToken);
    if (existingSession && existingSession.revokedAt !== null) {
      // ALERTA: refresh token revogado foi usado novamente.
      // Possível roubo de token — revogar TODAS as sessões do usuário.
      await revokeAllUserSessionsSafe(existingSession.userId);
      await auditLog.record({
        entityType: EntityType.SESSION,
        entityId: existingSession.id,
        action: AuditAction.USER_REFRESH,
        userId: existingSession.userId,
        metadata: {
          ip: metadata.ipAddress,
          warning: 'refresh_token_reuse_detected',
        },
      });
    }
    throw new AuthError('Credenciais inválidas');
  }

  // 2. Carrega usuário
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AuthError('Credenciais inválidas');
  }

  // 3. Revoga sessão antiga (rotação)
  await revokeSess(oldRefreshToken);

  // 4. Cria nova sessão
  const { refreshToken: newRefreshToken, session: newSession } = await createSession(
    user.id,
    metadata,
  );

  // 5. Carrega roles e permissions
  const roles = (await getUserRoles(user.id)).map((r) => r.name);
  const permissions = Array.from(await getUserPermissions(user.id));

  // 6. Auditoria
  await auditLog.record({
    entityType: EntityType.SESSION,
    entityId: newSession.id,
    action: AuditAction.USER_REFRESH,
    userId: user.id,
    metadata: {
      ip: metadata.ipAddress,
      oldSessionId: session.id,
      newSessionId: newSession.id,
    },
  });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    roles,
    permissions,
  };

  return {
    user: authUser,
    refreshToken: newRefreshToken,
    sessionId: newSession.id,
  };
}

/**
 * Helper interno: revoga todas as sessões de um usuário.
 */
async function revokeAllUserSessionsSafe(userId: string): Promise<void> {
  const { revokeAllUserSessions } = await import('./session.service.js');
  await revokeAllUserSessions(userId);
}

// =============================================================================
// HELPER: extrair metadata da request Fastify
// =============================================================================

/**
 * Extrai IP e User-Agent de uma request Fastify.
 * Importado aqui para auth.routes.ts não precisar duplicar.
 */
export function extractMetadata(request: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}): SessionMetadata {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
  };
}
