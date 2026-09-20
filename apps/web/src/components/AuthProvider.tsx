'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, suppressSessionRefresh } from '@/lib/api';

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

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<{ data: AuthUser }>('/auth/me');
      setUser({
        id: res.data.id,
        email: res.data.email,
        name: (res.data as { name?: string | null }).name ?? null,
        roles: res.data.roles ?? [],
      });
      setStatus('authed');
    } catch (err) {
      const status = (err as { status?: number }).status;
      setUser(null);
      // Só 401 resolve "deslogado"; rede/5xx mantêm 'loading' (transitório —
      // a próxima navegação/focus re-verifica).
      setStatus(status === 401 ? 'anon' : 'loading');
    }
  }, []);

  // Re-verifica no mount, a cada navegação e no retorno de foco — o indicador
  // nunca fica preso num estado resolvido antes de um login/logout.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

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
