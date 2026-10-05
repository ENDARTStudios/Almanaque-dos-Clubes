/**
 * WS-C-10 — propostas de edição da descrição (comunidade colaborativa).
 * Mesmo padrão de wsC9: módulo próprio ×3 locales.
 */
export interface ProposalStrings {
  propose: string;
  proposeLogin: string;
  loginLink: string;
  pendingReview: string;
  modalTitle: string;
  preview: string;
  send: string;
  sending: string;
  cancel: string;
  sentPending: string;
  sentApproved: string;
  dashboardTitle: string;
  noProposals: string;
  approve: string;
  reject: string;
  confirmApprove: string;
  reviewNotePlaceholder: string;
  reviewing: string;
  chars: string;
  minChars: string;
}

export const wsC10Strings: Record<'pt-br' | 'en-us' | 'es-es', { proposals: ProposalStrings }> = {
  'pt-br': {
    proposals: {
      propose: 'Propor edição',
      proposeLogin: 'Entre para propor uma edição desta descrição.',
      loginLink: 'Entrar',
      pendingReview: 'Sua proposta está em revisão.',
      modalTitle: 'Propor edição da descrição',
      preview: 'Pré-visualização',
      send: 'Enviar proposta',
      sending: 'Enviando…',
      cancel: 'Cancelar',
      sentPending: 'Proposta enviada! Aguardando revisão de um editor.',
      sentApproved: 'Proposta aplicada (você é editor do clube).',
      dashboardTitle: 'Propostas pendentes',
      noProposals: 'Nenhuma proposta pendente.',
      approve: 'Aprovar',
      reject: 'Rejeitar',
      confirmApprove: 'Aprovar e aplicar esta descrição?',
      reviewNotePlaceholder: 'Motivo da rejeição (opcional)…',
      reviewing: 'Revisando…',
      chars: 'caracteres',
      minChars: 'mín. 10',
    },
  },
  'en-us': {
    proposals: {
      propose: 'Suggest an edit',
      proposeLogin: 'Sign in to suggest an edit to this description.',
      loginLink: 'Sign in',
      pendingReview: 'Your proposal is under review.',
      modalTitle: 'Suggest a description edit',
      preview: 'Preview',
      send: 'Send proposal',
      sending: 'Sending…',
      cancel: 'Cancel',
      sentPending: 'Proposal sent! Waiting for an editor review.',
      sentApproved: 'Proposal applied (you are an editor of this club).',
      dashboardTitle: 'Pending proposals',
      noProposals: 'No pending proposals.',
      approve: 'Approve',
      reject: 'Reject',
      confirmApprove: 'Approve and apply this description?',
      reviewNotePlaceholder: 'Rejection reason (optional)…',
      reviewing: 'Reviewing…',
      chars: 'characters',
      minChars: 'min. 10',
    },
  },
  'es-es': {
    proposals: {
      propose: 'Proponer edición',
      proposeLogin: 'Inicia sesión para proponer una edición de esta descripción.',
      loginLink: 'Iniciar sesión',
      pendingReview: 'Tu propuesta está en revisión.',
      modalTitle: 'Proponer edición de la descripción',
      preview: 'Vista previa',
      send: 'Enviar propuesta',
      sending: 'Enviando…',
      cancel: 'Cancelar',
      sentPending: '¡Propuesta enviada! Esperando revisión de un editor.',
      sentApproved: 'Propuesta aplicada (eres editor del club).',
      dashboardTitle: 'Propuestas pendientes',
      noProposals: 'No hay propuestas pendientes.',
      approve: 'Aprobar',
      reject: 'Rechazar',
      confirmApprove: '¿Aprobar y aplicar esta descripción?',
      reviewNotePlaceholder: 'Motivo del rechazo (opcional)…',
      reviewing: 'Revisando…',
      chars: 'caracteres',
      minChars: 'mín. 10',
    },
  },
};
