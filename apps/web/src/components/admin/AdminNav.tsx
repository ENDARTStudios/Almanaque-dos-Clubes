'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from './strings';

/**
 * T-ADMIN — faixa de navegação do segmento `/admin`, aplicada a TODAS as páginas do
 * segmento pelo `layout.tsx`.
 *
 * Por que é um Client Component separado e não o layout inteiro: o `layout.tsx` precisa
 * continuar sendo Server Component para poder exportar o `metadata` (`noindex`/`nocache`
 * — T565). O destaque do item atual depende de `usePathname`, que só existe no cliente,
 * então o que é interativo vive aqui e o layout só monta a moldura.
 *
 * Acessibilidade: são âncoras de verdade (`<Link>`), logo já são focáveis e navegáveis
 * por teclado sem `tabIndex`; o item atual recebe `aria-current="page"` (leitor de tela
 * anuncia "página atual") e o alvo de toque de cada link passa de 24 px de altura.
 * Em 390 px a lista QUEBRA a linha (`flex-wrap`) em vez de rolar de lado — sem overflow
 * horizontal, que era o defeito a evitar.
 *
 * Não é portão de segurança: a restrição real está na API (`authenticate` +
 * `requireRole('admin')` + `requireOperator`). Aqui é só orientação de navegação.
 */
export default function AdminNav() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];
  const pathname = usePathname();

  const isCurrent = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <nav aria-label={s.nav.label} className="border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-6 items-center gap-1.5 text-sm text-ink-2 hover:text-primary-ink transition-colors duration-200"
        >
          <span aria-hidden="true">←</span>
          <span>{s.nav.back}</span>
        </Link>

        <ul className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          {s.nav.areas.map((area) => {
            const current = isCurrent(area.href);
            return (
              <li key={area.href}>
                <Link
                  href={area.href}
                  aria-current={current ? 'page' : undefined}
                  data-testid={`admin-nav-${
                    area.href === '/admin' ? 'index' : area.href.split('/').slice(2).join('-')
                  }`}
                  className={`inline-flex min-h-6 items-center rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-200 ${
                    current
                      ? 'bg-muted font-semibold text-primary-ink'
                      : 'text-ink-2 hover:bg-muted hover:text-primary-ink'
                  }`}
                >
                  {area.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
