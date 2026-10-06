'use client';
/**
 * WS-C-11 — dashboard de moderação de denúncias (admin).
 * GET /reports/pending · PATCH resolve (action + note; remove_content pede
 * confirmação) · PATCH dismiss (com note opcional).
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ReportStrings } from '@/i18n/wsC11';

interface PendingReport {
  id: string;
  reporterName: string | null;
  targetType: string;
  targetId: string;
  targetClubName: string | null;
  reason: string;
  details: string | null;
  createdAt: string;
  reportCount: number;
}

export default function ReportDashboard({ s }: { s: ReportStrings }) {
  const [reports, setReports] = useState<PendingReport[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [resolving, setResolving] = useState<{ id: string } | null>(null);
  const [action, setAction] = useState<
    'remove_content' | 'warn_user' | 'suspend_user' | 'no_action'
  >('no_action');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<{ data: { reports: PendingReport[] } }>('/reports/pending');
      setReports(res.data.reports);
      setForbidden(false);
    } catch (err) {
      if ((err as { status?: number }).status === 403) setForbidden(true);
      else setReports([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, kind: 'resolve' | 'dismiss'): Promise<void> {
    setBusy(true);
    setError('');
    try {
      if (kind === 'resolve') {
        await api.patch(`/reports/${id}/resolve`, {
          action,
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        });
      } else {
        await api.patch(`/reports/${id}/dismiss`, {
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        });
      }
      setResolving(null);
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  if (forbidden) {
    return <p className="text-sm text-foreground/60">Acesso restrito à moderação.</p>;
  }

  return (
    <div data-testid="report-dashboard">
      <h3 className="text-sm font-semibold text-foreground mb-3">{s.dashboardTitle}</h3>
      {reports === null && <p className="text-sm text-foreground/50">…</p>}
      {reports?.length === 0 && (
        <p className="text-sm text-foreground/50" data-testid="reports-empty">
          {s.noReports}
        </p>
      )}
      <ul className="space-y-3">
        {reports?.map((r) => (
          <li key={r.id} className="border border-border/50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
              <span className="bg-foreground/5 border border-border/50 rounded-full px-2 py-0.5">
                {r.targetType === 'club_description' ? 'club' : 'proposal'} ·{' '}
                {r.targetClubName ?? r.targetId.slice(0, 8)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${r.reportCount > 1 ? 'bg-red-100 text-red-700 font-semibold' : 'bg-foreground/5'}`}
                title={s.count}
              >
                ⚑ {r.reportCount}
              </span>
              <span>{r.reason}</span>
              <span>· {r.reporterName ?? '—'}</span>
              <span>· {new Date(r.createdAt).toLocaleString()}</span>
            </div>
            {r.details && <p className="text-foreground/70">{r.details}</p>}

            {resolving?.id === r.id ? (
              <div className="space-y-2 border-t border-border/50 pt-2">
                <label className="block text-xs font-medium" htmlFor={`action-${r.id}`}>
                  {s.actionLabel}
                </label>
                <select
                  id={`action-${r.id}`}
                  value={action}
                  onChange={(e) => setAction(e.target.value as typeof action)}
                  data-testid={`report-action-${r.id}`}
                  className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background"
                >
                  <option value="remove_content">{s.removeContent}</option>
                  <option value="warn_user">{s.warnUser}</option>
                  <option value="suspend_user">{s.suspendUser}</option>
                  <option value="no_action">{s.noAction}</option>
                </select>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder={s.notePlaceholder}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-xs"
                />
                {action === 'remove_content' && (
                  <p className="text-xs text-red-600">{s.confirmRemove}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    data-testid={`report-resolve-${r.id}`}
                    onClick={() => review(r.id, 'resolve')}
                    className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {busy ? s.reviewing : s.resolve}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolving(null)}
                    className="text-xs underline text-foreground/60"
                  >
                    {s.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid={`report-open-resolve-${r.id}`}
                  onClick={() => {
                    setResolving({ id: r.id });
                    setAction('no_action');
                    setNote('');
                  }}
                  className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold"
                >
                  {s.resolve}
                </button>
                <button
                  type="button"
                  data-testid={`report-dismiss-${r.id}`}
                  onClick={() => review(r.id, 'dismiss')}
                  className="text-xs border border-border px-3 py-1.5 rounded-lg"
                >
                  {s.dismiss}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-xs text-red-500 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
