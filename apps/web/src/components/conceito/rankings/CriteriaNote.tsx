import Link from 'next/link';
import type { ConceitoRankingsStrings } from '@/i18n/wsConceitoRankings';

/**
 * "COMO A PONTUAÇÃO É CALCULADA" — o bloco `surface-2` com borda que fecha a tabela no conceito.
 *
 * A copy é a régua publicada pelo acervo (pesos 5·4·3·2·1 e títulos ×50 — ver
 * docs/RANKING-ALGORITHM.md), não a ilustração do quadro. O desenho mostra números de exemplo
 * ("mundial 3 · continental 2 · nacional 1"); repeti-los aqui seria afirmar um critério que o
 * produto não usa.
 *
 * Título é `h2` (a página tem UM `h1`, no FichaHead) e o link de metodologia abre a âncora
 * existente em /metodologia — destino real, sem rota nova.
 */
export default function CriteriaNote({ s }: { s: ConceitoRankingsStrings }) {
  return (
    <section
      aria-labelledby="conceito-criteria-title"
      data-testid="conceito-rankings-criteria"
      className="mt-6 rounded-[2px] border border-border bg-surface-2 px-4 py-4 sm:px-5"
    >
      <h2
        id="conceito-criteria-title"
        className="text-[12.5px] font-semibold leading-tight text-secondary"
      >
        {s.criteriaTitle}
      </h2>
      <p className="mt-2 max-w-[92ch] text-[12px] leading-[17px] text-ink-2 [text-wrap:pretty]">
        {s.criteriaBody}
      </p>
      <p className="mt-2 text-[11px] leading-tight">
        <Link
          href="/metodologia#ranking-piloto-inglaterra"
          className="text-primary-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {s.criteriaLink}
        </Link>
      </p>
    </section>
  );
}
