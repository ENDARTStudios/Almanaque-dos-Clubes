/**
 * FONTE — proveniência do dado, sempre SECUNDÁRIA.
 *
 * ── A REGRA (do Operador, 2026-10) ────────────────────────────────────────────────────────
 * "Na maioria das informações do site se destaca a fonte de verificação, ela é importante, mas é
 * secundária. O usuário não quer ver fonte de dados, ele quer ver os dados. Métricas, rankings,
 * prêmios, números, história, records — é isso que importa para o usuário."
 *
 * A proveniência NÃO some: ela é o que diferencia este acervo de um site de futebol qualquer, e é
 * o que permite auditar um número. O que muda é a POSIÇÃO e o PESO:
 *
 *   ERRADO (o que existia)                     CERTO (o que este componente garante)
 *   ─────────────────────────────────────      ─────────────────────────────────────
 *   badge com borda e fundo, ACIMA do dado      texto discreto, ABAIXO do dado
 *   `font-semibold` no nome da fonte            mesmo peso do texto de apoio
 *   CAIXA ALTA + tracking                       caixa normal
 *   12px nos dois                              8px de respiro entre dado e fonte
 *
 * ── O QUE ESTE COMPONENTE NÃO FAZ ─────────────────────────────────────────────────────────
 * Não esconde a fonte, não a remove de `aria`, não a joga em tooltip. Fonte que só aparece ao
 * passar o mouse não é verificável — vira decoração. Secundária é diferente de ausente.
 *
 * ── POR QUE UM COMPONENTE, E NÃO UM ESTILO EM CADA TELA ───────────────────────────────────
 * A medição mostrou o mesmo defeito em 22 arquivos, cada um com seu tamanho e sua cor: 11px num,
 * 12px em outro, `uppercase` num terceiro, `font-semibold` num quarto. Sem um lugar único, a
 * próxima tela repete a inversão de hierarquia — foi assim que o problema se espalhou.
 */
import type { ReactNode } from 'react';

export interface SourceNoteProps {
  /** URL da fonte. Sem URL, ainda renderiza o rótulo (a proveniência textual vale). */
  href?: string | null;
  /** Rótulo da fonte, já no idioma. Ex.: "Wikidata", "RSSSF". */
  label: ReactNode;
  /** Qualificação opcional. Ex.: "CC0", "tabelas finais". */
  detail?: ReactNode;
  /**
   * Rótulo acessível do link. O texto visível pode ser curto ("Wikidata"), mas o leitor de tela
   * precisa saber que é a FONTE e de ONDE — senão o link vira "Wikidata" solto na lista de links.
   */
  ariaLabel?: string;
  /**
   * Prefixo lido só pelo leitor de tela, antes do rótulo. Use quando o rótulo for um NOME PRÓPRIO
   * ("Wikidata", "RSSSF") e ele sozinho não disser que é a origem do dado.
   *
   * Não use quando o rótulo já for "Fonte"/"Source"/"Fuente": o padrão de copy deste projeto é
   * justamente esse, e o prefixo fixo que existia aqui antes gerava "Fonte: Fonte".
   */
  prefixoAcessivel?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Tipografia da fonte, deliberadamente uma só:
 *   0.6875rem (11px) — menor que qualquer dado, maior que o piso de legibilidade
 *   `text-ink-3`      — o tom mais apagado da paleta que ainda passa AA sobre `--color-surface`
 *   sem `uppercase`, sem `tracking`, sem `font-*` — nada que aumente o volume visual
 */
const CLASSE_FONTE = 'mt-2 block text-[0.6875rem] leading-snug text-ink-3 [text-wrap:pretty]';

export default function SourceNote({
  href,
  label,
  detail,
  ariaLabel,
  prefixoAcessivel,
  className,
  'data-testid': testId,
}: SourceNoteProps) {
  const conteudo = (
    <>
      {/* PREFIXO ACESSÍVEL — opcional, e o padrão é NÃO ter.
          O `sr-only "Fonte: "` fixo que existia aqui produzia "Fonte: Fonte" em QUATRO dos cinco
          usos, porque neste projeto o rótulo visível do link JÁ é a palavra "Fonte" (é o padrão de
          copy da casa: "Fonte", "Fonte (Wikipédia)", "fonte"). Duplicar não ajuda ninguém, nem o
          leitor de tela: ele anunciava "Fonte: Fonte".
          O prefixo só faz sentido quando o rótulo é um NOME PRÓPRIO ("Wikidata", "RSSSF") — aí o
          leitor de tela precisa de contexto para saber que aquilo é a origem do dado. Por isso é
          opt-in: quem passa nome próprio passa `prefixoAcessivel="Fonte: "`. */}
      {prefixoAcessivel ? <span className="sr-only">{prefixoAcessivel}</span> : null}
      {label}
      {detail ? <span className="text-ink-3/80"> · {detail}</span> : null}
    </>
  );

  return (
    <p className={`${CLASSE_FONTE} ${className ?? ''}`.trim()} data-testid={testId}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          /* Sublinhado pontilhado permanente: mantém a affordance de link sem pedir atenção como
             um sublinhado cheio faria. A cor não muda no repouso — mudar cor é chamar atenção. */
          className="underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-primary-ink"
        >
          {conteudo}
        </a>
      ) : (
        conteudo
      )}
    </p>
  );
}
