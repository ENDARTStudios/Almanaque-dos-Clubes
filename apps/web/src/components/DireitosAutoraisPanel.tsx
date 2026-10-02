'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

// T470 — notificação/contranotificação autoral (Lei 9.610/98 + análoga).
// SEM safe harbor formal EUA. Logado = formulários com protocolo; deslogado =
// orientação + canal manual. Sem e-mail automático.

interface Notice {
  protocol: string;
  type: string;
  status: string;
  workTitle: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  received: 'Recebida',
  under_review: 'Em análise',
  action_taken: 'Providência adotada',
  rejected: 'Indeferida',
  closed: 'Encerrada',
};

export default function DireitosAutoraisPanel() {
  const { status } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [workTitle, setWorkTitle] = useState('');
  const [workUrl, setWorkUrl] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [description, setDescription] = useState('');
  const [signature, setSignature] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [counterOf, setCounterOf] = useState('');
  const [counterText, setCounterText] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Notice[] }>('/legal/copyright/notices');
      setItems(res.data);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    if (status === 'authed') void load();
  }, [status, load]);

  async function submitNotice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Notice }>('/legal/copyright/notices', {
        workTitle,
        workUrl: workUrl || undefined,
        materialUrl,
        description,
        goodFaithDeclaration: goodFaith,
        accuracyDeclaration: accuracy,
        signatureText: signature,
      });
      setMsg(`Notificação registrada. Protocolo: ${res.data.protocol}`);
      setWorkTitle('');
      setWorkUrl('');
      setMaterialUrl('');
      setDescription('');
      setSignature('');
      setGoodFaith(false);
      setAccuracy(false);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro ao registrar.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCounter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: Notice }>(
        `/legal/copyright/notices/${encodeURIComponent(counterOf)}/counter`,
        {
          description: counterText,
          goodFaithDeclaration: true,
          accuracyDeclaration: true,
          signatureText: signature || 'Titular autenticado',
        },
      );
      setMsg(`Contranotificação registrada. Protocolo: ${res.data.protocol}`);
      setCounterOf('');
      setCounterText('');
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro ao registrar.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') return <p className="text-foreground/60">Carregando…</p>;
  if (status !== 'authed') {
    return (
      <div className="space-y-4 text-foreground/70 leading-relaxed">
        <p>
          Envie notificações pelo fluxo com protocolo <strong>entrando na sua conta</strong>. Sem
          conta, use o canal manual:{' '}
          <a className="text-primary hover:underline" href="mailto:endart.studios@gmail.com">
            endart.studios@gmail.com
          </a>{' '}
          com: identificação da obra, URL exata, dados do titular/representante, declaração de
          boa-fé, declaração de exatidão e contato.
        </p>
        <div className="rounded-xl border border-border p-4 text-sm">
          <p className="font-semibold text-foreground mb-1">Enquadramento</p>
          <p>
            Este é um processo interno de notificação/contranotificação à luz da <strong>Lei
            9.610/98</strong> e normas análogas. <strong>Não há agente DMCA registrado nos EUA</strong> e não se invoca
            procedimento formal de safe harbor americano.
          </p>
          <p className="mt-2">
            Reincidentes: análise manual, com suspensão/encerramento proporcional se comprovado —
            sem automação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-label="Notificação" className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">
          Notificação de violação
        </h2>
        <form onSubmit={submitNotice} className="space-y-4">
          <div>
            <label htmlFor="n-work" className="block text-sm text-foreground/70 mb-1">Obra</label>
            <input id="n-work" required value={workTitle} onChange={(e) => setWorkTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label htmlFor="n-workurl" className="block text-sm text-foreground/70 mb-1">URL da obra (opcional)</label>
            <input id="n-workurl" type="url" value={workUrl} onChange={(e) => setWorkUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label htmlFor="n-mat" className="block text-sm text-foreground/70 mb-1">URL do material na plataforma</label>
            <input id="n-mat" type="url" required value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label htmlFor="n-desc" className="block text-sm text-foreground/70 mb-1">Descrição</label>
            <textarea id="n-desc" rows={3} required maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <label className="flex items-start gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={goodFaith} onChange={(e) => setGoodFaith(e.target.checked)} className="mt-0.5" />
            Declaro, de boa-fé, que o uso não é autorizado.
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={accuracy} onChange={(e) => setAccuracy(e.target.checked)} className="mt-0.5" />
            Declaro que as informações são exatas.
          </label>
          <div>
            <label htmlFor="n-sig" className="block text-sm text-foreground/70 mb-1">Assinatura (nome)</label>
            <input id="n-sig" required value={signature} onChange={(e) => setSignature(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          {err && <p className="text-sm text-red-500" role="alert">{err}</p>}
          <button type="submit" disabled={busy || !goodFaith || !accuracy}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {busy ? 'Enviando…' : 'Registrar notificação'}
          </button>
        </form>
      </section>

      <section aria-label="Contranotificação" className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Contranotificação</h2>
        <form onSubmit={submitCounter} className="space-y-4">
          <div>
            <label htmlFor="c-proto" className="block text-sm text-foreground/70 mb-1">Protocolo da notificação</label>
            <input id="c-proto" required value={counterOf} onChange={(e) => setCounterOf(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label htmlFor="c-desc" className="block text-sm text-foreground/70 mb-1">Justificativa</label>
            <textarea id="c-desc" rows={3} required maxLength={2000} value={counterText} onChange={(e) => setCounterText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <button type="submit" disabled={busy || !counterOf || counterText.length < 10}
            className="rounded-lg border border-border px-5 py-2 text-sm text-foreground hover:border-primary disabled:opacity-50">
            {busy ? 'Enviando…' : 'Registrar contranotificação'}
          </button>
        </form>
        <p className="sr-only" aria-live="polite">{msg}</p>
        {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      </section>

      <section aria-label="Minhas notificações" className="max-w-2xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Minhas notificações</h2>
        {items.length === 0 ? (
          <p className="text-sm text-foreground/60">Nenhuma notificação registrada.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.protocol} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-primary break-all">{it.protocol}</code>
                  <span className="text-foreground/70">{STATUS_LABEL[it.status] ?? it.status}</span>
                </div>
                <p className="text-foreground/60 mt-1">
                  {it.type === 'counter_notice' ? 'Contranotificação' : 'Notificação'} · {it.workTitle}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
