/**
 * Contexto de Row-Level Security (T370).
 *
 * Define `app.current_user_id` / `app.current_user_role` via
 * `set_config(..., true)` (equivalente a `SET LOCAL`) dentro de uma transação
 * Prisma. O contexto vale apenas para a transação atual e não vaza para o
 * pool de conexões.
 *
 * LIMITE ARQUITETURAL (importante): o Prisma usa pool de conexões. O contexto
 * RLS só pode ser aplicado dentro de uma transação que envolva as próprias
 * queries. Não é possível propagá-lo automaticamente a partir de um
 * `preHandler` (middleware) — as queries do handler podem rodar em conexão
 * diferente. Portanto, handlers de fluxos autenticados devem usar
 * `withRlsContext` explicitamente (ou `rlsContextFromRequest` para construir o
 * contexto a partir de `request.user`).
 *
 * Por isso o deploy de RLS em produção permanece ADIADO
 * (DECISOES.md `D-2026-08-24-rls-producao-adiado`) até que todos os fluxos
 * autenticados adotem este padrão.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type RlsRole = 'USER' | 'SERVICE';

export interface RlsContext {
  userId?: string;
  role?: RlsRole;
  /** Hash SHA-256 do refresh token (posse pré-auth). Nunca o token cru. */
  tokenHash?: string;
}

/**
 * Executa `fn` dentro de uma transação com o contexto RLS aplicado via
 * `SET LOCAL`. Devolve o resultado de `fn`.
 */
export async function withRlsContext<T>(
  ctx: RlsContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (ctx.userId) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, ctx.userId);
    }
    if (ctx.role) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role', $1, true)`, ctx.role);
    }
    if (ctx.tokenHash) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_token_hash', $1, true)`,
        ctx.tokenHash,
      );
    }
    return fn(tx);
  });
}

/**
 * Constrói o contexto RLS a partir do usuário autenticado da request.
 * Request anônimo → contexto vazio (deny-by-default nas políticas).
 */
export function rlsContextFromRequest(user?: { id: string } | null): RlsContext {
  if (!user) return {};
  return { userId: user.id, role: 'USER' };
}
