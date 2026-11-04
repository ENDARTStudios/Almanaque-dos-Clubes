'use client';

import { useCallback, useEffect, useState } from 'react';
import OperatorGate from '@/components/OperatorGate';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';
import { wsConceitoAdmin } from '@/i18n/wsConceitoAdmin';
import AdminOperacao, { type AdminMetricsView } from '@/components/conceito/admin/AdminOperacao';

/**
 * /admin — OPERAÇÃO no conceito FICHA.
 *
 * O hub antigo tinha uma lista de cartões e nada do estado do acervo. O quadro pede o painel:
 * acervo, qualidade do dado, filas e funções de administrador, com o topo escuro do segmento.
 *
 * Dados: UMA chamada a GET /admin/metrics (a mesma do /admin/metricas). 403 é recusa de
 * permissão — não "erro"; 5xx/rede é erro com retry. O gate de navegação continua no
 * OperatorGate e a segurança real continua na API (a tela não é o portão).
 */
type Status = 'loading' | 'ready' | 'forbidden' | 'error';

export default function AdminPage() {
  const { locale } = useI18n();
  const s = wsConceitoAdmin[locale];
  const admin = adminStrings[locale] ?? adminStrings['pt-br'];
  const [data, setData] = useState<AdminMetricsView | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const carregar = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.get<{ data: AdminMetricsView }>('/admin/metrics');
      setData(res.data);
      setStatus('ready');
    } catch (e) {
      const err = e as Error & { status?: number };
      setStatus(err.status === 403 || /403|FORBIDDEN/i.test(err.message) ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, [carregar]);

  return (
    <OperatorGate>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {status === 'forbidden' ? (
          <p role="alert" className="py-10 text-sm text-danger-ink" data-testid="admin-forbidden">
            {s.restricted}
          </p>
        ) : status === 'loading' && !data ? (
          <p role="status" className="py-10 text-sm text-ink-2" data-testid="admin-loading">
            {admin.index.checking}
          </p>
        ) : status === 'error' || !data ? (
          <div className="py-10" data-testid="admin-error">
            <p role="alert" className="text-sm text-danger-ink">
              {s.error}
            </p>
            <button
              type="button"
              onClick={() => void carregar()}
              className="mt-3 inline-flex min-h-9 items-center rounded-[2px] border border-border px-3 text-[12px] text-foreground hover:border-foreground"
            >
              {s.retry}
            </button>
          </div>
        ) : (
          <AdminOperacao data={data} s={s} locale={locale} areas={admin.nav.areas} />
        )}
      </div>
    </OperatorGate>
  );
}
