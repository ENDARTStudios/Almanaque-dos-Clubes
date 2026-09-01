'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';

type Sub = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
} | null;

const L: Record<
  string,
  {
    loading: string;
    none: string;
    plan: string;
    status: string;
    until: string;
    cancel: string;
    withdraw: string;
    done: string;
    error: string;
  }
> = {
  'pt-br': {
    loading: 'Carregando assinatura...',
    none: 'Nenhuma assinatura ativa.',
    plan: 'Plano',
    status: 'Status',
    until: 'Válida até',
    cancel: 'Cancelar assinatura',
    withdraw: 'Solicitar reembolso (7 dias)',
    done: 'Feito.',
    error: 'Erro ao processar.',
  },
  'en-us': {
    loading: 'Loading subscription...',
    none: 'No active subscription.',
    plan: 'Plan',
    status: 'Status',
    until: 'Valid until',
    cancel: 'Cancel subscription',
    withdraw: 'Request refund (7 days)',
    done: 'Done.',
    error: 'Error processing.',
  },
  'es-es': {
    loading: 'Cargando suscripción...',
    none: 'Sin suscripción activa.',
    plan: 'Plan',
    status: 'Estado',
    until: 'Válida hasta',
    cancel: 'Cancelar suscripción',
    withdraw: 'Solicitar reembolso (7 días)',
    done: 'Hecho.',
    error: 'Error al procesar.',
  },
};

export default function SubscriptionManager() {
  const { locale } = useI18n();
  const l = L[locale] ?? L['pt-br'];
  const [sub, setSub] = useState<Sub>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get<{ data: Sub }>('/billing/subscription')
      .then((r) => setSub(r.data))
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, []);

  async function act(kind: 'cancel' | 'withdraw') {
    setBusy(kind);
    setMsg('');
    try {
      const r = await api.post<{ data: Sub }>('/billing/' + kind);
      setSub(r.data);
      setMsg(l.done);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : l.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-border/50 rounded-xl p-6 bg-white mb-8">
      <h2 className="text-xl font-heading font-bold mb-4">{l.plan}</h2>
      {loading ? (
        <p className="text-sm text-foreground/60">{l.loading}</p>
      ) : !sub || sub.plan === 'FREE' ? (
        <p className="text-sm text-foreground/60">{l.none}</p>
      ) : (
        <div className="space-y-2 text-sm text-foreground/80">
          <p>
            <span className="font-semibold">{l.plan}:</span> {sub.plan}
          </p>
          <p>
            <span className="font-semibold">{l.status}:</span> {sub.status}
          </p>
          {sub.currentPeriodEnd && (
            <p>
              <span className="font-semibold">{l.until}:</span>{' '}
              {new Date(sub.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-3">
            <button
              onClick={() => act('cancel')}
              disabled={!!busy}
              className="border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              {busy === 'cancel' ? '...' : l.cancel}
            </button>
            <button
              onClick={() => act('withdraw')}
              disabled={!!busy}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busy === 'withdraw' ? '...' : l.withdraw}
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-foreground/60">{msg}</p>}
    </div>
  );
}
