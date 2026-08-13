/**
 * Password reset service (Tarefa 3.6).
 *
 * Fluxo:
 * 1. POST /auth/forgot-password → gera token único, expira 15min
 * 2. Envia email com link contendo token (Fase 12.1 — Resend)
 * 3. POST /auth/reset-password → valida token, atualiza senha
 *
 * Segurança:
 * - Token de 32 bytes aleatórios (SHA-256 hash para armazenamento)
 * - Expira em 15 minutos
 * - Uso único: revogado após reset bem-sucedido
 * - Tokens armazenados em Map em memória (singleton-instance dev/prod).
 *   Para multi-instance, migrar para tabela password_reset_tokens no schema.
 */
import { prisma } from '../../config/prisma.js';
import { generateToken, hashToken, hashPassword } from '../../config/crypto.js';

const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface StoredToken {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

/**
 * Store em memória para tokens de reset.
 * Limpa tokens expirados a cada 5 minutos.
 */
const resetTokenStore = new Map<string, StoredToken>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, stored] of resetTokenStore) {
    if (stored.expiresAt.getTime() < now) resetTokenStore.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

/**
 * Gera um token de reset de senha para um usuário.
 * Retorna o token em texto plano + dados do usuário para envio de email.
 * Retorna null se o email não existir (não revela existência).
 */
export async function createPasswordResetToken(
  email: string,
): Promise<{ token: string; name: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  // Revoga tokens anteriores do mesmo usuário
  for (const [key, stored] of resetTokenStore) {
    if (stored.userId === user.id) resetTokenStore.delete(key);
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

  resetTokenStore.set(tokenHash, { tokenHash, userId: user.id, expiresAt, used: false });

  const name = user.name ?? user.email.split('@')[0];
  return { token, name, email: user.email };
}

/**
 * Valida e consome um token de reset.
 * Retorna o userId se válido, null se inválido/expirado/usado.
 */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const stored = resetTokenStore.get(tokenHash);
  if (!stored || stored.used || stored.expiresAt < new Date()) {
    if (stored) resetTokenStore.delete(tokenHash);
    return null;
  }
  stored.used = true;
  return stored.userId;
}

/**
 * Reseta a senha de um usuário.
 */
export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
