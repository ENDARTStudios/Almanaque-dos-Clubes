'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { wsC12Strings } from '@/i18n/wsC12';

/**
 * T568 — CARROSSEL DE CAMPEÕES NA HERO: mundial + continentais.
 *
 * O QUE O OPERADOR PEDIU: "na hero, em 'Campeão Vigente no Acervo' deve destacar os campeões
 * mundiais vigentes e os campeões continentais, de modo que um carrossel".
 *
 * O que havia: a hero mostrava UM campeão só — o primeiro com proveniência na lista — e nada
 * distinguia se era mundial ou continental. A dimensão mais interessante do dado (o mundial ao
 * lado dos continentais) ficava invisível, e o carrossel completo vivia lá embaixo, separado da
 * dobra.
 *
 * TRÊS DECISÕES QUE NÃO SÃO DE ESTILO
 *
 * 1. **A hierarquia é ROTULADA, não inferida.** Cada slide diz "Mundial" ou "Continental". Sem o
 *    rótulo, o usuário veria "Real Madrid" e "Flamengo" lado a lado sem saber que estão em
 *    patamares diferentes — e concluiria que o acervo confunde as duas coisas.
 *
 * 2. **PREFS-REDUCED-MOTION NÃO TEM AUTOPLAY.** A rotação automática é enfeite; quem pediu menos
 *    movimento recebe o primeiro slide parado e navega pelos controles. A régua de movimento do
 *    projeto exige isso, e o portão `ui:audit:ci` acusa autoplay sem o gate.
 *
 * 3. **O avanço automático PAUSA em foco e hover.** Trocar o conteúdo embaixo do cursor de quem
 *    está lendo é hostil — e quem navega por teclado perderia o item focado no meio da leitura.
 *
 * A acessibilidade segue o padrão de carrossel: `aria-roledescription="carrossel"`, cada slide é
 * um `group` com `aria-roledescription="slide"` e rótulo "N de M", e a região é `aria-live="polite"`
 * — mas só quando o autoplay está LIGADO, porque com autoplay desligado a mudança é do usuário e
 * anunciar seria redundante.
 */

export interface HeroChampion {
  name: string;
  clubId: string | null;
  competitionName: string | null;
  competitionId: string | null;
  season: number | null;
  hierarchy: string;
  sourceUrl: string | null;
}

/** Quanto tempo cada slide fica. Lento o bastante para ler o nome e a competição. */
const INTERVALO_MS = 6000;

export default function HeroChampionCarousel({ champions }: { champions: HeroChampion[] }) {
  const { locale } = useI18n();
  const s12 = wsC12Strings[locale].carousel;
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);
  const regiaoRef = useRef<HTMLDivElement>(null);

  const total = champions.length;

  /* O gate de movimento é lido no cliente: `prefers-reduced-motion` é decisão do sistema
     operacional do usuário e não existe no servidor. Enquanto não é lido, não há autoplay —
     começar a animar e parar depois seria pior que não começar. */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setMovimentoReduzido(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  const avancar = useCallback(() => setAtual((a) => (a + 1) % total), [total]);
  const voltar = useCallback(() => setAtual((a) => (a - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1 || movimentoReduzido || pausado) return;
    const id = setInterval(avancar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [total, movimentoReduzido, pausado, avancar]);

  if (total === 0) return null;

  const c = champions[atual];
  if (!c) return null;

  const rotuloHierarquia = (h: string): string =>
    h === 'mundial' ? s12.tierWorld : h === 'continental' ? s12.tierContinental : s12.tierOther;

  const autoplay = total > 1 && !movimentoReduzido;

  return (
    <div
      ref={regiaoRef}
      role="group"
      aria-roledescription={s12.carouselRole}
      aria-label={s12.carouselLabel}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      data-testid="hero-champion-carousel"
      className="min-h-[7.5rem]"
    >
      <div
        /* `aria-live` só com autoplay: com ele desligado a troca é do usuário, e anunciar o que
           ele mesmo pediu é ruído para quem usa leitor de tela. */
        {...(autoplay ? { 'aria-live': 'polite' as const } : {})}
        role="group"
        aria-roledescription={s12.slideRole}
        aria-label={`${atual + 1} ${s12.of} ${total}`}
        data-testid="hero-champion-slide"
      >
        {/* O PATAMAR, declarado antes do nome: é o que separa um mundial de um continental. */}
        <p
          className="eyebrow text-secondary mb-1"
          data-testid="hero-champion-tier"
          data-tier={c.hierarchy}
        >
          {rotuloHierarquia(c.hierarchy)}
          {c.season ? ` · ${c.season}` : ''}
        </p>

        <p
          className="text-lg font-heading font-bold text-foreground"
          data-testid="hero-champion-name"
        >
          {c.clubId ? (
            <Link
              href={`/clubs/${c.clubId}`}
              className="underline decoration-dotted underline-offset-4 transition-colors duration-200 hover:text-primary-ink"
            >
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </p>

        {c.competitionName ? (
          <p className="text-sm text-ink-2" data-testid="hero-champion-competition">
            {c.competitionId ? (
              <Link
                href={`/competitions/${c.competitionId}`}
                className="transition-colors duration-200 hover:text-primary-ink"
              >
                {c.competitionName}
              </Link>
            ) : (
              c.competitionName
            )}
          </p>
        ) : null}

        {/* A FONTE, sempre. A hero não exibe prova sem origem — regra que já valia para o campeão
            único e continua valendo para cada slide. */}
        {c.sourceUrl ? (
          <a
            href={c.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[0.6875rem] text-ink-3 underline decoration-dotted underline-offset-2"
            data-testid="hero-champion-source"
          >
            {s12.source}
          </a>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={voltar}
            aria-label={s12.prev}
            data-testid="hero-champion-prev"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm text-foreground transition-colors duration-200 hover:border-primary"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={avancar}
            aria-label={s12.next}
            data-testid="hero-champion-next"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm text-foreground transition-colors duration-200 hover:border-primary"
          >
            <span aria-hidden="true">›</span>
          </button>

          {/* Pontos: mostram QUANTOS campeões existem, o que os botões sozinhos não dizem. */}
          <ul className="flex items-center gap-1.5" data-testid="hero-champion-dots">
            {champions.map((ch, i) => (
              <li key={`${ch.clubId ?? ch.name}-${ch.hierarchy}-${i}`}>
                <button
                  type="button"
                  onClick={() => setAtual(i)}
                  aria-label={`${i + 1} ${s12.of} ${total}`}
                  aria-current={i === atual ? 'true' : undefined}
                  data-testid={`hero-champion-dot-${i}`}
                  className={`block h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                    i === atual ? 'bg-primary-ink' : 'bg-border'
                  }`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
