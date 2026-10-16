'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import Pagination from './Pagination';
import { adminStrings } from './strings';

/**
 * T-ADMIN — trilha de auditoria (`/admin/auditoria`).
 *
 * Wave 2 — a API PASSOU a expor a trilha: `GET /admin/audit-logs` existe em
 * `apps/api/src/modules/admin/routes.ts`, com os filtros abaixo e paginação de
 * servidor. O contrato consumido é:
 *
 *   GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=
 *   → { data: { items: AuditEntry[], total: number } }
 *
 * Filtros: usuário (userId), ação (texto livre, casa por substring) e período
 * (from/to). O filtro de ação é TEXTO LIVRE em vez de `select` enumerado de
 * propósito: a lista de ações canônicas vive em `AuditAction` (apps/api) e
 * duplicá-la aqui garantiria divergência silenciosa quando o enum crescer.
 *
 * Paginação de SERVIDOR (25/página): uma trilha append-only cresce sem teto e
 * trazer tudo para o cliente não escala.
 *
 * 403 → mensagem de restrição (o gate real é a API).
 */

const PAGE_SIZE = 25;
const ENDPOINT = '/admin/audit-logs';

interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  metadata?: Record<string, unknown> | string | null;
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

function ipOf(metadata: AuditEntry['metadata']): string | null {
  if (!metadata) return null;
  let obj: unknown = metadata;
  if (typeof metadata === 'string') {
    try {
      obj = JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  const ip = (obj as Record<string, unknown> | null)?.ip;
  return typeof ip === 'string' ? ip : null;
}

export default function AuditTrail() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  // Rascunho (inputs) e filtros aplicados são separados: só o submit recarrega,
  // evitando uma requisição por tecla digitada.
  const [draft, setDraft] = useState({ userId: '', action: '', from: '', to: '' });
  const [applied, setApplied] = useState({ userId: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    setState('loading');
    const params = new URLSearchParams();
    if (applied.userId.trim()) params.set('userId', applied.userId.trim());
    if (applied.action.trim()) params.set('action', applied.action.trim());
    if (applied.from) params.set('from', new Date(applied.from).toISOString());
    if (applied.to) params.set('to', new Date(applied.to).toISOString());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));

    try {
      const res = await api.get<{
        data: AuditEntry[] | { items: AuditEntry[]; total?: number };
      }>(`${ENDPOINT}?${params.toString()}`);
      const data = res.data;
      if (Array.isArray(data)) {
        setEntries(data);
        setTotal(null);
      } else {
        setEntries(data?.items ?? []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, [applied, page]);

  useEffect(() => {
    // Callback assíncrono (não síncrono no corpo do efeito).
    void Promise.resolve().then(load);
  }, [load]);

  // totalPages pelo total do servidor; fallback conservador (nunca pinta
  // "próxima" sem base) quando ele não vem.
  const totalPages =
    total !== null
      ? Math.max(1, Math.ceil(total / PAGE_SIZE))
      : Math.max(1, entries.length >= PAGE_SIZE ? page + 1 : page);
  const currentPage = total !== null ? Math.min(page, totalPages) : page;

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  function clear() {
    const empty = { userId: '', action: '', from: '', to: '' };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  }

  const fieldClass =
    'w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2';
  const labelClass = 'block text-xs font-semibold text-ink-2 mb-1';

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2" aria-label={s.audit.title}>
        <div>
          <label htmlFor="audit-user" className={labelClass}>
            {s.audit.userLabel}
          </label>
          <input
            id="audit-user"
            value={draft.userId}
            onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
            placeholder={s.audit.userPlaceholder}
            className={fieldClass}
            data-testid="audit-user"
          />
        </div>
        <div>
          <label htmlFor="audit-action" className={labelClass}>
            {s.audit.actionLabel}
          </label>
          <input
            id="audit-action"
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
            placeholder={s.audit.actionPlaceholder}
            className={fieldClass}
            data-testid="audit-action"
          />
        </div>
        <div>
          <label htmlFor="audit-from" className={labelClass}>
            {s.audit.fromLabel}
          </label>
          <input
            id="audit-from"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            className={fieldClass}
            data-testid="audit-from"
          />
        </div>
        <div>
          <label htmlFor="audit-to" className={labelClass}>
            {s.audit.toLabel}
          </label>
          <input
            id="audit-to"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            className={fieldClass}
            data-testid="audit-to"
          />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            className="min-h-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 cursor-pointer"
            data-testid="audit-apply"
          >
            {s.audit.apply}
          </button>
          <button
            type="button"
            onClick={clear}
            className="min-h-6 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
            data-testid="audit-clear"
          >
            {s.audit.clear}
          </button>
        </div>
      </form>

      {/* Estados */}
      {state === 'forbidden' && (
        <p role="alert" className="text-sm text-danger-ink py-8" data-testid="audit-forbidden">
          {s.audit.forbidden}
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-danger-ink py-8" data-testid="audit-error">
          {s.audit.error}
        </p>
      )}
      {state === 'loading' && (
        <p className="text-sm text-ink-2 py-8" data-testid="audit-loading">
          {s.audit.loading}
        </p>
      )}

      {state === 'ok' &&
        (entries.length === 0 ? (
          <p className="text-sm text-ink-2 py-8" data-testid="audit-empty">
            {s.audit.empty}
          </p>
        ) : (
          <>
            <ul className="space-y-2" data-testid="audit-list">
              {entries.map((e) => {
                const ip = ipOf(e.metadata);
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4"
                    data-testid={`audit-row-${e.id}`}
                  >
                    <div className="min-w-0 flex-1 basis-[16rem]">
                      <p className="truncate font-mono text-sm text-foreground" title={e.action}>
                        {e.action}
                      </p>
                      <p className="truncate text-xs text-ink-2">
                        {e.entityType}
                        <span className="mx-1">·</span>
                        <span className="font-mono">{e.entityId}</span>
                      </p>
                    </div>
                    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
                      <div className="flex items-center gap-1.5">
                        <dt className="font-semibold">{s.audit.colWhen}:</dt>
                        <dd>{new Date(e.createdAt).toLocaleString()}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="font-semibold">{s.audit.colUser}:</dt>
                        <dd className="font-mono">{e.userId ?? s.audit.system}</dd>
                      </div>
                      {ip && (
                        <div className="flex items-center gap-1.5">
                          <dt className="font-semibold">{s.audit.colIp}:</dt>
                          <dd className="font-mono">{ip}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={total ?? entries.length}
              countLabel={s.audit.count}
              pageLabel={s.audit.page}
              prevLabel={s.audit.prev}
              nextLabel={s.audit.next}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
              testId="audit"
            />
          </>
        ))}
    </div>
  );
}
