'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { useI18n } from '@/i18n/Provider';
import { wsTitularStrings } from '@/i18n/wsTitular';

// T470 — painel de direitos do titular. Deslogado: orientação + canal manual.
// Logado: pedido com protocolo, lista, cancelamento, export JSON/CSV e exclusão
// (soft + anonimização). Sem e-mail automático (SMTP ausente). Acessível.
// T493 — i18n pt/en/es (pt é a língua de prevalência; metadata da página fica
// em PT). Conteúdo jurídico idêntico ao anterior — só extração de strings.

interface Dsr {
  protocol: string;
  type: string;
  status: string;
  jurisdiction: string;
  deadlineAt: string | null;
  createdAt: string;
}

const FIELD_OPTIONS = ['account', 'billing', 'subscriptions', 'favorites', 'sessions_metadata', 'requests', 'notices'];

export default function DireitosTitularPanel() {
  const { status } = useAuth();
  const { locale } = useI18n();
  const s = wsTitularStrings[locale] ?? wsTitularStrings['pt-br'];
  const [items, setItems] = useState<Dsr[]>([]);
  const [type, setType] = useState(s.types[0]!.value);
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
      setMsg(s.pedidoOk.replace('{protocol}', res.data.protocol));
      setDescription('');
      setFields([]);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : s.errRegistrar);
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
      setErr(e2 instanceof Error ? e2.message : s.errCancelar);
    } finally {
      setBusy(false);
    }
  }

  async function download(format: 'json' | 'csv') {
    try {
      const res = await fetch(`${getApiBase()}/legal/rights/me/export?format=${format}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(s.exportFail);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : s.errExport);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setErr(null);
    try {
      await api.del('/legal/rights/me/account', { confirmation: confirmText, password });
      window.location.href = '/';
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : s.errExcluir);
      setBusy(false);
    }
  }

  if (status === 'loading') return <p className="text-foreground/60">{s.loading}</p>;
  if (status !== 'authed') {
    return (
      <div className="space-y-4 text-foreground/70 leading-relaxed">
        <p>
          {s.loggedIntro} <strong>{s.loggedStrong}</strong>
          {s.loggedManual}{' '}
          <a className="text-primary hover:underline" href="mailto:endart.studios+privacidade@gmail.com">
            endart.studios+privacidade@gmail.com
          </a>
          .
        </p>
        <p className="text-sm">
          {s.dpoLabel} <strong>{s.dpoTeam}</strong> {s.dpoSame}
        </p>
        <p className="text-sm">{s.prazos}</p>
        <p className="text-sm">
          {s.menores} <strong>{s.menoresStrong}</strong>
          {s.menoresTail}
        </p>
        <p className="text-sm">
          {s.saibaMais}{' '}
          <a className="text-primary hover:underline" href="/privacidade">
            {s.saibaMaisPrivacidade}
          </a>
          ,{' '}
          <a className="text-primary hover:underline" href="/termos">
            {s.saibaMaisTermos}
          </a>{' '}
          e{' '}
          <a className="text-primary hover:underline" href="/metodologia">
            {s.saibaMaisMetodologia}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-label={s.ariaNovo} className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">{s.novoPedido}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="dsr-type" className="block text-sm text-foreground/70 mb-1">
              {s.direito}
            </label>
            <select
              id="dsr-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {s.types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dsr-jur" className="block text-sm text-foreground/70 mb-1">
              {s.jurisdicao}
            </label>
            <select
              id="dsr-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {s.jurisdictions.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="block text-sm text-foreground/70 mb-1">{s.escopo}</legend>
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
              {s.descricao} <span className="text-foreground/40">{s.opcional}</span>
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
            {busy ? s.enviando : s.registrar}
          </button>
        </form>
        <p className="sr-only" aria-live="polite">{msg}</p>
        {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      </section>

      <section aria-label={s.ariaPedidos} className="max-w-2xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">{s.meusPedidos}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-foreground/60">{s.nenhumPedido}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.protocol} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-primary break-all">{it.protocol}</code>
                  <span className="text-foreground/70">{s.status[it.status] ?? it.status}</span>
                </div>
                <p className="text-foreground/60 mt-1">
                  {s.types.find((t) => t.value === it.type)?.label ?? it.type} ·{' '}
                  {it.deadlineAt ? `${s.prazoPrefix} ${new Date(it.deadlineAt).toLocaleDateString()}` : ''}
                </p>
                {['received', 'needs_verification', 'in_progress'].includes(it.status) && (
                  <button
                    onClick={() => void cancel(it.protocol)}
                    disabled={busy}
                    className="mt-2 text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {s.cancelar}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={s.ariaPortabilidade} className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-3">{s.exportar}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => void download('json')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            {s.baixarJson}
          </button>
          <button
            onClick={() => void download('csv')}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            {s.baixarCsv}
          </button>
        </div>
      </section>

      <section aria-label={s.ariaExcluir} className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-3">{s.excluirTitle}</h2>
        <p className="text-sm text-foreground/60 mb-3">{s.excluirExplicacao}</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="del-confirm" className="block text-sm text-foreground/70 mb-1">
              {s.digiteExatamente} <code>{s.excluirFrase}</code>
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
              {s.suaSenha}
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
            disabled={busy || confirmText !== s.excluirFrase || !password}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {s.excluirBtn}
          </button>
        </div>
      </section>
    </div>
  );
}
