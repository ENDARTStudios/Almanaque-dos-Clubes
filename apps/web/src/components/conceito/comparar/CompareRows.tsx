import { formatCount } from '@/lib/format';
import type { Locale } from '@/i18n/config';

/**
 * LINHAS DA COMPARAÇÃO — o coração do quadro \`comparar\`.
 *
 * O desenho lê na horizontal: número grande da entidade A, o rótulo da métrica no centro e o
 * número da entidade B. Quem lidera fica em carmim; empate e lacuna ficam neutros. "—" é lacuna
 * declarada (a API não publica a métrica), nunca zero.
 */
export interface ComparacaoLinha {
  label: string;
  a: number | string | null;
  b: number | string | null;
  leader?: 'a' | 'b' | null;
  hint?: string;
}

function valor(v: number | string | null, locale: Locale): string {
  if (v == null) return '—';
  return typeof v === 'number' ? formatCount(v, locale) : v;
}

export default function CompareRows({
  rows,
  locale,
  label,
}: {
  rows: ComparacaoLinha[];
  locale: Locale;
  label: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={label} data-testid="conceito-comparar-linhas" className="mt-8">
      <ol className="list-none p-0">
        {rows.map((r) => {
          const aVazio = r.a == null;
          const bVazio = r.b == null;
          return (
            <li
              key={r.label}
              className="grid grid-cols-[1fr_minmax(120px,auto)_1fr] items-center gap-3 border-b border-border py-3 odd:bg-surface-2 sm:gap-6"
            >
              <span
                className={`num font-bold tabular-nums ${aVazio ? 'text-[18px] text-ink-3' : 'text-[26px]'} ${
                  r.leader === 'a' ? 'text-primary-ink' : 'text-foreground'
                }`}
              >
                {valor(r.a, locale)}
              </span>
              <span className="text-center text-[12px] leading-tight text-ink-2">
                {r.label}
                {r.hint ? (
                  <span className="mt-0.5 block text-[10px] leading-tight text-ink-3">
                    {r.hint}
                  </span>
                ) : null}
              </span>
              <span
                className={`num text-right font-bold tabular-nums ${bVazio ? 'text-[18px] text-ink-3' : 'text-[26px]'} ${
                  r.leader === 'b' ? 'text-primary-ink' : 'text-foreground'
                }`}
              >
                {valor(r.b, locale)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
