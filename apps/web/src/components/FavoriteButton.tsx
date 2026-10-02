'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

// T439 — botão coração de favoritar (estado otimista + rollback em erro;
// aria-pressed para acessibilidade).

export default function FavoriteButton({ clubId }: { clubId: string }) {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let activeReq = true;
    api
      .get<{ data: Array<{ clubId: string }> }>('/favorites')
      .then((res) => {
        if (activeReq) setActive(res.data.some((f) => f.clubId === clubId));
      })
      .catch(() => {
        // sem sessão — botão vira convite ao login
        if (activeReq) setActive(false);
      });
    return () => {
      activeReq = false;
    };
  }, [clubId]);

  async function toggle(): Promise<void> {
    if (active === null || busy) return;
    setBusy(true);
    const previous = active;
    setActive(!previous); // otimista
    try {
      if (previous) await api.delete(`/favorites/${clubId}`);
      else await api.post('/favorites', { clubId });
    } catch {
      setActive(previous); // rollback
    } finally {
      setBusy(false);
    }
  }

  const label = active ? t.heartRemove : t.heartAdd;
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={active === true}
      aria-label={label}
      title={label}
      disabled={active === null}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-foreground/70 hover:border-primary/50'
      } disabled:opacity-50`}
    >
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>
      <span>{label}</span>
    </button>
  );
}
