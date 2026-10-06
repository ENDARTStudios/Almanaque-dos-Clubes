'use client';
/**
 * WS-C-12 — lista de favoritos por tipo (player | competition) com remove.
 * GET /favorites?targetType=… · DELETE /favorites/:type/:id.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

interface TargetItem {
  id: string;
  targetId: string;
  name: string;
  qid: string | null;
  createdAt: string;
}

export default function FavoritesTargetList({
  targetType,
}: {
  targetType: 'player' | 'competition';
}) {
  const { dict } = useI18n();
  const t = dict.pages.favoritos;
  const [items, setItems] = useState<TargetItem[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<{ data: TargetItem[] }>(
        `/favorites?targetType=${targetType}&limit=100`,
      );
      setItems(res.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [targetType]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(targetId: string): Promise<void> {
    setBusyId(targetId);
    try {
      await api.delete(`/favorites/${targetType}/${targetId}`);
      setItems((prev) => prev?.filter((i) => i.targetId !== targetId) ?? null);
    } finally {
      setBusyId(null);
    }
  }

  const baseHref = targetType === 'player' ? '/players' : '/competitions';

  if (items === null) return <p className="text-sm text-foreground/50">…</p>;
  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {t.error}
      </p>
    );
  if (items.length === 0) return <p className="text-sm text-foreground/60 py-6">{t.empty}</p>;

  return (
    <ul className="space-y-3" data-testid={`favorites-${targetType}`}>
      {items.map((i) => (
        <li
          key={i.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
        >
          <div>
            <Link
              href={`${baseHref}/${i.targetId}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {i.name}
            </Link>
            {i.qid && <span className="text-xs text-foreground/40"> · {i.qid}</span>}
          </div>
          <button
            type="button"
            disabled={busyId === i.targetId}
            onClick={() => void remove(i.targetId)}
            className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 disabled:opacity-50"
          >
            {t.remove || 'Remover'}
          </button>
        </li>
      ))}
    </ul>
  );
}
