'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import NotificationDropdown from '@/components/NotificationDropdown';

/**
 * WS-C-8 — sino de notificações com badge de não-lidas.
 * Polling leve: /notifications/unread-count a cada 60s (e ao focar a janela).
 * Count 0 → badge não aparece. Abrir o sino → dropdown (últimas 10).
 */

export default function NotificationBadge() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(0); // invalida caches do dropdown
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const r = await api.get<{ count: number }>('/notifications/unread-count');
      setUnread(r.count ?? 0);
    } catch {
      /* silencioso: badge é progressivo, não crítico */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive) void refreshCount();
    };
    void Promise.resolve().then(tick); // evita setState síncrono no effect
    const interval = setInterval(tick, 60_000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshCount, changed]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ''}`}
        aria-expanded={open}
        className="relative p-1.5 text-foreground/70 hover:text-primary transition-colors"
        data-testid="notification-bell"
      >
        {/* ícone de sino inline (sem lib de ícones) */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span
            aria-live="polite"
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          onChanged={() => {
            setChanged((c) => c + 1);
            void refreshCount();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
