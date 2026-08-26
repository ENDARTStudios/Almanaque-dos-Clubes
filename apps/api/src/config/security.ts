/**
 * Configuração centralizada de segurança (T383).
 *
 * Fonte única da config do @fastify/helmet, consumida por `buildApp` e pelos
 * testes de regressão (sem réplica paralela — evita drift).
 *
 * - `X-Frame-Options` fixo em DENY (item 7.2).
 * - CSP e HSTS apenas em produção (`isProd`).
 */
export function helmetOptions(isProd: boolean) {
  return {
    contentSecurityPolicy: isProd
      ? { directives: { defaultSrc: ["'self'"], objectSrc: ["'none'"], scriptSrc: ["'self'"] } }
      : false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    xFrameOptions: { action: 'deny' as const },
  };
}
