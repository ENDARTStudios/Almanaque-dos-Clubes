import type { ConceitoPartidasStrings } from '@/i18n/wsConceitoPartidas';
import type { MatchRowData } from './types';

/**
 * ESTATÍSTICA DA PÁGINA — a caixa que fecha o recorte no quadro `partidas`.
 *
 * O desenho mostra aproveitamento/gols pró/gols contra/média de posse porque tem esse dado.
 * A API pública só garante o PLACAR; então a caixa calcula o que é derivável dele e DECLARA o
 * recorte ("desta página", não do acervo inteiro). Partida sem placar não entra: ausência não é
 * 0×0 — é a regra que a página inteira segue.
 */
export interface PageStatsValues {
  matches: number;
  goals: number;
  average: number;
  biggest: { label: string; margin: number } | null;
}

export function computePageStats(rows: MatchRowData[]): PageStatsValues {
  const comPlacar = rows.filter((r) => r.homeScore != null && r.awayScore != null);
  const goals = comPlacar.reduce((acc, r) => acc + (r.homeScore ?? 0) + (r.awayScore ?? 0), 0);
  let biggest: PageStatsValues['biggest'] = null;
  for (const r of comPlacar) {
    const margin = Math.abs((r.homeScore ?? 0) - (r.awayScore ?? 0));
    if (!biggest || margin > biggest.margin) {
      biggest = {
        margin,
        label: `${r.homeClub?.name ?? '—'} ${r.homeScore}×${r.awayScore} ${r.awayClub?.name ?? '—'}`,
      };
    }
  }
  return {
    matches: comPlacar.length,
    goals,
    average: comPlacar.length === 0 ? 0 : Math.round((goals / comPlacar.length) * 100) / 100,
    biggest,
  };
}

export default function PageStats({
  rows,
  s,
}: {
  rows: MatchRowData[];
  s: ConceitoPartidasStrings;
}) {
  const values = computePageStats(rows);
  if (values.matches === 0) return null;

  const itens = [
    { key: 'matches', label: s.stats.matches, value: String(values.matches) },
    { key: 'goals', label: s.stats.goals, value: String(values.goals) },
    {
      key: 'average',
      label: s.stats.average,
      value: values.average.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    },
    {
      key: 'biggest',
      label: s.stats.biggest,
      value: values.biggest ? `${values.biggest.margin}` : '—',
    },
  ];

  return (
    <section
      data-testid="conceito-partidas-stats"
      aria-labelledby="conceito-partidas-stats-title"
      className="mt-8 rounded-[2px] border border-border bg-surface-2 px-5 py-4"
    >
      <h2
        id="conceito-partidas-stats-title"
        className="text-[12.5px] font-semibold text-foreground"
      >
        {s.statsTitle}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {itens.map((item) => (
          <div key={item.key} className="flex flex-col">
            <dt className="order-2 mt-1 text-[11px] leading-tight text-ink-3">{item.label}</dt>
            <dd className="num order-1 text-[28px] font-bold leading-none text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {values.biggest ? (
        <p className="mt-2 text-[11px] leading-tight text-ink-3">{values.biggest.label}</p>
      ) : null}
      <p className="mt-2 text-[11px] leading-snug text-ink-3">{s.statsNote}</p>
    </section>
  );
}
