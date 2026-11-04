import SourceNote from '@/components/SourceNote';
import type { ConceitoCompeticaoStrings } from '@/i18n/wsConceitoCompeticao';

/**
 * PROCEDÊNCIA no pé da ficha da competição — dado primeiro, fonte depois.
 *
 * A ordem importa: a primeira nota fala da tabela (o dado principal da página), a última é a
 * regra de lacuna ("—" nunca é zero). Cada temporada já carrega a própria fonte embaixo da
 * tabela; aqui fica o que vale para a página inteira, em `SourceNote` (11px, tom apagado,
 * sublinhado pontilhado) — nada de caixa, caixa alta ou peso de dado.
 */
export interface ProcedenciaProps {
  s: ConceitoCompeticaoStrings;
  /** Temporada com tabela catalogada; `null` quando não há classificação. */
  season: string | null;
  /** A página tem a aba Pontuação (tabela derivada das partidas)? */
  hasDerived: boolean;
  testId?: string;
}

export default function Procedencia({
  s,
  season,
  hasDerived,
  testId = 'competicao-provenance',
}: ProcedenciaProps) {
  return (
    <footer data-testid={testId} className="mt-12 border-t-2 border-foreground pt-4">
      <h2 className="sr-only">{s.provenance.heading}</h2>
      {season ? (
        <SourceNote label={s.provenance.standings} />
      ) : (
        <SourceNote label={s.provenance.noTable} />
      )}
      {hasDerived ? <SourceNote label={s.provenance.derived} /> : null}
      <SourceNote label={s.provenance.gaps} />
      <SourceNote label={s.provenance.error} />
    </footer>
  );
}
