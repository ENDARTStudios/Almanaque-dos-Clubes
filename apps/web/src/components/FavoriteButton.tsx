'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

// T439 — botão coração de favoritar (estado otimista + rollback em erro;
// aria-pressed para acessibilidade).

export type FavoriteTargetType = 'club' | 'player' | 'competition';

interface FavoriteButtonProps {
  /** T439 — compat: clubId sozinho continua funcionando (targetType='club'). */
  clubId?: string;
  /** WS-C-12 — alvo genérico. */
  targetType?: FavoriteTargetType;
  targetId?: string;
  /** WS-C-12 — contagem inicial exibida ao lado do coração (opcional). */
  initialCount?: number;
  /** WS-C-12 — rótulo da contagem (Torcedores/Fãs/Espectadores). */
  countLabel?: string;
}

export default function FavoriteButton(props: FavoriteButtonProps) {
  const targetType: FavoriteTargetType = props.targetType ?? 'club';
  const targetId = props.targetId ?? props.clubId;
  if (!targetId) throw new Error('FavoriteButton requer targetId (ou clubId legado)');
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const [active, setActive] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(props.initialCount ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let activeReq = true;
    if (targetType !== 'club') {
      // genérico: o GET /favorites do próprio usuário já filtra por tipo —
      // o estado inicial vem de isFavorited no payload da página quando
      // disponível; aqui buscamos a lista do tipo.
      api
        .get<{ data: Array<{ targetId: string }> }>(`/favorites?targetType=${targetType}`)
        .then((res) => {
          if (activeReq) setActive(res.data.some((f) => f.targetId === targetId));
        })
        .catch(() => {
          if (activeReq) setActive(false);
        });
      return () => {
        activeReq = false;
      };
    }
    api
      .get<{ data: Array<{ clubId: string }> }>('/favorites')
      .then((res) => {
        if (activeReq) setActive(res.data.some((f) => f.clubId === targetId));
      })
      .catch(() => {
        // sem sessão — botão vira convite ao login
        if (activeReq) setActive(false);
      });
    return () => {
      activeReq = false;
    };
  }, [targetId, targetType]);

  async function toggle(): Promise<void> {
    if (active === null || busy) return;
    setBusy(true);
    const previous = active;
    setActive(!previous); // otimista
    if (count !== null) setCount(count + (previous ? -1 : 1)); // contagem otimista
    try {
      if (previous) await api.delete(`/favorites/${targetType}/${targetId}`);
      else await api.post('/favorites', { targetType, targetId });
    } catch {
      setActive(previous); // rollback
      if (count !== null) setCount(count);
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
      data-testid={`favorite-${targetType}-${targetId}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-foreground/70 hover:border-primary/50'
      } disabled:opacity-50`}
    >
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>
      <span>{label}</span>
      {count !== null && (
        <span data-testid={`favorite-count-${targetType}`} className="font-semibold">
          {count.toLocaleString('pt-BR')}
        </span>
      )}
      {props.countLabel && <span className="sr-only">{props.countLabel}</span>}
    </button>
  );
}
