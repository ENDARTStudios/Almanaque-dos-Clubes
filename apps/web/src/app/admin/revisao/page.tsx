'use client';

/**
 * T599/DQ-04 — /admin/revisao: fila de revisão de DADOS (admin).
 *
 * O integrity-check (semanal) alimenta a fila com anomalias de partidas e do
 * grafo; aqui uma PESSOA resolve (corrigiu) ou descarta (falso positivo), com
 * nota. Gate API-only igual às demais telas internas: a rota devolve 403 para
 * quem não é admin na allowlist do Operador.
 */
import { useCallback, useEffect, useState } from 'react';
import OperatorGate from '@/components/OperatorGate';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsT599Strings, type WsT599Strings } from '@/i18n/wsT599';

interface QueueRow {
  id: string;
  entityType: string;
  entityId: string;
  check: string;
  reason: string;
  severity: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export default function AdminRevisaoPage() {
  const { locale } = useI18n();
  const s: WsT599Strings = wsT599Strings[locale] ?? wsT599Strings['pt-br'];
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [status, setStatus] = useState<'PENDING' | 'ALL'>('PENDING');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (filter: 'PENDING' | 'ALL') => {
    setFailed(false);
    try {
      const res = await api.get<{ data: QueueRow[] }>(
        `/admin/review-queue?status=${filter}&limit=100`,
      );
      setRows(res.data ?? []);
      setLoaded(true);
    } catch {
      setFailed(true);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  const decidir = useCallback(
    async (row: QueueRow, acao: 'resolve' | 'dismiss') => {
      setBusy(row.id);
      try {
        await api.post(`/admin/review-queue/${row.id}/${acao}`, {
          note: notes[row.id] || undefined,
        });
        await load(status);
      } catch {
        setFailed(true);
      } finally {
        setBusy(null);
      }
    },
    [notes, load, status],
  );

  return (
    <OperatorGate>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">{s.title}</h1>
        <p className="text-sm text-ink-2 mb-6">{s.subtitle}</p>

        <div
          className="flex gap-1 mb-6 border border-border rounded-xl p-1 w-fit"
          role="tablist"
          aria-label={s.filterPending}
        >
          {(['PENDING', 'ALL'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={status === f}
              onClick={() => setStatus(f)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                status === f
                  ? 'bg-primary text-on-primary'
                  : 'text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              {f === 'PENDING' ? s.filterPending : s.filterAll}
            </button>
          ))}
        </div>

        {!loaded && <p className="text-sm text-foreground/70">{s.loading}</p>}
        {loaded && failed && (
          <p role="alert" className="text-sm text-danger-ink">
            {s.error}
          </p>
        )}
        {loaded && !failed && rows.length === 0 && (
          <p className="text-sm text-foreground/60 py-10">{s.empty}</p>
        )}

        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    row.severity === 'high'
                      ? 'bg-danger-surface text-danger-ink'
                      : 'bg-warn-surface text-warn-ink'
                  }`}
                >
                  {row.severity}
                </span>
                <span className="text-sm font-heading font-bold text-foreground">{row.check}</span>
                <span className="text-xs text-ink-3">
                  {row.entityType} · {row.entityId.slice(0, 8)}
                </span>
                {row.status !== 'PENDING' && (
                  <span className="ml-auto text-xs text-success-ink">
                    {row.status === 'RESOLVED' ? s.resolved : s.dismissed}
                    {row.resolvedBy ? ` · ${s.resolvedBy} ${row.resolvedBy.slice(0, 8)}` : ''}
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-2">{row.reason}</p>
              {row.status === 'PENDING' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={notes[row.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                    placeholder={s.notePlaceholder}
                    aria-label={`${s.notePlaceholder}: ${row.check} ${row.entityId}`}
                    className="flex-1 min-w-48 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => void decidir(row, 'resolve')}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-success-ink transition-colors duration-200 hover:border-primary disabled:opacity-50"
                  >
                    {s.resolve}
                  </button>
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => void decidir(row, 'dismiss')}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-primary disabled:opacity-50"
                  >
                    {s.dismiss}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </OperatorGate>
  );
}
