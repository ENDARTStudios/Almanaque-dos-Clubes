'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { adminStrings, fill } from './strings';
import Pagination from './Pagination';

/**
 * WS-C-9 — fila de moderação de posses de clube (critério C3): lista as posses
 * (pendentes por padrão), aprova (→ 'active', quem aprovou fica registrado na
 * API) e revoga com motivo obrigatório (C4). Consumes
 * `GET /admin/club-ownerships?status=&limit=&offset=` → `{ data, total }`.
 * A decisão de verdade é do servidor (`requireOperator`); aqui é só a fila.
 */
interface OwnershipRow {
  id: string;
  userId: string;
  clubId: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  userEmail: string;
  userName: string | null;
  clubName: string | null;
  clubKind: string | null;
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

const PAGE_SIZE = 25;

export default function ClubOwnerships() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  const [status, setStatus] = useState<'pending' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<{ id: string; reason: string } | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    const params = new URLSearchParams();
    params.set('status', status);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));
    try {
      const res = await api.get<{ data: OwnershipRow[]; total: number }>(
        `/admin/club-ownerships?${params.toString()}`,
      );
      setRows(res.data);
      setTotal(typeof res.total === 'number' ? res.total : null);
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, [status, page]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function approve(id: string): Promise<void> {
    setBusyId(id);
    setActionError('');
    try {
      await api.post(`/admin/club-ownerships/${id}/approve`);
      setRevoking(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : s.ownership.error);
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(id: string, reason: string): Promise<void> {
    if (reason.trim().length < 3) return;
    setBusyId(id);
    setActionError('');
    try {
      await api.post(`/admin/club-ownerships/${id}/revoke`, { reason: reason.trim() });
      setRevoking(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : s.ownership.error);
    } finally {
      setBusyId(null);
    }
  }

  const totalPages =
    total !== null
      ? Math.max(1, Math.ceil(total / PAGE_SIZE))
      : Math.max(1, rows.length >= PAGE_SIZE ? page + 1 : page);

  const inputClass =
    'w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2';

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
        className="flex flex-wrap items-end gap-3"
        aria-label={s.ownership.title}
      >
        <div>
          <label htmlFor="own-status" className="block text-xs font-semibold text-ink-2 mb-1">
            {s.ownership.statusLabel}
          </label>
          <select
            id="own-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'pending' | 'all');
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="pending">{s.ownership.statusPending}</option>
            <option value="all">{s.ownership.statusAll}</option>
          </select>
        </div>
      </form>

      {state === 'loading' && <p className="text-sm text-ink-2">{s.ownership.loading}</p>}
      {state === 'forbidden' && <p className="text-sm text-danger-ink">{s.ownership.forbidden}</p>}
      {state === 'error' && <p className="text-sm text-danger-ink">{s.ownership.error}</p>}

      {state === 'ok' && rows.length === 0 && (
        <p className="text-sm text-ink-2">{s.ownership.empty}</p>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-danger-ink">
          {actionError}
        </p>
      )}

      {state === 'ok' && rows.length > 0 && (
        <ul className="space-y-3" data-testid="admin-club-ownerships">
          {rows.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-border bg-surface p-4 space-y-2"
              data-testid={`ownership-row-${o.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-base font-bold text-foreground">
                  {o.clubName ?? '—'}
                </span>
                {o.clubKind === 'national_team' && (
                  <span className="rounded-full bg-neutral-surface px-2 py-0.5 text-[10px] text-ink-2">
                    {s.ownership.badgeNational}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    o.status === 'pending'
                      ? 'bg-warn-surface text-warn-ink'
                      : o.status === 'active'
                        ? 'bg-success-surface text-success-ink'
                        : o.status === 'suspended'
                          ? 'bg-warn-surface text-warn-ink'
                          : 'bg-danger-surface text-danger-ink'
                  }`}
                >
                  {o.status}
                </span>
                <span className="ml-auto text-xs text-ink-3">
                  {new Date(o.requestedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground/80">
                {o.userName ?? '—'} · <span className="text-ink-2">{o.userEmail}</span>
              </p>
              {(o.evidenceUrl || o.evidenceNote) && (
                <div className="text-xs text-foreground/70">
                  {o.evidenceUrl && (
                    <a
                      href={o.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary-ink underline break-all"
                    >
                      {o.evidenceUrl}
                    </a>
                  )}
                  {o.evidenceNote && <p className="mt-1 whitespace-pre-line">{o.evidenceNote}</p>}
                </div>
              )}
              {o.status === 'pending' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void approve(o.id)}
                    data-testid={`ownership-approve-${o.id}`}
                    className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {s.ownership.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => setRevoking({ id: o.id, reason: '' })}
                    data-testid={`ownership-revoke-${o.id}`}
                    className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition disabled:opacity-50"
                  >
                    {s.ownership.revoke}
                  </button>
                </div>
              )}
              {revoking?.id === o.id && (
                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <label
                    htmlFor={`revoke-reason-${o.id}`}
                    className="block text-xs font-semibold text-ink-2"
                  >
                    {s.ownership.revokeReason}
                  </label>
                  <input
                    id={`revoke-reason-${o.id}`}
                    value={revoking.reason}
                    onChange={(e) => setRevoking({ id: o.id, reason: e.target.value })}
                    placeholder={s.ownership.revokeReasonPlaceholder}
                    maxLength={500}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === o.id || revoking.reason.trim().length < 3}
                      onClick={() => void revoke(o.id, revoking.reason)}
                      data-testid={`ownership-revoke-confirm-${o.id}`}
                      className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {s.ownership.revokeConfirm}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevoking(null)}
                      className="text-sm underline text-foreground/60"
                    >
                      {s.ownership.revokeCancel}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total ?? 0}
          countLabel={s.ownership.count}
          pageLabel={s.ownership.page}
          prevLabel={s.ownership.prev}
          nextLabel={s.ownership.next}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
          testId="admin-club-ownerships"
        />
      )}
    </div>
  );
}
