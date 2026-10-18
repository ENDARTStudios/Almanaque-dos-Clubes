'use client';
/**
 * WS-C-9 — botão/fluxo "Sou editor deste clube" com os gates C1–C4.
 * POST /clubs/:id/own com evidência (C2): nasce 'pending' — revisão humana em
 * até 5 dias úteis (C3). O formulário mostra os critérios antes do envio
 * (copy honesta — nada de aprovação automática escondida) e os erros novos
 * da API viram mensagens i18n por código (PLAN_REQUIRED, EVIDENCE_REQUIRED…).
 * DELETE /clubs/:id/own permanece imediato (sair é sempre possível).
 */
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ClubCommunityStrings } from '@/i18n/wsC9';

interface Props {
  clubId: string;
  isOwner: boolean;
  s: ClubCommunityStrings;
  loggedIn: boolean;
  onChanged: (nowOwner: boolean) => void;
}

/** Traduz o código de domínio da API para mensagem i18n (fallback: mensagem bruta). */
export function ownershipErrorMessage(err: unknown, s: ClubCommunityStrings): string {
  const code = (err as { code?: string } | undefined)?.code;
  switch (code) {
    case 'PLAN_REQUIRED':
      return s.errPlanRequired;
    case 'EVIDENCE_REQUIRED':
      return s.errEvidenceRequired;
    case 'MANUAL_CURATION_REQUIRED':
      return s.errManualCuration;
    case 'CLUB_EDITORS_FULL':
      return s.errEditorsFull;
    case 'OWNERSHIP_REVOKED':
      return s.errOwnershipRevoked;
    case 'OWNERSHIP_PENDING_REVIEW':
      return s.errOwnershipPending;
    case 'OWNERSHIP_SUSPENDED':
      return s.errOwnershipSuspended;
    default:
      return err instanceof Error && err.message ? err.message : s.errGeneric;
  }
}

export default function ClubOwnerButton({ clubId, isOwner, s, loggedIn, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  if (!loggedIn) {
    return (
      <p className="text-sm text-foreground/60">
        {s.loginToBecome}{' '}
        <Link href="/auth/login" className="text-primary-ink hover:underline">
          {s.loginLink}
        </Link>
      </p>
    );
  }

  async function submitClaim(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post<{ data: { created: boolean; status: string } }>(`/clubs/${clubId}/own`, {
        evidenceUrl: evidenceUrl.trim() || undefined,
        evidenceNote: evidenceNote.trim() || undefined,
      });
      setFormOpen(false);
      setSent(true);
      onChanged(false); // recarrega: a posse existe, mas pendente (não é owner ativo)
    } catch (err) {
      setError(ownershipErrorMessage(err, s));
    } finally {
      setBusy(false);
    }
  }

  async function leave(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/clubs/${clubId}/own`);
      setSent(false);
      onChanged(false);
    } catch (err) {
      setError(ownershipErrorMessage(err, s));
    } finally {
      setBusy(false);
    }
  }

  if (isOwner) {
    return (
      <div>
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          data-testid="club-leave-owner"
          className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition disabled:opacity-50"
        >
          {s.leaveOwner}
        </button>
        {error && (
          <p role="alert" className="text-xs text-danger-ink mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!formOpen) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setFormOpen(true);
            setSent(false);
            setError('');
          }}
          data-testid="club-become-owner"
          className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {s.becomeOwner}
        </button>
        {sent && (
          <p role="status" className="text-xs text-success-ink mt-1">
            {s.claimSent}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger-ink mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submitClaim}
      data-testid="club-ownership-form"
      className="w-full max-w-md rounded-xl border border-border bg-muted p-4 space-y-3"
    >
      <h4 className="font-heading text-base font-bold text-foreground">{s.becomeOwnerTitle}</h4>
      <p className="text-xs text-foreground/70">{s.criteriaIntro}</p>
      <ul className="text-xs text-foreground/70 space-y-1 list-disc pl-4">
        <li>{s.criteriaElite}</li>
        <li>{s.criteriaEvidence}</li>
        <li>{s.criteriaReview}</li>
      </ul>
      <div>
        <label htmlFor="club-evidence-url" className="block text-xs font-semibold text-ink-2 mb-1">
          {s.evidenceUrlLabel}
        </label>
        <input
          id="club-evidence-url"
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder={s.evidenceUrlPlaceholder}
          maxLength={500}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>
      <div>
        <label htmlFor="club-evidence-note" className="block text-xs font-semibold text-ink-2 mb-1">
          {s.evidenceNoteLabel}
        </label>
        <textarea
          id="club-evidence-note"
          value={evidenceNote}
          onChange={(e) => setEvidenceNote(e.target.value)}
          placeholder={s.evidenceNotePlaceholder}
          maxLength={1000}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          data-testid="club-ownership-submit"
          className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? s.submitting : s.submitClaim}
        </button>
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className="text-sm underline text-foreground/60"
        >
          {s.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-ink">
          {error}
        </p>
      )}
    </form>
  );
}
