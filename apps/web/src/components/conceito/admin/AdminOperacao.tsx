import Link from 'next/link';
import { formatCount } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { ConceitoAdminStrings } from '@/i18n/wsConceitoAdmin';

/**
 * OPERAÇÃO — o quadro \`admin\` do conceito FICHA.
 *
 * A tela é ferramenta, não vitrine: mesma tipografia, densidade maior. Blocos:
 *   1. ACERVO — 6 contagens reais do payload /admin/metrics;
 *   2. QUALIDADE — percentual de cobertura por campo (parte ÷ total), com barra e número;
 *   3. FILAS — filaPorChave com a contagem real e o caminho de revisão;
 *   4. FUNÇÕES — o catálogo de áreas internas (mesma fonte da navegação).
 *
 * O gráfico de ingestão do desenho NÃO é desenhado: a API de métricas não publica execuções
 * nem latência nesta tela. A lacuna é declarada em texto — nenhum número inventado.
 */
export interface AdminMetricsView {
  measuredAt: string;
  acervo: {
    clubsTotal: number;
    players: number;
    matches: number;
    competitions: number;
    seasons: number;
    rankings: number;
  };
  cobertura: {
    clubs: {
      total: number;
      logoUrl: number;
      stadiumName: number;
      teamColors: number;
      editorialText: number;
    };
    players: { total: number; photoUrl: number; country: number };
  };
  filaPorChave: Record<string, number>;
}

function pct(part: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return Math.round((part / total) * 100);
}

function QualityCard({
  label,
  value,
  pctValue,
}: {
  label: string;
  value: number;
  pctValue: number | null;
}) {
  return (
    <div className="rounded-[2px] border border-border bg-surface px-4 py-3">
      <p className="text-[11px] leading-tight text-ink-3">{label}</p>
      <p className="num mt-1 text-[24px] leading-none font-bold text-foreground">
        {pctValue != null ? `${pctValue}%` : '—'}
      </p>
      <div className="mt-2 h-1 w-full bg-border" aria-hidden="true">
        <div style={{ width: `${pctValue ?? 0}%` }} className="h-1 bg-primary" />
      </div>
      <p className="mt-1 text-[10px] text-ink-3">{formatCount(value, 'pt-br')}</p>
    </div>
  );
}

export default function AdminOperacao({
  data,
  s,
  locale,
  areas,
}: {
  data: AdminMetricsView;
  s: ConceitoAdminStrings;
  locale: Locale;
  areas: Array<{ href: string; label: string; desc: string }>;
}) {
  const { clubs, players } = data.cobertura;
  const qualidade = [
    { label: s.quality.clubLogo, value: clubs.logoUrl, p: pct(clubs.logoUrl, clubs.total) },
    {
      label: s.quality.clubStadium,
      value: clubs.stadiumName,
      p: pct(clubs.stadiumName, clubs.total),
    },
    { label: s.quality.clubColors, value: clubs.teamColors, p: pct(clubs.teamColors, clubs.total) },
    {
      label: s.quality.clubEditorial,
      value: clubs.editorialText,
      p: pct(clubs.editorialText, clubs.total),
    },
    {
      label: s.quality.playerPhoto,
      value: players.photoUrl,
      p: pct(players.photoUrl, players.total),
    },
    {
      label: s.quality.playerCountry,
      value: players.country,
      p: pct(players.country, players.total),
    },
  ];
  const filas = Object.entries(data.filaPorChave).filter(([, n]) => n > 0);
  const kpis = [
    { label: s.kpi.clubs, value: data.acervo.clubsTotal },
    { label: s.kpi.players, value: data.acervo.players },
    { label: s.kpi.competitions, value: data.acervo.competitions },
    { label: s.kpi.matches, value: data.acervo.matches },
    { label: s.kpi.seasons, value: data.acervo.seasons },
    { label: s.kpi.rankings, value: data.acervo.rankings },
  ];

  return (
    <div data-testid="admin-operacao" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
            {s.kicker}
          </p>
          <h1 className="mt-2 font-heading text-[40px] leading-none font-bold text-foreground">
            {s.title}
          </h1>
          <p className="mt-2 max-w-[720px] text-[13px] leading-[20px] text-ink-2">{s.subtitle}</p>
        </div>
        <p className="text-[10px] text-ink-3">
          {s.updatedAt} {new Date(data.measuredAt).toLocaleString(locale)}
        </p>
      </div>

      <section aria-labelledby="admin-acervo" className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="admin-acervo" className="text-[12.5px] font-semibold text-foreground">
            {s.acervoTitle}
          </h2>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col">
              <dt className="order-2 mt-1 text-[10px] text-ink-3">{k.label}</dt>
              <dd className="num order-1 text-[26px] leading-none font-bold text-foreground">
                {formatCount(k.value, locale)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="admin-qualidade" className="mt-8">
        <h2 id="admin-qualidade" className="text-[12.5px] font-semibold text-foreground">
          {s.qualityTitle}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {qualidade.map((q) => (
            <QualityCard key={q.label} label={q.label} value={q.value} pctValue={q.p} />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-filas" className="mt-8">
        <h2 id="admin-filas" className="text-[12.5px] font-semibold text-foreground">
          {s.queuesTitle}
        </h2>
        {filas.length === 0 ? (
          <p className="mt-2 text-[11px] text-ink-3">{s.queuesEmpty}</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-[10px] tracking-[0.08em] text-ink-3 uppercase">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  fila
                </th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  {s.queueCount}
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  {' '}
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(([key, n], i) => (
                <tr key={key} className={i % 2 === 1 ? 'bg-surface-2' : undefined}>
                  <th
                    scope="row"
                    className="border-b border-border py-2 pr-3 text-left font-semibold text-foreground"
                  >
                    {s.queueLabels[key] ?? key}
                  </th>
                  <td className="num border-b border-border py-2 pr-3 tabular-nums text-ink-2">
                    {formatCount(n, locale)}
                  </td>
                  <td className="border-b border-border py-2">
                    <Link
                      href="/admin/revisao"
                      className="text-primary-ink underline decoration-dotted underline-offset-2"
                    >
                      {s.queueAction}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 max-w-[900px] text-[11px] leading-snug text-ink-3">{s.ingestionGap}</p>
      </section>

      <section aria-labelledby="admin-funcoes" className="mt-8">
        <h2 id="admin-funcoes" className="text-[12.5px] font-semibold text-foreground">
          {s.functionsTitle}
        </h2>
        <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={`${area.href}-${area.label}`}>
              <Link
                href={area.href}
                data-testid={`admin-hub-${area.href === '/admin' ? 'index' : area.href.split('/').slice(2).join('-')}`}
                className="flex h-full flex-col justify-between rounded-[2px] border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-foreground"
              >
                <span className="text-[12px] font-semibold text-foreground">{area.label}</span>
                <span className="mt-1 text-[11px] leading-snug text-ink-3">{area.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
