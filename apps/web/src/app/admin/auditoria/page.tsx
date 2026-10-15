'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AuditTrail from '@/components/admin/AuditTrail';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * T-ADMIN — /admin/auditoria.
 *
 * Casca fina sobre `components/admin/AuditTrail`, que documenta no topo a lacuna: a API
 * ainda não expõe a trilha. Esta página fica PRONTA para consumir
 * `GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=` — quando a rota
 * existir em `apps/api` (de outro agente), nada aqui precisa mudar.
 */
export default function AdminAuditPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {s.audit.title}
        </h1>
        <p className="text-ink-2 mb-8">{s.audit.subtitle}</p>
        <AuditTrail />
      </div>
    </ProtectedRoute>
  );
}
