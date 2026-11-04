import type { ConceitoRankingDetalheStrings } from '@/i18n/wsConceitoRankingDetalhe';

/**
 * CAIXA DO CRITÉRIO — o que separa um ranking de uma opinião.
 *
 * O conceito põe, abaixo da tabela, a régua em texto aberto e um link para a metodologia. A
 * página não esconde a fórmula: sem ela, a posição é uma afirmação sem lastro. A caixa é
 * referência declarada, então não é interativa além do link.
 */
export default function CriteriaBox({ s }: { s: ConceitoRankingDetalheStrings }) {
  return (
    <section
      data-testid="conceito-ranking-criteria"
      aria-labelledby="conceito-ranking-criteria-title"
      className="mt-8 rounded-[2px] border border-border bg-surface-2 px-5 py-4"
    >
      <h2
        id="conceito-ranking-criteria-title"
        className="text-[12.5px] font-semibold text-secondary"
      >
        {s.criteriaTitle}
      </h2>
      <p className="mt-2 max-w-[90ch] text-[12px] leading-[18px] text-ink-2">{s.criteriaBody}</p>
      <a
        href="/metodologia#ranking-piloto-inglaterra"
        className="mt-2 inline-flex min-h-6 items-center text-[11px] text-primary-ink underline decoration-dotted underline-offset-2"
      >
        {s.methodologyLink}
      </a>
    </section>
  );
}
