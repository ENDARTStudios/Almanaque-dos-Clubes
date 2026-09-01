const PROD_API_URL = 'https://api.almanaquedosclubes.com/api/v1';
const DEV_API_URL = 'http://localhost:3000/api/v1';

function isTrustedApiBase(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === 'api.almanaquedosclubes.com' || host.endsWith('.almanaquedosclubes.com');
  } catch {
    return false;
  }
}

const configuredApi = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
// Em produção, confiamos apenas em uma base da família almanaquedosclubes.com.
// Ignora URLs de staging/railway/localhost configuradas por engano no ambiente.
const API_BASE =
  process.env.NODE_ENV === 'production'
    ? configuredApi && isTrustedApiBase(configuredApi)
      ? configuredApi
      : PROD_API_URL
    : configuredApi || DEV_API_URL;

interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

let csrfToken: string | null = null;

async function readCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(API_BASE + '/auth/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>;
      const d = (j.data ?? j) as Record<string, unknown>;
      csrfToken = (d.csrfToken as string) ?? (d.token as string) ?? null;
    }
  } catch {
    /* sem token determinável */
  }
  return csrfToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await readCsrfToken();
    if (token) headers['x-csrf-token'] = token;
  }
  const res = await fetch(API_BASE + path, { credentials: 'include', headers, ...options });
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: 'Erro desconhecido' } }))) as ApiError;
    throw new Error(body.error.message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
