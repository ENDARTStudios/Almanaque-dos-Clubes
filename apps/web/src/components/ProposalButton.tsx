'use client';
/**
 * WS-C-10 — botão/estado de proposta para não-editors.
 * Estados: anônimo (link p/ login) · pending (status, desabilitado) ·
 * botão "Propor edição" (abre o modal).
 */
import { useState } from 'react';
import Link from 'next/link';
import ProposalModal from './ProposalModal';
import type { ProposalStrings } from '@/i18n/wsC10';

interface Props {
  clubId: string;
  proposalStatus: 'none' | 'pending' | 'approved' | 'rejected' | null | undefined;
  s: ProposalStrings;
  loggedIn: boolean;
  onProposalChange: () => void;
}

export default function ProposalButton({
  clubId,
  proposalStatus,
  s,
  loggedIn,
  onProposalChange,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!loggedIn) {
    return (
      <p className="text-sm text-foreground/60">
        {s.proposeLogin}{' '}
        <Link href="/auth/login" className="text-primary hover:underline">
          {s.loginLink}
        </Link>
      </p>
    );
  }

  if (proposalStatus === 'pending') {
    return (
      <p className="text-sm text-foreground/60" data-testid="proposal-pending">
        {s.pendingReview}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="proposal-open"
        className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-all"
      >
        {s.propose}
      </button>
      {open && (
        <ProposalModal
          clubId={clubId}
          s={s}
          onClose={() => setOpen(false)}
          onSent={(status) => {
            setOpen(false);
            onProposalChange();
            void status;
          }}
        />
      )}
    </div>
  );
}
