'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import ConfirmDialog from './ConfirmDialog';
import Pagination from './Pagination';
import { adminStrings, fill } from './strings';

/**
 * T-ADMIN — catálogo de MÍDIA (`/admin/catalogo`).
 *
 * ENDPOINTS (wave 2, em `apps/api/src/modules/admin/catalog.routes.ts`):
 *   - `GET    /admin/catalogo/media?q=&limit=&offset=` → `{ data, total }`
 *   - `POST   /admin/catalogo/media`                   → mídia de clube SEM mídia
 *   - `PATCH  /admin/catalogo/media/:clubId`           → edição parcial
 *   - `DELETE /admin/catalogo/media/:clubId`           → soft delete (limpa + snapshot)
 *
 * INTERPRETAÇÃO: não há tabela de mídia; a mídia vive nos CAMPOS DO CLUBE
 * (logoUrl, stadiumImage, teamColors, kitHistory, anthem, pennants,
 * editorialText). A tela edita esses campos. Campos JSON vão em textarea; cores,
 * em lista separada por vírgula. Remover = limpar a mídia (o clube permanece).
 *
 * 403 → mensagem de restrição (o gate real é a API).
 */

const PAGE_SIZE = 25;

interface MediaShape {
  logoUrl: string | null;
  stadiumImage: string | null;
  teamColors: string[] | null;
  kitHistory: unknown;
  anthem: unknown;
  pennants: unknown;
  editorialText: unknown;
}

interface MediaRow {
  id: string;
  name: string;
  qid: string | null;
  updatedAt: string;
  hasMedia: boolean;
  media: MediaShape;
}

interface FormState {
  logoUrl: string;
  stadiumImage: string;
  teamColors: string;
  kitHistory: string;
  anthem: string;
  pennants: string;
  editorialText: string;
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';
type FormMode = 'create' | 'edit';

const EMPTY_FORM: FormState = {
  logoUrl: '',
  stadiumImage: '',
  teamColors: '',
  kitHistory: '',
  anthem: '',
  pennants: '',
  editorialText: '',
};

function jsonToText(v: unknown): string {
  if (v === null || v === undefined) return '';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return '';
  }
}

function toForm(media: MediaShape): FormState {
  return {
    logoUrl: media.logoUrl ?? '',
    stadiumImage: media.stadiumImage ?? '',
    teamColors: Array.isArray(media.teamColors) ? media.teamColors.join(', ') : '',
    kitHistory: jsonToText(media.kitHistory),
    anthem: jsonToText(media.anthem),
    pennants: jsonToText(media.pennants),
    editorialText: jsonToText(media.editorialText),
  };
}

export default function MediaCatalog() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  const [rows, setRows] = useState<MediaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [draftQ, setDraftQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState<{ mode: FormMode; row: MediaRow } | null>(null);
  const [removing, setRemoving] = useState<MediaRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    const params = new URLSearchParams();
    if (appliedQ.trim()) params.set('q', appliedQ.trim());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));
    try {
      const res = await api.get<{ data: MediaRow[]; total: number }>(
        `/admin/catalogo/media?${params.toString()}`,
      );
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, [appliedQ, page]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  function openCreate(row: MediaRow) {
    setError('');
    setDone('');
    setForm(EMPTY_FORM);
    setFormOpen({ mode: 'create', row });
  }

  function openEdit(row: MediaRow) {
    setError('');
    setDone('');
    setForm(toForm(row.media));
    setFormOpen({ mode: 'edit', row });
  }

  /** Monta o payload; retorna o rótulo do campo com JSON inválido, se houver. */
  function buildPayload(
    f: FormState,
    mode: FormMode,
  ): { payload: Record<string, unknown>; invalidField?: string } {
    const payload: Record<string, unknown> = {};
    const skip = mode === 'create';

    const text = (key: 'logoUrl' | 'stadiumImage') => {
      const v = f[key].trim();
      if (!v) {
        if (!skip) payload[key] = null;
        return;
      }
      payload[key] = v;
    };
    text('logoUrl');
    text('stadiumImage');

    const colors = f.teamColors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (colors.length) payload.teamColors = colors;
    else if (!skip) payload.teamColors = null;

    const jsonFields: Array<{ key: keyof FormState; label: string }> = [
      { key: 'kitHistory', label: s.catalog.fieldKits },
      { key: 'anthem', label: s.catalog.fieldAnthem },
      { key: 'pennants', label: s.catalog.fieldPennants },
      { key: 'editorialText', label: s.catalog.fieldEditorial },
    ];
    for (const { key, label } of jsonFields) {
      const raw = f[key].trim();
      if (!raw) {
        if (!skip) payload[key] = null;
        continue;
      }
      try {
        payload[key] = JSON.parse(raw);
      } catch {
        return { payload, invalidField: label };
      }
    }
    return { payload };
  }

  async function save() {
    if (!formOpen) return;
    const { payload, invalidField } = buildPayload(form, formOpen.mode);
    if (invalidField) {
      setError(fill(s.catalog.invalidJson, { field: invalidField }));
      return;
    }
    if (formOpen.mode === 'create' && Object.keys(payload).length === 0) {
      setError(s.catalog.needOneField);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (formOpen.mode === 'create') {
        await api.post(`/admin/catalogo/media`, { clubId: formOpen.row.id, ...payload });
      } else {
        await api.patch(`/admin/catalogo/media/${formOpen.row.id}`, payload);
      }
      setFormOpen(null);
      setDone(s.catalog.done);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : s.catalog.error);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/admin/catalogo/media/${removing.id}`);
      setDone(s.catalog.done);
      setRemoving(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : s.catalog.error);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'forbidden') {
    return (
      <p role="alert" className="text-sm text-danger-ink py-10" data-testid="catalog-forbidden">
        {s.catalog.forbidden}
      </p>
    );
  }

  const fieldClass =
    'w-full min-h-6 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2';
  const labelClass = 'block text-xs font-semibold text-ink-2 mb-1';
  const presentLabels = (row: MediaRow): string[] => {
    const out: string[] = [];
    if (row.media.logoUrl) out.push(s.catalog.fieldLogo);
    if (row.media.stadiumImage) out.push(s.catalog.fieldStadium);
    if (Array.isArray(row.media.teamColors) && row.media.teamColors.length)
      out.push(s.catalog.fieldColors);
    if (row.media.kitHistory) out.push(s.catalog.fieldKits);
    if (row.media.anthem) out.push(s.catalog.fieldAnthem);
    if (row.media.pennants) out.push(s.catalog.fieldPennants);
    if (row.media.editorialText) out.push(s.catalog.fieldEditorial);
    return out;
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setAppliedQ(draftQ);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-0 flex-1 basis-[16rem]">
          <label htmlFor="catalog-search" className={labelClass}>
            {s.catalog.searchLabel}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder={s.catalog.searchPlaceholder}
            className={fieldClass}
            data-testid="catalog-search"
          />
        </div>
        <button
          type="submit"
          className="min-h-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 cursor-pointer"
          data-testid="catalog-search-apply"
        >
          {s.users.apply}
        </button>
      </form>

      {done && (
        <p role="status" className="text-xs text-success-ink" data-testid="catalog-done">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger-ink" data-testid="catalog-error">
          {error}
        </p>
      )}

      {formOpen && (
        <section
          aria-label={s.catalog.editTitle}
          className="rounded-xl border border-border bg-surface p-4 space-y-3"
          data-testid="catalog-form"
        >
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {s.catalog.editTitle}
            <span className="ml-2 text-sm font-normal text-ink-2">
              {formOpen.row.name}
              {formOpen.row.qid ? ` · ${formOpen.row.qid}` : ''}
            </span>
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="catalog-logo" className={labelClass}>
                {s.catalog.fieldLogo}
              </label>
              <input
                id="catalog-logo"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className={fieldClass}
                data-testid="catalog-logo"
              />
            </div>
            <div>
              <label htmlFor="catalog-stadium" className={labelClass}>
                {s.catalog.fieldStadium}
              </label>
              <input
                id="catalog-stadium"
                value={form.stadiumImage}
                onChange={(e) => setForm({ ...form, stadiumImage: e.target.value })}
                className={fieldClass}
                data-testid="catalog-stadium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="catalog-colors" className={labelClass}>
              {s.catalog.fieldColors}
            </label>
            <input
              id="catalog-colors"
              value={form.teamColors}
              onChange={(e) => setForm({ ...form, teamColors: e.target.value })}
              aria-describedby="catalog-colors-hint"
              className={fieldClass}
              data-testid="catalog-colors"
            />
            <p id="catalog-colors-hint" className="mt-1 text-xs text-ink-2">
              {s.catalog.colorsHint}
            </p>
          </div>

          <p className="text-xs text-ink-2">{s.catalog.jsonHint}</p>
          {(
            [
              ['kitHistory', s.catalog.fieldKits],
              ['anthem', s.catalog.fieldAnthem],
              ['pennants', s.catalog.fieldPennants],
              ['editorialText', s.catalog.fieldEditorial],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`catalog-${key}`} className={labelClass}>
                {label}
              </label>
              <textarea
                id={`catalog-${key}`}
                rows={4}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={`${fieldClass} font-mono`}
                data-testid={`catalog-${key}`}
              />
            </div>
          ))}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="min-h-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
              data-testid="catalog-save"
            >
              {s.catalog.save}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(null)}
              disabled={busy}
              className="min-h-6 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
              data-testid="catalog-form-cancel"
            >
              {s.catalog.cancel}
            </button>
          </div>
        </section>
      )}

      {state === 'loading' ? (
        <p className="text-sm text-ink-2 py-8">{s.catalog.loading}</p>
      ) : state === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink py-8" data-testid="catalog-load-error">
          {s.catalog.error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-2 py-8" data-testid="catalog-empty">
          {appliedQ.trim() ? s.catalog.emptyFiltered : s.catalog.empty}
        </p>
      ) : (
        <>
          <ul className="space-y-2" data-testid="catalog-list">
            {rows.map((row) => {
              const present = presentLabels(row);
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4"
                  data-testid={`catalog-row-${row.id}`}
                >
                  <div className="min-w-0 flex-1 basis-[16rem]">
                    <p className="truncate font-semibold text-foreground">{row.name}</p>
                    <p className="truncate text-xs text-ink-2 font-mono">{row.qid ?? row.id}</p>
                    <p className="mt-1 text-xs text-ink-2" data-testid={`catalog-media-${row.id}`}>
                      {row.hasMedia ? present.join(' · ') : s.catalog.noMedia}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {row.hasMedia ? (
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="min-h-6 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                        data-testid={`catalog-edit-${row.id}`}
                      >
                        {s.catalog.edit}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCreate(row)}
                        className="min-h-6 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                        data-testid={`catalog-create-${row.id}`}
                      >
                        {s.catalog.add}
                      </button>
                    )}
                    {row.hasMedia && (
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setDone('');
                          setRemoving(row);
                        }}
                        aria-haspopup="dialog"
                        className="min-h-6 rounded-lg border border-danger-ink px-3 py-1.5 text-sm font-semibold text-danger-ink hover:bg-danger-surface cursor-pointer"
                        data-testid={`catalog-remove-${row.id}`}
                      >
                        {s.catalog.remove}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={total}
            countLabel={s.catalog.count}
            pageLabel={s.catalog.page}
            prevLabel={s.catalog.prev}
            nextLabel={s.catalog.next}
            onPrev={() => setPage(Math.max(1, currentPage - 1))}
            onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            testId="catalog"
          />
        </>
      )}

      {removing && (
        <ConfirmDialog
          title={s.catalog.removeTitle}
          body={fill(s.catalog.removeBody, { club: removing.name })}
          confirmLabel={s.catalog.removeConfirm}
          cancelLabel={s.catalog.removeCancel}
          busy={busy}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setRemoving(null)}
          testId="catalog-confirm"
        />
      )}
    </div>
  );
}
