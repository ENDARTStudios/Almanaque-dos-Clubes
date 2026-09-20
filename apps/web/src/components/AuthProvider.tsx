'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, suppressSessionRefresh } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';

const API_BASE = getApiBase();

// T455 — fonte ÚNICA de verdade do estado de sessão no client. O navbar (e
// qualquer componente — ProtectedRoute, /auth/login) consome este contexto;
// NENHUM outro fetch de /auth/me é permitido (era a causa do conflito de
// "duas verdades" entre navbar e páginas). Re-verifica a cada navegação e no
// foco da janela; só resolve "deslogado" após 401 definitivo ou logout —
// erros transitórios (rede/5xx) mantêm o estado "loading" (nunca deslogado).
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
}

export type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthState {
  user: AuthUser | null;
  /** 'loading' enquanto indeterminado (erro transitório não resolve deslogado). */
  status: AuthStatus;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  status: 'loading',
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const pathname = usePathname();
  // T458 — orçamento de sessão no client: re-checks de navegação são
  // throttled (30s), focus só re-verifica após 60s e as abas compartilham o
  // resultado via BroadcastChannel (N abas = 1 verificação, não N).
  const lastCheckRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    // T457 (regra P0 do 09-20) — a cadeia de sessão SEMPRE assenta: qualquer
    // resposta HTTP (401/403/429/5xx) resolve o estado (anon se não-autenticado)
    // e a ausência de resposta tem teto duro — nunca spinner perpétuo.
    const attempt = async (signal: AbortSignal): Promise<AuthUser> => {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include', signal });
      // Qualquer resposta HTTP assenta: 401/403 → deslogado; 2xx/3xx → dados.
      if (res.status === 401 || res.status === 403) {
        const err = new Error('unauthenticated') as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      if (!res.ok) {
        const err = new Error(`me: ${res.status}`) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      const j = (await res.json()) as { data: AuthUser };
      return { ...j.data, name: j.data.name ?? null };
    };

    const controller = new AbortController();
    const teto = setTimeout(() => controller.abort(), 8000); // teto duro de 8s
    try {
      const user = await attempt(controller.signal);
      setUser({ ...user, name: user.name ?? null });
      setStatus('authed');
    } catch (err) {
      setUser(null);
      setStatus('anon'); // navegável primeiro; retry via navegação/focus
      const status = (err as { status?: number }).status;
      console.warn('[auth] sessão não verificada (resolvida anônima):', status ?? 'sem resposta');
    } finally {
      clearTimeout(teto);
      lastCheckRef.current = Date.now();
    }
  }, []);

  const refreshThrottled = useCallback(async (): Promise<void> => {
    const since = Date.now() - lastCheckRef.current;
    if (since < 30_000) return; // orçamento: máx. 1 check a cada 30s
    await refresh();
  }, [refresh]);

  // Re-verifica no mount (força) e nas navegações (throttled 30s) — o indicador
  // nunca fica preso num estado resolvido antes de um login/logout.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    // T458 — focus só re-verifica após 60s da última checagem.
    const onFocus = () => {
      if (Date.now() - lastCheckRef.current > 60_000) void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // T458 — abas compartilham a sessão via BroadcastChannel (N abas = 1 check).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('almanaque-session');
    ch.onmessage = (ev: MessageEvent) => {
      const data = ev.data as { user: AuthUser | null; at: number } | null;
      if (!data || data.at <= lastCheckRef.current) return;
      lastCheckRef.current = data.at;
      setUser(data.user);
      setStatus(data.user ? 'authed' : 'anon');
    };
    channelRef.current = ch;
    return () => ch.close();
  }, []);

  // publica o estado resolvido para as outras abas (owner + anon)
  useEffect(() => {
    if (status === 'loading') return;
    channelRef.current?.postMessage({ user, at: Date.now() });
  }, [user, status]);

  const logout = useCallback(async () => {
    // T454 — suprime o auto-refresh ANTES do POST (sem ressurreição).
    suppressSessionRefresh();
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('[auth] logout: servidor não confirmou revogação', err);
    }
    setUser(null);
    setStatus('anon');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
