'use client';

/**
 * T-24/28 — /admin/bots: monitor dos 12 bots autônomos.
 *
 * Contrato consumido (apps/api/src/modules/admin/bots.routes.ts):
 *   GET  /admin/bots           → { data: { bots, summary } }
 *   GET  /admin/bots/:id/runs  → { data: RunRow[] } (limit 1..100, default 20)
 *   POST /admin/bots/:id/run   → 202 { queued: true } (CSRF tratado em `@/lib/api`)
 *
 * Honestidade: nenhuma lacuna é completada com zero. Sem execução = "nunca
 * executou"; API fora = erro sem números; histórico vazio diz que o scheduler
 * roda a cada 4h. A tabela mostra o que a rodada DECLAROU (`message`), não só o
 * status — "rodou" e "rendeu" continuam sendo coisas diferentes.
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import OperatorGate from '@/components/OperatorGate';
import AdminHeading from '@/components/ficha/AdminHeading';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import { api } from '@/lib/api';
import { formatCount, formatDate, formatRelativeTime } from '@/lib/format';
import { useI18n } from '@/i18n/Provider';
import type { Locale } from '@/i18n/config';
import { adminStrings, fill, type AdminStrings } from '@/components/admin/strings';

type BotStrings = AdminStrings['bots'];

/** Linha de execução como a API do monitor devolve. */
interface BotRunRow {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string | null;
}

interface BotMonitorItem {
  id: string;
  domain: string;
  label: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  lastMessage: string | null;
  lastRun: BotRunRow | null;
}

interface BotsSummary {
  bots: BotMonitorItem[];
  summary: {
    total: number;
    running: number;
    ok: number;
    failed: number;
    staleMs: number;
  };
}

type StatusKey = 'ok' | 'partial' | 'failed' | 'skipped' | 'running' | 'unknown';
type LoadState = 'loading' | 'ok' | 'forbidden' | 'error';

interface HistoryState {
  state: 'loading' | 'ok' | 'error';
  runs: BotRunRow[];
}

const KNOWN_STATUSES: readonly string[] = ['ok', 'partial', 'failed', 'skipped', 'running'];

function statusKey(value: string | null | undefined): StatusKey {
  return value && KNOWN_STATUSES.includes(value) ? (value as StatusKey) : 'unknown';
}

/**
 * Cor por desfecho. O texto do badge carrega a informação; a cor só reforça —
 * cor nunca é o único sinal (WCAG 1.4.1).
 */
const BADGE_CLASS: Record<StatusKey, string> = {
  ok: 'bg-success-surface text-success-ink',
  partial: 'bg-warn-surface text-warn-ink',
  failed: 'bg-danger-surface text-danger-ink',
  skipped: 'bg-neutral-surface text-ink-2',
  running: 'bg-info-surface text-info-ink',
  unknown: 'bg-neutral-surface text-ink-2',
};

function statusLabel(key: StatusKey, s: BotStrings): string {
  switch (key) {
    case 'ok':
      return s.statusOk;
    case 'partial':
      return s.statusPartial;
    case 'failed':
      return s.statusFailed;
    case 'skipped':
      return s.statusSkipped;
    case 'running':
      return s.statusRunning;
    default:
      return s.statusUnknown;
  }
}

function triggerLabel(trigger: string, s: BotStrings): string {
  if (trigger === 'manual') return s.colTriggerManual;
  if (trigger === 'api') return s.colTriggerApi;
  if (trigger === 'schedule') return s.colTriggerSchedule;
  return trigger;
}

/** Duração observada (finishedAt − startedAt); `null` enquanto não terminou. */
function durationMs(run: BotRunRow): number | null {
  if (!run.finishedAt) return null;
  const start = new Date(run.startedAt).getTime();
  const end = new Date(run.finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function formatDuration(ms: number | null, locale: Locale): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${formatCount(ms, locale)} ms`;
  const seconds = ms / 1000;
  return `${formatCount(seconds < 10 ? Math.round(seconds * 10) / 10 : Math.round(seconds), locale)} s`;
}

function RunMetrics({ run, s, locale }: { run: BotRunRow; s: BotStrings; locale: Locale }) {
  const items = [
    { label: s.metricProcessed, value: run.processed },
    { label: s.metricUpdated, value: run.updated },
    { label: s.metricSkipped, value: run.skipped },
    { label: s.metricErrors, value: run.errors },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1">
          <dt className="text-ink-3">{item.label}</dt>
          <dd className="tabular-nums text-foreground">{formatCount(item.value, locale)}</dd>
        </div>
      ))}
    </dl>
  );
}

function RunHistory({
  botId,
  botName,
  history,
  locale,
  s,
  onRetry,
}: {
  botId: string;
  botName: string;
  history: HistoryState;
  locale: Locale;
  s: BotStrings;
  onRetry: () => void;
}) {
  const headingId = `bot-history-heading-${botId}`;
  const title = fill(s.historyTitle, { bot: botName });

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 font-heading text-sm font-semibold text-foreground">
        {title}
      </h2>
      {history.state === 'loading' && (
        <p role="status" className="text-xs text-ink-2">
          {s.historyLoading}
        </p>
      )}
      {history.state === 'error' && (
        <div role="alert" className="text-xs text-danger-ink">
          <p>{s.historyError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition-colors duration-200 hover:border-primary/60"
          >
            {s.retry}
          </button>
        </div>
      )}
      {history.state === 'ok' && history.runs.length === 0 && (
        <p className="text-xs text-ink-2">{s.historyEmpty}</p>
      )}
      {history.state === 'ok' && history.runs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="text-left text-ink-3">
                <th scope="col" className="py-1 pr-3">
                  {s.colWhen}
                </th>
                <th scope="col" className="py-1 pr-3">
                  {s.colTrigger}
                </th>
                <th scope="col" className="py-1 pr-3">
                  {s.colStatus}
                </th>
                <th scope="col" className="py-1 pr-3">
                  {s.colRunMetrics}
                </th>
                <th scope="col" className="py-1 pr-3">
                  {s.colDuration}
                </th>
                <th scope="col" className="py-1">
                  {s.colRunMessage}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.runs.map((run) => {
                const key = statusKey(run.status);
                return (
                  <tr key={run.id} className="border-t border-border align-top">
                    <td className="py-1 pr-3 text-ink-2">
                      <time dateTime={run.startedAt} title={formatDate(run.startedAt, locale)}>
                        {formatRelativeTime(run.startedAt, locale)}
                      </time>
                    </td>
                    <td className="py-1 pr-3 text-ink-2">{triggerLabel(run.trigger, s)}</td>
                    <td className="py-1 pr-3">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-semibold ${BADGE_CLASS[key]}`}
                      >
                        {statusLabel(key, s)}
                      </span>
                    </td>
                    <td className="py-1 pr-3">
                      <RunMetrics run={run} s={s} locale={locale} />
                    </td>
                    <td className="py-1 pr-3 tabular-nums text-ink-2">
                      {formatDuration(durationMs(run), locale)}
                    </td>
                    <td className="max-w-xs py-1 break-words text-ink-2">
                      {run.message ?? s.noMessage}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminBotsPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];
  const text = s.bots;

  const [data, setData] = useState<BotsSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [queued, setQueued] = useState<string | null>(null);
  const [actionFailed, setActionFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryState>>({});
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get<{ data: BotsSummary }>('/admin/bots');
      setData(res.data);
      setLoadState('ok');
    } catch (err) {
      // Sem números inventados: o payload antigo é descartado junto com o erro.
      setData(null);
      setLoadState((err as { status?: number }).status === 403 ? 'forbidden' : 'error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // `Promise.resolve().then` evita setState síncrono no corpo do efeito
    // (`react-hooks/set-state-in-effect`).
    void Promise.resolve().then(load);
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, [load]);

  const scheduleReload = useCallback(() => {
    // A rodada manual entra na fila do worker; 6 s é o suficiente para ela
    // aparecer como `running` na leitura seguinte (o histórico é recarregado
    // quando o operador abrir o bot).
    timers.current.push(
      setTimeout(() => {
        setQueued(null);
        void load();
      }, 6000),
    );
  }, [load]);

  const runNow = useCallback(
    async (id: string) => {
      setBusy(id);
      setActionFailed(false);
      setQueued(null);
      try {
        await api.post(`/admin/bots/${id}/run`);
        setQueued(id);
        scheduleReload();
      } catch {
        setActionFailed(true);
      } finally {
        setBusy(null);
      }
    },
    [scheduleReload],
  );

  const loadHistory = useCallback(async (id: string) => {
    setHistory((prev) => ({ ...prev, [id]: { state: 'loading', runs: [] } }));
    try {
      const res = await api.get<{ data: BotRunRow[] }>(`/admin/bots/${id}/runs?limit=20`);
      setHistory((prev) => ({
        ...prev,
        [id]: { state: 'ok', runs: Array.isArray(res.data) ? res.data : [] },
      }));
    } catch {
      setHistory((prev) => ({ ...prev, [id]: { state: 'error', runs: [] } }));
    }
  }, []);

  const toggleHistory = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      const existing = history[id];
      if (!existing || existing.state === 'error') void loadHistory(id);
    },
    [history, loadHistory, openId],
  );

  const bots = data?.bots ?? [];
  const summary = data?.summary ?? null;
  const latestRunAt = bots.reduce<string | null>((latest, bot) => {
    if (!bot.lastRunAt) return latest;
    if (!latest) return bot.lastRunAt;
    return bot.lastRunAt > latest ? bot.lastRunAt : latest;
  }, null);
  const noRunsYet = data !== null && bots.every((bot) => !bot.lastRunAt);

  const botName = (bot: BotMonitorItem): string => text.botNames[bot.id] ?? bot.label ?? bot.id;
  const domainName = (bot: BotMonitorItem): string => text.domains[bot.domain] ?? bot.domain;

  const summaryCards = summary
    ? [
        {
          key: 'total',
          label: text.summaryTotal,
          value: formatCount(summary.total, locale),
          hint: null,
          tone: 'text-foreground',
        },
        {
          key: 'ok',
          label: text.summaryOk,
          value: formatCount(summary.ok, locale),
          hint: text.summaryOkHint,
          tone: summary.ok > 0 ? 'text-success-ink' : 'text-foreground',
        },
        {
          key: 'failed',
          label: text.summaryFailed,
          value: formatCount(summary.failed, locale),
          hint: null,
          tone: summary.failed > 0 ? 'text-danger-ink' : 'text-foreground',
        },
        {
          key: 'running',
          label: text.summaryRunning,
          value: formatCount(summary.running, locale),
          hint: null,
          tone: summary.running > 0 ? 'text-info-ink' : 'text-foreground',
        },
        {
          key: 'recent',
          label: text.summaryRecent,
          value: latestRunAt ? formatRelativeTime(latestRunAt, locale) : text.never,
          hint: latestRunAt ? formatDate(latestRunAt, locale) : null,
          tone: 'text-foreground',
        },
      ]
    : [];

  const retryButton = (
    <button
      type="button"
      onClick={() => void load()}
      disabled={refreshing}
      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors duration-200 hover:border-primary/60 disabled:opacity-50"
    >
      {text.retry}
    </button>
  );

  return (
    <OperatorGate>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <AdminHeading
          title={text.title}
          subtitle={text.subtitle}
          aside={
            <button
              type="button"
              onClick={() => void load()}
              disabled={refreshing || loadState === 'loading'}
              aria-busy={refreshing}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors duration-200 hover:border-primary/60 disabled:opacity-50"
            >
              {text.refresh}
            </button>
          }
        />

        {loadState === 'loading' && (
          <p role="status" className="text-sm text-ink-2">
            {text.loading}
          </p>
        )}

        {loadState === 'forbidden' && (
          <p role="alert" className="text-sm text-danger-ink">
            {text.forbidden}
          </p>
        )}

        {loadState === 'error' && (
          <ErrorState
            title={text.errorTitle}
            body={text.error}
            retryLabel={text.retry}
            retryAction={retryButton}
          />
        )}

        {loadState === 'ok' && summary && (
          <>
            <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {summaryCards.map((card) => (
                <div key={card.key} className="rounded-xl border border-border bg-surface p-3">
                  <dt className="text-xs text-ink-3">{card.label}</dt>
                  <dd className={`mt-1 font-heading text-xl font-bold tabular-nums ${card.tone}`}>
                    {card.value}
                  </dd>
                  {card.hint && <dd className="text-[11px] text-ink-3">{card.hint}</dd>}
                </div>
              ))}
            </dl>

            {noRunsYet && (
              <div className="mb-6">
                <EmptyState title={text.emptyTitle} body={text.emptyBody} />
              </div>
            )}

            {actionFailed && (
              <p role="alert" className="mb-4 text-sm text-danger-ink">
                {text.queueFailed}
              </p>
            )}

            <div
              role="region"
              aria-label={text.tableLabel}
              tabIndex={0}
              className="overflow-x-auto rounded-xl border border-border"
            >
              <table className="w-full min-w-[56rem] text-sm" data-testid="bots-table">
                <caption className="sr-only">{text.tableLabel}</caption>
                <thead>
                  <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-ink-3">
                    <th scope="col" className="px-3 py-2">
                      {text.colBot}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {text.colStatus}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {text.colMetrics}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {text.colFailures}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {text.colLastRun}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {text.colMessage}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      {text.colActions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => {
                    const key = statusKey(bot.lastRun?.status ?? bot.lastStatus);
                    const lastRun = bot.lastRun;
                    const isOpen = openId === bot.id;
                    const historyId = `bot-history-${bot.id}`;
                    const historyState = history[bot.id] ?? { state: 'loading', runs: [] };
                    return (
                      <Fragment key={bot.id}>
                        <tr className="border-b border-border align-top last:border-b-0">
                          <td className="px-3 py-3">
                            <span className="font-semibold text-foreground">{botName(bot)}</span>
                            <span className="mt-0.5 block text-xs text-ink-3">
                              {domainName(bot)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[key]}`}
                            >
                              {statusLabel(key, text)}
                            </span>
                            {!bot.enabled && (
                              <span className="mt-1 block text-xs text-ink-3">{text.disabled}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {lastRun ? (
                              <RunMetrics run={lastRun} s={text} locale={locale} />
                            ) : (
                              <span className="text-xs text-ink-3">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {bot.consecutiveFailures > 0 ? (
                              <span className="text-xs font-semibold text-danger-ink">
                                {fill(text.failures, { n: bot.consecutiveFailures })}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-3">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {bot.lastRunAt ? (
                              <time
                                dateTime={bot.lastRunAt}
                                title={formatDate(bot.lastRunAt, locale)}
                                className="text-ink-2"
                              >
                                {formatRelativeTime(bot.lastRunAt, locale)}
                              </time>
                            ) : (
                              <span className="text-ink-3">{text.never}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <p
                              className="line-clamp-2 max-w-xs break-words text-xs text-ink-2"
                              title={bot.lastMessage ?? undefined}
                            >
                              {bot.lastMessage ?? text.noMessage}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy === bot.id}
                                onClick={() => void runNow(bot.id)}
                                className="rounded-lg border border-border px-3 py-1.5 text-sm text-primary-ink transition-colors duration-200 hover:border-primary disabled:opacity-50"
                              >
                                {busy === bot.id ? text.queueing : text.runNow}
                              </button>
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={historyId}
                                onClick={() => toggleHistory(bot.id)}
                                className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-2 transition-colors duration-200 hover:border-primary/60 hover:text-primary-ink"
                              >
                                {isOpen ? text.historyClose : text.history}
                              </button>
                            </div>
                            {queued === bot.id && (
                              <p role="status" className="mt-1 text-right text-xs text-success-ink">
                                {text.queued}
                              </p>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr
                            id={historyId}
                            className="border-b border-border bg-muted last:border-b-0"
                          >
                            <td colSpan={7} className="px-3 py-3">
                              <RunHistory
                                botId={bot.id}
                                botName={botName(bot)}
                                history={historyState}
                                locale={locale}
                                s={text}
                                onRetry={() => void loadHistory(bot.id)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </OperatorGate>
  );
}
