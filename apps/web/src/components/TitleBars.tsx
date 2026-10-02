/**
 * WS-C-7 — barras CSS puras de títulos por hierarquia (A vs B).
 * Sem lib de charts: flex + width % normalizado pelo máximo do par.
 * Zero counts → barra vazia com o número explícito (honesto).
 */

export interface HierarchyCount {
  municipal: number;
  estadual: number;
  nacional: number;
  continental: number;
  mundial: number;
  total: number;
}

const ORDER = ['mundial', 'continental', 'nacional', 'estadual', 'municipal'] as const;

export default function TitleBars({
  nameA,
  nameB,
  countsA,
  countsB,
  hierarchyLabels,
}: {
  nameA: string;
  nameB: string;
  countsA: HierarchyCount;
  countsB: HierarchyCount;
  hierarchyLabels: Record<(typeof ORDER)[number], string>;
}) {
  return (
    <div data-testid="title-bars" role="img" aria-label={`${nameA} vs ${nameB}`}>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground/60 mb-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3 h-2 rounded-sm bg-primary inline-block" />
          {nameA}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-3 h-2 rounded-sm bg-foreground/30 inline-block"
          />
          {nameB}
        </span>
      </div>
      <ul className="space-y-2.5">
        {ORDER.map((h) => {
          const a = countsA[h] ?? 0;
          const b = countsB[h] ?? 0;
          const max = Math.max(a, b, 1);
          return (
            <li key={h} data-testid={`title-bar-${h}`}>
              <p className="text-xs text-foreground/50 mb-1">{hierarchyLabels[h]}</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(a / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-6 text-right text-foreground/70">
                    {a}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/30 rounded-full"
                      style={{ width: `${(b / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-6 text-right text-foreground/70">
                    {b}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
