/**
 * WS-G-1 — Redação de segredos para logs/manifests.
 * NUNCA ecoa DATABASE_URL/REDIS_URL/tokens/senhas. Substitui por '«redacted»'.
 */
const SECRET_KEY =
  /(database_url|redis_url|redis_private_url|token|secret|password|passwd|pwd|authorization|api[_-]?key|jwt|csrf)/i;
const SECRET_VALUE = /(postgres(ql)?:\/\/|redis(s)?:\/\/|bearer\s|-----BEGIN )/i;
const REDACTED = '«redacted»';

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return SECRET_VALUE.test(value) ? REDACTED : value;
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? REDACTED : redactValue(v);
    }
    return out;
  }
  return value;
}

export function redact<T>(input: T): T {
  return redactValue(input) as T;
}
