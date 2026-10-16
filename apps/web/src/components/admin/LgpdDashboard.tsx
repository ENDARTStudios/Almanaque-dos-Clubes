'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import ConfirmDialog from './ConfirmDialog';
import { adminStrings } from './strings';

/**
 * T-ADMIN — painel LGPD (`/admin/lgpd`).
 *
 * ENDPOINTS (wave 2, em `apps/api/src/modules/admin/lgpd.routes.ts`):
 *   - `GET  /admin/lgpd/consents?limit=1000`  → últimos 1.000 logs de consentimento
 *   - `GET  /admin/lgpd/deletions`            → exclusões agendadas + data-limite
 *   - `POST /admin/lgpd/purge?dryRun=true|false`
 *
 * A purga é DESTRUTIVA só no modo real. O modo `dry-run` (padrão) apenas CONTA.
 * A tela deixa isso explícito: "Simular" nunca apaga; "Executar purga" pede
 * confirmação num modal acessível descrevendo o que será removido.
 *
 * 403 → mensagem de restrição (o gate real é a API).
 */

interface Consent {
  id: string;
  visitorId: string;
  version: string;
  categories: Record<string, unknown> | string | null;
  consentedAt: string;
  revokedAt: string | null;
  userAgent: string | null;
}

interface Deletion {
  id: string;
  protocol: string;
  userId: string;
  status: string;
  deadlineAt: string | null;
  completedAt: string | null;
  createdAt: string;
  accountDeletedAt: string | null;
  accountStatus: string | null;
  purgeEligibleAt: string | null;
}

interface PurgeResult {
  dryRun: boolean;
  graceDays: number;
  cutoff: string;
  eligibleUsers: number;
  targets: { sessions: number; notifications: number; favorites: number; activities: number };
}

type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

function categoriesOf(categories: Consent['categories']): string[] {
  let obj: unknown = categories;
  if (typeof categories === 'string') {
    try {
      obj = JSON.parse(categories);
    } catch {
      return [];
    }
  }
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj as Record<string, unknown>)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

export default function LgpdDashboard() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  const [state, setState] = useState<LoadState>('loading');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [deletions, setDeletions] = useState<Deletion[]>([]);
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null);
  const [purgeDialog, setPurgeDialog] = useState<{ dryRun: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [c, d] = await Promise.all([
        api.get<{ data: Consent[] }>('/admin/lgpd/consents?limit=1000'),
        api.get<{ data: Deletion[] }>('/admin/lgpd/deletions'),
      ]);
      setConsents(c.data ?? []);
      setDeletions(d.data ?? []);
      setState('ok');
    } catch (err) {
      setState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function runPurge(dryRun: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ data: PurgeResult }>(
        `/admin/lgpd/purge?dryRun=${dryRun ? 'true' : 'false'}`,
      );
      setPurgeResult(res.data);
      setPurgeDialog(null);
      if (!dryRun) await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : s.lgpd.error);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'forbidden') {
    return (
      <p role="alert" className="text-sm text-danger-ink py-10" data-testid="lgpd-forbidden">
        {s.lgpd.forbidden}
      </p>
    );
  }

  const panelClass = 'rounded-xl border border-border bg-surface p-4 space-y-3';

  return (
    <div className="space-y-8">
      {state === 'error' && (
        <p role="alert" className="text-sm text-danger-ink py-4" data-testid="lgpd-error">
          {s.lgpd.error}
        </p>
      )}
      {state === 'loading' && <p className="text-sm text-ink-2 py-4">{s.lgpd.loading}</p>}

      {state === 'ok' && (
        <>
          {/* Consentimentos */}
          <section aria-label={s.lgpd.consentsTitle} className={panelClass}>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {s.lgpd.consentsTitle}
            </h2>
            <p className="text-sm text-ink-2">{s.lgpd.consentsSubtitle}</p>
            {consents.length === 0 ? (
              <p className="text-sm text-ink-2 py-2" data-testid="lgpd-consents-empty">
                {s.lgpd.empty}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="lgpd-consents">
                  <thead className="text-left text-xs font-semibold text-ink-2">
                    <tr>
                      <th className="py-1 pr-3">{s.lgpd.consentsColVisitor}</th>
                      <th className="py-1 pr-3">{s.lgpd.consentsColVersion}</th>
                      <th className="py-1 pr-3">{s.lgpd.consentsColCategories}</th>
                      <th className="py-1 pr-3">{s.lgpd.consentsColWhen}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consents.map((c) => (
                      <tr key={c.id} className="border-t border-border/50 align-top">
                        <td className="py-1.5 pr-3 font-mono text-xs text-ink-2">
                          {c.visitorId.slice(0, 12)}…
                        </td>
                        <td className="py-1.5 pr-3">{c.version}</td>
                        <td className="py-1.5 pr-3 text-xs text-ink-2">
                          {categoriesOf(c.categories).join(', ') || '—'}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {new Date(c.consentedAt).toLocaleString()}
                          {c.revokedAt && (
                            <span className="ml-2 rounded-full bg-danger-surface px-2 py-0.5 text-xs text-danger-ink">
                              {s.lgpd.consentsColRevoked}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Exclusões agendadas */}
          <section aria-label={s.lgpd.deletionsTitle} className={panelClass}>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {s.lgpd.deletionsTitle}
            </h2>
            <p className="text-sm text-ink-2">{s.lgpd.deletionsSubtitle}</p>
            <p
              className="rounded-lg border border-border bg-neutral-surface px-3 py-2 text-xs text-ink-2"
              data-testid="lgpd-grace-note"
            >
              {s.lgpd.deletionsGrace}
            </p>
            {deletions.length === 0 ? (
              <p className="text-sm text-ink-2 py-2" data-testid="lgpd-deletions-empty">
                {s.lgpd.empty}
              </p>
            ) : (
              <ul className="space-y-2" data-testid="lgpd-deletions">
                {deletions.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-sm"
                    data-testid={`lgpd-deletion-${d.id}`}
                  >
                    <span className="font-mono text-xs text-ink-2">{d.protocol}</span>
                    <span className="text-ink-2">{d.status}</span>
                    <span className="text-xs text-ink-2">
                      {s.lgpd.deletionsColDeletedAt}:{' '}
                      {d.accountDeletedAt ? new Date(d.accountDeletedAt).toLocaleDateString() : '—'}
                    </span>
                    <span className="text-xs text-ink-2">
                      {s.lgpd.deletionsColEligible}:{' '}
                      {d.purgeEligibleAt ? new Date(d.purgeEligibleAt).toLocaleDateString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Purga */}
          <section aria-label={s.lgpd.purgeTitle} className={panelClass}>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {s.lgpd.purgeTitle}
            </h2>
            <p className="text-sm text-ink-2">{s.lgpd.purgeSubtitle}</p>
            <p
              className="rounded-lg border border-border bg-neutral-surface px-3 py-2 text-xs text-ink-2"
              data-testid="lgpd-purge-note"
            >
              {s.lgpd.purgeNote}
            </p>

            {error && (
              <p role="alert" className="text-xs text-danger-ink" data-testid="lgpd-purge-error">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setPurgeDialog({ dryRun: true });
                }}
                className="min-h-6 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                data-testid="lgpd-purge-dry"
              >
                {s.lgpd.purgeDryRun}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setPurgeDialog({ dryRun: false });
                }}
                className="min-h-6 rounded-lg border border-danger-ink px-4 py-2 text-sm font-semibold text-danger-ink hover:bg-danger-surface cursor-pointer"
                data-testid="lgpd-purge-run"
              >
                {s.lgpd.purgeRun}
              </button>
            </div>

            {purgeResult && (
              <div
                className="rounded-lg border border-border bg-muted p-3 text-sm"
                data-testid="lgpd-purge-result"
              >
                <p className="mb-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      purgeResult.dryRun
                        ? 'bg-warn-surface text-warn-ink'
                        : 'bg-danger-surface text-danger-ink'
                    }`}
                  >
                    {purgeResult.dryRun ? s.lgpd.purgeDryRunBadge : s.lgpd.purgeRealBadge}
                  </span>
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-2">{s.lgpd.purgeEligible}</dt>
                    <dd className="tabular-nums font-semibold">{purgeResult.eligibleUsers}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-2">{s.lgpd.purgeSessions}</dt>
                    <dd className="tabular-nums font-semibold">{purgeResult.targets.sessions}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-2">{s.lgpd.purgeNotifications}</dt>
                    <dd className="tabular-nums font-semibold">
                      {purgeResult.targets.notifications}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-2">{s.lgpd.purgeFavorites}</dt>
                    <dd className="tabular-nums font-semibold">{purgeResult.targets.favorites}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-2">{s.lgpd.purgeActivities}</dt>
                    <dd className="tabular-nums font-semibold">{purgeResult.targets.activities}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        </>
      )}

      {purgeDialog && (
        <ConfirmDialog
          title={s.lgpd.purgeConfirmTitle}
          body={purgeDialog.dryRun ? s.lgpd.purgeConfirmBody : s.lgpd.purgeConfirmRealBody}
          confirmLabel={s.lgpd.purgeConfirmYes}
          cancelLabel={s.lgpd.purgeConfirmNo}
          busy={busy}
          onConfirm={() => void runPurge(purgeDialog.dryRun)}
          onCancel={() => setPurgeDialog(null)}
          testId="lgpd-purge-confirm"
        />
      )}
    </div>
  );
}
