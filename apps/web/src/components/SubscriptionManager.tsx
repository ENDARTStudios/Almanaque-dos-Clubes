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

interface Billing {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  externalId: string | null;
  createdAt: string;
}

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
    refundDone: string;
    error: string;
    historyTitle: string;
    refundCondTitle: string;
    refundCondCdc: string;
    refundCondPrazo: string;
    refundCondCanal: string;
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
    refundDone: 'Reembolso solicitado em {date} — protocolo {protocol}. O crédito aparece no extrato em alguns dias.',
    error: 'Erro ao processar.',
    historyTitle: 'Histórico de cobranças',
    refundCondTitle: 'Condições de reembolso',
    refundCondCdc: 'Arrependimento em até 7 dias (CDC art. 49): devolução integral do valor pago.',
    refundCondPrazo: 'O crédito no extrato ocorre em 3–10 dias úteis, conforme o adquirente.',
    refundCondCanal: 'Dúvidas: endart.studios@gmail.com — sempre com o protocolo da solicitação.',
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
    refundDone: 'Refund requested on {date} — protocol {protocol}. The credit appears on your statement within a few days.',
    error: 'Error processing.',
    historyTitle: 'Billing history',
    refundCondTitle: 'Refund conditions',
    refundCondCdc: 'Withdrawal within 7 days (CDC art. 49): full refund of the amount paid.',
    refundCondPrazo: 'The credit appears on your statement within 3–10 business days, per the acquirer.',
    refundCondCanal: 'Questions: endart.studios@gmail.com — always include the request protocol.',
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
    refundDone: 'Reembolso solicitado el {date} — protocolo {protocol}. El crédito aparece en tu extracto en unos días.',
    error: 'Error al procesar.',
    historyTitle: 'Historial de cobros',
    refundCondTitle: 'Condiciones de reembolso',
    refundCondCdc: 'Arrepentimiento en hasta 7 días (CDC art. 49): devolución íntegra del valor pagado.',
    refundCondPrazo: 'El crédito aparece en tu extracto en 3–10 días hábiles, según el adquirente.',
    refundCondCanal: 'Dudas: endart.studios@gmail.com — incluye siempre el protocolo de la solicitud.',
  },
};

export default function SubscriptionManager() {
  const { locale } = useI18n();
  const l = L[locale] ?? L['pt-br'];
  const [sub, setSub] = useState<Sub>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [billings, setBillings] = useState<Array<{
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    externalId: string | null;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    api
      .get<{ data: Sub }>('/billing/subscription')
      .then((r) => setSub(r.data))
      .catch(() => setSub(null));
    // T463 — histórico de cobranças do próprio usuário (owner-scoped no server)
    api
      .get<{ data: Array<Billing> }>('/billing/invoices?limit=20')
      .then((r) => setBillings(r.data ?? []))
      .catch(() => setBillings([]))
      .finally(() => setLoading(false));
  }, []);

  async function act(kind: 'cancel' | 'withdraw') {
    setBusy(kind);
    setMsg('');
    try {
      // T451 — withdraw devolve o protocolo do refund (fail-loud: erros do
      // provedor chegam como exceção e o estado local NÃO é alterado).
      const r = await api.post<{ data: Sub; refund?: { id: string } }>('/billing/' + kind);
      setSub(r.data);
      setMsg(
        kind === 'withdraw' && r.refund?.id
          ? l.refundDone
              .replace('{date}', new Date().toLocaleDateString())
              .replace('{protocol}', r.refund.id)
          : l.done,
      );
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

      {/* T463 — histórico de cobranças (owner-scoped) */}
      {billings.length > 0 && (
        <div className="mt-8" data-testid="billing-history">
          <h3 className="text-lg font-heading font-semibold mb-3">{l.historyTitle}</h3>
          <ul className="space-y-2 text-sm">
            {billings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap gap-x-3 items-center rounded-lg border border-border px-3 py-2"
              >
                <span className="font-semibold text-foreground">
                  {(b.amountCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: b.currency || 'BRL',
                  })}
                </span>
                <span
                  className={
                    b.status === 'PAID'
                      ? 'text-green-700'
                      : b.status === 'REFUNDED'
                        ? 'text-amber-700'
                        : 'text-foreground/60'
                  }
                >
                  {b.status}
                </span>
                <span className="text-foreground/50">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
                {b.externalId && (
                  <span className="text-foreground/40 text-xs truncate max-w-[16rem]">
                    {b.externalId}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* T463 — condições de reembolso (permanente) */}
      <div
        className="mt-8 rounded-lg border border-border p-4 text-xs text-foreground/60"
        data-testid="refund-conditions"
      >
        <p className="font-semibold text-foreground/80 mb-1">{l.refundCondTitle}</p>
        <p className="mb-1">{l.refundCondCdc}</p>
        <p className="mb-1">{l.refundCondPrazo}</p>
        <p>{l.refundCondCanal}</p>
      </div>
    </div>
  );
}
