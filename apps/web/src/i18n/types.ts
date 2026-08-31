import type { Locale } from './config';

export interface LegalSection {
  title: string;
  body: string[];
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
    rankings: string;
    search: string;
    login: string;
    dashboard: string;
    signOut: string;
  };
  footer: {
    tagline: string;
    platformTitle: string;
    platformClubs: string;
    platformPlayers: string;
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
    security: string;
    copyright: string;
  };
  common: {
    loading: string;
    backHome: string;
    viewAll: string;
    learnMore: string;
    comingSoonTitle: string;
    comingSoonDesc: string;
    resultsFor: string;
    resultsNote: string;
    notFoundTitle: string;
    notFoundDesc: string;
  };
  home: {
    heroTitle: string;
    heroTitleAccent: string;
    heroSubtitle: string;
    ctaSearch: string;
    ctaRegister: string;
    stats: { clubs: string; players: string; competitions: string; matches: string };
    featuresTitle: string;
    featuresSubtitle: string;
    features: { title: string; desc: string }[];
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
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
  };
  pages: {
    clubs: { title: string; subtitle: string; placeholder: string };
    players: { title: string; subtitle: string; placeholder: string };
    rankings: { title: string; subtitle: string };
    search: { title: string; subtitle: string; placeholder: string };
    sobre: { title: string; intro: string; sections: LegalSection[] };
    planos: { title: string; intro: string; sections: LegalSection[]; note: string };
    seguranca: { title: string; intro: string; sections: LegalSection[] };
  };
  legal: {
    updatedLabel: string;
    terms: { title: string; intro: string; sections: LegalSection[] };
    privacy: { title: string; intro: string; sections: LegalSection[] };
  };
  langSelector: { label: string; current: string };
}

export type { Locale };
