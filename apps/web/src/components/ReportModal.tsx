'use client';
/**
 * WS-C-11 — modal acessível de denúncia.
 * POST /reports — reason enum + details opcional (máx 1000, texto puro).
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ReportStrings } from '@/i18n/wsC11';

const MAX = 1000;

interface Props {
  clubId: string;
  s: ReportStrings;
  onClose: () => void;
  onSent: () => void;
}

export default function ReportModal({ clubId, s, onClose, onSent }: Props) {
  const [reason, setReason] = useState<
    'spam' | 'offensive' | 'misinformation' | 'copyright' | 'other'
  >('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function send(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await api.post('/reports', {
        targetType: 'club_description',
        targetId: clubId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      onSent();
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
        className="bg-background rounded-2xl shadow-xl max-w-md w-full p-6 text-foreground border border-border/50"
      >
        <h2 className="text-lg font-heading font-bold mb-4">{s.modalTitle}</h2>

        <label className="block text-sm font-medium mb-1.5" htmlFor="report-reason">
          {s.reasonLabel}
        </label>
        <select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as typeof reason)}
          data-testid="report-reason"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-4 bg-background"
        >
          <option value="spam">{s.reasons.spam}</option>
          <option value="offensive">{s.reasons.offensive}</option>
          <option value="misinformation">{s.reasons.misinformation}</option>
          <option value="copyright">{s.reasons.copyright}</option>
          <option value="other">{s.reasons.other}</option>
        </select>

        <label className="block text-sm font-medium mb-1.5" htmlFor="report-details">
          {s.detailsLabel}
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={MAX}
          rows={4}
          placeholder={s.detailsPlaceholder}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-1"
        />
        <div className="text-xs text-foreground/40 text-right mb-3">
          {details.length}/{MAX}
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-500 mb-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
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
            disabled={busy}
            data-testid="report-send"
            className="text-sm bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? s.sending : s.send}
          </button>
        </div>
      </div>
    </div>
  );
}
