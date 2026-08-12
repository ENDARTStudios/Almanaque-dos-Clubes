/**
 * Carrega variáveis de ambiente do .env e as valida com Zod.
 * Deve ser importado antes de qualquer outro módulo que use process.env.
 *
 * Validação:
 * - JWT_SECRET e JWT_REFRESH_SECRET: strings ≥ 32 chars em produção,
 *   rejeita placeholders conhecidos (FORBIDDEN_SECRETS).
 * - Em desenvolvimento, gera defaults efêmeros se não definidos (apenas para sandbox).
 * - JWT_SECRET != JWT_REFRESH_SECRET em produção (erro fatal se iguais).
 *
 * Uso:
 *   import { env } from './config/env.js';
 *   console.log(env.port);
 */
import { config } from 'dotenv';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';

// Carrega .env a partir da raiz do monorepo (3 níveis acima de apps/api/src/config/)
// ou do diretório atual (fallback).
config({ path: ['../../.env', '../../../.env', '.env'] });

// =============================================================================
// SCHEMAS ZOD
// =============================================================================

/**
 * Placeholders proibidos para JWT_SECRET/JWT_REFRESH_SECRET.
 * Se presente, a validação falha — evita deploy com valor default de exemplo.
 */
const FORBIDDEN_SECRETS = new Set([
  'SUA_CHAVE_AQUI',
  'SUA_CHAVE_JWT_AQUI',
  'SUA_CHAVE_REFRESH_AQUI',
  'changeme',
  'secret',
  'jwt_secret',
  'your-secret-key',
  'your-refresh-secret-key',
]);

/**
 * Valida um segredo JWT:
 * - Não vazio
 * - Não é placeholder proibido
 * - Em produção: ≥ 32 caracteres
 * - Em desenvolvimento: ≥ 16 caracteres (mais permissivo para testes)
 */
function validateJwtSecret(value: unknown, fieldName: string, isProd: boolean): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} não definida. Defina no .env`);
  }
  if (FORBIDDEN_SECRETS.has(value.toLowerCase())) {
    throw new Error(
      `${fieldName} contém placeholder proibido. Gere um segredo real com: openssl rand -base64 48`,
    );
  }
  const minLen = isProd ? 32 : 16;
  if (value.length < minLen) {
    throw new Error(
      `${fieldName} muito curta (mínimo ${minLen} caracteres, atual ${value.length}). ` +
        `Gere com: openssl rand -base64 48`,
    );
  }
  return value;
}

/**
 * Schema para durações (ex.: "15m", "7d", "1h", "30s").
 * Aceita formato <número><unidade> onde unidade ∈ {ms, s, m, h, d, w, y}.
 */
const durationSchema = z
  .string()
  .regex(
    /^\d+\s*(ms|s|m|h|d|w|y)$/,
    'Formato inválido. Exemplos válidos: "15m", "7d", "1h", "30ms"',
  );

// =============================================================================
// NODE_ENV
// =============================================================================

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';
const isDev = nodeEnv === 'development';

// =============================================================================
// JWT SECRETS
// =============================================================================

let jwtSecret: string;
let jwtRefreshSecret: string;

if (isProd) {
  // Em produção: variáveis OBRIGATÓRIAS e válidas
  jwtSecret = validateJwtSecret(process.env.JWT_SECRET, 'JWT_SECRET', true);
  jwtRefreshSecret = validateJwtSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET', true);
  if (jwtSecret === jwtRefreshSecret) {
    throw new Error(
      'JWT_SECRET e JWT_REFRESH_SECRET não podem ser iguais em produção. ' +
        'Gere dois segredos diferentes: openssl rand -base64 48',
    );
  }
} else {
  // Em desenvolvimento: gera defaults efêmeros se não definidos (apenas para sandbox).
  // ATENÇÃO: esses defaults mudam a cada restart — sessões não persistem entre restarts.
  // Defina JWT_SECRET e JWT_REFRESH_SECRET no .env local para persistência.
  jwtSecret = process.env.JWT_SECRET ?? generateEphemeralSecret();
  jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? generateEphemeralSecret();

  // Se definidos mas são placeholder, também rejeita em dev (fail-fast)
  if (FORBIDDEN_SECRETS.has(jwtSecret.toLowerCase())) {
    throw new Error('JWT_SECRET contém placeholder proibido. Gere um segredo real.');
  }
  if (FORBIDDEN_SECRETS.has(jwtRefreshSecret.toLowerCase())) {
    throw new Error('JWT_REFRESH_SECRET contém placeholder proibido. Gere um segredo real.');
  }
}

/**
 * Gera um segredo efêmero para desenvolvimento (quando JWT_SECRET não está definido).
 * 48 bytes aleatórios em base64 = 64 caracteres.
 */
function generateEphemeralSecret(): string {
  // 48 bytes aleatórios em base64 = 64 caracteres (≥32 chars exigido em prod)
  return randomBytes(48).toString('base64');
}

// =============================================================================
// DURAÇÕES JWT
// =============================================================================

const jwtExpiresIn = durationSchema.parse(process.env.JWT_EXPIRES_IN ?? '15m');
const jwtRefreshExpiresIn = durationSchema.parse(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d');

// =============================================================================
// SCHEMA FINAL — valida o resto das variáveis
// =============================================================================

const envSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  databaseUrl: z.string().min(1, 'DATABASE_URL não definida'),
  prismaSchemaProvider: z.enum(['sqlite', 'postgres']).default('sqlite'),
});

const parsed = envSchema.parse({
  nodeEnv,
  port: process.env.PORT,
  host: process.env.HOST,
  logLevel: process.env.LOG_LEVEL,
  databaseUrl: process.env.DATABASE_URL,
  prismaSchemaProvider: process.env.PRISMA_SCHEMA_PROVIDER,
});

// =============================================================================
// EXPORT
// =============================================================================

export const env = {
  // Servidor
  nodeEnv: parsed.nodeEnv,
  port: parsed.port,
  host: parsed.host,
  logLevel: parsed.logLevel,
  isDev,
  isProd,
  isTest: parsed.nodeEnv === 'test',

  // Banco
  databaseUrl: parsed.databaseUrl,
  prismaSchemaProvider: parsed.prismaSchemaProvider,

  // JWT
  jwtSecret,
  jwtRefreshSecret,
  jwtExpiresIn,
  jwtRefreshExpiresIn,

  // Upload (S3-compatível)
  s3Endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'almanaque',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'almanaque_dev_2025',
  s3Bucket: process.env.S3_BUCKET ?? 'almanaque-uploads',
  uploadMaxBytes: parseInt(process.env.UPLOAD_MAX_BYTES ?? '52428800', 10) || 52428800,
  uploadAllowedMimes: (process.env.UPLOAD_ALLOWED_MIMES ?? 'image/jpeg,image/png,image/webp').split(
    ',',
  ),
} as const;
