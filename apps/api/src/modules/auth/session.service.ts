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
 * Segurança:
 * - Refresh token rotação: cada refresh invalida a sessão atual e cria nova
 *   (implementado em auth.routes.ts, não aqui)
 * - Limpeza: job agendado deve deletar sessions com expiresAt < now - 30d
 *   (Tarefa 7.x ou 9.x)
 */
import { prisma } from '../../config/prisma.js';
import { generateToken, hashToken } from '../../config/crypto.js';
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
 * Cria uma nova sessão para um usuário.
 *
 * @example
 *   const { refreshToken, session } = await createSession(user.id, {
 *     userAgent: request.headers['user-agent'],
 *     ipAddress: request.ip,
 *   });
 *   // setar cookie httpOnly com refreshToken
 *   // persistir session.id para futura verificação
 */
export async function createSession(
  userId: string,
  metadata: SessionMetadata = {},
): Promise<CreateSessionResult> {
  const refreshToken = generateToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
      expiresAt,
      revokedAt: null,
    },
  });

  return { refreshToken, session };
}

/**
 * Verifica se um refresh token corresponde a uma sessão ativa.
 *
 * @returns A sessão ativa, ou `null` se:
 *   - Token não corresponde a nenhuma sessão (tokenHash inexistente)
 *   - Sessão está revogada (revokedAt != null)
 *   - Sessão está expirada (expiresAt < now)
 *
 * @example
 *   const session = await verifySession(refreshToken);
 *   if (!session) {
 *     // 401 — credenciais inválidas (não revelar motivo)
 *   }
 */
export async function verifySession(refreshToken: string): Promise<Session | null> {
  if (!refreshToken) return null;

  // Busca por hash (não expõe o token em query)
  // Mas primeiro precisamos saber QUAL hash buscar — não sabemos sem computar.
  // Solução: hashToken(refreshToken) e buscar por tokenHash.
  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) return null;

  // Sessão revogada (logout explícito)
  if (session.revokedAt !== null) return null;

  // Sessão expirada
  if (session.expiresAt < new Date()) return null;

  return session;
}

/**
 * Verifica se um refresh token corresponde a UMA sessão (ativa ou não).
 *
 * Útil para rotação: mesmo se a sessão foi revogada, queremos saber se o token
 * já existia (detectar reuso de token revogado = possível ataque).
 *
 * @example
 *   const session = await findSessionByToken(refreshToken);
 *   if (session && session.revokedAt !== null) {
 *     // ALERTA: refresh token revogado foi usado novamente.
 *     // Possível roubo de token — revogar TODAS as sessões do usuário.
 *     await revokeAllUserSessions(session.userId);
 *   }
 */
export async function findSessionByToken(refreshToken: string): Promise<Session | null> {
  if (!refreshToken) return null;
  const tokenHash = hashToken(refreshToken);
  return prisma.session.findUnique({ where: { tokenHash } });
}

/**
 * Revoga uma sessão (logout).
 *
 * Não deleta o registro — apenas marca revokedAt = now. Isso:
 * 1. Preserva auditoria (sabemos quando a sessão foi revogada)
 * 2. Permite detectar reuso de token revogado
 * 3. Mantém índice `revokedAt` utilizável para queries "sessões ativas"
 *
 * Idempotente: revogar sessão já revogada não causa erro.
 *
 * @returns true se a sessão foi encontrada (e revogada), false caso contrário
 */
export async function revokeSession(refreshToken: string): Promise<boolean> {
  if (!refreshToken) return false;
  const tokenHash = hashToken(refreshToken);

  try {
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revoga todas as sessões ativas de um usuário.
 *
 * Uso:
 * - Password reset (invalida todas as sessões antigas)
 * - Detectado reuso de token revogado (comprometimento de sessão)
 * - Suspensão de conta de usuário
 *
 * @returns Número de sessões revogadas
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Conta sessões ativas de um usuário.
 * Útil para dashboard "você tem N sessões ativas".
 */
export async function countActiveUserSessions(userId: string): Promise<number> {
  return prisma.session.count({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Lista sessões ativas de um usuário (para dashboard "gerenciar sessões").
 * NÃO retorna tokenHash — apenas metadata (userAgent, ipAddress, expiresAt, createdAt).
 */
export async function listActiveUserSessions(userId: string) {
  return prisma.session.findMany({
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
  });
}

/**
 * Deleta sessões expiradas há mais de 30 dias.
 * Job de manutenção — chamar 1x/dia (cron, Fase 9).
 *
 * @returns Número de registros deletados
 */
export async function cleanupExpiredSessions(retentionDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
}
