/**
 * WS-C-11 — denúncias (moderação defensiva). Strings ×3.
 */
export interface ReportStrings {
  report: string;
  reportedAlready: string;
  modalTitle: string;
  reasonLabel: string;
  reasons: Record<'spam' | 'offensive' | 'misinformation' | 'copyright' | 'other', string>;
  detailsLabel: string;
  detailsPlaceholder: string;
  send: string;
  sending: string;
  cancel: string;
  sent: string;
  nothingToReport: string;
  dashboardTitle: string;
  noReports: string;
  resolve: string;
  dismiss: string;
  removeContent: string;
  warnUser: string;
  suspendUser: string;
  noAction: string;
  actionLabel: string;
  notePlaceholder: string;
  confirmRemove: string;
  reviewing: string;
  count: string;
  backToDashboard: string;
}

export const wsC11Strings: Record<'pt-br' | 'en-us' | 'es-es', { reports: ReportStrings }> = {
  'pt-br': {
    reports: {
      report: 'Denunciar',
      reportedAlready: 'Você já denunciou este conteúdo.',
      modalTitle: 'Denunciar conteúdo',
      reasonLabel: 'Motivo',
      reasons: {
        spam: 'Spam',
        offensive: 'Conteúdo ofensivo',
        misinformation: 'Desinformação',
        copyright: 'Violação de direitos autorais',
        other: 'Outro',
      },
      detailsLabel: 'Detalhes (opcional)',
      detailsPlaceholder: 'Conte o problema (máx. 1000 caracteres)…',
      send: 'Enviar denúncia',
      sending: 'Enviando…',
      cancel: 'Cancelar',
      sent: 'Denúncia enviada. Nossa equipe de moderação vai revisar.',
      nothingToReport: 'Nada a denunciar aqui.',
      dashboardTitle: 'Denúncias pendentes',
      noReports: 'Nenhuma denúncia pendente.',
      resolve: 'Resolver',
      dismiss: 'Descartar',
      removeContent: 'Remover conteúdo',
      warnUser: 'Advertir usuário',
      suspendUser: 'Suspender usuário',
      noAction: 'Sem ação',
      actionLabel: 'Ação',
      notePlaceholder: 'Nota da revisão (opcional)…',
      confirmRemove: 'Confirma remover o conteúdo denunciado?',
      reviewing: 'Processando…',
      count: 'denúncias',
      backToDashboard: '← Voltar ao painel',
    },
  },
  'en-us': {
    reports: {
      report: 'Report',
      reportedAlready: 'You already reported this content.',
      modalTitle: 'Report content',
      reasonLabel: 'Reason',
      reasons: {
        spam: 'Spam',
        offensive: 'Offensive content',
        misinformation: 'Misinformation',
        copyright: 'Copyright infringement',
        other: 'Other',
      },
      detailsLabel: 'Details (optional)',
      detailsPlaceholder: 'Describe the problem (max. 1000 characters)…',
      send: 'Send report',
      sending: 'Sending…',
      cancel: 'Cancel',
      sent: 'Report sent. Our moderation team will review it.',
      nothingToReport: 'Nothing to report here.',
      dashboardTitle: 'Pending reports',
      noReports: 'No pending reports.',
      resolve: 'Resolve',
      dismiss: 'Dismiss',
      removeContent: 'Remove content',
      warnUser: 'Warn user',
      suspendUser: 'Suspend user',
      noAction: 'No action',
      actionLabel: 'Action',
      notePlaceholder: 'Review note (optional)…',
      confirmRemove: 'Remove the reported content?',
      reviewing: 'Processing…',
      count: 'reports',
      backToDashboard: '← Back to dashboard',
    },
  },
  'es-es': {
    reports: {
      report: 'Denunciar',
      reportedAlready: 'Ya denunciaste este contenido.',
      modalTitle: 'Denunciar contenido',
      reasonLabel: 'Motivo',
      reasons: {
        spam: 'Spam',
        offensive: 'Contenido ofensivo',
        misinformation: 'Desinformación',
        copyright: 'Violación de derechos de autor',
        other: 'Otro',
      },
      detailsLabel: 'Detalles (opcional)',
      detailsPlaceholder: 'Cuenta el problema (máx. 1000 caracteres)…',
      send: 'Enviar denuncia',
      sending: 'Enviando…',
      cancel: 'Cancelar',
      sent: 'Denuncia enviada. Nuestro equipo de moderación la revisará.',
      nothingToReport: 'Nada que denunciar aquí.',
      dashboardTitle: 'Denuncias pendientes',
      noReports: 'No hay denuncias pendientes.',
      resolve: 'Resolver',
      dismiss: 'Descartar',
      removeContent: 'Eliminar contenido',
      warnUser: 'Advertir al usuario',
      suspendUser: 'Suspender usuario',
      noAction: 'Sin acción',
      actionLabel: 'Acción',
      notePlaceholder: 'Nota de revisión (opcional)…',
      confirmRemove: '¿Confirmas eliminar el contenido denunciado?',
      reviewing: 'Procesando…',
      count: 'denuncias',
      backToDashboard: '← Volver al panel',
    },
  },
};
