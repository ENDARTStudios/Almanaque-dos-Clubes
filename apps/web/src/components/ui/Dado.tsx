import type { ReactNode } from 'react';

/**
 * NÚMERO-HERÓI — o dado como tipografia.
 *
 * Três decisões, todas com motivo medido:
 *
 * 1. A classe `.num` (Barlow Condensed + `tabular-nums` + `tnum`) não é decoração: sem numeral
 *    tabular, `1` e `8` têm larguras diferentes e as colunas de uma tabela "dançam" de uma linha
 *    para outra. É o defeito mais visível em qualquer tabela de rankings.
 *
 * 2. O número NUNCA aparece sozinho — `label` é obrigatório. Um `36` sem rótulo é adivinhação:
 *    pode ser títulos, pontos, jogos ou idade. A regra vem do conceito (a paleta de comando
 *    mostra "36 / TÍTULOS", nunca "36").
 *
 * 3. `tone="verified"` usa o dourado, reservado a procedência e pódio. Se o dourado fosse usado
 *    em número comum, ele deixaria de significar "conferido" — a cor precisa ter um papel só.
 */
export function NumeroHero({
  value,
  label,
  size = 'md',
  tone = 'default',
  hint,
  className = '',
}: {
  /** O número já formatado (use `formatCount` para locale correto). */
  value: string | number;
  /** O que este número É. Obrigatório: número sem rótulo é adivinhação. */
  label: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'verified' | 'muted';
  /** Linha de contexto abaixo do rótulo (procedência, unidade, período). */
  hint?: ReactNode;
  className?: string;
}) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl sm:text-6xl',
  } as const;
  const tones = {
    default: 'text-foreground',
    verified: 'text-secondary',
    muted: 'text-ink-2',
  } as const;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={`num ${sizes[size]} leading-none ${tones[tone]}`}>{value}</span>
      <span className="text-[0.8125rem] leading-tight text-ink-2">{label}</span>
      {hint ? <span className="eyebrow">{hint}</span> : null}
    </div>
  );
}

/**
 * LINHA DE PROCEDÊNCIA — a promessa da marca virando elemento de interface.
 *
 * O diferencial do Almanaque é que todo número tem fonte conferível. Isso não pode morar num
 * rodapé de página: tem de estar ao lado do dado. Este componente é o par `FONTE · valor · link`
 * que aparece no cartão de prova, na faixa de números e nas tabelas.
 *
 * O link é `<a>` de verdade (navegável por teclado, com anel de foco visível) e sempre com
 * `rel="noopener noreferrer"` + `target="_blank"`, porque aponta para fonte externa.
 */
export function SourceLine({
  label = 'Fonte',
  value,
  href,
  linkLabel,
  className = '',
}: {
  label?: string;
  /** Identificador legível da fonte: `knowledge_graph`, `RSSSF`, `wikidata`. */
  value: string;
  href?: string;
  /** Texto do link quando há `href`. Sem ele, cai no próprio `value`. */
  linkLabel?: string;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] ${className}`}>
      <span className="eyebrow">{label}</span>
      <span className="text-ink-2">{value}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary underline decoration-secondary/40 underline-offset-2 transition-colors duration-200 hover:decoration-secondary"
        >
          {linkLabel ?? value} ↗
        </a>
      ) : null}
    </p>
  );
}
