import Link from 'next/link';
import type { DashboardStatsData } from '@/components/DashboardStats';
import type { ConceitoDashboardStrings } from '@/i18n/wsConceitoDashboard';

/**
 * CONTA E ASSINATURA — a tabela densa do /dashboard no conceito FICHA.
 *
 * Cada linha declara situação, detalhe e a ação REAL que existe. Perfil não tem tela ainda:
 * a linha diz "Em breve" em vez de fingir um link. Plano não tem status no payload do painel:
 * a situação fica "—" e a ação leva ao gerenciamento.
 */
export default function AccountTable({
  stats,
  s,
}: {
  stats: DashboardStatsData;
  s: ConceitoDashboardStrings;
}) {
  const unread = stats.totalNotifications.unread;
  const rows = [
    {
      item: s.rows.plan,
      status: '—',
      detail: s.rows.planDetail,
      action: (
        <Link
          href="/dashboard/subscription"
          className="text-primary-ink underline decoration-dotted underline-offset-2"
        >
          {s.rows.planAction}
        </Link>
      ),
    },
    {
      item: s.rows.profile,
      status: s.rows.profileStatus,
      detail: s.rows.profileDetail,
      action: <span className="text-ink-3">—</span>,
    },
    {
      item: s.rows.notifications,
      status: unread > 0 ? `${unread} ${s.unread}` : s.allRead,
      detail: s.rows.notificationsDetail,
      action: (
        <Link
          href="/notifications"
          className="text-primary-ink underline decoration-dotted underline-offset-2"
        >
          {s.rows.notificationsAction}
        </Link>
      ),
    },
    {
      item: s.rows.proposals,
      status:
        stats.totalProposals.pending > 0
          ? `${stats.totalProposals.pending} ${s.pending}`
          : String(stats.totalProposals.total),
      detail: s.rows.proposalsDetail,
      action: <span className="text-ink-3">—</span>,
    },
    {
      item: s.rows.ownedClubs,
      status: String(stats.ownedClubsCount),
      detail: s.rows.ownedClubsDetail,
      action: <span className="text-ink-3">—</span>,
    },
    {
      item: s.rows.history,
      status: '—',
      detail: s.rows.historyDetail,
      action: (
        <Link
          href="/dashboard/history"
          className="text-primary-ink underline decoration-dotted underline-offset-2"
        >
          {s.rows.historyAction}
        </Link>
      ),
    },
  ];

  return (
    <section aria-labelledby="conta-assinatura" className="mt-10">
      <h2 id="conta-assinatura" className="text-[12.5px] font-semibold text-foreground">
        {s.accountTitle}
      </h2>
      <table
        className="mt-2 w-full border-collapse text-left text-[12px]"
        data-testid="dashboard-conta-tabela"
      >
        <thead>
          <tr className="border-b border-border text-[10px] tracking-[0.08em] text-ink-3 uppercase">
            <th scope="col" className="py-1.5 pr-3 font-semibold">
              {s.columns.item}
            </th>
            <th scope="col" className="py-1.5 pr-3 font-semibold">
              {s.columns.status}
            </th>
            <th scope="col" className="py-1.5 pr-3 font-semibold">
              {s.columns.detail}
            </th>
            <th scope="col" className="py-1.5 font-semibold">
              {s.columns.action}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.item} className={i % 2 === 1 ? 'bg-surface-2' : undefined}>
              <th
                scope="row"
                className="border-b border-border py-2 pr-3 text-left font-semibold text-foreground"
              >
                {r.item}
              </th>
              <td className="border-b border-border py-2 pr-3 text-ink-2">{r.status}</td>
              <td className="border-b border-border py-2 pr-3 text-ink-3">{r.detail}</td>
              <td className="border-b border-border py-2">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
