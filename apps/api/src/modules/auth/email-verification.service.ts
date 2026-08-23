/**
 * Email verification service (T342).
 *
 * Fluxo:
 * 1. POST /auth/register → cria token de verificação (hash + TTL 24h)
 * 2. Email com link contendo o token (via mailer provider-agnostic)
 * 3. POST /auth/verify-email → consome token, seta `emailVerified`
 *
 * Segurança:
 * - Token de 32 bytes aleatórios; armazenado APENAS como SHA-256
 *   (nunca em texto plano) — mesmo padrão de password-reset.service.ts.
 * - TTL de 24h; uso único (consumido no primeiro uso válido).
 * - Cooldown de 60s por usuário contra disparos repetidos (dedupe).
 * - Store em memória (padrão existente). Multi-instance exigiria tabela
 *   própria — backlog futuro, sem mudança de schema nesta tarefa.
 */
import { prisma } from '../../config/prisma.js';
import { generateToken, hashToken } from '../../config/crypto.js';

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_COOLDOWN_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface StoredVerificationToken {
  userId: string;
  expiresAt: Date;
  used: boolean;
}

const verificationTokenStore = new Map<string, StoredVerificationToken>();
const verificationCooldownStore = new Map<string, number>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, stored] of verificationTokenStore) {
    if (stored.expiresAt.getTime() < now) verificationTokenStore.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

/**
 * Gera token de verificação para um usuário.
 * Retorna null se estiver dentro do cooldown (dedupe de disparos).
 * Revoga tokens anteriores do mesmo usuário.
 */
export async function createEmailVerificationToken(userId: string): Promise<string | null> {
  const now = Date.now();
  const lastIssued = verificationCooldownStore.get(userId);
  if (lastIssued !== undefined && now - lastIssued < VERIFICATION_COOLDOWN_MS) {
    return null;
  }
  verificationCooldownStore.set(userId, now);

  for (const [key, stored] of verificationTokenStore) {
    if (stored.userId === userId) verificationTokenStore.delete(key);
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  verificationTokenStore.set(tokenHash, {
    userId,
    expiresAt: new Date(now + VERIFICATION_TOKEN_TTL_MS),
    used: false,
  });
  return token;
}

/**
 * Valida e consome um token de verificação.
 * Marca `emailVerified` no usuário e retorna o userId.
 * Retorna null se inválido, expirado ou já usado.
 */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const stored = verificationTokenStore.get(tokenHash);
  if (!stored || stored.used || stored.expiresAt.getTime() < Date.now()) {
    if (stored) verificationTokenStore.delete(tokenHash);
    return null;
  }
  stored.used = true;
  await prisma.user.update({
    where: { id: stored.userId },
    data: { emailVerified: new Date() },
  });
  return stored.userId;
}
