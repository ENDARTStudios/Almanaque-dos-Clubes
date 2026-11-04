/**
 * CRITÉRIOS — o bloco do conceito que declara como a tabela é ordenada.
 *
 * ── O QUE ELE RESOLVE ──────────────────────────────────────────────────────────────────────
 * O quadro `tabela.png` põe a frase "Tabela acumulada com os critérios de desempate
 * declarados. Pontos → saldo → gols pró." no subtítulo. Numa tabela CATALOGADA o acervo não
 * conhece o regulamento: a posição veio pronta da fonte. Declarar a regra do quadro como se
 * fosse a da competição seria inventar — então o bloco declara o que existe e o que é lacuna.
 * Na tabela DERIVADA (aba Pontuação) a regra é conhecida, porque é o código que ordena.
 *
 * Nunca é caixa alta, nunca é badge: é nota de apoio (11px, tom de texto secundário), abaixo
 * do dado — a mesma régua de hierarquia do `SourceNote`.
 */
export interface CriteriosProps {
  title: string;
  items: string[];
  testId?: string;
}

export default function Criterios({ title, items, testId }: CriteriosProps) {
  if (items.length === 0) return null;
  return (
    <div
      role="note"
      data-testid={testId}
      aria-label={title}
      className="mt-4 rounded-[2px] border border-border bg-surface-2 px-4 py-3"
    >
      <p className="text-[12.5px] font-semibold leading-tight text-foreground">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-[11px] leading-snug text-ink-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
