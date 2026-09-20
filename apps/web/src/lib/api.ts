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

// P1 — renovação de sessão single-flight: o access token dura 15min e NENHUM
// código do client chamava /auth/refresh — após 15min toda chamada dava 401 e
// o usuário aparentava logout (a sessão de 7 dias existia, mas nunca era usada).
let refreshPromise: Promise<boolean> | null = null;

// T454 — após "Sair" explícito, o interceptor NÃO pode ressuscitar a sessão
// com um refresh residual (cookies HttpOnly sobrevivem a falhas do logout).
let sessionSuppressed = false;

export function suppressSessionRefresh(): void {
  sessionSuppressed = true;
}

async function tryRefreshSession(): Promise<boolean> {
  if (sessionSuppressed) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const token = await readCsrfToken();
        const res = await fetch(API_BASE + '/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          // corpo "{}" obrigatório: parser do Fastify rejeita JSON vazio
          // (armadilha HANDOFF-T445) — o token vem do cookie __Host-refresh_token.
          body: '{}',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-csrf-token': token } : {}),
          },
        });
        return res.ok;
      } catch {
        return false;
      }
    })();
  }
  const ok = await refreshPromise;
  refreshPromise = null;
  return ok;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
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
  // T454 — login/register bem-sucedidos reabilitam a renovação automática
  // (cancela a supressão pós-logout).
  if (res.ok && method === 'POST' && (path === '/auth/login' || path === '/auth/register')) {
    sessionSuppressed = false;
  }
  // P1 — access expirado (401): renova a sessão uma vez e refaz a chamada.
  if (res.status === 401 && !isRetry) {
    const renewed = await tryRefreshSession();
    if (renewed) {
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        csrfToken = null;
        const fresh = await readCsrfToken();
        if (fresh) retryHeaders['x-csrf-token'] = fresh;
      }
      res = await fetch(API_BASE + path, { credentials: 'include', headers: retryHeaders, ...options });
    }
  }
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
    // T455 — status acessível ao chamador (AuthProvider distingue 401 de
    // erro transitório: só 401 resolve "deslogado").
    const error = new Error(
      details.length ? details.join('; ') : body.error.message,
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
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
