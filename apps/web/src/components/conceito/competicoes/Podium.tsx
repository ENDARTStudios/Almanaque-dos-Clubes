import { Medal, type Metal } from '@/components/ficha/Metal';
import type { ConceitoCompeticoesStrings } from '@/i18n/wsConceitoCompeticoes';

/**
 * PÓDIO DA ÚLTIMA EDIÇÃO — a peça que fecha a promessa do conceito: o dado com a fonte.
 *
 * A regra que este componente NÃO quebra: a fonte só registra campeão e vice da última edição
 * da Copa do Mundo no acervo. O 3º lugar é `null` — e vira LACUNA DECLARADA no terceiro cartão,
 * não um nome inventado para "ficar igual ao desenho".
 *
 * A forma carrega o lugar (anel no 1º, disco vazado no 2º, disco menor no 3º) — o pódio continua
 * legível em preto e branco, como o `Metal` do sistema exige.
 */
export interface PodiumClub {
  name: string;
}

export interface ConceptPodiumProps {
  /** Nome da competição e ano da edição (ex.: "Copa do Mundo · 2022"). */
  editionLabel: string | null;
  champion: PodiumClub | null;
  runnerUp: PodiumClub | null;
  third: PodiumClub | null;
  s: ConceitoCompeticoesStrings;
}

const ORDEM: Array<{
  key: 'champion' | 'runnerUp' | 'third';
  metal: Metal;
  place: 1 | 2 | 3;
  role: string;
}> = [
  { key: 'champion', metal: 'ouro', place: 1, role: 'podiumChampion' },
  { key: 'runnerUp', metal: 'prata', place: 2, role: 'podiumRunnerUp' },
  { key: 'third', metal: 'bronze', place: 3, role: 'podiumThird' },
];

const ROLE_COLOR: Record<Metal, string> = {
  ouro: 'text-[color:var(--color-metal-ouro-ink)]',
  prata: 'text-[color:var(--color-metal-prata-ink)]',
  bronze: 'text-[color:var(--color-metal-bronze-ink)]',
};

export default function ConceptPodium({
  editionLabel,
  champion,
  runnerUp,
  third,
  s,
}: ConceptPodiumProps) {
  if (!champion) return null;
  const clubes = { champion, runnerUp, third };

  return (
    <section aria-labelledby="concept-podium-title" data-testid="concept-podium">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="concept-podium-title" className="text-[12.5px] font-semibold text-foreground">
          {s.podiumTitle}
        </h2>
        {editionLabel ? <p className="text-[11px] text-ink-3">{editionLabel}</p> : null}
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {ORDEM.map(({ key, metal, place, role }) => {
          const clube = clubes[key];
          const roleLabel = s[role as 'podiumChampion' | 'podiumRunnerUp' | 'podiumThird'];
          return (
            <li
              key={key}
              data-testid={`concept-podium-${key}`}
              className="flex min-h-[104px] items-center gap-4 rounded-[2px] border border-border bg-surface px-5 py-4"
            >
              <Medal metal={metal} place={place} size={40} />
              <div className="min-w-0">
                {clube ? (
                  <>
                    <p className="truncate font-heading text-lg font-bold leading-tight">
                      {clube.name}
                    </p>
                    <p className={`mt-1 text-[11px] font-semibold ${ROLE_COLOR[metal]}`}>
                      {roleLabel}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-ink-3">{roleLabel}</p>
                    <p className="mt-1 text-[11px] leading-tight text-ink-2">{s.podiumGap}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
