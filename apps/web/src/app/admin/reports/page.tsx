'use client';
/**
 * WS-C-11 — /admin/reports: moderação de denúncias (admin).
 * API-only gate: GET /reports/pending → 403 para não-admin (mensagem de
 * restrição), espelhando /admin/observability.
 */
import ProtectedRoute from '@/components/ProtectedRoute';
import ReportDashboard from '@/components/ReportDashboard';
import { useI18n } from '@/i18n/Provider';
import { wsC11Strings } from '@/i18n/wsC11';

export default function AdminReportsPage() {
  const { locale } = useI18n();
  const s = wsC11Strings[locale]?.reports ?? wsC11Strings['pt-br'].reports;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">{s.dashboardTitle}</h1>
        <div className="mt-6 rounded-2xl border border-border/50 bg-background p-5">
          <ReportDashboard s={s} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
