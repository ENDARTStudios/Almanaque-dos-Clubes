'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, suppressSessionRefresh } from '@/lib/api';

// T450 — fonte ÚNICA de verdade do estado de sessão no client. O navbar (e
// qualquer componente) consome este contexto em vez de chamar /auth/me por
// conta própria — a divergência entre fontes era o bug do indicador.
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data: AuthUser }>('/auth/me');
      setUser({
        id: res.data.id,
        email: res.data.email,
        name: (res.data as { name?: string | null }).name ?? null,
        roles: res.data.roles ?? [],
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    // T454 — a ordem IMPORTA: primeiro o POST /auth/logout (o interceptor do
    // #143 renova o access expirado e o retry revoga de fato); a supressão
    // do auto-refresh vem DEPOIS, para evitar ressurreição por 401s residuais.
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('[auth] logout: servidor não confirmou revogação', err);
    }
    suppressSessionRefresh();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
