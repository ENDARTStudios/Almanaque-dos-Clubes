'use client';
import { useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  BarChart3,
  Globe,
  Trophy,
  Search as SearchIcon,
  ExternalLink,
} from 'lucide-react';
import { useGsapFadeIn, useGsapStagger } from '@/hooks/useGsap';
import { useI18n } from '@/i18n/Provider';
import { wsC12Strings } from '@/i18n/wsC12';
import { formatCount } from '@/lib/format';

const featureIcons = [BookOpen, Trophy, SearchIcon, Brain, BarChart3, Globe];

// WS-C-12 — totais vindos do Server Component (page.tsx), buscados na API com
// revalidate. null = API indisponível -> lacuna declarada (nunca inventar).
export interface HeroTotals {
  clubs: number | null;
  competitions: number | null;
  rankings: number | null;
}

// Campeão vigente com proveniência (GET /champions/carousel) — a "Prova" da hero.
export interface HeroChampion {
  name: string;
  clubId: string | null;
  competitionName: string | null;
  competitionId: string | null;
  season: number | null;
  sourceType: string | null;
  sourceUrl: string | null;
}

export default function HeroSection({
  initialTotals,
  champion,
}: {
  initialTotals?: HeroTotals;
  champion?: HeroChampion | null;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDListElement>(null);
  const { t, dict, locale } = useI18n();
  const c12 = wsC12Strings[locale];

  useGsapFadeIn(heroRef);
  useGsapFadeIn(proofRef, { delay: 0.15 });
  useGsapStagger(statsRef, '.stat-item');

  const hasTotals =
    initialTotals?.clubs != null ||
    initialTotals?.competitions != null ||
    initialTotals?.rankings != null;

  const stats = [
    { value: initialTotals?.clubs, label: t('home.stats.clubs') },
    { value: initialTotals?.competitions, label: t('home.stats.competitions') },
    { value: initialTotals?.rankings, label: t('home.stats.rankings') },
  ];

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-background text-foreground"
      aria-labelledby="hero-title"
    >
      {/* Camadas decorativas: halo + grade de campo + grão (CSS/SVG inline, sem rede). */}
      <div className="theme-dark-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="theme-dark-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="theme-dark-grain pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8 lg:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          {/* ---- Gancho + Promessa + CTA ---------------------------------- */}
          <div className="max-w-2xl">
            {/* Sem "eyebrow" acima do H1: um rótulo minúsculo em caixa alta sobre um
                título grande é o molde que o detector marca (`hero-eyebrow-chip`).
                O H1 é o primeiro elemento de texto da página; a informação que o chip
                carregava virou a primeira linha da promessa, em destaque. */}
            <h1
              id="hero-title"
              className="scroll-mt-24 text-balance font-heading text-4xl leading-[0.98] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              {c12.hook}
            </h1>

            <p data-testid="hero-promise" className="mt-6 max-w-xl text-lg text-foreground/75 text-balance">
              <span className="font-semibold text-foreground">{c12.eyebrow}</span>{' '}
              {c12.promise}
            </p>

            <p
              data-testid="hero-promise-note"
              className="mt-3 max-w-xl border-l-2 border-primary/60 pl-3 text-sm text-foreground/60"
            >
              {c12.promiseNote}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/search"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-md transition duration-200 hover:opacity-90 hover:shadow-lg"
              >
                {c12.ctaPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-border px-7 py-3 text-base font-semibold text-foreground transition duration-200 hover:border-primary hover:text-primary-ink"
              >
                {c12.ctaSecondary}
              </Link>
            </div>

            <p data-testid="hero-cta-note" className="mt-3 text-sm text-foreground/75">
              {c12.ctaPrimaryNote}
            </p>
          </div>

          {/* ---- Prova: campeão vigente com fonte --------------------------- */}
          <div ref={proofRef}>
            <article className="rounded-2xl border border-border bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)] p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <p
                  data-testid="hero-proof-label"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary"
                >
                  {c12.proofTitle}
                </p>
                <Trophy className="h-6 w-6 text-primary-ink" aria-hidden="true" />
              </div>

              {champion ? (
                <div className="mt-4">
                  {champion.clubId ? (
                    <Link
                      href={`/clubs/${champion.clubId}`}
                      className="font-heading text-2xl font-bold text-foreground transition-colors hover:text-primary-ink sm:text-3xl"
                    >
                      {champion.name}
                    </Link>
                  ) : (
                    <p className="font-heading text-2xl font-bold sm:text-3xl">{champion.name}</p>
                  )}

                  <p className="mt-1 text-sm text-foreground/75">
                    {champion.competitionId ? (
                      <Link
                        href={`/competitions/${champion.competitionId}`}
                        className="underline decoration-dotted underline-offset-2 transition-colors hover:text-primary-ink"
                      >
                        {champion.competitionName ?? '—'}
                      </Link>
                    ) : (
                      (champion.competitionName ?? '—')
                    )}
                  </p>

                  {champion.season != null && (
                    <p className="mt-1 text-xs text-foreground/60">
                      {c12.proofSeason}: {champion.season}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-xs text-foreground/60">
                    <span className="uppercase tracking-wide">{c12.proofSource}:</span>
                    {champion.sourceType && <span>{champion.sourceType}</span>}
                    {champion.sourceUrl && (
                      <a
                        href={champion.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-ink underline decoration-dotted underline-offset-2"
                      >
                        {dict.pages.champions.source}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-foreground/60">{c12.proofEmpty}</p>
              )}

              <p data-testid="hero-proof-disclaimer" className="mt-4 text-xs text-foreground/70">
                {c12.proofDisclaimer}
              </p>
            </article>

            {/* Prova quantitativa: contagens reais do acervo.
                Sem dado, NÃO renderiza três cartões com "—" (isso finge métrica e
                repete o defeito da hero antiga): declara a lacuna uma única vez. */}
            {hasTotals ? (
              <>
                <dl ref={statsRef} className="mt-6 grid grid-cols-3 gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="stat-item flex flex-col rounded-xl border border-border bg-[color-mix(in_oklab,var(--color-foreground)_4%,transparent)] px-3 py-4 text-center"
                    >
                      <dd className="font-heading text-2xl font-bold text-primary-ink sm:text-3xl">
                        {stat.value != null ? formatCount(stat.value, locale) : '—'}
                      </dd>
                      <dt className="mt-1 text-[11px] leading-tight text-[color-mix(in_oklab,var(--color-foreground)_70%,transparent)]">
                        {stat.label}
                      </dt>
                    </div>
                  ))}
                </dl>
                <p data-testid="hero-stats-note" className="mt-3 text-xs text-foreground/70">
                  {c12.statsProvenance}
                </p>
              </>
            ) : (
              <p
                data-testid="hero-stats-gap"
                className="mt-6 rounded-xl border border-dashed border-border bg-[color-mix(in_oklab,var(--color-foreground)_4%,transparent)] px-4 py-4 text-xs leading-relaxed text-foreground/60"
              >
                {c12.statsNoData}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fecho da dobra: régua de acento em vez de gradiente para o corpo claro —
          o gradiente criava uma faixa cinza suja quando as seções seguintes também
          são escuras. Fronteira nítida, sem costura. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden="true" />
    </section>
  );
}

/**
 * Seções seguintes da dobra — mantidas em camada escura para não quebrar o
 * contraste dos tokens, mas em Server-friendly estrutura: só o que anima é client.
 */
export function HomeFeatures() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLOListElement>(null);
  const { t, dict, locale } = useI18n();
  const c12 = wsC12Strings[locale];

  useGsapStagger(featuresRef, '.feature-card');
  useGsapStagger(howRef, '.how-step');

  return (
    <>
      <section className="bg-background py-16 text-foreground sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{c12.featuresTitle}</h2>
          <p className="mt-3 max-w-2xl text-foreground/70">{c12.featuresSubtitle}</p>

          <div ref={featuresRef} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dict.home.features.map((feat, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <article
                  key={feat.title}
                  className="feature-card rounded-xl border border-border bg-[color-mix(in_oklab,var(--color-foreground)_5%,transparent)] p-6 transition-colors duration-200 hover:border-primary/60"
                >
                  {/* Ícone EM LINHA com o título, em fluxo, sem tile arredondado:
                      o "quadradinho com ícone acima do h3" é o template genérico de
                      feature-card que o detector da skill `impeccable` marca como
                      tell de UI gerada por IA (regra `icon-tile-stack`). */}
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary-ink" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">{feat.title}</h3>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/75">{feat.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="theme-dark bg-[color-mix(in_oklab,var(--color-foreground)_4%,var(--color-background))] py-16 text-foreground sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{c12.howTitle}</h2>
          {/* Número grande acima do título era o mesmo tell, na variante "numbered step".
              A ordem virou: régua de acento → título → corpo, com o número como prefixo
              discreto em linha (semanticamente a lista já é ordenada por ser <ol>). */}
          <ol ref={howRef} className="mt-10 grid gap-6 md:grid-cols-3">
            {c12.howSteps.map((step, i) => (
              <li key={step.title} className="how-step border-t-2 border-primary/50 pt-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-sm font-bold text-secondary tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground/75">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

/** Fecho da página: CTA final (o "comando" do framework, depois da prova). */
export function HomeClosing() {
  const { locale } = useI18n();
  const c12 = wsC12Strings[locale];

  return (
    <section className="relative overflow-hidden bg-background py-16 text-foreground sm:py-20">
      <div className="theme-dark-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">{c12.closingTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-foreground/70">{c12.closingDesc}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/search"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-md transition duration-200 hover:opacity-90 hover:shadow-lg"
          >
            {c12.ctaPrimary}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-border px-7 py-3 text-base font-semibold transition duration-200 hover:border-primary hover:text-primary-ink"
          >
            {c12.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
