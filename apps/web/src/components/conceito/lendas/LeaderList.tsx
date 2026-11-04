import Link from 'next/link';
import { Trophy } from '@/components/ficha/Metal';
import type { Locale } from '@/i18n/config';
import type { ConceitoLendasStrings } from '@/i18n/wsConceitoLendas';
import { formatCount } from '@/lib/format';
import LendasSectionHeading from './SectionHeading';
import type { CompetitionLeaderItem } from './types';

/**
 * LISTA DENSA "LÍDERES POR COMPETIÇÃO" — a lista de posição do quadro (a que era "Maiores
 * jogadores").
 *
 * O payload NÃO tem jogadores: tem uma competição e o clube que mais venceu nela. Então a
 * linha é honesta com o que existe — nome da competição (link real), último título do líder
 * (ou "—") e, à direita, líder + nº de títulos. A "posição" é a ordem que a API já devolve
 * (competições com mais títulos auditáveis), não uma nota inventada. O fio de 1 px entre as
 * linhas é o do conceito; o círculo com a taça substitui o retrato que não temos, sem fingir
 * que existe uma foto.
 */
export default function LeaderList({
  items,
  locale,
  t,
}: {
  items: CompetitionLeaderItem[];
  locale: Locale;
  t: ConceitoLendasStrings;
}) {
  return (
    <section aria-labelledby="lendas-lideres-title" className="mt-10">
      <LendasSectionHeading id="lendas-lideres-title">{t.leaders.heading}</LendasSectionHeading>
      <ul
        data-testid="lendas-leaders"
        aria-label={t.leaders.listLabel}
        className="mt-3 max-w-[51.25rem]"
      >
        {items.map((item, index) => {
          const position = index + 1;
          const competitionName = item.competitionName ?? item.competitionId;
          return (
            <li
              key={item.competitionId}
              data-testid="lendas-leader-row"
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 border-b border-border py-3 sm:grid-cols-[3.5rem_22rem_minmax(0,1fr)]"
            >
              <span className="num text-[26px] leading-none text-ink-3 sm:text-[30px]">
                {position}
              </span>

              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
                >
                  <Trophy size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[18px] leading-tight font-bold text-foreground sm:text-[22px]">
                    <Link
                      href={`/competitions/${item.competitionId}`}
                      className="inline-flex min-h-6 items-center transition-colors duration-200 hover:text-primary-ink"
                    >
                      {competitionName}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
                    {t.leaders.lastTitleLabel}:{' '}
                    {item.lastTitleYear === null ? '—' : item.lastTitleYear}
                  </p>
                </div>
              </div>

              <div className="col-start-2 mt-2 min-w-0 text-[12px] leading-snug text-ink-2 sm:col-start-3 sm:mt-0">
                <span className="text-[11px] text-ink-3">{t.leaders.leaderLabel}: </span>
                <Link
                  href={`/clubs/${item.leaderClubId}`}
                  className="inline-flex min-h-6 items-center font-semibold text-foreground underline decoration-border decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-primary-ink"
                >
                  {item.leaderClubName}
                </Link>
                <span className="text-ink-3"> · </span>
                <span className="num text-[14px] text-foreground">
                  {formatCount(item.titles, locale)}
                </span>{' '}
                <span className="text-[11px] text-ink-3">{t.leaders.titlesUnit}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
