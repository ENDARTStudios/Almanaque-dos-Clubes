import Link from 'next/link';
import { MapPin } from 'lucide-react';

import FichaHead from '@/components/ficha/FichaHead';
import SectionHeading from '@/components/ficha/SectionHeading';
import SourceNote from '@/components/SourceNote';
import type { Locale } from '@/i18n/config';
import { conceitoEstadioStrings, fillEstadio } from '@/i18n/wsConceitoEstadio';
import { formatCount } from '@/lib/format';
import type { Estadio } from './types';

/**
 * FICHA DO ESTÁDIO no conceito FICHA — composição do quadro `estadio`.
 *
 * ── ORDEM DO QUADRO ─────────────────────────────────────────────────────────────────────────
 * kicker de localização · nome display + subtítulo · moldura da imagem · faixa de métricas ·
 * história + fonte · clubes que mandam aqui · ficha técnica · procedência no pé.
 *
 * ── ADAPTAÇÃO HONESTA ───────────────────────────────────────────────────────────────────────
 * O quadro desenha 78.838 de capacidade, 199.854 de recorde, 412 partidas, 1.148 gols e 2,79 de
 * média. Nada disso é copiado: a API pública do estádio (`GET /stadiums/:id`) publica nome,
 * cidade/estado/país, capacidade, piso, coordenadas, o clube vinculado e a URL da fonte.
 * Público por partida, inauguração, partidas, gols e média NÃO são publicados por estádio — a
 * faixa mostra "—" e a nota diz por quê. O bloco de maiores públicos e o gráfico por década não
 * são renderizados justamente porque a série não existe.
 *
 * ── IMAGEM ──────────────────────────────────────────────────────────────────────────────────
 * O acervo pode ter a foto do estádio no perfil do clube, mas sem licença verificada no payload.
 * Publicar sem licença seria pior que não publicar; a moldura então declara a lacuna — e não
 * desenha arquibancada, que seria placebo visual.
 *
 * ── ESTILO ──────────────────────────────────────────────────────────────────────────────────
 * raio 2px, borda 1px, sem sombra; fio de 2px no topo da faixa; metadado em `ink-3` 11px;
 * número em `font-heading`/`.num` com `tabular-nums`; texto de destaque em `text-primary-ink`;
 * nenhuma transição genérica e nenhuma curva de entrada (régua `motion-craft`).
 */
export interface EstadioFichaPageViewProps {
  locale: Locale;
  estadio: Estadio;
}

/** Traço de lacuna declarada. Não é texto traduzível: é o sinal universal de ausência. */
const GAP = '—';

/** Coordenadas no mesmo formato que a ficha antiga usava (4 casas, ponto decimal). */
function coordsOf(estadio: Estadio): string | null {
  if (estadio.latitude == null || estadio.longitude == null) return null;
  return `${estadio.latitude.toFixed(4)}, ${estadio.longitude.toFixed(4)}`;
}

function StadiumImageFrame({ locale, coords }: { locale: Locale; coords: string | null }) {
  const t = conceitoEstadioStrings[locale];

  return (
    <figure className="w-full lg:w-[420px] lg:shrink-0" data-testid="estadio-image-frame">
      <div className="flex aspect-[420/260] w-full flex-col justify-between rounded-[2px] border border-border bg-surface-2 p-4">
        <div className="flex items-center gap-2 text-ink-3">
          <MapPin aria-hidden="true" size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-semibold leading-none">{t.image.label}</span>
        </div>
        <div>
          <p className="text-[13px] leading-5 text-ink-2">{t.image.missing}</p>
          {coords ? (
            <p className="mt-1.5 text-[11px] leading-none text-ink-3">
              {t.image.coordsLabel}: <span className="num text-[12px]">{coords}</span>
            </p>
          ) : null}
        </div>
      </div>
      <figcaption className="mt-2 text-[11px] leading-snug text-ink-3">
        {t.image.caption}
      </figcaption>
    </figure>
  );
}

export default function EstadioFichaPageView({ locale, estadio }: EstadioFichaPageViewProps) {
  const t = conceitoEstadioStrings[locale];
  const coords = coordsOf(estadio);
  const place = [estadio.city, estadio.country].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const kicker = [t.kicker, ...place].join(' · ');

  const subtitleParts: string[] = [];
  if (estadio.capacity != null) {
    subtitleParts.push(
      fillEstadio(t.head.capacity, { value: formatCount(estadio.capacity, locale) }),
    );
  }
  if (estadio.surface) {
    subtitleParts.push(fillEstadio(t.head.surface, { value: estadio.surface }));
  }
  if (estadio.clubName) {
    subtitleParts.push(fillEstadio(t.head.homeClub, { name: estadio.clubName }));
  }
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined;

  /*
   * As seis métricas do quadro, na ordem do desenho. Só a capacidade existe no payload do
   * estádio; as outras cinco viram "—" declarado. Zero seria uma afirmação falsa ("nenhum gol"),
   * e um número ilustrativo seria pior ainda.
   */
  const metrics: Array<{ key: string; label: string; value: string; accent: boolean }> = [
    {
      key: 'capacity',
      label: t.metrics.capacity,
      value: estadio.capacity != null ? formatCount(estadio.capacity, locale) : GAP,
      accent: true,
    },
    { key: 'recordAttendance', label: t.metrics.recordAttendance, value: GAP, accent: false },
    { key: 'inauguration', label: t.metrics.inauguration, value: GAP, accent: false },
    { key: 'matches', label: t.metrics.matches, value: GAP, accent: false },
    { key: 'goals', label: t.metrics.goals, value: GAP, accent: false },
    { key: 'average', label: t.metrics.average, value: GAP, accent: false },
  ];

  const details: Array<{ key: string; label: string; value: string }> = [
    { key: 'city', label: t.details.city, value: estadio.city ?? GAP },
    { key: 'state', label: t.details.state, value: estadio.state ?? GAP },
    { key: 'country', label: t.details.country, value: estadio.country ?? GAP },
    { key: 'surface', label: t.details.surface, value: estadio.surface ?? GAP },
    { key: 'coordinates', label: t.details.coordinates, value: coords ?? GAP },
  ];

  return (
    <div className="pb-4">
      <header>
        <p
          data-testid="estadio-kicker"
          className="text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-ink-3"
        >
          {kicker}
        </p>
        <div className="mt-3 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <FichaHead title={estadio.name} subtitle={subtitle} />
          </div>
          <StadiumImageFrame locale={locale} coords={coords} />
        </div>
      </header>

      <section
        className="mt-6 border-t-2 border-foreground pt-5"
        aria-labelledby="estadio-metrics-title"
        data-testid="estadio-metrics"
      >
        <h2 id="estadio-metrics-title" className="sr-only">
          {t.metrics.label}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.key} className="min-w-0">
              <dt className="text-[12.5px] leading-none text-ink-3">{metric.label}</dt>
              <dd
                data-testid={`estadio-metric-${metric.key}`}
                className={`num mt-2 text-[34px] leading-none ${
                  metric.value === GAP
                    ? 'text-ink-3'
                    : metric.accent
                      ? 'text-primary-ink'
                      : 'text-foreground'
                }`}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="measure-readable mt-5 text-[11px] leading-snug text-ink-3">
          {t.metrics.note}
        </p>
      </section>

      <section
        className="mt-8 border-t border-border pt-5"
        aria-labelledby="estadio-history-title"
        data-testid="estadio-history"
      >
        <SectionHeading id="estadio-history-title">{t.history.heading}</SectionHeading>
        <p className="measure-readable text-[14px] leading-[22px] text-ink-2 [text-wrap:pretty]">
          {t.history.gap}
        </p>
        <SourceNote
          href={estadio.sourceUrl}
          label={t.provenance.source}
          detail={t.provenance.license}
          prefixoAcessivel={t.provenance.sourcePrefix}
          data-testid="estadio-source"
        />
      </section>

      <section
        className="mt-8 border-t border-border pt-5"
        aria-labelledby="estadio-clubs-title"
        data-testid="estadio-clubs"
      >
        <SectionHeading id="estadio-clubs-title">{t.clubs.heading}</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            data-testid="estadio-club-card"
            className="rounded-[2px] border border-border bg-surface px-4 py-4"
          >
            {estadio.clubName ? (
              <>
                {estadio.clubId ? (
                  <Link
                    href={`/clubs/${estadio.clubId}`}
                    className="inline-flex min-h-6 items-center font-heading text-[17px] font-bold leading-tight text-foreground hover:text-primary-ink hover:underline"
                  >
                    {estadio.clubName}
                  </Link>
                ) : (
                  <p className="font-heading text-[17px] font-bold leading-tight text-foreground">
                    {estadio.clubName}
                  </p>
                )}
                <p className="mt-1 text-[11px] font-semibold leading-none text-secondary">
                  {t.clubs.linked}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-ink-3">{t.clubs.matchesGap}</p>
              </>
            ) : (
              <p className="text-[13px] leading-5 text-ink-2">{t.clubs.empty}</p>
            )}
          </div>
        </div>
      </section>

      {/*
       * O quadro tem "Maiores públicos" aqui. A série não existe na API (não há público por
       * partida), então o bloco NÃO é desenhado — a nota abaixo declara a ausência em vez de
       * preencher a tabela com linhas ilustrativas.
       */}
      <p
        data-testid="estadio-attendance-gap"
        className="measure-readable mt-6 border-l-2 border-border pl-4 text-[13px] leading-5 text-ink-2"
      >
        {t.attendanceGap}
      </p>

      <section
        className="mt-8 border-t border-border pt-5"
        aria-labelledby="estadio-details-title"
        data-testid="estadio-details"
      >
        <SectionHeading id="estadio-details-title">{t.details.heading}</SectionHeading>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {details.map((item) => (
            <div
              key={item.key}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2"
            >
              <dt className="text-[11px] text-ink-3">{item.label}</dt>
              <dd className="text-[13px] text-foreground [font-variant-numeric:tabular-nums]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mt-10 border-t border-border pt-5" data-testid="estadio-provenance">
        <p className="measure-readable text-[11px] leading-snug text-ink-3">{t.provenance.note}</p>
      </footer>
    </div>
  );
}
