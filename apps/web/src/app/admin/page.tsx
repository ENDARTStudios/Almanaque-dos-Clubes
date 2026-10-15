'use client';

import Link from 'next/link';
import OperatorGate from '@/components/OperatorGate';
import { useI18n } from '@/i18n/Provider';

/**
 * HUB DE ADMINISTRAÇÃO — T559, protegido pelo gate de operador (T565).
 *
 * Por que esta página existe: as duas ferramentas internas (`/admin/observability` e
 * `/admin/reports`) estavam listadas DENTRO de `/dashboard`, a área do usuário. O efeito era o
 * usuário comum ver "Observabilidade — Crons, fila e alertas (admin)" ao lado de "Favoritos".
 * Além de confuso, expunha a existência de superfícies internas a quem não tem acesso.
 *
 * E por que ela está dentro do `OperatorGate`: o Operador pediu que a área seja restrita a ele,
 * com login. O gate oferece a ENTRADA; a recusa de verdade vem do servidor, porque cada uma das
 * duas ferramentas chama uma API que exige `requireOperator`. Nenhuma checagem no navegador
 * protege coisa alguma — quem controla o navegador chama a API direto.
 *
 * Por isso o `metadata` saiu: uma página `'use client'` não pode exportá-lo. O `robots: noindex`
 * que estava aqui foi para o `layout.tsx` do segmento, que é server component e cobre as três
 * rotas de uma vez — o que é melhor, porque antes só o índice estava marcado e as duas
 * ferramentas não.
 */
export default function AdminPage() {
  const { t } = useI18n();

  const ferramentas = [
    {
      href: '/admin/observability',
      titulo: t('admin.observability'),
      desc: t('admin.observabilityDesc'),
    },
    { href: '/admin/reports', titulo: t('admin.reports'), desc: t('admin.reportsDesc') },
  ];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {t('admin.title')}
        </h1>
        <p className="text-ink-2 mb-8">{t('admin.subtitle')}</p>

        <ul className="grid gap-4 sm:grid-cols-2">
          {ferramentas.map((f) => (
            <li key={f.href}>
              <Link
                href={f.href}
                className="block h-full rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary"
              >
                <span className="block font-heading text-lg font-bold text-foreground">
                  {f.titulo}
                </span>
                <span className="mt-1 block text-sm text-ink-2">{f.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Declara ONDE o acesso é decidido, para não dar a impressão de que a tela é o gate. */}
        <p className="mt-8 text-xs text-ink-3">{t('admin.accessNote')}</p>
      </div>
    </OperatorGate>
  );
}
