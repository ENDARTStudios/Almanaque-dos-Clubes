'use client';

/**
 * T603 — /admin/bots: o SISTEMA DE BOTS visto de fora.
 *
 * Uma linha por bot: domínio, cadência, última rodada e — o que importa — o DELTA
 * da métrica. "Rodou" ≠ "rendeu": a tabela mostra as duas coisas.
 */
import { useCallback, useEffect, useState } from 'react';
import OperatorGate from '@/components/OperatorGate';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsT603Strings, type WsT603Strings } from '@/i18n/wsT603';

interface BotRow {
  key: string;
  domain: string;
  label: string;
  cadenceHours: number;
  writes: boolean;
  sources: string[];
  note: string | null;
  lastRunAt: string | null;
  dueAt: string | null;
  isDue: boolean;
}

interface RunRow {
  botKey: string;
  status: string;
  startedAt: string;
  durationMs: number | null;
  delta: number | null;
  error: string | null;
}

export default function AdminBotsPage() {
  const { locale } = useI18n();
  const s: WsT603Strings = wsT603Strings[locale] ?? wsT603Strings['pt-br'];
  const [bots, setBots] = useState<BotRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: BotRow[]; recentRuns: RunRow[] }>('/admin/bots');
      setBots(res.data ?? []);
      setRuns(res.recentRuns ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disparar = useCallback(
    async (key: string) => {
      setBusy(key);
      try {
        await api.post(`/admin/bots/${key}/run`, {});
        // pequena espera + releitura: o disparo roda em segundo plano
        setTimeout(() => void load(), 4000);
      } catch {
        setFailed(true);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  return (
    <OperatorGate>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">{s.title}</h1>
        <p className="text-sm text-ink-2 mb-6 max-w-3xl">{s.subtitle}</p>

        {!loaded && <p className="text-sm text-foreground/70">{s.loading}</p>}
        {loaded && failed && (
          <p role="alert" className="text-sm text-danger-ink">
            {s.error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="bots-table">
            <caption className="sr-only">{s.title}</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" className="py-2 pr-3">
                  {s.colBot}
                </th>
                <th scope="col" className="py-2 pr-3">
                  {s.colDomain}
                </th>
                <th scope="col" className="py-2 pr-3">
                  {s.colCadence}
                </th>
                <th scope="col" className="py-2 pr-3">
                  {s.colLast}
                </th>
                <th scope="col" className="py-2" />
              </tr>
            </thead>
            <tbody>
              {bots.map((b) => {
                const ultima = runs.find((r) => r.botKey === b.key);
                return (
                  <tr key={b.key} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <span className="font-semibold text-foreground">{b.label}</span>
                      <span className="block text-xs text-ink-3">{b.key}</span>
                      {b.note && <span className="block text-xs text-warn-ink mt-1">{b.note}</span>}
                    </td>
                    <td className="py-2 pr-3 text-ink-2">{b.domain}</td>
                    <td className="py-2 pr-3 text-ink-2 tabular-nums">{b.cadenceHours}h</td>
                    <td className="py-2 pr-3">
                      {ultima ? (
                        <>
                          <span
                            className={
                              ultima.status === 'SUCCESS'
                                ? 'text-success-ink'
                                : ultima.status === 'FAILED'
                                  ? 'text-danger-ink'
                                  : 'text-warn-ink'
                            }
                          >
                            {ultima.status}
                          </span>
                          <span className="text-xs text-ink-3">
                            {' · '}
                            {ultima.delta === null
                              ? s.noDelta
                              : `${s.delta} ${ultima.delta > 0 ? '+' : ''}${ultima.delta}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-ink-3">{s.never}</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busy === b.key}
                        onClick={() => void disparar(b.key)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm text-primary-ink transition-colors hover:border-primary disabled:opacity-50"
                      >
                        {busy === b.key ? s.running : s.runNow}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </OperatorGate>
  );
}
