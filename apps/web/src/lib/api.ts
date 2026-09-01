import { getApiBase } from './api-base';

const API_BASE = getApiBase();

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
  let res = await fetch(API_BASE + path, { credentials: 'include', headers, ...options });
  // Se um write falhar por CSRF stale, invalida o cache, refaz o token e tenta uma vez.
  if (!res.ok && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const probe = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    if (probe?.error?.code === 'CSRF_INVALID') {
      csrfToken = null;
      const fresh = await readCsrfToken();
      if (fresh) headers['x-csrf-token'] = fresh;
      res = await fetch(API_BASE + path, { credentials: 'include', headers, ...options });
    }
  }
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: 'Erro desconhecido' } }))) as ApiError;
    // Se a API devolver erros de validação em "details", mostramos as mensagens
    // específicas (ex.: "Senha deve conter ao menos 1 letra maiúscula").
    const details =
      Array.isArray((body.error as { details?: unknown })?.details) === true
        ? ((body.error as { details?: Array<{ message?: string }> }).details ?? [])
            .map((d) => d?.message)
            .filter(Boolean)
            .slice(0, 3)
        : [];
    throw new Error(details.length ? details.join('; ') : body.error.message);
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
