'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';

// T445 — formulário público de direitos do titular (LGPD art. 18).
// Sem login: a criação aceita auth opcional no backend e devolve um protocolo
// (token) para acompanhamento. A projeção de status NUNCA expõe email/notes.

interface CreateResult {
  data: { id: string; token: string; rightType: string; status: string; slaDueAt: string };
}
interface StatusResult {
  data: {
    id: string;
    rightType: string;
    status: string;
    createdAt: string;
    slaDueAt: string;
    deferredUntil: string | null;
  };
}

const RIGHT_TYPE_KEYS = [
  'confirmacao',
  'acesso',
  'correcao',
  'anonimizacao',
  'portabilidade',
  'eliminacao',
  'infoCompartilhamento',
  'infoConsequencia',
  'revisaoAutomatizada',
  'revogacao',
] as const;

// Valores exatos aceitos pela API (ver state-machine.ts do módulo privacy).
const RIGHT_TYPE_VALUES: Record<(typeof RIGHT_TYPE_KEYS)[number], string> = {
  confirmacao: 'confirmação',
  acesso: 'acesso',
  correcao: 'correção',
  anonimizacao: 'anonimização',
  portabilidade: 'portabilidade',
  eliminacao: 'eliminação',
  infoCompartilhamento: 'info_compartilhamento',
  infoConsequencia: 'info_consequência',
  revisaoAutomatizada: 'revisão_automatizada',
  revogacao: 'revogação',
};

export default function DireitosTitularForm() {
  const { dict } = useI18n();
  const d = dict.direitosTitular;

  const [rightType, setRightType] = useState<string>('confirmação');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);

  const [trackToken, setTrackToken] = useState('');
  const [trackResult, setTrackResult] = useState<StatusResult['data'] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<CreateResult>('/privacy-requests', {
        rightType,
        email,
        notes: notes || undefined,
      });
      setProtocol(res.data.token);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : d.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function track(token?: string) {
    const value = (token ?? trackToken).trim();
    if (!value) return;
    setTrackError(null);
    try {
      const res = await api.get<StatusResult>(`/privacy-requests/${encodeURIComponent(value)}`);
      setTrackResult(res.data);
    } catch {
      setTrackResult(null);
      setTrackError(d.notFound);
    }
  }

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString();

  if (protocol) {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-2">{d.successTitle}</h2>
        <p className="text-foreground/70 mb-4">{d.successBody}</p>
        <div className="rounded-xl border border-border p-4 mb-4">
          <p className="text-sm text-foreground/50 mb-1">{d.protocolLabel}</p>
          <code className="text-sm break-all text-primary">{protocol}</code>
        </div>
        <button
          onClick={() => {
            setTrackToken(protocol);
            void track(protocol);
          }}
          className="text-sm text-primary hover:underline"
        >
          {d.trackNow}
        </button>
        {trackError && <p className="mt-3 text-sm text-red-500">{trackError}</p>}
        {trackResult && (
          <dl className="mt-4 rounded-xl border border-border p-4 text-sm space-y-2">
            <div>
              <dt className="text-foreground/50 inline">{d.rightTypeLabel}: </dt>
              <dd className="inline text-foreground">{trackResult.rightType}</dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.statusLabel}: </dt>
              <dd className="inline text-foreground">
                {d.statusLabels[trackResult.status as keyof typeof d.statusLabels] ??
                  trackResult.status}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.createdAtLabel}: </dt>
              <dd className="inline text-foreground">{dateFmt(trackResult.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.slaLabel}: </dt>
              <dd className="inline text-foreground">
                {dateFmt(trackResult.deferredUntil ?? trackResult.slaDueAt)}
              </dd>
            </div>
          </dl>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-label={d.formTitle} className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">{d.formTitle}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="rightType" className="block text-sm text-foreground/70 mb-1">
              {d.rightTypeLabel}
            </label>
            <select
              id="rightType"
              value={rightType}
              onChange={(e) => setRightType(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {RIGHT_TYPE_KEYS.map((key) => (
                <option key={key} value={RIGHT_TYPE_VALUES[key]}>
                  {d.rightTypes[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-foreground/70 mb-1">
              {d.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm text-foreground/70 mb-1">
              {d.notesLabel} <span className="text-foreground/40">{d.notesOptional}</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? d.submitting : d.submit}
          </button>
        </form>
      </section>

      <section aria-label={d.trackTitle} className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">{d.trackTitle}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void track();
          }}
          className="space-y-3"
        >
          <label htmlFor="protocolo" className="block text-sm text-foreground/70 mb-1">
            {d.trackInputLabel}
          </label>
          <input
            id="protocolo"
            value={trackToken}
            onChange={(e) => setTrackToken(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <button
            type="submit"
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary"
          >
            {d.trackButton}
          </button>
        </form>
        {trackError && <p className="mt-3 text-sm text-red-500">{trackError}</p>}
        {trackResult && (
          <dl className="mt-4 rounded-xl border border-border p-4 text-sm space-y-2">
            <div>
              <dt className="text-foreground/50 inline">{d.rightTypeLabel}: </dt>
              <dd className="inline text-foreground">{trackResult.rightType}</dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.statusLabel}: </dt>
              <dd className="inline text-foreground">
                {d.statusLabels[trackResult.status as keyof typeof d.statusLabels] ??
                  trackResult.status}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.createdAtLabel}: </dt>
              <dd className="inline text-foreground">{dateFmt(trackResult.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-foreground/50 inline">{d.slaLabel}: </dt>
              <dd className="inline text-foreground">
                {dateFmt(trackResult.deferredUntil ?? trackResult.slaDueAt)}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
