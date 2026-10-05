'use client';
/**
 * WS-C-10 — modal acessível de proposta de edição.
 * POST /clubs/:id/description/proposals — 201 pending | 200 auto-aprovado (editor).
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ProposalStrings } from '@/i18n/wsC10';

const MIN = 10;
const MAX = 2000;

interface Props {
  clubId: string;
  s: ProposalStrings;
  onClose: () => void;
  onSent: (status: 'pending' | 'approved') => void;
}

export default function ProposalModal({ clubId, s, onClose, onSent }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Foco no textarea ao abrir + fecha com Escape (acessibilidade básica).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSend = text.trim().length >= MIN && text.trim().length <= MAX && !busy;

  async function send(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{ data: { status: 'pending' | 'approved' } }>(
        `/clubs/${clubId}/description/proposals`,
        { userDescription: text },
      );
      onSent(res.data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={s.modalTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-background rounded-2xl shadow-xl max-w-lg w-full p-6 text-foreground border border-border/50"
      >
        <h2 className="text-lg font-heading font-bold mb-3">{s.modalTitle}</h2>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          rows={6}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        />
        <div className="flex justify-between text-xs text-foreground/40 mt-1">
          <span>
            {text.trim().length}/{MAX} {s.chars} · {s.minChars}
          </span>
        </div>

        {text.trim().length > 0 && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-foreground/40 mb-1">{s.preview}</p>
            {/* pré-visualização em texto puro — a API sanitiza HTML */}
            <p className="text-sm text-foreground/80 whitespace-pre-line border border-border/50 rounded-lg p-3">
              {text}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-500 mt-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm underline text-foreground/60 px-3 py-1.5"
          >
            {s.cancel}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            data-testid="proposal-send"
            className="text-sm bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? s.sending : s.send}
          </button>
        </div>
      </div>
    </div>
  );
}
