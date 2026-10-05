import type { Locale } from './config';

/**
 * WS-C-8 — strings das notificações de usuário (badge, dropdown, /notifications).
 * Módulo ADITIVO (não altera o Dictionary global).
 */
export interface WsC8Strings {
  notifications: {
    title: string;
    empty: string;
    loading: string;
    markAllRead: string;
    newTitle: string;
    newCompetition: string;
    rankingChange: string;
    system: string;
    proposalReview: string;
    unreadOnly: string;
    all: string;
    backToNotifications: string;
  };
}

export const wsC8Strings: Record<Locale, WsC8Strings> = {
  'pt-br': {
    notifications: {
      title: 'Notificações',
      empty: 'Nenhuma notificação',
      loading: 'Carregando…',
      markAllRead: 'Marcar todas como lidas',
      newTitle: 'Novo título',
      newCompetition: 'Nova competição',
      rankingChange: 'Mudança no ranking',
      system: 'Sistema',
      proposalReview: 'Proposta revisada',
      unreadOnly: 'Não lidas',
      all: 'Todas',
      backToNotifications: '← Notificações',
    },
  },
  'en-us': {
    notifications: {
      title: 'Notifications',
      empty: 'No notifications',
      loading: 'Loading…',
      markAllRead: 'Mark all as read',
      newTitle: 'New title',
      newCompetition: 'New competition',
      rankingChange: 'Ranking change',
      system: 'System',
      proposalReview: 'Proposal reviewed',
      unreadOnly: 'Unread',
      all: 'All',
      backToNotifications: '← Notifications',
    },
  },
  'es-es': {
    notifications: {
      title: 'Notificaciones',
      empty: 'Sin notificaciones',
      loading: 'Cargando…',
      markAllRead: 'Marcar todas como leídas',
      newTitle: 'Nuevo título',
      newCompetition: 'Nueva competición',
      rankingChange: 'Cambio en el ranking',
      system: 'Sistema',
      proposalReview: 'Propuesta revisada',
      unreadOnly: 'No leídas',
      all: 'Todas',
      backToNotifications: '← Notificaciones',
    },
  },
};

/** Rótulo por type (fallback: o próprio type). */
export function notificationTypeLabel(type: string, s: WsC8Strings['notifications']): string {
  const map: Record<string, string> = {
    new_title: s.newTitle,
    new_competition: s.newCompetition,
    ranking_change: s.rankingChange,
    system: s.system,
    proposal_reviewed: s.proposalReview,
  };
  return map[type] ?? type;
}
