'use client';

import Link from 'next/link';
import PageHeading from '@/components/PageHeading';
import DashboardStatsSection from '@/components/DashboardStatsSection';
import { useI18n } from '@/i18n/Provider';

/**
 * MEU ALMANAQUE — a área do usuário (T559).
 *
 * O que esta página era, e o que mudou:
 *
 * 1. **Os cartões de ADMIN estavam aqui dentro.** "Observabilidade — Crons, fila e alertas
 *    (admin)" e "Moderação — Denúncias pendentes (admin)" apareciam lado a lado com "Favoritos",
 *    como se fossem recursos do usuário. Foram para `/admin`, que passou a existir (não havia
 *    hub). Além de confuso, expunha superfícies internas a quem não tem acesso.
 *
 * 2. **Eram DOIS níveis de título competindo.** Um `<h2>` "Conta e assinatura" agrupava cartões
 *    que já titulavam com `<h2>` — o mesmo nível, dentro do mesmo bloco. Agora cada grupo tem
 *    `<h2>` e cada cartão titula com `<h3>`, então a árvore tem hierarquia de verdade.
 *
 * 3. **Nenhuma string passava por dicionário.** Estava tudo literal em português dentro do JSX,
 *    contra a regra de i18n do projeto. Agora usa `pages.dashboard.*` nos três idiomas.
 *
 * 4. **O cartão "Perfil" parecia clicável e não era** — um `<div>` com a mesma aparência dos
 *    `<Link>` vizinhos. Um alvo que parece levar a algum lugar e não leva é pior que ausência:
 *    o usuário clica, nada acontece, e ele conclui que a página quebrou. Agora ele DECLARA a
 *    lacuna ("Em breve") e não finge ser link.
 *
 * O agrupamento em dois blocos ("Meu acervo" e "Conta e assinatura") é a leitura do pedido do
 * Operador: "Meu Almanaque" é o nome da área do usuário, e ela tem duas naturezas de coisa —
 * o que ele guardou no acervo, e a relação comercial dele com o produto.
 */

/** Cartões que LEVAM a algum lugar. */
const ACERVO = [
  { href: '/favoritos', chave: 'favorites' },
  { href: '/dashboard/history', chave: 'history' },
  { href: '/notifications', chave: 'notifications' },
] as const;

const CONTA = [{ href: '/dashboard/subscription', chave: 'subscription' }] as const;

export default function DashboardPage() {
  const { t } = useI18n();

  const cartao =
    'block h-full rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.dashboard.title" subtitleKey="pages.dashboard.subtitle" />

      {/* WS-C-14 — stats do usuário + favoritos recentes + placeholder de tracking. */}
      <DashboardStatsSection />

      <section aria-labelledby="meu-acervo" className="mb-10">
        <h2
          id="meu-acervo"
          className="font-heading text-lg font-bold text-foreground mb-3"
          data-testid="dashboard-acervo-title"
        >
          {t('pages.dashboard.myAlmanaqueTitle')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {ACERVO.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className={cartao} data-testid={`dashboard-${c.chave}`}>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {t(`pages.dashboard.${c.chave}`)}
                </h3>
                <p className="mt-1 text-sm text-ink-2">{t(`pages.dashboard.${c.chave}Desc`)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="conta-assinatura">
        <h2
          id="conta-assinatura"
          className="font-heading text-lg font-bold text-foreground mb-3"
          data-testid="dashboard-conta-title"
        >
          {t('pages.dashboard.accountTitle')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CONTA.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className={cartao} data-testid={`dashboard-${c.chave}`}>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {t(`pages.dashboard.${c.chave}`)}
                </h3>
                <p className="mt-1 text-sm text-ink-2">{t(`pages.dashboard.${c.chave}Desc`)}</p>
              </Link>
            </li>
          ))}

          {/* LACUNA DECLARADA, e não um link falso.
              Este cartão tinha exatamente a aparência dos `<Link>` ao lado, mas era um `<div>`
              sem destino. Quem clicasse não ia a lugar nenhum e concluía que a página quebrou.
              Agora ele diz o que é: recurso que ainda não existe. */}
          <li>
            <div
              className="h-full rounded-xl border border-dashed border-border bg-surface-2 p-5"
              data-testid="dashboard-profile-pending"
            >
              <h3 className="font-heading text-lg font-bold text-foreground">
                {t('pages.dashboard.profile')}
                <span className="ml-2 align-middle rounded-full bg-neutral-surface px-2 py-0.5 font-body text-xs font-normal text-ink-2">
                  {t('pages.dashboard.comingSoon')}
                </span>
              </h3>
              <p className="mt-1 text-sm text-ink-2">{t('pages.dashboard.profilePending')}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
