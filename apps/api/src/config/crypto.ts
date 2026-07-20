/**
 * Crypto helpers para senha e tokens.
 *
 * SENHA — argon2id (RFC 9106), custo 12 (memória 64 MiB, paralelismo 1):
 * - Recomendado pela OWASP para autenticação de senha (Memory-Hard Function).
 * - argon2id combina resistência a GPU (argon2i) e a trade-offs tempo/memória (argon2d).
 * - Custo 12 = 64 MiB RAM por hash — adequado para servidor típico; ajustar conforme hardware.
 * - O salt é gerado automaticamente pelo argon2.hash() e embutido no hash resultante
 *   (formato $argon2id$v=19$m=65536,t=12,p=1$<salt>$<hash>). NÃO persistimos salt separado.
 *
 * TOKENS (refresh, reset, etc.) — SHA-256:
 * - Hash unidirecional rápido — adequado para tokens longos aleatórios.
 * - Diferente de senha: token já é alta-entropia (32+ bytes), não precisa de argon2.
 * - SHA-256 é seguro contra preimage em tokens aleatórios de tamanho suficiente.
 *
 * PRINCÍPIO: nunca expor o hash em logs, respostas de erro, ou serializações.
 * Ver apps/api/src/modules/audit/audit-log.service.ts para redaction automática.
 */
import argon2, { type HashOptions } from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

/**
 * Parâmetros do argon2id.
 * Custo 12 = tempo de iteração; memória 65.536 KiB = 64 MiB; paralelismo 1.
 * Estes valores são seguros para produção em hardware típico (latência ~100ms por hash).
 */
const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id, // = 2 — argon2id (RFC 9106)
  memoryCost: 65_536, // 64 MiB
  timeCost: 12, // 12 iterações
  parallelism: 1,
};

/**
 * Tamanho em bytes de tokens aleatórios (refresh, reset, etc.).
 * 32 bytes = 256 bits = ~43 caracteres base64url.
 */
const TOKEN_BYTES = 32;

// =============================================================================
// SENHA — argon2id
// =============================================================================

/**
 * Gera o hash argon2id de uma senha em texto plano.
 *
 * @example
 *   const hash = await hashPassword('user-password-123');
 *   // hash = '$argon2id$v=19$m=65536,t=12,p=1$<salt>$<hash>'
 *
 * Latência esperada: ~100-150ms em hardware típico.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length === 0) {
    throw new Error('Senha não pode ser vazia');
  }
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verifica se uma senha em texto plano corresponde a um hash argon2id.
 *
 * Usa comparação timing-safe internamente (argon2.verify já é seguro contra timing attacks).
 *
 * @example
 *   const valid = await verifyPassword(userInput, storedHash);
 *   if (!valid) {
 *     // NÃO revelar se email existe — usar mensagem genérica 'credenciais inválidas'
 *     throw new UnauthorizedError('Credenciais inválidas');
 *   }
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Hash malformado ou algoritmo desconhecido — tratar como falha
    return false;
  }
}

// =============================================================================
// TOKENS — SHA-256 + randomBytes
// =============================================================================

/**
 * Gera um token aleatório criptograficamente seguro (32 bytes = 256 bits).
 *
 * Uso típico: refresh tokens, reset tokens, magic links.
 *
 * @returns Token em formato base64url (~43 caracteres). Sem prefixo/sufixo.
 *
 * @example
 *   const refreshToken = generateToken();
 *   const tokenHash = hashToken(refreshToken);
 *   // Persistir apenas tokenHash no banco; enviar refreshToken para o cliente.
 */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Gera o hash SHA-256 de um token.
 *
 * SHA-256 é adequado para tokens porque:
 * 1. Token já é alta-entropia (32 bytes aleatórios) — não precisa de KDF como argon2
 * 2. Hash unidirecional: se o banco vazar, atacante não consegue recuperar o token original
 * 3. Rápido: ~1μs por hash (vs ~100ms do argon2). Importante para /auth/refresh em hot path.
 *
 * @example
 *   const token = generateToken();
 *   const hash = hashToken(token);
 *   await prisma.session.create({ data: { tokenHash: hash, ... } });
 */
export function hashToken(token: string): string {
  if (!token) throw new Error('Token não pode ser vazio');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Verifica se um token corresponde a um hash armazenado.
 * Usa timingSafeEqual para prevenir timing attacks.
 *
 * @example
 *   const storedHash = await prisma.session.findUnique(...).tokenHash;
 *   const valid = verifyToken(providedToken, storedHash);
 */
export function verifyToken(token: string, hash: string): boolean {
  if (!token || !hash) return false;
  const computedHash = hashToken(token);
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// =============================================================================
// HELPERS ADICIONAIS
// =============================================================================

/**
 * Gera um código curto (6 dígitos) para verificação por email/SMS.
 * Não adequado para refresh tokens — apenas para códigos de curta duração (OTP).
 *
 * @example
 *   const code = generateNumericCode(6);
 *   // '482910'
 */
export function generateNumericCode(length = 6): string {
  if (length < 4 || length > 10) {
    throw new Error('Comprimento deve estar entre 4 e 10');
  }
  const max = 10 ** length;
  const value = randomBytes(4).readUInt32LE(0) % max;
  return value.toString().padStart(length, '0');
}

/**
 * Compara duas strings de forma timing-safe (não revela diferença de tamanho).
 * Útil para comparar tokens/códigos que chegaram por header.
 *
 * Não usar para senhas (use verifyPassword).
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
