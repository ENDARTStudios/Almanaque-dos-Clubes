'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';

// T439 — hooks de favoritos: CRUD + tempo real via /ws (ticket curto).

export interface FavoriteView {
  id: string;
  clubId: string;
  notificationsActive: boolean;
  createdAt: string;
  club: {
    id: string;
    name: string;
    country: string | null;
    state: string | null;
    city: string | null;
  };
  ranking: { name: string; season: string | null; position: number; points: number | null } | null;
}

export interface FavoritesResponse {
  data: FavoriteView[];
  ranking: { name: string; season: string | null } | null;
}

// Origem WS derivada da mesma API_BASE do cliente HTTP (dev: mesma origem;
// prod: api.almanaquedosclubes.com).
function wsOrigin(): string {
  return getApiBase()
    .replace(/\/api\/v1\/?$/, '')
    .replace(/^http/, 'ws');
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteView[]>([]);
  const [ranking, setRanking] = useState<{ name: string; season: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<FavoritesResponse>('/favorites');
      setFavorites(res.data);
      setRanking(res.ranking);
      setLoaded(true);
      setError(false);
    } catch {
      setError(true);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tempo real: ticket curto (cookie httpOnly) → /ws?ticket=… → eventos do
  // próprio usuário. Reconexão com backoff exponencial + heartbeat 25s.
  const liveRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;

    const connect = async (): Promise<void> => {
      try {
        const res = await api.post<{ data: { ticket: string } }>('/ws/ticket');
        if (disposed) return;
        const ws = new WebSocket(`${wsOrigin()}/ws?ticket=${res.data.ticket}`);
        liveRef.current = ws;
        ws.onopen = () => {
          attempt = 0;
          setLive(true);
          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
          }, 25000);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as {
              event?: string;
              data?: { clubId?: string };
            };
            if (msg.event === 'favorite_added' && msg.data?.clubId) void refresh();
            if (msg.event === 'favorite_removed' && msg.data?.clubId) void refresh();
          } catch {
            /* ignora mensagens inválidas */
          }
        };
        ws.onclose = () => {
          setLive(false);
          if (heartbeat) clearInterval(heartbeat);
          if (!disposed) {
            attempt += 1;
            reconnect = setTimeout(() => void connect(), Math.min(1000 * 2 ** attempt, 30000));
          }
        };
      } catch {
        // sem sessão (401) — não reconecta
      }
    };

    void connect();
    return () => {
      disposed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnect) clearTimeout(reconnect);
      liveRef.current?.close();
    };
  }, [refresh]);

  const add = useCallback(
    async (clubId: string): Promise<void> => {
      await api.post('/favorites', { clubId });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (clubId: string): Promise<void> => {
      await api.delete(`/favorites/${clubId}`);
      await refresh();
    },
    [refresh],
  );

  return { favorites, ranking, loaded, error, live, add, remove, refresh };
}
