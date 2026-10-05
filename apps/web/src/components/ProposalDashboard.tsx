'use client';
/**
 * WS-C-10 — dashboard de propostas pendentes (só para editors do clube).
 * GET /clubs/:id/description/proposals · PATCH approve/reject.
 * Rejeitar pede reviewNote opcional; aprovar confirma antes.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProposalStrings } from '@/i18n/wsC10';

interface PendingProposal {
  id: string;
  proposerName: string | null;
  userDescription: string;
  createdAt: string;
}

interface Props {
  clubId: string;
  s: ProposalStrings;
  refreshKey: number;
  onReviewed: () => void;
}

export default function ProposalDashboard({ clubId, s, refreshKey, onReviewed }: Props) {
  const [proposals, setProposals] = useState<PendingProposal[] | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get<{ data: { proposals: PendingProposal[] } }>(
        `/clubs/${clubId}/description/proposals`,
      );
      setProposals(res.data.proposals);
    } catch {
      setProposals([]);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function review(
    id: string,
    action: 'approve' | 'reject',
    reviewNote?: string,
  ): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/clubs/${clubId}/description/proposals/${id}`, {
        action,
        ...(reviewNote ? { reviewNote } : {}),
      });
      setNoteFor(null);
      setNote('');
      await load();
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="proposal-dashboard">
      <h3 className="text-sm font-semibold text-foreground mb-2">{s.dashboardTitle}</h3>
      {proposals === null && <p className="text-sm text-foreground/50">…</p>}
      {proposals?.length === 0 && <p className="text-sm text-foreground/50">{s.noProposals}</p>}
      <ul className="space-y-3">
        {proposals?.map((p) => (
          <li key={p.id} className="border border-border/50 rounded-lg p-3 text-sm">
            <p className="text-xs text-foreground/40 mb-1">
              {p.proposerName ?? '—'} · {new Date(p.createdAt).toLocaleString()}
            </p>
            <p className="text-foreground/80 whitespace-pre-line">{p.userDescription}</p>
            {noteFor === p.id ? (
              <div className="mt-2 space-y-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder={s.reviewNotePlaceholder}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review(p.id, 'reject', note)}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {busy ? s.reviewing : s.reject}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteFor(null)}
                    className="text-xs underline text-foreground/60"
                  >
                    {s.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(s.confirmApprove)) void review(p.id, 'approve');
                  }}
                  data-testid={`proposal-approve-${p.id}`}
                  className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                >
                  {s.approve}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setNoteFor(p.id)}
                  data-testid={`proposal-reject-${p.id}`}
                  className="text-xs border border-border px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {s.reject}
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
