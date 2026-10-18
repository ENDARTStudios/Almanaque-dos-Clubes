'use client';

import OperatorGate from '@/components/OperatorGate';
import ClubOwnerships from '@/components/admin/ClubOwnerships';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * WS-C-9 — /admin/moderacao-clubes.
 *
 * Fila de posses de clube (critério C3): o Operador aprova ou revoga com motivo.
 * Casca fina sobre `components/admin/ClubOwnerships`; a decisão de verdade é do
 * servidor (`requireRole('admin')` + `requireOperator`) e toda decisão registra
 * QUEM aprovou/revogou (approvedBy/reviewedBy + auditoria).
 */
export default function AdminClubOwnershipPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {s.ownership.title}
        </h1>
        <p className="text-ink-2 mb-8">{s.ownership.subtitle}</p>
        <ClubOwnerships />
      </div>
    </OperatorGate>
  );
}
