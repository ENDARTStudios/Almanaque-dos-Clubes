import Link from 'next/link';
import { Trophy } from '@/components/ficha/Metal';
import type { ConceitoCompeticoesStrings } from '@/i18n/wsConceitoCompeticoes';

/**
 * DESTAQUES · POR ALCANCE — a faixa de quatro alvos do conceito FICHA em /competitions.
 *
 * Cada cartão carrega TRÊS informações, e todas são reais:
 *   · o nome (vem da curadoria de âncoras, ids confirmados no banco);
 *   · o ano de fundação e o número de edições NO ACERVO (não "23 edições históricas" — o que
 *     o banco tem é o que aparece; a diferença é declarada, não estimada);
 *   · o alcance (mundial/continental/nacional), que também decide a COR DO TROFÉU.
 *
 * O troféu é o mesmo componente do sistema (`Trophy`), com a cor do degrau: ouro para o
 * mundial, carmim para o continental, petróleo para o nacional. Cor aqui não é decoração — é a
 * legenda do alcance, por isso o rótulo em texto vem junto (a cor nunca é o único portador).
 */
export type Tier = 'mundial' | 'continental' | 'nacional';

export interface HighlightItem {
  id: string;
  name: string;
  tier: Tier;
  inceptionYear: number | null;
  editions: number | null;
}

const TIER_COLOR: Record<Tier, string> = {
  mundial: 'var(--color-tier-mundial)',
  continental: 'var(--color-tier-continental)',
  nacional: 'var(--color-tier-nacional)',
};

const TIER_TEXT: Record<Tier, string> = {
  mundial: 'text-[color:var(--color-tier-mundial)]',
  continental: 'text-[color:var(--color-tier-continental)]',
  nacional: 'text-[color:var(--color-tier-nacional)]',
};

const TIER_BORDER: Record<Tier, string> = {
  mundial: 'border-[color:var(--color-tier-mundial)]',
  continental: 'border-border',
  nacional: 'border-border',
};

function meta(item: HighlightItem, s: ConceitoCompeticoesStrings): string | null {
  const parts: string[] = [];
  if (item.inceptionYear != null) parts.push(String(item.inceptionYear));
  // "0 edições no acervo" não informa: é lacuna, não contagem. Só entra o que existe.
  if (item.editions != null && item.editions > 0) {
    parts.push(s.editionsLine.replace('{editions}', String(item.editions)));
  }
  return parts.length ? parts.join(' · ') : null;
}

export default function CompetitionHighlights({
  items,
  s,
}: {
  items: HighlightItem[];
  s: ConceitoCompeticoesStrings;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="concept-highlights">
      {items.map((item) => {
        const metaLinha = meta(item, s);
        return (
          <li key={item.id} className="flex">
            <Link
              href={`/competitions/${item.id}`}
              data-testid={`concept-highlight-${item.id}`}
              className={`flex min-h-[196px] w-full flex-col rounded-[2px] border bg-surface px-4 pt-4 pb-3 transition-colors duration-200 hover:bg-surface-2 ${TIER_BORDER[item.tier]} ${
                item.tier === 'mundial' ? 'border-2' : 'border'
              }`}
            >
              <span className="flex flex-1 items-start justify-center pt-2">
                <Trophy size={34} color={TIER_COLOR[item.tier]} />
              </span>
              <span className="mt-3 font-heading text-[17px] font-bold leading-tight">
                {item.name}
              </span>
              {metaLinha ? (
                <span className="mt-1 text-[11px] leading-tight text-ink-3">{metaLinha}</span>
              ) : null}
              <span
                className={`mt-1 text-[10px] font-semibold leading-none ${TIER_TEXT[item.tier]}`}
              >
                {s.tier[item.tier]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
