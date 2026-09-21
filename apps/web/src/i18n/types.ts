import type { Locale } from './config';

export interface LegalSection {
  title: string;
  body: string[];
}

// Inventário real de cookies da Política de Cookies (/cookies) — T436.
export interface CookieInventoryRow {
  name: string;
  purpose: string;
  category: string;
  duration: string;
  form: string;
}

export interface Dictionary {
  site: {
    name: string;
    tagline: string;
    description: string;
  };
  nav: {
    clubs: string;
    players: string;
    competitions: string;
    map: string;
    rankings: string;
    search: string;
    login: string;
    dashboard: string;
    signOut: string;
    subscription: string;
  };
  footer: {
    tagline: string;
    platformTitle: string;
    platformClubs: string;
    platformPlayers: string;
    platformCompetitions: string;
    platformRankings: string;
    platformSearch: string;
    aboutTitle: string;
    aboutUs: string;
    plans: string;
    api: string;
    blog: string;
    contact: string;
    telegram: string;
    legalTitle: string;
    privacy: string;
    terms: string;
    cookies: string;
    security: string;
    copyright: string;
    dataSubjectRights: string;
    copyrightClaims: string;
  };
  /** T445 — formulário público de direitos do titular (LGPD art. 18). */
  direitosTitular: {
    title: string;
    intro: string;
    formTitle: string;
    rightTypeLabel: string;
    emailLabel: string;
    notesLabel: string;
    notesOptional: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    protocolLabel: string;
    trackNow: string;
    trackTitle: string;
    trackInputLabel: string;
    trackButton: string;
    notFound: string;
    errorGeneric: string;
    statusLabel: string;
    slaLabel: string;
    createdAtLabel: string;
    rightTypes: {
      confirmacao: string;
      acesso: string;
      correcao: string;
      anonimizacao: string;
      portabilidade: string;
      eliminacao: string;
      infoCompartilhamento: string;
      infoConsequencia: string;
      revisaoAutomatizada: string;
      revogacao: string;
    };
    statusLabels: {
      recebido: string;
      em_andamento: string;
      atendido: string;
      indeferido: string;
    };
  };
  /** T445 — formulário público de copyright claims (DMCA). */
  copyrightForm: {
    title: string;
    intro: string;
    materialLabel: string;
    locationLabel: string;
    fundamentLabel: string;
    emailLabel: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    protocolLabel: string;
    errorGeneric: string;
  };
  common: {
    loading: string;
    back: string;
    backHome: string;
    viewAll: string;
    learnMore: string;
    comingSoonTitle: string;
    comingSoonDesc: string;
    resultsFor: string;
    resultsNote: string;
    notFoundTitle: string;
    notFoundDesc: string;
    cookieBanner: {
      title: string;
      body: string;
      accept: string;
      reject: string;
      manage: string;
      save: string;
      necessary: string;
      necessaryAlways: string;
      preferences: string;
      analytics: string;
      personalization: string;
      marketing: string;
      footerManage: string;
    };
  };
  home: {
    heroTitle: string;
    heroTitleAccent: string;
    heroSubtitle: string;
    ctaSearch: string;
    ctaRegister: string;
    stats: {
      clubs: string;
      players: string;
      competitions: string;
      matches: string;
      rankings: string;
      growing: string;
    };
    featuresTitle: string;
    featuresSubtitle: string;
    features: { title: string; desc: string }[];
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
    passwordHelp: string;
    name: string;
    loginSubmit: string;
    loginErrorDefault: string;
    noAccount: string;
    loginLink: string;
    registerTitle: string;
    registerSubtitle: string;
    registerSubmit: string;
    haveAccount: string;
    registerLink: string;
    acceptTerms: string;
    acceptPrivacy: string;
    acceptRequired: string;
    registerErrorDefault: string;
    forgotPasswordLink: string;
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    forgotPasswordSubmit: string;
    forgotPasswordSent: string;
    resetPasswordTitle: string;
    resetPasswordSubtitle: string;
    resetPasswordNew: string;
    resetPasswordConfirm: string;
    resetPasswordSubmit: string;
    resetPasswordSuccess: string;
    backToLogin: string;
    passwordMismatch: string;
  };
  pages: {
    clubs: { title: string; subtitle: string; placeholder: string };
    players: { title: string; subtitle: string; placeholder: string };
    competitions: { title: string; subtitle: string; empty: string };
    favoritos: {
      title: string;
      heartAdd: string;
      heartRemove: string;
      remove: string;
      empty: string;
      live: string;
      offline: string;
      error: string;
      rankingBadge: string;
    };
    champions: {
      title: string;
      empty: string;
      season: string;
      source: string;
      rankingBadge: string;
      dots: string;
      prev: string;
      next: string;
      hierarchy_mundial: string;
      hierarchy_continental: string;
      hierarchy_nacional: string;
      hierarchy_estadual: string;
      hierarchy_municipal: string;
    };
    compare: {
      title: string;
      subtitle: string;
      typeClubs: string;
      typePlayers: string;
      searchPlaceholderA: string;
      searchPlaceholderB: string;
      compareBtn: string;
      metric: string;
      leader: string;
      titlesTotal: string;
      foundedYear: string;
      stadiumCapacity: string;
      rankingPoints: string;
      matches: string;
      timelineTitle: string;
      titlesTitle: string;
      noData: string;
      selectBoth: string;
      world: string;
      continental: string;
      national: string;
      state: string;
      municipal: string;
    };
    rankings: {
      title: string;
      subtitle: string;
      filterYear: string;
      filterGender: string;
      filterCountry: string;
      all: string;
      genderMen: string;
      genderWomen: string;
      colPosition: string;
      colClub: string;
      colPoints: string;
      colBase: string;
      baseOf: string;
      loadMore: string;
      empty: string;
      updated: string;
    };
    search: { title: string; subtitle: string; placeholder: string };
    sobre: { title: string; intro: string; sections: LegalSection[] };
    planos: { title: string; intro: string; sections: LegalSection[]; note: string };
    seguranca: { title: string; intro: string; sections: LegalSection[] };
    cookiePolicy: {
      title: string;
      intro: string;
      sections: LegalSection[];
      note?: string;
      inventoryTitle?: string;
      inventoryHeaders?: string[];
      inventory?: CookieInventoryRow[];
    };
    ia: { title: string; intro: string; sections: LegalSection[]; note?: string };
    termosAssinatura: { title: string; intro: string; sections: LegalSection[]; note?: string };
  };
  legal: {
    updatedLabel: string;
    terms: { title: string; intro: string; sections: LegalSection[] };
    privacy: { title: string; intro: string; sections: LegalSection[] };
  };
  langSelector: { label: string; current: string };
}

export type { Locale };
