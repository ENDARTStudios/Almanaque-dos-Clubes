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
} from 'lucide-react';
import { useGsapFadeIn, useGsapStagger } from '@/hooks/useGsap';
import { useI18n } from '@/i18n/Provider';
import { wsC12Strings } from '@/i18n/wsC12';
import { formatCount } from '@/lib/format';
import HeroChampionCarousel, { type HeroChampion } from './HeroChampionCarousel';

const featureIcons = [BookOpen, Trophy, SearchIcon, Brain, BarChart3, Globe];

// WS-C-12 — totais vindos do Server Component (page.tsx), buscados na API com
// revalidate. null = API indisponível -> lacuna declarada (nunca inventar).
export interface HeroTotals {
  clubs: number | null;
  competitions: number | null;
  rankings: number | null;
}

// Campeão vigente com proveniência (GET /champions/carousel) — a "Prova" da hero.
export type { HeroChampion } from './HeroChampionCarousel';

export default function HeroSection({
  initialTotals,
  champions = [],
}: {
  initialTotals?: HeroTotals;
  champions?: HeroChampion[];
}) {
  const heroRef = useRef<HTMLElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDListElement>(null);
  const { t, locale } = useI18n();
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
      {/* As três camadas decorativas (`theme-dark-glow`/`-grid`/`-grain`) foram REMOVIDAS na
          inversão para o tema claro. Elas eram um gradiente quente e um grão desenhados para
          somar luz sobre fundo quase-preto; sobre papel claro o mesmo gradiente vira MANCHA, e
          a grade de campo vira sujeira. Em fundo claro a hierarquia vem de espaço e de sombra,
          não de camada — foi o que a prancha do conceito mostrou (ver docs/conceito-claro). */}

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

            <p data-testid="hero-promise" className="mt-6 max-w-xl text-lg text-ink-2 text-balance">
              <span className="font-semibold text-foreground">{c12.eyebrow}</span>{' '}
              {c12.promise}
            </p>

            <p
              data-testid="hero-promise-note"
              className="mt-3 max-w-xl border-l-2 border-primary/60 pl-3 text-sm text-ink-2"
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

            <p data-testid="hero-cta-note" className="mt-3 text-sm text-ink-2">
              {c12.ctaPrimaryNote}
            </p>
          </div>

          {/* ---- Prova: campeão vigente com fonte --------------------------- */}
          <div ref={proofRef}>
            <article className="rounded-2xl border border-border bg-surface-2 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                {/* Rótulo-selo em VINHO, não em ouro. Motivo medido: o ouro da paleta
                    (`#94600a`) rende 4,44:1 sobre o `surface-2` deste cartão, e 11px em caixa
                    alta é texto NORMAL — reprova em AA. O vinho rende 6,99:1 no mesmo fundo e
                    mantém o rótulo dentro da família de acento. */}
                <p
                  data-testid="hero-proof-label"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-ink"
                >
                  {c12.proofTitle}
                </p>
                <Trophy className="h-6 w-6 text-primary-ink" aria-hidden="true" />
              </div>

              {champions.length > 0 ? (
                <div className="mt-4">
                  {/* T568 — carrossel de campeões: mundial E continentais.
                      Antes esta área mostrava UM campeão só, e nada dizia se era mundial ou
                      continental — a dimensão mais interessante do dado ficava invisível. */}
                  <HeroChampionCarousel champions={champions} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-2">{c12.proofEmpty}</p>
              )}

              <p data-testid="hero-proof-disclaimer" className="mt-4 text-xs text-ink-2">
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
                      className="stat-item flex flex-col rounded-xl border border-border bg-surface px-4 py-4"
                    >
                      {/* Base do conceito: número em `.num` (Barlow Condensed + numeral tabular)
                          e SEMPRE com o rótulo embaixo. Duas mudanças deliberadas em relação à
                          versão anterior: a tinta saiu de `text-primary-ink` para
                          `text-foreground` (o vermelho da marca fica reservado a CTA e estado —
                          usado em número, ele deixava de significar "aja aqui"), e o
                          alinhamento saiu do centro para a esquerda, que é o que permite
                          comparar três números em coluna. */}
                      {/* Número em VINHO, como na prancha do conceito: é o destaque editorial
                          do dado, e o acento é o que o faz destacar sem precisar de corpo maior. */}
                      <dd className="num text-3xl leading-none text-primary-ink">
                        {stat.value != null ? formatCount(stat.value, locale) : '—'}
                      </dd>
                      <dt className="mt-2 text-[0.8125rem] leading-tight text-ink-2">{stat.label}</dt>
                    </div>
                  ))}
                </dl>
                <p data-testid="hero-stats-note" className="mt-3 text-xs text-ink-2">
                  {c12.statsProvenance}
                </p>
              </>
            ) : (
              <p
                data-testid="hero-stats-gap"
                className="mt-6 rounded-xl border border-dashed border-border bg-surface px-4 py-4 text-xs leading-relaxed text-ink-2"
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
  const { dict, locale } = useI18n();
  const c12 = wsC12Strings[locale];

  useGsapStagger(featuresRef, '.feature-card');
  useGsapStagger(howRef, '.how-step');

  return (
    <>
      <section className="bg-background py-16 text-foreground sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{c12.featuresTitle}</h2>
          <p className="mt-3 max-w-2xl text-ink-2">{c12.featuresSubtitle}</p>

          <div ref={featuresRef} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dict.home.features.map((feat, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <article
                  key={feat.title}
                  className="feature-card rounded-xl border border-border bg-surface-2 p-6 transition-colors duration-200 hover:border-primary/60"
                >
                  {/* Ícone EM LINHA com o título, em fluxo, sem tile arredondado:
                      o "quadradinho com ícone acima do h3" é o template genérico de
                      feature-card que o detector da skill `impeccable` marca como
                      tell de UI gerada por IA (regra `icon-tile-stack`). */}
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary-ink" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">{feat.title}</h3>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{feat.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Faixa de "como funciona" — `bg-muted` é o degrau NEUTRO quente (o mesmo papel que
          `surface-2` cumpre nos cartões). Antes esta seção forçava `.theme-dark` e um
          `color-mix` para criar contraste; com o claro como padrão, a faixa tonal já resolve:
          `muted` é mais escuro que o papel e separa a seção sem precisar de tema próprio. */}
      <section className="bg-muted py-16 text-foreground sm:py-20">
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
                <p className="mt-2.5 text-sm leading-relaxed text-ink-2">{step.desc}</p>
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
      {/* Última camada escura removida. Em fundo claro o "fecho dramático" vem do CTA e do
          espaço em volta, não de um gradiente — que aqui viraria mancha, não luz. */}
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">{c12.closingTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-2">{c12.closingDesc}</p>
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
