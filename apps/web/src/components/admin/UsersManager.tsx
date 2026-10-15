'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import ConfirmDialog from './ConfirmDialog';
import Pagination from './Pagination';
import { adminStrings, fill } from './strings';

/**
 * T-ADMIN — gestão de usuários (`/admin/usuarios`).
 *
 * ENDPOINTS CONSUMIDOS (todos já existentes em `apps/api/src/modules/admin/routes.ts`):
 *   - `GET  /admin/users`                  → lista (id, email, name, status, createdAt, lastLoginAt)
 *   - `POST /admin/users/:id/suspend`      → banir   (status → SUSPENDED)
 *   - `POST /admin/users/:id/reactivate`   → desbanir (status → ACTIVE)
 *
 * LACUNA DECLARADA (não inventada, não compensada no cliente):
 *   1. a lista NÃO traz `plan`, então o filtro por plano (FREE/PRO/ELITE) fica desativado e
 *      a coluna Plano mostra "—";
 *   2. NÃO existe rota de administração para TROCAR o plano de outra conta —
 *      `PUT /billing/plan` (billing/routes.ts) altera apenas o plano de quem chama
 *      (`request.user.id`), logo não serve para o operador agir sobre terceiros.
 *   Enquanto (1) e (2) não existirem, um controle de plano aqui seria placebo — régua
 *   "empty-honesto" do design system: lacuna declarada, nunca número/ação fake.
 *
 * A paginação de 25 é CLIENT-SIDE porque a rota devolve a lista inteira, sem `limit`/`offset`.
 *
 * Segurança: nenhuma guarda é reimplementada aqui. Quem recusa é a API
 * (`authenticate` + `requireRole('admin')` + `requireOperator`); 403 vira mensagem de
 * permissão, não tela quebrada.
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
  /** Ausente hoje: a rota não seleciona este campo. Lido de forma defensiva. */
  plan?: string | null;
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

function statusClass(status: string): string {
  if (status === 'ACTIVE') return 'bg-success-surface text-success-ink';
  if (status === 'SUSPENDED') return 'bg-danger-surface text-danger-ink';
  if (status === 'PENDING') return 'bg-warn-surface text-warn-ink';
  return 'bg-neutral-surface text-ink-2';
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function UsersManager() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  const [rows, setRows] = useState<UserRow[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Alvo da ação destrutiva pendente de confirmação + feedback da ação concluída.
  const [pending, setPending] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: UserRow[] }>('/admin/users');
      setRows(res.data ?? []);
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    // Callback assíncrono (não síncrono no corpo do efeito) — regra
    // react-hooks/set-state-in-effect.
    void Promise.resolve().then(load);
  }, [load]);

  // O plano só é filtrável se ALGUM registro o trouxer; hoje, nunca.
  const planAvailable = useMemo(
    () => rows.some((r) => typeof r.plan === 'string' && r.plan.length > 0),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter((r) => {
      if (q) {
        const haystack = normalize(`${r.name ?? ''} ${r.email}`);
        if (!haystack.includes(q)) return false;
      }
      if (plan !== 'ALL' && (r.plan ?? '') !== plan) return false;
      return true;
    });
  }, [rows, search, plan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp em vez de efeito corretivo: encolher o filtro não deixa a página órfã.
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function confirmAction() {
    if (!pending) return;
    const banir = pending.status !== 'SUSPENDED';
    const path = `/admin/users/${pending.id}/${banir ? 'suspend' : 'reactivate'}`;
    setBusy(true);
    setActionError('');
    try {
      const res = await api.post<{ data: { id: string; status: string } }>(path);
      setRows((prev) =>
        prev.map((r) => (r.id === pending.id ? { ...r, status: res.data.status } : r)),
      );
      setDone(s.users.done);
      setPending(null);
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

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-end">
        <div>
          <label htmlFor="users-search" className="block text-xs font-semibold text-ink-2 mb-1">
            {s.users.searchLabel}
          </label>
          <input
            id="users-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s.users.searchPlaceholder}
            className="w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2"
            data-testid="users-search"
          />
        </div>
        <div>
          <label htmlFor="users-plan" className="block text-xs font-semibold text-ink-2 mb-1">
            {s.users.planLabel}
          </label>
          <select
            id="users-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            disabled={!planAvailable}
            aria-describedby={planAvailable ? undefined : 'users-plan-gap'}
            title={planAvailable ? undefined : s.users.planGap}
            className="w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* Lacuna declarada — visível só quando a API não traz o plano. */}
      {state === 'ok' && !planAvailable && (
        <p
          id="users-plan-gap"
          className="rounded-lg border border-border bg-neutral-surface px-3 py-2 text-xs text-ink-2"
          data-testid="users-plan-gap"
        >
          {s.users.planGap}
        </p>
      )}

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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-2 py-8" data-testid="users-empty">
          {rows.length === 0 ? s.users.empty : s.users.emptyFiltered}
        </p>
      ) : (
        <>
          <ul className="space-y-2" data-testid="users-list">
            {visible.map((u) => {
              const banir = u.status !== 'SUSPENDED';
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
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${statusClass(u.status)}`}
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

                  <button
                    type="button"
                    onClick={() => {
                      setDone('');
                      setActionError('');
                      setPending(u);
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
                </li>
              );
            })}
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
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

      {pending && (
        <ConfirmDialog
          title={
            pending.status !== 'SUSPENDED'
              ? s.users.confirmSuspendTitle
              : s.users.confirmReactivateTitle
          }
          body={fill(
            pending.status !== 'SUSPENDED'
              ? s.users.confirmSuspendBody
              : s.users.confirmReactivateBody,
            { email: pending.email },
          )}
          confirmLabel={s.users.confirmYes}
          cancelLabel={s.users.confirmNo}
          busy={busy}
          onConfirm={() => void confirmAction()}
          onCancel={() => setPending(null)}
          testId="users-confirm"
        />
      )}
    </div>
  );
}
