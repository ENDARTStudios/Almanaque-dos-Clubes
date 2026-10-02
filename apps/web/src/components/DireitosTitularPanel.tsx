'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';

// T470 — painel de direitos do titular. Deslogado: orientação + canal manual.
// Logado: pedido com protocolo, lista, cancelamento, export JSON/CSV e exclusão
// (soft + anonimização). Sem e-mail automático (SMTP ausente). Acessível.

const TYPES: Array<{ value: string; label: string }> = [
  { value: 'confirmation_access', label: 'Confirmação e acesso' },
  { value: 'correction', label: 'Correção' },
  { value: 'anonymization_blockage_deletion', label: 'Anonimização / bloqueio / eliminação' },
  { value: 'portability', label: 'Portabilidade' },
  { value: 'sharing_information', label: 'Informação sobre compartilhamento' },
  { value: 'consent_revocation', label: 'Revogação de consentimento' },
  { value: 'objection', label: 'Oposição' },
  { value: 'automated_decision_review', label: 'Revisão de decisão automatizada' },
];
const JURISDICTIONS = [
  { value: 'BR', label: 'Brasil (LGPD)' },
  { value: 'EEA_UK', label: 'EEE / Reino Unido' },
  { value: 'OTHER', label: 'Outro' },
];
const FIELD_OPTIONS = ['account', 'billing', 'subscriptions', 'favorites', 'sessions_metadata', 'requests', 'notices'];

interface Dsr {
  protocol: string;
  type: string;
  status: string;
  jurisdiction: string;
  deadlineAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  received: 'Recebido',
  needs_verification: 'Aguardando verificação',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rejected: 'Indeferido',
  cancelled: 'Cancelado',
};

export default function DireitosTitularPanel() {
  const { status } = useAuth();
  const [items, setItems] = useState<Dsr[]>([]);
  const [type, setType] = useState(TYPES[0].value);
  const [jurisdiction, setJurisdiction] = useState('BR');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Dsr[] }>('/legal/rights/requests');
      setItems(res.data);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    if (status === 'authed') void load();
  }, [status, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Dsr }>('/legal/rights/requests', {
        type,
        jurisdiction,
        description: description || undefined,
        requestedFields: fields.length ? fields : undefined,
      });
      setMsg(`Pedido registrado. Protocolo: ${res.data.protocol}`);
      setDescription('');
      setFields([]);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro ao registrar.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(protocol: string) {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/legal/rights/requests/${encodeURIComponent(protocol)}/cancel`);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro ao cancelar.');
    } finally {
      setBusy(false);
    }
  }

  async function download(format: 'json' | 'csv') {
    try {
      const res = await fetch(`${getApiBase()}/legal/rights/me/export?format=${format}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha na exportação');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro na exportação.');
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setErr(null);
    try {
      await api.del('/legal/rights/me/account', { confirmation: confirmText, password });
      window.location.href = '/';
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro ao excluir.');
      setBusy(false);
    }
  }

  if (status === 'loading') return <p className="text-foreground/60">Carregando…</p>;
  if (status !== 'authed') {
    return (
      <div className="space-y-4 text-foreground/70 leading-relaxed">
        <p>
          Para o fluxo automatizado com protocolo rastreável, <strong>entre na sua conta</strong> e
          use esta página. Sem conta, exerça seus direitos pelo canal manual:{' '}
          <a className="text-primary hover:underline" href="mailto:endart.studios@gmail.com">
            endart.studios@gmail.com
          </a>
          .
        </p>
        <p className="text-sm">
          Encarregado (DPO): <strong>Equipe END ART Studios</strong> — mesmo canal.
        </p>
        <p className="text-sm">
          Prazos: confirmação/acesso imediatos quando possível; demais pedidos em até 15 dias no
          Brasil (LGPD, art. 18, §3, prorrogável, com comunicação à ANPD) ou 1 mês no EEE/Reino
          Unido quando aplicável. Escalonamento: ANPD e, quando aplicável, autoridade supervisora.
        </p>
        <p className="text-sm">
          Menores: a plataforma <strong>não realiza verificação de idade</strong> e não direciona o
          serviço a crianças; responsáveis podem contatar o canal de privacidade.
        </p>
        <p className="text-sm">
          Saiba mais na{' '}
          <a className="text-primary hover:underline" href="/privacidade">
            Política de Privacidade
          </a>
          ,{' '}
          <a className="text-primary hover:underline" href="/termos">
            Termos
          </a>{' '}
          e{' '}
          <a className="text-primary hover:underline" href="/metodologia">
            Metodologia
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-label="Novo pedido" className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Novo pedido</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="dsr-type" className="block text-sm text-foreground/70 mb-1">
              Direito
            </label>
            <select
              id="dsr-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dsr-jur" className="block text-sm text-foreground/70 mb-1">
              Jurisdição
            </label>
            <select
              id="dsr-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="block text-sm text-foreground/70 mb-1">
              Escopo (opcional)
            </legend>
            <div className="flex flex-wrap gap-3">
              {FIELD_OPTIONS.map((f) => (
                <label key={f} className="flex items-center gap-1.5 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={fields.includes(f)}
                    onChange={(e) =>
                      setFields((prev) => (e.target.checked ? [...prev, f] : prev.filter((x) => x !== f)))
                    }
                  />
                  {f}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="dsr-desc" className="block text-sm text-foreground/70 mb-1">
              Descrição <span className="text-foreground/40">(opcional)</span>
            </label>
            <textarea
              id="dsr-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          {err && <p className="text-sm text-red-500" role="alert">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Registrar pedido'}
          </button>
        </form>
        <p className="sr-only" aria-live="polite">{msg}</p>
        {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      </section>

      <section aria-label="Meus pedidos" className="max-w-2xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Meus pedidos</h2>
        {items.length === 0 ? (
          <p className="text-sm text-foreground/60">Nenhum pedido registrado.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.protocol} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-primary break-all">{it.protocol}</code>
                  <span className="text-foreground/70">{STATUS_LABEL[it.status] ?? it.status}</span>
                </div>
                <p className="text-foreground/60 mt-1">
                  {TYPES.find((t) => t.value === it.type)?.label ?? it.type} ·{' '}
                  {it.deadlineAt ? `prazo ${new Date(it.deadlineAt).toLocaleDateString()}` : ''}
                </p>
                {['received', 'needs_verification', 'in_progress'].includes(it.status) && (
                  <button
                    onClick={() => void cancel(it.protocol)}
                    disabled={busy}
                    className="mt-2 text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Portabilidade" className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-3">Exportar meus dados</h2>
        <div className="flex gap-3">
          <button
            onClick={() => void download('json')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            Baixar JSON
          </button>
          <button
            onClick={() => void download('csv')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            Baixar CSV
          </button>
        </div>
      </section>

      <section aria-label="Excluir conta" className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-3">Excluir minha conta</h2>
        <p className="text-sm text-foreground/60 mb-3">
          A conta é anonimizada (e-mail não reutilizável) e as sessões são revogadas. Registros
          fiscais e de segurança são preservados por obrigação legal.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="del-confirm" className="block text-sm text-foreground/70 mb-1">
              Digite EXATAMENTE <code>EXCLUIR CONTA</code>
            </label>
            <input
              id="del-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label htmlFor="del-pass" className="block text-sm text-foreground/70 mb-1">
              Sua senha
            </label>
            <input
              id="del-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            onClick={() => void deleteAccount()}
            disabled={busy || confirmText !== 'EXCLUIR CONTA' || !password}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Excluir conta definitivamente
          </button>
        </div>
      </section>
    </div>
  );
}
