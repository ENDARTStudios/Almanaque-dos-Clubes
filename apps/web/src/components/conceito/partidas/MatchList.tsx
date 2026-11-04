import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ClubCrest } from '@/components/MediaAssets';
import type { Locale } from '@/i18n/config';
import type { MatchRowData } from './types';

/**
 * LISTA DE PARTIDAS do conceito FICHA.
 *
 * O quadro `partidas` desenha cada jogo como uma LINHA de confronto — data/rodada à esquerda,
 * os dois clubes com placar no centro e a ação à direita —, não como tabela de colunas. Aqui a
 * linha não inteira é um link (os nomes de clube já são links); a ação "ver partida" é um alvo
 * próprio, de 24px+, no fim da linha.
 *
 * O que o desenho tem e a API não publica: posse, finalizações e escanteios por partida. Essas
 * colunas NÃO existem aqui — a nota da página declara o motivo, em vez de inventar número.
 */
const INTL: Record<Locale, string> = {
  'pt-br': 'pt-BR',
  'en-us': 'en-GB',
  'es-es': 'es-ES',
};

function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(INTL[locale] ?? 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Confronto({
  match,
  joiner,
  noScore,
}: {
  match: MatchRowData;
  joiner: string;
  noScore: string;
}) {
  const { homeClub, awayClub, homeScore, awayScore } = match;
  const temPlacar = homeScore != null && awayScore != null;
  return (
    <span
      data-testid="conceito-partida-confronto"
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      {homeClub ? <ClubCrest logoUrl={homeClub.logoUrl} name={homeClub.name} size={24} /> : null}
      {homeClub ? (
        <Link href={`/clubs/${homeClub.id}`} className="text-primary-ink hover:underline">
          {homeClub.name}
        </Link>
      ) : (
        <span className="text-ink-3">—</span>
      )}
      {temPlacar ? (
        <>
          <span className="num text-base font-bold tabular-nums">{homeScore}</span>
          <span aria-hidden="true" className="text-ink-3">
            ×
          </span>
          <span className="sr-only">{joiner}</span>
          <span className="num text-base font-bold tabular-nums">{awayScore}</span>
        </>
      ) : (
        <span className="text-ink-3">{noScore}</span>
      )}
      {awayClub ? (
        <Link href={`/clubs/${awayClub.id}`} className="text-primary-ink hover:underline">
          {awayClub.name}
        </Link>
      ) : (
        <span className="text-ink-3">—</span>
      )}
      {awayClub ? <ClubCrest logoUrl={awayClub.logoUrl} name={awayClub.name} size={24} /> : null}
    </span>
  );
}

export default function MatchList({
  rows,
  locale,
  openLabel,
  scoreJoiner,
  noScore,
  dataLabel,
}: {
  rows: MatchRowData[];
  locale: Locale;
  /** Nome acessível do link "ver partida". */
  openLabel: string;
  /** Conjunção lida pelo leitor de tela no lugar do "×". */
  scoreJoiner: string;
  /** Lacuna declarada quando falta um dos placares. */
  noScore: string;
  /** Rótulo do bloco de resultados (aria-label). */
  dataLabel: string;
}) {
  return (
    <ol data-testid="conceito-partidas-list" aria-label={dataLabel} className="mt-2 list-none p-0">
      {rows.map((m) => {
        const confronto = `${m.homeClub?.name ?? '—'} ${m.homeScore ?? ''} x ${m.awayScore ?? ''} ${m.awayClub?.name ?? '—'}`;
        return (
          <li
            key={m.id}
            data-testid="conceito-partida-row"
            className="flex items-start gap-3 border-b border-border py-3 text-[13px] sm:gap-5"
          >
            <div className="w-[70px] shrink-0 text-[11px] leading-tight text-ink-3 sm:w-[84px]">
              <div className="tabular-nums">{formatDate(m.date, locale)}</div>
              {m.round ? <div className="mt-0.5">{m.round}</div> : null}
            </div>
            <div className="min-w-0 flex-1">
              <Confronto match={m} joiner={scoreJoiner} noScore={noScore} />
              <p className="mt-1 text-[11px] leading-tight text-ink-3">
                {[m.competition?.name, m.season?.name].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <Link
              href={`/matches/${m.id}`}
              aria-label={`${openLabel}: ${confronto}`}
              className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-[2px] text-ink-3 transition-colors duration-200 hover:text-primary-ink"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
