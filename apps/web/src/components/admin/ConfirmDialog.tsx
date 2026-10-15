'use client';

import { useEffect, useRef } from 'react';

/**
 * T-ADMIN — modal de confirmação de ação destrutiva.
 *
 * Estrutura copiada do `SubscriptionManager` (T464), que é o padrão acessível já
 * validado no projeto — mesma promessa, generalizada para reuso:
 *
 * - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`/`aria-describedby`;
 * - foco INICIAL no botão SEGURO (o default nunca é o destrutivo);
 * - `Escape` fecha;
 * - `Tab`/`Shift+Tab` presos no diálogo (não escapa para a página atrás);
 * - clique no backdrop fecha (o `onClick` compara `target` com `currentTarget`).
 *
 * Acrescenta uma coisa que o original não tinha: ao fechar, o foco VOLTA para o elemento
 * que abriu o diálogo. Sem isso, quem navega por teclado cai no início do documento
 * depois de cancelar. O componente é montado só enquanto aberto (o pai usa
 * `{alvo && <ConfirmDialog …/>}`), então o efeito de montagem é o momento certo para
 * capturar o foco anterior e instalar os listeners.
 *
 * O callback de cancelamento vive num ref atualizado por efeito: os listeners são
 * instalados UMA vez por montagem (deps `[]`), mas sempre chamam a versão mais recente
 * do `onCancel` — sem reinstalar a cada render do pai.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  testId = 'admin-confirm',
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  testId?: string;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const safeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef(onCancel);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    // Guarda quem abriu para devolver o foco no fechamento + foco no botão SEGURO.
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    safeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelRef.current();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(nodes).filter((n) => !n.hasAttribute('disabled'));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-desc"
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        data-testid={testId}
      >
        <h3
          id="admin-confirm-title"
          className="text-lg font-heading font-semibold text-foreground mb-2"
        >
          {title}
        </h3>
        <p id="admin-confirm-desc" className="text-sm text-ink-2 mb-5">
          {body}
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            ref={safeBtnRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-6 border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-6 bg-danger-ink text-on-danger px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            data-testid={`${testId}-yes`}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
