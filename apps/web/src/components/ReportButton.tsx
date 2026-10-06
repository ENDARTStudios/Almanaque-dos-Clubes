'use client';
/**
 * WS-C-11 — botão de denúncia (ícone de bandeira) na seção Comunidade.
 * Estados: anônimo (não mostra) · já denunciou (disabled) · botão que abre o
 * ReportModal. Erros da API (ex.: nada a denunciar) viram mensagem inline.
 */
import { useState } from 'react';
import Link from 'next/link';
import type { ReportStrings } from '@/i18n/wsC11';
import ReportModal from './ReportModal';

interface Props {
  clubId: string;
  hasReported: boolean | undefined;
  loggedIn: boolean;
  s: ReportStrings;
  onReported: () => void;
}

export default function ReportButton({ clubId, hasReported, loggedIn, s, onReported }: Props) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!loggedIn) return null;
  if (hasReported || done) {
    return (
      <p className="text-xs text-foreground/40" data-testid="club-reported-already">
        {s.reportedAlready}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="club-report-open"
        className="text-xs text-foreground/50 hover:text-red-600 transition-colors underline decoration-dotted"
      >
        ⚑ {s.report}
      </button>
      {open && (
        <ReportModal
          clubId={clubId}
          s={s}
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setDone(true);
            onReported();
          }}
        />
      )}
      {!open && done === false && hasReported === undefined && (
        <span className="hidden">
          <Link href="/auth/login">login</Link>
        </span>
      )}
    </div>
  );
}
