'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/i18n/Provider';
import { useGsapFadeIn, useGsapStagger } from '@/hooks/useGsap';
import FichaGlobe from '@/components/ficha/Globe';
import { FlagImage } from '@/components/CountryFlag';
import { formatCount } from '@/lib/format';

/**
 * A ABERTURA NO CONCEITO FICHA.
 *
 * O que estava errado antes: a home era a única superfície grande que NÃO tinha sido migrada
 * para o sistema — ela ainda era a composição do conceito anterior (cartão de prova + três
 * contadores + cards de recurso), enquanto o resto do site já usava a espinha da ficha. O
 * resultado é o que o Operador viu: o conceito FICHA existia, mas a primeira tela não se
 * parecia com ele em nada.
 *
 * O que este componente reproduz do quadro `home` de `design/concept/app/home.png`:
 *   · título display em duas linhas, a segunda em crimson — o acento é a manchete;
 *   · globo de linhas grande à direita (componente `Globe`, com projeção ortográfica real);
 *   · faixa de cinco números do acervo, sobre um fio de 2 px, cada um com o rótulo do que conta;
 *   · "O acervo é a interface": seis portas de entrada com bandeira, nome e contagem real;
 *   · a procedência no pé, em 11 px, declarando de onde vêm os totais.
 *
 * REGRAS QUE NÃO FORAM AFROUXADAS PARA "FICAR IGUAL AO DESENHO":
 *   · nenhum número é inventado. Se a API não responder, o valor vira "—" e a nota de
 *     procedência diz que a falha é lacuna declarada (o conceito usava um número ilustrativo
 *     para Lendas; aqui ele é omitido, porque "não sabemos" não pode virar "1.284");
 *   · o rótulo de seção não é eyebrow: é texto em caixa baixa, 12,5 px, sem tracking — a skill
 *     proíbe o molde "rótulo minúsculo em caixa alta acima de título";
 *   · o movimento é GSAP com fallback de 2 s e `prefers-reduced-motion` em JS (hook do repo).
 */

/** Totais do acervo exibidos na abertura. `null` = a origem não respondeu (lacuna declarada). */
export interface HomeTotals {
  clubs: number | null;
  players: number | null;
  competitions: number | null;
  matches: number | null;
  rankings: number | null;
  countries: number | null;
}

/** Uma porta de entrada do acervo. `count` null = sem contagem confiável; mostra a nota. */
interface Porta {
  key: string;
  href: string;
  title: string;
  count: number | null;
  note?: string;
  flag: string;
}

export default function HomeFicha({ totals }: { totals: HomeTotals }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { t, locale } = useI18n();
  useGsapFadeIn(heroRef, { y: 18 });
  useGsapStagger(listRef, 'li');

  const fmt = (v: number | null) => (v == null ? '—' : formatCount(v, locale));

  const faixa = [
    { key: 'clubs', label: t('home.stats.clubs'), value: totals.clubs },
    { key: 'players', label: t('home.stats.players'), value: totals.players },
    { key: 'competitions', label: t('home.stats.competitions'), value: totals.competitions },
    { key: 'matches', label: t('home.stats.matches'), value: totals.matches },
    { key: 'rankings', label: t('home.stats.rankings'), value: totals.rankings },
  ];

  const portas: Porta[] = [
    {
      key: 'clubs',
      href: '/clubs',
      title: t('home.explore.clubs'),
      count: totals.clubs,
      flag: 'BR',
    },
    {
      key: 'competitions',
      href: '/competitions',
      title: t('home.explore.competitions'),
      count: totals.competitions,
      flag: 'SE',
    },
    {
      key: 'players',
      href: '/players',
      title: t('home.explore.players'),
      count: totals.players,
      flag: 'AR',
    },
    {
      key: 'rankings',
      href: '/rankings',
      title: t('home.explore.rankings'),
      count: totals.rankings,
      flag: 'GB',
    },
    {
      key: 'legends',
      href: '/legends',
      title: t('home.explore.legends'),
      count: null,
      note: t('home.explore.legendsNote'),
      flag: 'PT',
    },
    {
      key: 'map',
      href: '/map',
      title: t('home.explore.map'),
      count: totals.countries,
      note: t('home.explore.mapNote'),
      flag: 'AU',
    },
  ];

  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate overflow-hidden bg-background text-foreground"
    >
      {/* O globo é a escala do acervo: sangra à direita, atrás do texto. Só no desktop; no
          mobile ele competiria com o título, e a hierarquia da dobra é o título. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 -right-24 hidden text-foreground select-none lg:block xl:right-0"
      >
        <FichaGlobe size={520} opacity={0.9} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-12 lg:px-8">
        <div ref={heroRef} className="lg:max-w-[56%]">
          <p data-testid="home-hero-kicker" className="text-[12.5px] font-semibold text-ink-3">
            {t('home.heroKicker')}
          </p>

          <h1
            id="home-title"
            className="mt-4 font-heading text-[42px] leading-[0.98] font-bold tracking-[-0.5px] text-balance sm:text-[54px] lg:text-[62px]"
          >
            <span className="block">{t('home.heroTitle')}</span>{' '}
            <span className="block text-primary">{t('home.heroTitleAccent')}</span>
          </h1>

          <p
            data-testid="home-hero-subtitle"
            className="mt-6 max-w-[560px] text-[15px] leading-[23px] text-ink-2"
          >
            {t('home.heroSubtitle')}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center gap-3 rounded-[2px] bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors duration-200 hover:bg-foreground/90"
            >
              {t('home.ctaSearch')}
              <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex min-h-12 items-center rounded-[2px] border-[1.5px] border-foreground px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/5"
            >
              {t('home.ctaRegister')}
            </Link>
          </div>
          {/* O conceito põe a saída discreta NUMA LINHA ABAIXO dos dois CTAs: ela não é uma
              terceira ação, é a promessa de que explorar não exige conta. */}
          <Link
            href="/search"
            data-testid="home-hero-explore-link"
            className="mt-3 inline-flex min-h-6 items-center text-[11px] font-medium text-ink-3 transition-colors duration-200 hover:text-foreground"
          >
            {t('home.exploreNoAccount')} →
          </Link>
        </div>

        {/* Faixa de números — o fio de 2 px é a régua do conceito, e o rótulo sempre acompanha
            o número (um "72" solto pode ser rankings, pontos ou edições). */}
        <dl
          data-testid="home-stats"
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t-2 border-foreground pt-4 sm:grid-cols-3 lg:max-w-[700px] lg:grid-cols-5"
        >
          {faixa.map((stat, i) => (
            <div key={stat.key} className="flex flex-col">
              <dt
                data-testid={`home-stat-label-${stat.key}`}
                className="order-2 mt-2 text-[12.5px] leading-tight text-ink-3"
              >
                {stat.label}
              </dt>
              <dd
                data-testid={`home-stat-${stat.key}`}
                className={`order-1 num text-2xl leading-none ${i === 0 ? 'text-primary' : 'text-foreground'}`}
              >
                {fmt(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Comece por onde quiser — a camada de exploração do conceito. */}
      <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <p data-testid="home-explore-label" className="text-[12.5px] font-semibold text-foreground">
          {t('home.explore.label')}
        </p>
        <h2
          data-testid="home-explore-title"
          className="mt-1 font-heading text-3xl font-bold tracking-[-0.5px] sm:text-[34px]"
        >
          {t('home.explore.title')}
        </h2>

        <ul
          ref={listRef}
          data-testid="home-explore"
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {portas.map((porta) => (
            <li key={porta.key} className="flex">
              <Link
                href={porta.href}
                data-testid={`home-porta-${porta.key}`}
                className="group flex min-h-20 w-full items-center gap-4 rounded-[2px] border border-border bg-surface px-4 py-4 transition-colors duration-200 hover:border-foreground focus-visible:border-foreground"
              >
                <FlagImage code={porta.flag} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    data-testid={`home-porta-title-${porta.key}`}
                    className="font-heading text-[15px] font-bold leading-tight"
                  >
                    {porta.title}
                  </span>
                  {porta.count != null ? (
                    <span
                      data-testid={`home-porta-count-${porta.key}`}
                      className="num text-[26px] leading-none text-primary"
                    >
                      {fmt(porta.count)}
                    </span>
                  ) : (
                    <span className="text-[12.5px] leading-tight text-ink-2">{porta.note}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p
          data-testid="home-stats-note"
          className="mt-8 max-w-[820px] text-[11px] leading-snug text-ink-3"
        >
          {t('home.statsNote')}
        </p>
      </div>
    </section>
  );
}
