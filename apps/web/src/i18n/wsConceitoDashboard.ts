import type { Locale } from './config';

/** Copy do /dashboard (Meu Almanaque) no conceito FICHA. Módulo aditivo. */
export interface ConceitoDashboardStrings {
  kicker: string;
  title: string;
  subtitle: string;
  anchorLabel: string;
  myAlmanaque: string;
  accountTitle: string;
  columns: { item: string; status: string; detail: string; action: string };
  rows: {
    plan: string;
    planDetail: string;
    planAction: string;
    profile: string;
    profileStatus: string;
    profileDetail: string;
    notifications: string;
    notificationsDetail: string;
    notificationsAction: string;
    proposals: string;
    proposalsDetail: string;
    ownedClubs: string;
    ownedClubsDetail: string;
    history: string;
    historyDetail: string;
    historyAction: string;
  };
  allRead: string;
  unread: string;
  pending: string;
  recommendations: string;
  cards: { clubs: string; competitions: string; players: string; notifications: string };
  recentFavorites: string;
}

export const wsConceitoDashboard: Record<Locale, ConceitoDashboardStrings> = {
  'pt-br': {
    kicker: 'Sua conta · painel',
    title: 'Meu Almanaque',
    subtitle: 'O que você acompanha, o que mudou e o estado da sua conta.',
    anchorLabel: 'itens seguidos',
    myAlmanaque: 'Meu Almanaque',
    accountTitle: 'Conta e assinatura',
    columns: { item: 'Item', status: 'Situação', detail: 'Detalhe', action: 'Ação' },
    rows: {
      plan: 'Plano',
      planDetail: 'assinatura, renovação e recibos',
      planAction: 'gerenciar',
      profile: 'Perfil',
      profileStatus: 'Em breve',
      profileDetail: 'nome, e-mail e bio',
      notifications: 'Notificações',
      notificationsDetail: 'e-mail e alertas do acervo',
      notificationsAction: 'ajustar',
      proposals: 'Propostas',
      proposalsDetail: 'enviadas por você para revisão',
      ownedClubs: 'Clubes editados',
      ownedClubsDetail: 'modo clube',
      history: 'Histórico',
      historyDetail: 'consultas e alterações da conta',
      historyAction: 'ver',
    },
    allRead: 'tudo lido',
    unread: 'não lidas',
    pending: 'pendentes',
    recommendations: 'recomendações',
    cards: {
      clubs: 'Clubes favoritos',
      competitions: 'Competições',
      players: 'Jogadores',
      notifications: 'Notificações',
    },
    recentFavorites: 'Favoritos recentes',
  },
  'en-us': {
    kicker: 'Your account · panel',
    title: 'My Almanaque',
    subtitle: 'What you follow, what changed and the state of your account.',
    anchorLabel: 'followed items',
    myAlmanaque: 'My Almanaque',
    accountTitle: 'Account and subscription',
    columns: { item: 'Item', status: 'Status', detail: 'Detail', action: 'Action' },
    rows: {
      plan: 'Plan',
      planDetail: 'subscription, renewal and receipts',
      planAction: 'manage',
      profile: 'Profile',
      profileStatus: 'Coming soon',
      profileDetail: 'name, e-mail and bio',
      notifications: 'Notifications',
      notificationsDetail: 'e-mail and archive alerts',
      notificationsAction: 'adjust',
      proposals: 'Proposals',
      proposalsDetail: 'sent by you for review',
      ownedClubs: 'Edited clubs',
      ownedClubsDetail: 'club mode',
      history: 'History',
      historyDetail: 'lookups and account changes',
      historyAction: 'view',
    },
    allRead: 'all read',
    unread: 'unread',
    pending: 'pending',
    recommendations: 'recommendations',
    cards: {
      clubs: 'Favourite clubs',
      competitions: 'Competitions',
      players: 'Players',
      notifications: 'Notifications',
    },
    recentFavorites: 'Recent favourites',
  },
  'es-es': {
    kicker: 'Tu cuenta · panel',
    title: 'Mi Almanaque',
    subtitle: 'Lo que sigues, lo que cambió y el estado de tu cuenta.',
    anchorLabel: 'elementos seguidos',
    myAlmanaque: 'Mi Almanaque',
    accountTitle: 'Cuenta y suscripción',
    columns: { item: 'Elemento', status: 'Situación', detail: 'Detalle', action: 'Acción' },
    rows: {
      plan: 'Plan',
      planDetail: 'suscripción, renovación y recibos',
      planAction: 'gestionar',
      profile: 'Perfil',
      profileStatus: 'Próximamente',
      profileDetail: 'nombre, correo y bio',
      notifications: 'Notificaciones',
      notificationsDetail: 'correo y alertas del acervo',
      notificationsAction: 'ajustar',
      proposals: 'Propuestas',
      proposalsDetail: 'enviadas por ti para revisión',
      ownedClubs: 'Clubes editados',
      ownedClubsDetail: 'modo club',
      history: 'Historial',
      historyDetail: 'consultas y cambios de la cuenta',
      historyAction: 'ver',
    },
    allRead: 'todo leído',
    unread: 'sin leer',
    pending: 'pendientes',
    recommendations: 'recomendaciones',
    cards: {
      clubs: 'Clubes favoritos',
      competitions: 'Competiciones',
      players: 'Jugadores',
      notifications: 'Notificaciones',
    },
    recentFavorites: 'Favoritos recientes',
  },
};
