/**
 * Pódio da competição — extraído da página para poder ser testado.
 *
 * ── POR QUE UM COMPONENTE, E NÃO UM BLOCO DE JSX DENTRO DA PÁGINA ───────────────────────────
 * O pódio morava inline em `app/competitions/[id]/page.tsx`, dentro de um Server Component de
 * 1.307 linhas. Consequências medidas:
 *
 *   · não tinha teste — nenhum arquivo tocava em `podium-runner-up` ou `podium-third`;
 *   · o bronze estava pintado com `text-secondary`, que é OURO, e nada avisou;
 *   · prata era `text-ink-2`, um cinza de texto, não um metal.
 *
 * Um bloco que não pode ser renderizado sozinho não pode ser verificado sozinho. Extrair é o que
 * torna o teste possível — e o bug do bronze só apareceu porque olhei o componente de perto.
 *
 * ── A REGRA DE METAL ────────────────────────────────────────────────────────────────────────
 * A cor do OBJETO e a cor da PALAVRA não são a mesma (ver `ficha/Metal.tsx`), e a FORMA carrega a
 * colocação: ouro tem disco cheio + anel, prata tem disco vazado, bronze tem disco menor. Em
 * preto e branco o pódio continua legível.
 *
 * ── LACUNA HONESTA ──────────────────────────────────────────────────────────────────────────
 * Copa sem 3º lugar catalogado não renderiza o slot. Um pódio de dois lugares é a verdade do
 * acervo; inventar o terceiro seria mentira com cara de dado.
 */
import Link from 'next/link';
import { Medal } from './Metal';

export interface PodiumClub {
  clubId: string | null;
  clubName: string;
}

export interface CompetitionPodiumProps {
  podium: {
    champion: PodiumClub | null;
    runnerUp: PodiumClub | null;
    third: PodiumClub | null;
  };
  /** Textos, já traduzidos. O componente não fala com o dicionário. */
  labels: {
    champion: string;
    runnerUp: string;
    third: string;
    empty: string;
    lastEdition: (year: number) => string;
    medalSilverNote: string;
    medalBronzeNote: string;
  };
  lastEditionYear?: number | null;
  /** Imagem oficial do troféu, quando o acervo tem uma licenciada. */
  trophyImageUrl?: string | null;
}

function Slot({
  club,
  label,
  metal,
  note,
}: {
  club: PodiumClub;
  label: string;
  metal: 'prata' | 'bronze';
  note: string;
}) {
  return (
    <article
      className="rounded-lg border border-border bg-background p-4"
      data-testid={metal === 'prata' ? 'podium-runner-up' : 'podium-third'}
    >
      <div className="flex items-center gap-3">
        {/* decorativo: quem nomeia o slot é o texto ao lado */}
        <span aria-hidden="true" className="shrink-0">
          <Medal metal={metal} place={metal === 'prata' ? 2 : 3} size={36} />
        </span>
        <div>
          <p className="text-xs text-ink-3">{label}</p>
          <p className="font-heading font-bold text-foreground">
            {club.clubId ? (
              <Link href={`/clubs/${club.clubId}`} className="hover:text-primary-ink">
                {club.clubName}
              </Link>
            ) : (
              club.clubName
            )}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-ink-3">{note}</p>
    </article>
  );
}

export default function CompetitionPodium({
  podium,
  labels,
  lastEditionYear,
  trophyImageUrl,
}: CompetitionPodiumProps) {
  if (!podium.champion) {
    return (
      <p className="text-sm text-ink-2" data-testid="podium-empty">
        {labels.empty}
      </p>
    );
  }

  const { champion, runnerUp, third } = podium;

  return (
    <div className="space-y-4" data-testid="competition-podium">
      <article className="rounded-lg border border-[color:var(--color-metal-ouro)] bg-surface p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden="true" className="shrink-0">
            <Medal metal="ouro" place={1} size={44} />
          </span>
          {trophyImageUrl ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-border/50 bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trophyImageUrl}
                alt=""
                className="h-12 w-12 object-contain"
                loading="lazy"
              />
            </span>
          ) : null}
          <div>
            <p className="text-xs font-semibold text-[color:var(--color-metal-ouro-ink)]">
              {labels.champion}
            </p>
            <p className="mt-0.5 font-heading text-2xl font-bold text-foreground">
              {champion.clubId ? (
                <Link href={`/clubs/${champion.clubId}`} className="hover:text-primary-ink">
                  {champion.clubName}
                </Link>
              ) : (
                champion.clubName
              )}
            </p>
            {lastEditionYear != null ? (
              <p className="mt-1 text-xs text-ink-3">{labels.lastEdition(lastEditionYear)}</p>
            ) : null}
          </div>
        </div>
      </article>

      {runnerUp || third ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {runnerUp ? (
            <Slot
              club={runnerUp}
              label={labels.runnerUp}
              metal="prata"
              note={labels.medalSilverNote}
            />
          ) : null}
          {third ? (
            <Slot club={third} label={labels.third} metal="bronze" note={labels.medalBronzeNote} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
