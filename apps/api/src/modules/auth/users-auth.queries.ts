import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

/**
 * T442 — Lookup PRE-AUTH de usuário por email (login, checagem de duplicidade
 * no registro, forgot-password).
 *
 * Com FORCE RLS em users (rls_users_setup.sql), um SELECT comum pré-auth é
 * negado — passa pela função SECURITY DEFINER `users_find_by_email` (dono =
 * superuser que aplicou o script). Retorna a primeira linha ou null.
 */
export interface UserAuthRow {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  emailVerified: Date | null;
}

export async function usersFindByEmail(email: string): Promise<UserAuthRow | null> {
  const rows = await prisma.$queryRawUnsafe<UserAuthRow[]>(
    'SELECT * FROM users_find_by_email($1)',
    email.toLowerCase().trim(),
  );
  return rows[0] ?? null;
}

/** Tipo de transação usado pelos serviços com withRlsContext. */
export type Tx = Prisma.TransactionClient;
