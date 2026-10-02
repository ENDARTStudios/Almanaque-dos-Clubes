'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsC8Strings, notificationTypeLabel } from '@/i18n/wsC8';

/**
 * WS-C-8 — dropdown com as últimas 10 notificações.
 * Click em item: marca como lida e navega para a página relevante (clube).
 * Footer: "Marcar todas como lidas". Navegação por teclado (foco nos itens).
 */

interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

function itemText(n: NotificationItem): string {
  const p = n.payload as {
    clubName?: string;
    titles?: Array<{ year?: number; competitionName?: string }>;
    competitionName?: string;
    rankingName?: string;
    position?: number;
  };
  if (n.type === 'new_title') {
    const t = p.titles?.[0];
    return `${p.clubName ?? '—'} · ${t?.competitionName ?? '—'}${t?.year ? ` (${t.year})` : ''}`;
  }
  if (n.type === 'ranking_change') {
    return `${p.clubName ?? '—'} · ${p.rankingName ?? '—'}${p.position != null ? ` — ${p.position}º` : ''}`;
  }
  if (n.type === 'new_competition') {
    return `${p.clubName ?? '—'} · ${p.competitionName ?? '—'}`;
  }
  return String(n.payload ?? '');
}

function itemHref(n: NotificationItem): string | null {
  const clubId = (n.payload as { clubId?: string }).clubId;
  return clubId ? `/clubs/${clubId}` : null;
}

export default function NotificationDropdown({
  onChanged,
  onClose,
}: {
  onChanged: () => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const s = wsC8Strings[locale].notifications;
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ notifications: NotificationItem[] }>('/notifications?limit=10');
      setItems(r.notifications ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const markRead = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n.id}/read`, {});
      } catch {
        /* segue para navegar mesmo se falhar o mark */
      }
    }
    onChanged();
    onClose();
    const href = itemHref(n);
    if (href) window.location.href = href;
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all', {});
    } catch {
      /* noop */
    }
    onChanged();
    onClose();
  };

  return (
    <div
      className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-background shadow-lg z-50"
      role="menu"
      aria-label={s.title}
      data-testid="notification-dropdown"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-heading font-semibold text-foreground">{s.title}</span>
        <button
          type="button"
          onClick={markAll}
          className="text-xs text-primary hover:underline"
          data-testid="notification-mark-all"
        >
          {s.markAllRead}
        </button>
      </div>
      <ul className="max-h-80 overflow-y-auto">
        {items === null ? (
          <li className="px-3 py-3 text-sm text-foreground/40">{s.loading ?? '…'}</li>
        ) : items.length === 0 ? (
          <li className="px-3 py-3 text-sm text-foreground/50">{s.empty}</li>
        ) : (
          items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => void markRead(n)}
                className={`w-full text-left px-3 py-2 border-b border-border/30 hover:bg-foreground/5 focus:outline-none focus:bg-foreground/5 ${
                  n.read ? 'opacity-60' : ''
                }`}
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
                <p className="text-sm text-foreground truncate">{itemText(n)}</p>
                <p className="text-xs text-foreground/40">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="px-3 py-2 border-t border-border/50">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-primary hover:underline"
        >
          {s.title} →
        </Link>
      </div>
    </div>
  );
}
