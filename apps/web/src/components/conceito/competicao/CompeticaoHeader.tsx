import type { ReactNode } from 'react';
import FichaHead from '@/components/ficha/FichaHead';
import { CountryFlag } from '@/components/CountryFlag';
import { TrophyCup } from '@/components/icons';
import type { Locale } from '@/i18n/config';

/**
 * CABEÇALHO da ficha da competição — a primeira dobra do quadro `app/tabela.png`.
 *
 * ── ORDEM DO QUADRO ─────────────────────────────────────────────────────────────────────────
 * kicker ("Competição · país") · h1 display · número-âncora (rodadas da tabela catalogada ou
 * edições do acervo) com rótulo · subtítulo. O cabeçalho é o MESMO em todas as abas; o que muda
 * abaixo é o painel.
 *
 * ── O QUE NÃO É INVENTADO ──────────────────────────────────────────────────────────────────
 * O quadro desenha "38 / RODADAS · 2024-25". O número sai da ÚLTIMA temporada com tabela
 * catalogada (maior nº de jogos por clube) e o rótulo nomeia essa temporada; sem tabela, a
 * âncora cai para as edições catalogadas, que também são dado — e sem nenhuma das duas o
 * cabeçalho não abre âncora (número que não foi verificado não vira manchete).
 *
 * ── TROFÉU ─────────────────────────────────────────────────────────────────────────────────
 * Preservado do cabeçalho anterior: imagem oficial quando existe; senão a taça autoral com as
 * iniciais do nome e a DECLARAÇÃO de que é ilustração (o desenho nunca se passa pelo troféu
 * oficial). Os `data-testid` antigos continuam os mesmos.
 */
export interface CompeticaoHeaderProps {
  locale: Locale;
  /** Kicker já composto: "Competição · Itália". */
  kicker: string;
  name: string;
  subtitle: string;
  /** Número-âncora; ausente = sem número verificado. */
  anchor?: string;
  anchorLabel?: string;
  countryCode: string | null;
  /** Rótulo de competição internacional, do dicionário da página. */
  internationalLabel: string;
  genderLabel: string | null;
  levelLabel: string | null;
  trophyImageUrl: string | null;
  /** Declaração de ilustração quando não há imagem oficial. */
  trophyIllustrationNote: string | null;
  /** Ações reais da página (favoritar). */
  actions?: ReactNode;
  /** Site oficial e redes sociais (preservado). */
  social?: ReactNode;
}

const META_CHIP =
  'inline-flex min-h-6 items-center rounded-[2px] border border-border bg-surface px-2 text-[11px] leading-none text-ink-2';

export default function CompeticaoHeader({
  locale,
  kicker,
  name,
  subtitle,
  anchor,
  anchorLabel,
  countryCode,
  internationalLabel,
  genderLabel,
  levelLabel,
  trophyImageUrl,
  trophyIllustrationNote,
  actions,
  social,
}: CompeticaoHeaderProps) {
  return (
    <header data-testid="competicao-header">
      <p
        data-testid="competicao-kicker"
        className="text-[11px] font-semibold uppercase leading-none tracking-[0.2em] text-ink-3"
      >
        {kicker}
      </p>

      <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <FichaHead
            title={name}
            subtitle={subtitle}
            anchor={anchor}
            anchorLabel={anchorLabel}
            actions={actions}
          />

          {/* Identificação — o que a fonte publica sobre o recorte, em metadado de 11px. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {countryCode ? (
              <CountryFlag
                code={countryCode}
                locale={locale}
                basePath="/competitions"
                destination="competitions"
                className="rounded-[2px] border border-border bg-surface px-2 text-[11px]"
              />
            ) : (
              <span className={META_CHIP}>{internationalLabel}</span>
            )}
            {genderLabel ? <span className={META_CHIP}>{genderLabel}</span> : null}
            {levelLabel ? <span className={META_CHIP}>{levelLabel}</span> : null}
          </div>
        </div>

        {/* Troféu: imagem oficial (quando há) ou a taça autoral DECLARADA como ilustração. */}
        <figure className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          {trophyImageUrl ? (
            <span
              data-testid="competition-trophy"
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[2px] border border-border bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trophyImageUrl}
                alt=""
                className="h-16 w-16 object-contain"
                loading="lazy"
              />
            </span>
          ) : (
            <span
              data-testid="competition-trophy-illustration"
              className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-[2px] border border-border bg-muted text-primary-ink"
              aria-hidden="true"
            >
              <TrophyCup size={30} />
              <span className="font-heading text-sm font-bold leading-none">
                {name.slice(0, 2).toUpperCase()}
              </span>
            </span>
          )}
          {!trophyImageUrl && trophyIllustrationNote ? (
            <figcaption
              data-testid="competition-trophy-note"
              className="max-w-[14rem] text-[11px] leading-snug text-ink-3 lg:text-right"
            >
              {trophyIllustrationNote}
            </figcaption>
          ) : null}
        </figure>
      </div>

      {social ? <div className="mt-5">{social}</div> : null}
    </header>
  );
}
