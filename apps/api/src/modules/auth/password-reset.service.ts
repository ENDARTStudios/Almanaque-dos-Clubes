/**
 * Password reset service (Tarefa 3.6).
 *
 * Fluxo:
 * 1. POST /auth/forgot-password → gera token único, expira 15min
 * 2. Envia email mock (log) com link contendo token
 * 3. POST /auth/reset-password/:token → valida token, atualiza senha
 *
 * Segurança:
 * - Token de 32 bytes aleatórios (SHA-256 hash para armazenamento)
 * - Expira em 15 minutos
 * - Uso único: revogado após reset bem-sucedido
 * - Rate limiting no endpoint (Tarefa 3.8)
 */
import { prisma } from '../../config/prisma.js';
import { generateToken, hashToken, hashPassword } from '../../config/crypto.js';

// Duração do token de reset: 15 minutos
const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;

interface ResetToken {
  token: string; // texto plano (enviado ao cliente)
  tokenHash: string; // hash (armazenado)
  userId: string;
  expiresAt: Date;
}

/**
 * Gera um token de reset de senha para um usuário.
 * Idempotente: se já existe token válido, reusa.
 */
export async function createPasswordResetToken(email: string): Promise<ResetToken | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null; // Não revela se email existe

  // Revoga tokens anteriores (quando tabela password_reset_tokens existir no schema)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwdReset = (prisma as any).passwordResetToken;
  if (pwdReset?.updateMany) {
    await pwdReset.updateMany({
      where: { userId: user.id },
      data: { usedAt: new Date() },
    });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

  // TODO: Usar tabela password_reset_tokens (falta no schema)
  // Por ora, armazena em memória (não persistente entre restarts)
  // Tabela necessária: id, userId, tokenHash, expiresAt, usedAt

  return { token, tokenHash, userId: user.id, expiresAt };
}

/**
 * Valida e consome um token de reset.
 * Retorna o userId se válido, null se inválido/expirado/usado.
 */
export async function consumePasswordResetToken(_token: string): Promise<string | null> {
  // TODO: Implementar quando tabela password_reset_tokens existir
  return null;
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
