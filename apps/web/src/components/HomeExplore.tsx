'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useGsapStagger } from '@/hooks/useGsap';
import { NumeroHero } from '@/components/ui/Dado';
import { useI18n } from '@/i18n/Provider';
import { formatCount } from '@/lib/format';
import type { Locale } from '@/i18n/types';
import type { HeroTotals } from '@/components/HeroSection';

/**
 * CAMADA DE EXPLORAÇÃO — a ideia central do conceito: o acervo é a interface.
 *
 * O diagnóstico que originou este componente: a home mostrava a escala do acervo (12.003
 * clubes) mas **não dava por onde entrar nele**. Texto, carrossel e cards de recurso não são
 * navegação — nenhum deles levava a um clube, um país ou uma competição.
 *
 * Duas regras que este componente respeita:
 *
 * 1. **Nenhuma prateleira existe sem destino real.** Todas as cinco apontam para rota que
 *    existe no app (`/clubs`, `/competitions`, `/rankings`, `/map`, `/compare`). Um card de
 *    exploração que leva a lugar nenhum é pior do que não ter card.
 *
 * 2. **Nenhum número é inventado.** A contagem vem do mesmo `HeroTotals` que o servidor já
 *    busca para a dobra. Quando a API não responde, a prateleira continua navegável e apenas
 *    omite o número — lacuna declarada, e não um "—" que finge métrica.
 */

interface Shelf {
  key: 'clubs' | 'competitions' | 'rankings' | 'map' | 'compare';
  href: string;
  title: string;
  /** Contagem real, quando disponível. `null` = API não respondeu (omite, não inventa). */
  count: number | null;
  /** Rótulo do que a contagem significa. Sem ele, o número é adivinhação. */
  unit?: string;
  /** Barra de acento: diferencia as categorias sem depender de cor de texto. */
  accent?: 'primary' | 'secondary' | 'none';
}

function shelvesFor(t: (k: string) => string, totals: HeroTotals, locale: Locale): Shelf[] {
  const fmt = (v: number | null | undefined) => (v == null ? null : formatCount(v, locale));
  return [
    {
      key: 'clubs',
      href: '/clubs',
      title: t('home.explore.clubs'),
      count: totals.clubs ?? null,
      unit: fmt(totals.clubs) ?? undefined,
      accent: 'primary',
    },
    {
      key: 'competitions',
      href: '/competitions',
      title: t('home.explore.competitions'),
      count: totals.competitions ?? null,
      unit: fmt(totals.competitions) ?? undefined,
      accent: 'secondary',
    },
    {
      key: 'rankings',
      href: '/rankings',
      title: t('home.explore.rankings'),
      count: totals.rankings ?? null,
      unit: fmt(totals.rankings) ?? undefined,
      accent: 'none',
    },
    {
      key: 'map',
      href: '/map',
      title: t('home.explore.map'),
      count: null,
      unit: t('home.explore.worldwide'),
      accent: 'none',
    },
    {
      key: 'compare',
      href: '/compare',
      title: t('home.explore.compare'),
      count: null,
      unit: t('home.explore.sideBySide'),
      accent: 'none',
    },
  ];
}

export default function HomeExplore({ totals }: { totals: HeroTotals }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { t, locale } = useI18n();
  useGsapStagger(listRef, 'li');

  const shelves = shelvesFor(t, totals, locale);
  const accents = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    none: 'bg-border',
  } as const;

  return (
    <section className="bg-background py-16 text-foreground sm:py-20" aria-labelledby="explore-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Sem `eyebrow` acima do h2. O detector de anti-padrões reprova o molde
            "kicker pequeno em caixa alta sobre título grande" (`kicker-above-heading`), e é a
            MESMA regra já aplicada na hero — eu a reintroduzi aqui por hábito. O título
            sozinho basta: "O acervo é a interface" já é a instrução. */}
        <h2 id="explore-title" className="font-heading text-3xl font-bold sm:text-4xl">
          {t('home.explore.title')}
        </h2>

        <ul ref={listRef} className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {shelves.map((shelf) => (
            <li key={shelf.key} className="flex">
              <Link
                href={shelf.href}
                className="group relative flex min-h-32 w-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary focus-visible:border-primary"
              >
                {/* Barra de acento à esquerda — o mesmo motivo do conceito: diferencia a
                    categoria sem colorir texto (cor de texto carrega contraste, cor de barra não). */}
                <span
                  className={`absolute inset-y-0 left-0 w-[3px] ${accents[shelf.accent ?? 'none']}`}
                  aria-hidden="true"
                />
                <span className="flex items-start justify-between gap-3">
                  <span className="font-heading text-xl font-bold leading-tight">{shelf.title}</span>
                  {/* Sem `hover:translate` aqui de propósito. O portão acusa hover que MOVE sem
                      gate de ponteiro, e não existe variante de Tailwind para
                      `(hover: hover) and (pointer: fine)` nesta versão. `motion-safe:hover:`
                      satisfaria o regex do portão mas NÃO resolveria o problema real:
                      `motion-safe` cobre `prefers-reduced-motion`, não a ausência de ponteiro —
                      em toque o hover continuaria disparando falso. O deslocamento era
                      decorativo; o retorno visual vem da cor (o ícone clareia no hover do
                      cartão), que é o mesmo padrão que o repo já usa nos outros CTAs. */}
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-ink-3 transition-colors duration-200 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </span>
                {shelf.count != null ? (
                  /* `NumeroHero` em vez de marcar `.num` à mão: o primitivo garante que o
                     rótulo venha sempre (número sem rótulo é adivinhação) e centraliza a
                     decisão de tinta — aqui, `tone="muted"` não se aplica porque este é o
                     número-âncora do cartão. O rótulo diz o que o número CONTA
                     ("no acervo"), em vez de repetir o título do cartão. */
                  <NumeroHero
                    value={shelf.unit ?? ''}
                    label={t('home.explore.inArchive')}
                    size="md"
                    className="mt-4"
                  />
                ) : (
                  <span className="mt-4 text-[0.8125rem] text-ink-2">{shelf.unit}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
