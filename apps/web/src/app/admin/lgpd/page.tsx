'use client';

import OperatorGate from '@/components/OperatorGate';
import LgpdDashboard from '@/components/admin/LgpdDashboard';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';
import AdminHeading from '@/components/ficha/AdminHeading';

/**
 * T-ADMIN — /admin/lgpd.
 *
 * Casca fina (título + `OperatorGate`); a lógica vive em
 * `components/admin/LgpdDashboard`.
 *
 * O portão real é a API: as rotas `/admin/lgpd/*` exigem `authenticate +
 * requireRole('admin') + requireOperator`, e 403 vira a mensagem de
 * "sem permissão" dentro do painel.
 */
export default function AdminLgpdPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AdminHeading title={s.lgpd.title} />
        <p className="text-ink-2 mb-8">{s.lgpd.subtitle}</p>
        <LgpdDashboard />
      </div>
    </OperatorGate>
  );
}
