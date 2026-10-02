'use client';
import { useState } from 'react';

/**
 * WS-O-1 — visualizador de logs JSON estruturados (colapsível por entrada).
 */

export interface LogEntryView {
  at: string;
  level: 'info' | 'warn' | 'error';
  job: string;
  event: string;
  data?: Record<string, unknown>;
}

export interface QueueJobView {
  id: string | number;
  name: string;
  state: string;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
  returnvalue: unknown;
}

const LEVEL_COLOR: Record<string, string> = {
  info: 'text-foreground/70',
  warn: 'text-amber-600',
  error: 'text-red-600',
};

function Entry({ log }: { log: LogEntryView }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border/40 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left font-mono text-xs flex gap-2 items-baseline"
        aria-expanded={open}
      >
        <span className="text-foreground/40 shrink-0 tabular-nums">
          {new Date(log.at).toLocaleTimeString()}
        </span>
        <span className={`${LEVEL_COLOR[log.level] ?? ''} shrink-0 uppercase`}>{log.level}</span>
        <span className="text-foreground font-semibold shrink-0">{log.job}</span>
        <span className="text-foreground/70 truncate">{log.event}</span>
      </button>
      {open && (
        <pre className="mt-1 text-xs bg-foreground/5 rounded-lg p-2 overflow-x-auto text-foreground/70">
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </li>
  );
}

export default function LogViewer({
  entries,
  queueJobs,
  queueLabel,
  emptyLabel,
}: {
  entries: LogEntryView[];
  queueJobs: QueueJobView[];
  queueLabel: string;
  emptyLabel: string;
}) {
  return (
    <div data-testid="log-viewer" className="space-y-6">
      <section>
        <h3 className="text-sm font-heading font-semibold text-foreground mb-2">
          {emptyLabel === '' ? '' : ''}
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-foreground/50">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-border/40" aria-label="job logs">
            {entries.map((e, i) => (
              <Entry key={`${e.at}-${i}`} log={e} />
            ))}
          </ul>
        )}
      </section>
      {queueJobs.length > 0 && (
        <section>
          <h3 className="text-sm font-heading font-semibold text-foreground mb-2">{queueLabel}</h3>
          <ul className="divide-y divide-border/40" aria-label={queueLabel}>
            {queueJobs.map((j) => (
              <li key={String(j.id)} className="py-1.5 font-mono text-xs flex gap-2 items-baseline">
                <span className="text-foreground/40 tabular-nums shrink-0">
                  {new Date(j.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`shrink-0 uppercase ${j.state === 'failed' ? 'text-red-600' : 'text-green-700'}`}
                >
                  {j.state}
                </span>
                <span className="text-foreground font-semibold shrink-0">{j.name}</span>
                <span className="text-foreground/50 truncate">
                  {j.failedReason ??
                    (j.finishedOn != null && j.processedOn != null
                      ? `${((j.finishedOn - j.processedOn) / 1000).toFixed(1)}s`
                      : '—')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
