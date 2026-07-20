/**
 * Carrega variáveis de ambiente do .env.
 * Deve ser importado antes de qualquer outro módulo que use process.env.
 */
import { config } from 'dotenv';

config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;
