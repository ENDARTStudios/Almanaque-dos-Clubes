'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsC8Strings, notificationTypeLabel } from '@/i18n/wsC8';

/**
 * WS-C-8 — histórico completo de notificações (/notifications).
 * Filtro todas/não-lidas + paginação (50 por página). Mesma linguagem visual
 * do dropdown, expandida.
 */

interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

const PAGE_SIZE = 50;

function NotificationsList() {
  const { locale } = useI18n();
  const s = wsC8Strings[locale].notifications;
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ notifications: NotificationItem[]; total: number }>(
        `/notifications?limit=${PAGE_SIZE}&offset=${offset}${unreadOnly ? '&unreadOnly=true' : ''}`,
      );
      setItems(r.notifications ?? []);
      setTotal(r.total ?? 0);
      setFailed(false);
    } catch {
      setFailed(true);
      setItems([]);
    }
  }, [unreadOnly, offset]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const markRead = async (n: NotificationItem) => {
    if (n.read) return;
    try {
      await api.patch(`/notifications/${n.id}/read`, {});
      setItems((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      /* noop */
    }
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all', {});
      await load();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-4" data-testid="notifications-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2" role="group" aria-label={s.title}>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false);
              setOffset(0);
            }}
            className={`text-xs rounded-full px-3 py-1 border ${
              !unreadOnly ? 'border-primary text-primary' : 'border-border text-foreground/60'
            }`}
          >
            {s.all}
          </button>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(true);
              setOffset(0);
            }}
            className={`text-xs rounded-full px-3 py-1 border ${
              unreadOnly ? 'border-primary text-primary' : 'border-border text-foreground/60'
            }`}
          >
            {s.unreadOnly}
          </button>
        </div>
        <button
          type="button"
          onClick={markAll}
          className="text-xs text-primary hover:underline"
          data-testid="notifications-mark-all"
        >
          {s.markAllRead}
        </button>
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-red-600">
          {s.title}: ERROR
        </p>
      ) : items === null ? (
        <p className="text-sm text-foreground/40">…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground/50 py-10" data-testid="notifications-empty">
          {s.empty}
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {items.map((n) => (
            <li key={n.id} data-testid="notification-item">
              <button
                type="button"
                onClick={() => void markRead(n)}
                className={`w-full text-left py-3 ${n.read ? 'opacity-60' : ''}`}
              >
                <p className="text-xs font-medium text-primary">
                  {notificationTypeLabel(n.type, s)}
                  {!n.read && (
                    <span
                      aria-hidden="true"
                      className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle"
                    />
                  )}
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {(() => {
                    const p = n.payload as {
                      clubName?: string;
                      clubId?: string;
                      titles?: Array<{ year?: number; competitionName?: string }>;
                    };
                    const text =
                      n.type === 'new_title'
                        ? `${p.clubName ?? '—'} · ${p.titles
                            ?.map(
                              (t) => `${t.competitionName ?? '—'}${t.year ? ` (${t.year})` : ''}`,
                            )
                            .join(' · ')}`
                        : String(n.payload ?? '');
                    return p.clubId ? (
                      <Link
                        href={`/clubs/${p.clubId}`}
                        className="hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {text}
                      </Link>
                    ) : (
                      text
                    );
                  })()}
                </p>
                <p className="text-xs text-foreground/40">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {total > offset + PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          className="text-sm text-primary hover:underline"
        >
          + {PAGE_SIZE}
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { locale } = useI18n();
  const s = wsC8Strings[locale].notifications;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-8">
        {s.title}
      </h1>
      <ProtectedRoute>
        <NotificationsList />
      </ProtectedRoute>
    </div>
  );
}
