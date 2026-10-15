'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import UsersManager from '@/components/admin/UsersManager';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * T-ADMIN — /admin/usuarios.
 *
 * A página é casca fina (título + `ProtectedRoute`); a lógica vive em
 * `components/admin/UsersManager`. Mesmo desenho de `/admin/reports`, onde o
 * `ReportDashboard` carrega o comportamento e a página só compõe.
 *
 * O portão é `ProtectedRoute` (sessão) e, de fato, a API: `GET /admin/users` exige
 * `authenticate + requireRole('admin') + requireOperator`, e 403 vira a mensagem de
 * "sem permissão" dentro do manager — não uma tela quebrada.
 */
export default function AdminUsersPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {s.users.title}
        </h1>
        <p className="text-ink-2 mb-8">{s.users.subtitle}</p>
        <UsersManager />
      </div>
    </ProtectedRoute>
  );
}
