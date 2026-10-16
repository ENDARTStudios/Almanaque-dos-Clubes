'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import ConfirmDialog from './ConfirmDialog';
import Pagination from './Pagination';
import { adminStrings, fill } from './strings';

/**
 * T-ADMIN — gestão de usuários (`/admin/usuarios`).
 *
 * ENDPOINTS CONSUMIDOS (wave 2 — todos server-side):
 *   - `GET   /admin/users?q=&plan=&limit=&offset=` → `{ data, total }`
 *   - `PATCH /admin/users/:id/plan`                → troca de plano (via serviço de assinatura)
 *   - `POST  /admin/users/:id/suspend`             → banir   (status → SUSPENDED)
 *   - `POST  /admin/users/:id/reactivate`          → desbanir (status → ACTIVE)
 *
 * A paginação e o filtro por plano agora são do SERVIDOR: a rota aceita
 * `limit`/`offset` e devolve o `plan` de cada conta, então o filtro por plano
 * funciona de verdade (antes: paginação cliente sobre a lista inteira, filtro de
 * plano desativado por falta do campo).
 *
 * Segurança: nenhuma guarda é reimplementada aqui. Quem recusa é a API
 * (`authenticate` + `requireRole('admin')` + `requireOperator`); 403 vira mensagem
 * de permissão, não tela quebrada.
 */

const PAGE_SIZE = 25;
const PLANS = ['FREE', 'PRO', 'ELITE'] as const;

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  plan: string | null;
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

type Dialog =
  { kind: 'suspend' | 'reactivate'; user: UserRow } | { kind: 'plan'; user: UserRow; plan: string };

function statusClass(status: string): string {
  if (status === 'ACTIVE') return 'bg-success-surface text-success-ink';
  if (status === 'SUSPENDED') return 'bg-danger-surface text-danger-ink';
  if (status === 'PENDING') return 'bg-warn-surface text-warn-ink';
  return 'bg-neutral-surface text-ink-2';
}

export default function UsersManager() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [draft, setDraft] = useState({ q: '', plan: 'ALL' });
  const [applied, setApplied] = useState({ q: '', plan: 'ALL' });
  const [page, setPage] = useState(1);
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    const params = new URLSearchParams();
    if (applied.q.trim()) params.set('q', applied.q.trim());
    if (applied.plan !== 'ALL') params.set('plan', applied.plan);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));
    try {
      const res = await api.get<{ data: UserRow[]; total: number }>(
        `/admin/users?${params.toString()}`,
      );
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, [applied, page]);

  useEffect(() => {
    // Callback assíncrono (não síncrono no corpo do efeito) — regra
    // react-hooks/set-state-in-effect.
    void Promise.resolve().then(load);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const hasFilters = applied.q.trim() !== '' || applied.plan !== 'ALL';

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied((prev) => ({ ...prev, q: draft.q }));
  }

  function changePlanFilter(value: string) {
    setDraft((prev) => ({ ...prev, plan: value }));
    setPage(1);
    setApplied((prev) => ({ ...prev, plan: value }));
  }

  function clearFilters() {
    const empty = { q: '', plan: 'ALL' };
    setDraft(empty);
    setApplied(empty);
    setPage(1);
  }

  async function confirmAction() {
    if (!dialog) return;
    setBusy(true);
    setActionError('');
    try {
      if (dialog.kind === 'plan') {
        const res = await api.patch<{ data: { userId: string; plan: string } }>(
          `/admin/users/${dialog.user.id}/plan`,
          { plan: dialog.plan },
        );
        setRows((prev) =>
          prev.map((r) => (r.id === dialog.user.id ? { ...r, plan: res.data.plan } : r)),
        );
      } else {
        const path = `/admin/users/${dialog.user.id}/${
          dialog.kind === 'suspend' ? 'suspend' : 'reactivate'
        }`;
        const res = await api.post<{ data: { id: string; status: string } }>(path);
        setRows((prev) =>
          prev.map((r) => (r.id === dialog.user.id ? { ...r, status: res.data.status } : r)),
        );
      }
      setDone(s.users.done);
      setDialog(null);
    } catch (err) {
      // Falha visível: o estado local NUNCA é fingido em caso de erro.
      setActionError(err instanceof Error ? err.message : s.users.error);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'forbidden') {
    return (
      <p role="alert" className="text-sm text-danger-ink py-10" data-testid="users-forbidden">
        {s.users.forbidden}
      </p>
    );
  }

  const fieldClass =
    'w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2';
  const labelClass = 'block text-xs font-semibold text-ink-2 mb-1';

  return (
    <div className="space-y-5">
      {/* Filtros — busca (submit) + plano (imediato); ambos server-side. */}
      <form
        onSubmit={applySearch}
        className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-end"
      >
        <div>
          <label htmlFor="users-search" className={labelClass}>
            {s.users.searchLabel}
          </label>
          <input
            id="users-search"
            type="search"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder={s.users.searchPlaceholder}
            className={fieldClass}
            data-testid="users-search"
          />
        </div>
        <div>
          <label htmlFor="users-plan" className={labelClass}>
            {s.users.planLabel}
          </label>
          <select
            id="users-plan"
            value={draft.plan}
            onChange={(e) => changePlanFilter(e.target.value)}
            className={fieldClass}
            data-testid="users-plan-filter"
          >
            <option value="ALL">{s.users.planAll}</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            className="min-h-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 cursor-pointer"
            data-testid="users-search-apply"
          >
            {s.users.apply}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-6 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
            data-testid="users-clear"
          >
            {s.users.clear}
          </button>
        </div>
      </form>

      {done && (
        <p role="status" className="text-xs text-success-ink" data-testid="users-done">
          {done}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-xs text-danger-ink" data-testid="users-action-error">
          {actionError}
        </p>
      )}

      {/* Lista */}
      {state === 'loading' ? (
        <p className="text-sm text-ink-2 py-8">{s.users.loading}</p>
      ) : state === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink py-8" data-testid="users-error">
          {s.users.error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-2 py-8" data-testid="users-empty">
          {hasFilters ? s.users.emptyFiltered : s.users.empty}
        </p>
      ) : (
        <>
          <ul className="space-y-2" data-testid="users-list">
            {rows.map((u) => {
              const banir = u.status !== 'SUSPENDED';
              const targetPlan = planDraft[u.id] ?? u.plan ?? 'FREE';
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4"
                  data-testid={`users-row-${u.id}`}
                >
                  <div className="min-w-0 flex-1 basis-[16rem]">
                    <p className="truncate font-semibold text-foreground">
                      {u.name ?? <span className="text-ink-2">—</span>}
                    </p>
                    <p className="truncate text-sm text-ink-2">{u.email}</p>
                  </div>

                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">{s.users.colStatus}</dt>
                      <dd>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${statusClass(
                            u.status,
                          )}`}
                        >
                          {u.status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt className="font-semibold">{s.users.colPlan}:</dt>
                      <dd data-testid={`users-plan-${u.id}`}>{u.plan ?? '—'}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt className="font-semibold">{s.users.colCreated}:</dt>
                      <dd>{new Date(u.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt className="font-semibold">{s.users.colLastLogin}:</dt>
                      <dd>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString()
                          : s.users.never}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Troca de plano — via serviço de assinatura + auditoria. */}
                    <select
                      value={targetPlan}
                      onChange={(e) => setPlanDraft({ ...planDraft, [u.id]: e.target.value })}
                      aria-label={`${s.users.planNewLabel}: ${u.email}`}
                      className="min-h-6 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      data-testid={`users-plan-select-${u.id}`}
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setDone('');
                        setActionError('');
                        setDialog({ kind: 'plan', user: u, plan: targetPlan });
                      }}
                      disabled={targetPlan === (u.plan ?? 'FREE')}
                      className="min-h-6 shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer disabled:cursor-default"
                      data-testid={`users-plan-action-${u.id}`}
                    >
                      {s.users.planAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDone('');
                        setActionError('');
                        setDialog({ kind: banir ? 'suspend' : 'reactivate', user: u });
                      }}
                      aria-haspopup="dialog"
                      className={`min-h-6 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                        banir
                          ? 'border-danger-ink text-danger-ink hover:bg-danger-surface'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                      data-testid={`users-action-${u.id}`}
                    >
                      {banir ? s.users.suspend : s.users.reactivate}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={total}
            countLabel={s.users.count}
            pageLabel={s.users.page}
            prevLabel={s.users.prev}
            nextLabel={s.users.next}
            onPrev={() => setPage(Math.max(1, currentPage - 1))}
            onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            testId="users"
          />
        </>
      )}

      {dialog && (
        <ConfirmDialog
          title={
            dialog.kind === 'plan'
              ? s.users.planConfirmTitle
              : dialog.kind === 'suspend'
                ? s.users.confirmSuspendTitle
                : s.users.confirmReactivateTitle
          }
          body={fill(
            dialog.kind === 'plan'
              ? s.users.planConfirmBody
              : dialog.kind === 'suspend'
                ? s.users.confirmSuspendBody
                : s.users.confirmReactivateBody,
            dialog.kind === 'plan'
              ? { email: dialog.user.email, plan: dialog.plan }
              : { email: dialog.user.email },
          )}
          confirmLabel={s.users.confirmYes}
          cancelLabel={s.users.confirmNo}
          busy={busy}
          onConfirm={() => void confirmAction()}
          onCancel={() => setDialog(null)}
          testId="users-confirm"
        />
      )}
    </div>
  );
}
