import Link from 'next/link';
import CountryFlag from '@/components/CountryFlag';
import type { Locale } from '@/i18n/config';
import type { ConceitoLendasStrings } from '@/i18n/wsConceitoLendas';
import { formatCount } from '@/lib/format';
import LendasSectionHeading from './SectionHeading';
import type { TopChampionItem } from './types';

/**
 * CARTÕES DE "MAIORES CAMPEÕES" — o bloco "Maiores clubes" do quadro.
 *
 * O que é REAL: clube, país, nº de títulos auditáveis e ano do último título (quando a
 * fonte traz). O que o quadro desenha e NÃO existe no payload — "desde 1902" (fundação) —
 * não é inventado: a linha de apoio mostra o último título, que é o dado que a API entrega,
 * ou "—" quando a fonte não informa o ano.
 *
 * Sem retrato/badge inventado: a bandeira vem do mesmo componente `CountryFlag` do resto do
 * site. O lugar no ranking é número, não cor sozinha: ouro/prata/bronze nos três primeiros
 * (tokens de metal do tema escuro), cinza nos demais.
 */
function positionClass(position: number): string {
  if (position === 1) return 'text-[color:var(--color-metal-ouro)]';
  if (position === 2) return 'text-[color:var(--color-metal-prata)]';
  if (position === 3) return 'text-[color:var(--color-metal-bronze)]';
  return 'text-ink-3';
}

export default function ChampionCards({
  items,
  locale,
  t,
}: {
  items: TopChampionItem[];
  locale: Locale;
  t: ConceitoLendasStrings;
}) {
  return (
    <section aria-labelledby="lendas-campeoes-title" className="mt-10">
      <LendasSectionHeading id="lendas-campeoes-title">{t.champions.heading}</LendasSectionHeading>
      <ul
        data-testid="lendas-champions"
        aria-label={t.champions.listLabel}
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
      >
        {items.map((item, index) => {
          const position = index + 1;
          return (
            <li key={item.clubId} className="min-w-0">
              <article className="flex h-full min-h-[104px] flex-col justify-between rounded-[2px] border border-border bg-surface p-3.5">
                <div>
                  <p className={`num text-[18px] leading-none ${positionClass(position)}`}>
                    {position}
                  </p>
                  <h3 className="mt-2 font-heading text-[15px] leading-[1.1] font-bold text-foreground sm:text-[16px]">
                    <Link
                      href={`/clubs/${item.clubId}`}
                      className="inline-flex min-h-6 items-center transition-colors duration-200 hover:text-primary-ink"
                    >
                      {item.clubName}
                    </Link>
                  </h3>
                  <p className="mt-1 text-[12px] leading-snug font-semibold text-primary-ink">
                    {formatCount(item.titles, locale)} {t.champions.titlesUnit}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-[11px] leading-snug text-ink-3">
                  <CountryFlag
                    code={item.country}
                    locale={locale}
                    showName
                    className="text-[11px]"
                  />
                  <span>
                    {t.champions.lastTitleLabel}:{' '}
                    {item.lastTitleYear === null ? '—' : item.lastTitleYear}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
