'use client';

import Link from 'next/link';
import OperatorGate from '@/components/OperatorGate';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * HUB DE ADMINISTRAÇÃO — índice das ferramentas internas (T559, gate T565, T-ADMIN).
 *
 * Por que esta página existe: as ferramentas internas estavam listadas DENTRO de `/dashboard`,
 * a área do usuário. O efeito era o usuário comum ver "Observabilidade — Crons, fila e alertas
 * (admin)" ao lado de "Favoritos". Além de confuso, expunha a existência de superfícies internas
 * a quem não tem acesso.
 *
 * T-ADMIN — o índice passou a cobrir TODAS as áreas internas (as oito áreas de gestão, mais
 * Observabilidade e Denúncias, que já existiam e continuam alcançáveis), consumindo o mesmo
 * catálogo que a navegação do `layout.tsx` usa (`adminStrings.nav.areas`). Uma lista só, duas
 * apresentações: evita o clássico "adicionei a página nova e esqueci de listar em um dos dois".
 *
 * Por que dentro do `OperatorGate`: o Operador pediu que a área seja restrita a ele. O gate
 * oferece a ENTRADA; a recusa de verdade vem do servidor, porque cada ferramenta chama uma API
 * que exige `requireOperator`. Nenhuma checagem no navegador protege coisa alguma.
 *
 * Por isso o `metadata` saiu daqui: uma página `'use client'` não pode exportá-lo. O
 * `robots: noindex` vive no `layout.tsx` do segmento, que é Server Component e cobre TODAS as
 * rotas do segmento.
 */
export default function AdminPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {s.index.title}
        </h1>
        <p className="text-ink-2 mb-8">{s.index.subtitle}</p>

        <ul className="grid gap-4 sm:grid-cols-2">
          {s.nav.areas.map((area) => (
            <li key={area.href}>
              <Link
                href={area.href}
                data-testid={`admin-hub-${
                  area.href === '/admin' ? 'index' : area.href.split('/').slice(2).join('-')
                }`}
                className="block h-full rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary"
              >
                <span className="block font-heading text-lg font-bold text-foreground">
                  {area.label}
                </span>
                <span className="mt-1 block text-sm text-ink-2">{area.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Declara ONDE o acesso é decidido, para não dar a impressão de que a tela é o gate. */}
        <p className="mt-8 text-xs text-ink-3">{s.index.accessNote}</p>
      </div>
    </OperatorGate>
  );
}
