'use client';
import { useI18n } from '@/i18n/Provider';

// T440 — Tabela comparativa com indicador de líder por linha.

export interface CompareRow {
  metric: string;
  a: number | string | null;
  b: number | string | null;
  note?: string;
}

function display(v: number | string | null): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

export default function CompareMetrics({
  aName,
  bName,
  rows,
}: {
  aName: string;
  bName: string;
  rows: CompareRow[];
}) {
  const { dict } = useI18n();
  const t = dict.pages.compare;

  return (
    <section aria-label={t.metric}>
      <h2 className="text-xl font-heading font-semibold mb-3">{t.metric}</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-foreground/5 text-left">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.metric}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {aName}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {bName}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.leader}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const na = typeof row.a === 'number' ? row.a : null;
              const nb = typeof row.b === 'number' ? row.b : null;
              const leader =
                na !== null && nb !== null ? (na > nb ? 'a' : nb > na ? 'b' : null) : null;
              return (
                <tr key={row.metric} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-foreground/80">
                    {row.metric}
                    {row.note ? (
                      <span className="block text-xs text-foreground/40">{row.note}</span>
                    ) : null}
                  </th>
                  <td className="px-4 py-3 font-semibold">
                    {display(row.a)}
                    {leader === 'a' ? (
                      <span className="ml-2 text-primary" aria-label={t.leader}>
                        ✓
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {display(row.b)}
                    {leader === 'b' ? (
                      <span className="ml-2 text-primary" aria-label={t.leader}>
                        ✓
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-foreground/50">
                    {leader === 'a' ? aName : leader === 'b' ? bName : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
