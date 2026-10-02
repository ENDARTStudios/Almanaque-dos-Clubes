'use client';

/**
 * WS-O-1 — barras de estado da fila (completed/failed/waiting/delayed/active),
 * CSS puro, normalizadas pelo total.
 */

export interface QueueCountsView {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
}

const BARS: Array<{ key: keyof QueueCountsView; color: string }> = [
  { key: 'completed', color: 'bg-green-500' },
  { key: 'failed', color: 'bg-red-500' },
  { key: 'waiting', color: 'bg-amber-400' },
  { key: 'active', color: 'bg-blue-500' },
  { key: 'delayed', color: 'bg-foreground/30' },
];

export default function QueueStatus({
  counts,
  labels,
}: {
  counts: QueueCountsView;
  labels: Record<string, string>;
}) {
  const values = BARS.map((b) => ({ ...b, n: counts[b.key] ?? 0 }));
  const max = Math.max(...values.map((v) => v.n), 1);
  return (
    <div data-testid="queue-status" className="space-y-2">
      {values.map((v) => (
        <div key={v.key}>
          <div className="flex items-center justify-between text-xs text-foreground/60 mb-0.5">
            <span>{labels[v.key] ?? v.key}</span>
            <span className="tabular-nums">{v.n}</span>
          </div>
          <div className="h-2.5 bg-foreground/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${v.color}`}
              style={{ width: `${(v.n / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
