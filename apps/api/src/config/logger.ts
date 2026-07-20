/**
 * Logger Pino estruturado.
 * Em produção serializa JSON; em desenvolvimento pretty-print.
 */
import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  ...(env.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});
