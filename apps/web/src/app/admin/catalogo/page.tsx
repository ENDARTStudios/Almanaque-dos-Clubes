'use client';

import OperatorGate from '@/components/OperatorGate';
import MediaCatalog from '@/components/admin/MediaCatalog';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * T-ADMIN — /admin/catalogo.
 *
 * Casca fina (título + `OperatorGate`); a lógica vive em
 * `components/admin/MediaCatalog`, mesmo desenho de `/admin/usuarios`.
 *
 * O portão é `OperatorGate` (sessão E operador) e, de fato, a API: as rotas
 * `/admin/catalogo/media*` exigem `authenticate + requireRole('admin') +
 * requireOperator`, e 403 vira a mensagem de "sem permissão" dentro do manager.
 */
export default function AdminCatalogPage() {
  const { locale } = useI18n();
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  return (
    <OperatorGate>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          {s.catalog.title}
        </h1>
        <p className="text-ink-2 mb-8">{s.catalog.subtitle}</p>
        <MediaCatalog />
      </div>
    </OperatorGate>
  );
}
