/**
 * Session service — autenticação stateless via refresh token.
 *
 * Fluxo:
 * 1. Login → createSession(userId, metadata) retorna { refreshToken, session }
 * 2. Cliente envia refreshToken em cookie httpOnly
 * 3. Refresh → verifySession(refreshToken) retorna session ativa ou null
 * 4. Logout → revokeSession(refreshToken) marca revokedAt = now
 *
 * Modelo no banco:
 * - Session tem tokenHash (SHA-256 do refreshToken) — nunca persistimos o token em texto
 * - Session tem expiresAt (7 dias) — sessões expiradas são inválidas
 * - Session tem revokedAt (null = ativa) — sessões revogadas são inválidas
 *
 * RLS (T371): cada operação usa `withRlsContext` com o contexto correto:
 * - createSession → owner (userId) [INSERT owner]
 * - verifySession/findSessionByToken → posse (tokenHash) [SELECT by token]
 * - revoke/update owner → owner (userId) [UPDATE owner]
 * - cleanupExpiredSessions → SERVICE [DELETE service]
 *
 * Segurança:
 * - Refresh token rotação: cada refresh invalida a sessão atual e cria nova
 *   (implementado em auth.routes.ts / auth.service.ts)
 * - tokenHash nunca é o token cru; o GUC recebe apenas o hash SHA-256.
 */
import { generateToken, hashToken } from '../../config/crypto.js';
import { withRlsContext } from '../../config/rls-context.js';
import type { Session } from '@prisma/client';

/**
 * Duração padrão do refresh token: 7 dias.
 * Em milissegundos para cálculo de expiresAt.
 */
export const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Metadata capturada no momento do login para auditoria.
 * NÃO incluir dados sensíveis — apenas contexto de rede/sessão.
 */
export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Resultado da criação de sessão.
 * `refreshToken` deve ser enviado para o cliente (cookie httpOnly).
 * `session` contém a entidade persistida (sem o token).
 */
export interface CreateSessionResult {
  refreshToken: string; // texto plano — só existe aqui, nunca persistido
  session: Session; // entidade do banco (tokenHash, não o token)
}

/**
 * Cria uma nova sessão para um usuário (contexto owner).
 */
export async function createSession(
  userId: string,
  metadata: SessionMetadata = {},
): Promise<CreateSessionResult> {
  const refreshToken = generateToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  const session = await withRlsContext({ userId }, (tx) =>
    tx.session.create({
      data: {
        userId,
        tokenHash,
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
        expiresAt,
        revokedAt: null,
      },
    }),
  );

  return { refreshToken, session };
}

/**
 * Verifica se um refresh token corresponde a uma sessão ativa.
 * Contexto de posse (tokenHash): a busca pré-auth autoriza apenas a linha do
 * próprio token apresentado.
 *
 * @returns A sessão ativa, ou `null` se:
 *   - Token não corresponde a nenhuma sessão (tokenHash inexistente)
 *   - Sessão está revogada (revokedAt != null)
 *   - Sessão está expirada (expiresAt < now)
 */
export async function verifySession(refreshToken: string): Promise<Session | null> {
  if (!refreshToken) return null;

  const tokenHash = hashToken(refreshToken);
  const session = await withRlsContext({ tokenHash }, (tx) =>
    tx.session.findUnique({ where: { tokenHash } }),
  );

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

/**
 * Verifica se um refresh token corresponde a UMA sessão (ativa ou não).
 * Útil para rotação: mesmo revogada, queremos saber se o token já existia
 * (detectar reuso de token revogado = possível ataque).
 */
export async function findSessionByToken(refreshToken: string): Promise<Session | null> {
  if (!refreshToken) return null;
  const tokenHash = hashToken(refreshToken);
  return withRlsContext({ tokenHash }, (tx) => tx.session.findUnique({ where: { tokenHash } }));
}

/**
 * Revoga uma sessão (logout).
 *
 * Dois passos sob RLS:
 * 1. Acha a sessão por posse (tokenHash) para obter o userId;
 * 2. Revoga por owner (userId).
 *
 * Idempotente: revogar sessão já revogada (ou inexistente) não causa erro.
 */
export async function revokeSession(refreshToken: string): Promise<boolean> {
  if (!refreshToken) return false;
  const tokenHash = hashToken(refreshToken);

  const session = await withRlsContext({ tokenHash }, (tx) =>
    tx.session.findUnique({ where: { tokenHash } }),
  );
  if (!session) return true; // idempotente: nada a revogar

  await withRlsContext({ userId: session.userId }, (tx) =>
    tx.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  );
  return true;
}

/**
 * Revoga todas as sessões ativas de um usuário (contexto owner).
 *
 * Uso:
 * - Password reset (invalida todas as sessões antigas)
 * - Detectado reuso de token revogado (comprometimento de sessão)
 * - Suspensão de conta de usuário
 *
 * @returns Número de sessões revogadas
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await withRlsContext({ userId }, (tx) =>
    tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  );
  return result.count;
}

/**
 * Conta sessões ativas de um usuário (contexto owner).
 */
export async function countActiveUserSessions(userId: string): Promise<number> {
  return withRlsContext({ userId }, (tx) =>
    tx.session.count({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  );
}

/**
 * Lista sessões ativas de um usuário (contexto owner) — para "gerenciar sessões".
 * NÃO retorna tokenHash — apenas metadata (userAgent, ipAddress, expiresAt, createdAt).
 */
export async function listActiveUserSessions(userId: string) {
  return withRlsContext({ userId }, (tx) =>
    tx.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  );
}

/**
 * Deleta sessões expiradas há mais de 30 dias (contexto SERVICE — job de manutenção).
 *
 * @returns Número de registros deletados
 */
export async function cleanupExpiredSessions(retentionDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await withRlsContext({ role: 'SERVICE' }, (tx) =>
    tx.session.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    }),
  );
  return result.count;
}
