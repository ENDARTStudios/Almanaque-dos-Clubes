'use client';
/**
 * WS-C-9 — botão "Sou editor deste clube" / "Deixar de ser editor".
 * POST /clubs/:id/own (auto-aprovado nesta fase) · DELETE /clubs/:id/own.
 * Erros viram mensagem inline (403 = não é editor; 401 = não logado).
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

export default function ClubOwnerButton({ clubId, isOwner, s, loggedIn, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loggedIn) {
    return (
      <p className="text-sm text-foreground/60">
        {s.loginToBecome}{' '}
        <Link href="/auth/login" className="text-primary hover:underline">
          {s.loginLink}
        </Link>
      </p>
    );
  }

  async function become(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await api.post(`/clubs/${clubId}/own`);
      onChanged(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  async function leave(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/clubs/${clubId}/own`);
      onChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {isOwner ? (
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          data-testid="club-leave-owner"
          className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-all disabled:opacity-50"
        >
          {s.leaveOwner}
        </button>
      ) : (
        <button
          type="button"
          onClick={become}
          disabled={busy}
          data-testid="club-become-owner"
          className="text-sm bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {s.becomeOwner}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
