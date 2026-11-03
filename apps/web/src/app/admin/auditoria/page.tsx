'use client';

import OperatorGate from '@/components/OperatorGate';
import AuditTrail from '@/components/admin/AuditTrail';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';
import AdminHeading from '@/components/ficha/AdminHeading';

/**
 * T-ADMIN — /admin/auditoria.
 *
 * Casca fina sobre `components/admin/AuditTrail`. Wave 2: a API passou a expor a
 * trilha em `GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=`, com
 * filtros e paginação de servidor; o componente já consome o contrato.
 */
export default function AdminAuditPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AdminHeading title={s.audit.title} />
        <p className="text-ink-2 mb-8">{s.audit.subtitle}</p>
        <AuditTrail />
      </div>
    </OperatorGate>
  );
}
