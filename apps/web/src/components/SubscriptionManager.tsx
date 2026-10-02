'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    confirmCancelTitle: string;
    confirmCancelBody: string;
    confirmWithdrawTitle: string;
    confirmWithdrawBody: string;
    confirmYes: string;
    confirmNo: string;
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
    confirmCancelTitle: 'Cancelar assinatura?',
    confirmCancelBody:
      'Sua renovação será interrompida; você mantém acesso até {date}. Nenhum valor é devolvido.',
    confirmWithdrawTitle: 'Solicitar reembolso?',
    confirmWithdrawBody:
      'Isso devolve {amount} e ENCERRA sua assinatura agora. Nenhum novo ciclo será cobrado. Confirmar?',
    confirmYes: 'Confirmar',
    confirmNo: 'Voltar',
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
    confirmCancelTitle: 'Cancel subscription?',
    confirmCancelBody:
      'Your renewal will stop; you keep access until {date}. No amount is refunded.',
    confirmWithdrawTitle: 'Request a refund?',
    confirmWithdrawBody:
      'This refunds {amount} and ENDS your subscription now. No new cycle will be charged. Confirm?',
    confirmYes: 'Confirm',
    confirmNo: 'Back',
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
    confirmCancelTitle: '¿Cancelar suscripción?',
    confirmCancelBody:
      'Tu renovación se detendrá; mantienes el acceso hasta {date}. No se devuelve ningún importe.',
    confirmWithdrawTitle: '¿Solicitar reembolso?',
    confirmWithdrawBody:
      'Esto devuelve {amount} y TERMINA tu suscripción ahora. No se cobrará un nuevo ciclo. ¿Confirmar?',
    confirmYes: 'Confirmar',
    confirmNo: 'Volver',
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

  // T464 — confirmação de ação destrutiva (modal acessível) antes de executar.
  const [confirm, setConfirm] = useState<null | 'cancel' | 'withdraw'>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const safeBtnRef = useRef<HTMLButtonElement | null>(null);

  const loadData = useCallback(async () => {
    await api
      .get<{ data: Sub }>('/billing/subscription')
      .then((r) => setSub(r.data))
      .catch(() => setSub(null));
    // T463 — histórico de cobranças do próprio usuário (owner-scoped no server)
    await api
      .get<{ data: Array<Billing> }>('/billing/invoices?limit=20')
      .then((r) => setBillings(r.data ?? []))
      .catch(() => setBillings([]));
  }, []);

  useEffect(() => {
    void loadData().finally(() => setLoading(false));
  }, [loadData]);

  // F1 — foco inicial no botão SEGURO (Voltar); Esc fecha; Tab preso no diálogo.
  useEffect(() => {
    if (!confirm) return;
    safeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirm(null);
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(nodes).filter((n) => !n.hasAttribute('disabled'));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirm]);

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
      setConfirm(null);
      // F2 — re-sincroniza o histórico: o withdraw marca REFUNDED no servidor,
      // então a lista precisa refletir o estado real (sem linha PAID obsoleta).
      await loadData();
    } catch (err) {
      // F3 — falha visível; o estado NUNCA é limpo/fingido em caso de erro.
      setMsg(err instanceof Error ? err.message : l.error);
    } finally {
      setBusy(null);
    }
  }

  const refundAmount = (() => {
    const paid = billings.find((b) => b.status === 'PAID');
    return paid
      ? (paid.amountCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: paid.currency || 'BRL',
        })
      : '';
  })();

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
              onClick={() => setConfirm('cancel')}
              aria-haspopup="dialog"
              disabled={!!busy}
              className="border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              {l.cancel}
            </button>
            <button
              onClick={() => setConfirm('withdraw')}
              aria-haspopup="dialog"
              disabled={!!busy}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {l.withdraw}
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

      {/* T464 — modal de confirmação (foco preso, Esc fecha, padrão = Voltar) */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirm(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            data-testid="confirm-destructive"
          >
            <h3
              id="confirm-title"
              className="text-lg font-heading font-semibold text-foreground mb-2"
            >
              {confirm === 'withdraw' ? l.confirmWithdrawTitle : l.confirmCancelTitle}
            </h3>
            <p id="confirm-desc" className="text-sm text-foreground/70 mb-5">
              {(confirm === 'withdraw' ? l.confirmWithdrawBody : l.confirmCancelBody)
                .replace('{amount}', refundAmount || '—')
                .replace(
                  '{date}',
                  sub?.currentPeriodEnd
                    ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                    : '—',
                )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                ref={safeBtnRef}
                onClick={() => setConfirm(null)}
                disabled={!!busy}
                className="border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer"
              >
                {l.confirmNo}
              </button>
              <button
                onClick={() => void act(confirm)}
                disabled={!!busy}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                data-testid="confirm-destructive-yes"
              >
                {busy ? '...' : l.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
