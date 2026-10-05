'use client';
/**
 * WS-C-9 — editor da descrição comunitária (só visível para owners ativos).
 * PATCH /clubs/:id/description — server sanitiza (sem HTML) e valida 2000 chars.
 */
import { useState } from 'react';
import { api } from '@/lib/api';
import type { ClubCommunityStrings } from '@/i18n/wsC9';

const MAX = 2000;

interface Props {
  clubId: string;
  initial: string;
  s: ClubCommunityStrings;
  onSaved: (text: string) => void;
}

export default function ClubDescriptionEditor({ clubId, initial, s, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function save(): Promise<void> {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.patch<{ data: { userDescription: string } }>(
        `/clubs/${clubId}/description`,
        { userDescription: text },
      );
      onSaved(res.data.userDescription);
      setOpen(false);
      setFeedback({ ok: true, msg: s.saved });
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setText(initial);
            setOpen(true);
            setFeedback(null);
          }}
          data-testid="club-edit-description"
          className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-all"
        >
          {s.editDescription}
        </button>
        {feedback && (
          <p
            role="status"
            className={`text-xs mt-1 ${feedback.ok ? 'text-green-600' : 'text-red-500'}`}
          >
            {feedback.msg}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-testid="club-description-editor">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={5}
        placeholder={s.placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
      />
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-foreground/40">
          {text.length}/{MAX}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          data-testid="club-save-description"
          className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? s.saving : s.save}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm underline text-foreground/60"
        >
          {s.cancel}
        </button>
      </div>
      {feedback && !feedback.ok && (
        <p role="alert" className="text-xs text-red-500 mt-1">
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
