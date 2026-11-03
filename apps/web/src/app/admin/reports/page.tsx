'use client';
/**
 * WS-C-11 — /admin/reports: moderação de denúncias (admin).
 * API-only gate: GET /reports/pending → 403 para não-admin (mensagem de
 * restrição), espelhando /admin/observability.
 */
import OperatorGate from '@/components/OperatorGate';
import ReportDashboard from '@/components/ReportDashboard';
import { useI18n } from '@/i18n/Provider';
import { wsC11Strings } from '@/i18n/wsC11';
import AdminHeading from '@/components/ficha/AdminHeading';

export default function AdminReportsPage() {
  const { locale } = useI18n();
  const s = wsC11Strings[locale]?.reports ?? wsC11Strings['pt-br'].reports;

  return (
    <OperatorGate>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AdminHeading title={s.dashboardTitle} />
        <div className="mt-6 rounded-2xl border border-border/50 bg-background p-5">
          <ReportDashboard s={s} locale={locale} />
        </div>
      </div>
    </OperatorGate>
  );
}
