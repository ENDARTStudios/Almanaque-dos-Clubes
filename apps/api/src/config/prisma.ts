/**
 * Singleton do PrismaClient.
 * Evita múltiplas conexões em ambientes com hot-reload (tsx watch).
 */

import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// T401: a API conecta como role nao-superusuario (app_user) para RLS efetiva.
// Prefere DATABASE_URL_APP (segredo do Railway, nao commitado) e cai para DATABASE_URL.
const APP_DB_URL = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL;
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    datasources: { db: { url: APP_DB_URL } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
