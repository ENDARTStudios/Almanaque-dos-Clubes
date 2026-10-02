'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useI18n } from '@/i18n/Provider';

// T440 — Timeline de evolução no ranking (2 séries, recharts).

interface HistoryPoint {
  season: string | null;
  points: number | null;
}

export default function CompareTimeline({
  aName,
  bName,
  aHistory,
  bHistory,
}: {
  aName: string;
  bName: string;
  aHistory: HistoryPoint[];
  bHistory: HistoryPoint[];
}) {
  const { dict } = useI18n();
  const t = dict.pages.compare;

  // União de temporadas ordenada (asc) — valores faltantes viram null (gap).
  const seasons = useMemoSortedSeasons(aHistory, bHistory);
  const data = seasons.map((s) => ({
    season: s,
    [aName]: aHistory.find((h) => h.season === s)?.points ?? null,
    [bName]: bHistory.find((h) => h.season === s)?.points ?? null,
  }));

  if (seasons.length === 0) {
    return (
      <section aria-label={t.timelineTitle}>
        <h2 className="text-xl font-heading font-semibold mb-3">{t.timelineTitle}</h2>
        <p className="text-sm text-foreground/50">{t.noData}</p>
      </section>
    );
  }

  return (
    <section aria-label={t.timelineTitle}>
      <h2 className="text-xl font-heading font-semibold mb-3">{t.timelineTitle}</h2>
      <div
        role="img"
        aria-label={`${t.timelineTitle}: ${aName} vs ${bName}`}
        className="w-full h-72 rounded-xl border border-border p-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000018" />
            <XAxis dataKey="season" fontSize={12} />
            <YAxis domain={[0, 100]} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={aName}
              stroke="#b91c1c"
              strokeWidth={2}
              connectNulls
              dot
            />
            <Line
              type="monotone"
              dataKey={bName}
              stroke="#1d4ed8"
              strokeWidth={2}
              connectNulls
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-foreground/40">
        {t.timelineTitle} — {aName} ({aHistory.length}) · {bName} ({bHistory.length})
      </p>
    </section>
  );
}

function useMemoSortedSeasons(a: HistoryPoint[], b: HistoryPoint[]): string[] {
  const set = new Set<string>();
  for (const h of a) if (h.season) set.add(h.season);
  for (const h of b) if (h.season) set.add(h.season);
  return [...set].sort((x, y) => x.localeCompare(y));
}
