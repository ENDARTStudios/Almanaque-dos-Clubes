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
    /** Rótulos CURTOS para a barra superior — o nome completo ("Jogadores & Treinadores")
     *  quebra em duas linhas num menu horizontal e a barra vira uma bagunça. O nome completo
     *  continua valendo para o painel mobile e para SEO/rótulo acessível. */
    shortClubs: string;
    shortPlayers: string;
    shortRankings: string;
    search: string;
    login: string;
    dashboard: string;
    signOut: string;
    subscription: string;
    market: string;
    menu: string;
    searchPlaceholder: string;
    sub: {
      countryBR: string;
      countryGB: string;
      countryIT: string;
      countryFR: string;
      countryES: string;
      countryNO: string;
      continental: string;
      women: string;
      allCompetitions: string;
      clubCountry_BR: string;
      clubCountry_AR: string;
      clubCountry_PT: string;
      clubCountry_ES: string;
      clubCountry_GB: string;
      clubCountry_IT: string;
      clubCountry_DE: string;
      clubCountry_FR: string;
      clubCountry_MX: string;
      clubCountry_US: string;
      byContinent: string;
      womenClubs: string;
      allClubs: string;
    };
  };
  footer: {
    /** T560 — titulo do landmark do rodape (sr-only); os H3 das colunas precisam dele. */
    landmark: string;
    tagline: string;
    platformTitle: string;
    platformClubs: string;
    platformPlayers: string;
    platformCompetitions: string;
    platformRankings: string;
    platformSearch: string;
    // T545 — link alternativo de /matches no rodapé (o Navbar aguarda a sessão paralela).
    platformMatches: string;
    aboutTitle: string;
    aboutUs: string;
    plans: string;
    api: string;
    blog: string;
    contact: string;
    telegram: string;
    legalTitle: string;
    privacy: string;
    methodology: string;
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
  /** T445/T470 — textos de notificação autoral (Lei 9.610/98 + análoga). */
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
    };
    explore: {
      label: string;
      title: string;
      clubs: string;
      competitions: string;
      rankings: string;
      map: string;
      compare: string;
      inArchive: string;
      worldwide: string;
      sideBySide: string;
    };
    featuresTitle: string;
    featuresSubtitle: string;
    features: { title: string; desc: string }[];
  };
  auth: {
    or: string;
    loginTitle: string;
    loginSubtitle: string;
    email: string;
    password: string;
    passwordHelp: string;
    name: string;
    loginSubmit: string;
    loginErrorDefault: string;
    loginGoogle: string;
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
    // T559 — "Meu Almanaque": a área do usuário.
    dashboard: {
      title: string;
      subtitle: string;
      accountTitle: string;
      myAlmanaqueTitle: string;
      subscription: string;
      subscriptionDesc: string;
      favorites: string;
      favoritesDesc: string;
      history: string;
      historyDesc: string;
      notifications: string;
      notificationsDesc: string;
      profile: string;
      profilePending: string;
      comingSoon: string;
      historyTitle: string;
      historyEmpty: string;
      historyPending: string;
      historyBack: string;
      /** T596 — Time do Coração: o clube de que o usuário é torcedor fanático. */
      heartClubTitle: string;
      heartClubDesc: string;
      heartClubNone: string;
      heartClubSearchLabel: string;
      heartClubSearchPlaceholder: string;
      heartClubSearchEmpty: string;
      heartClubSet: string;
      heartClubChange: string;
      heartClubRemove: string;
      heartClubView: string;
      heartClubError: string;
      heartClubRemoved: string;
    };
    // T556 — índice de países: o agrupamento de `/clubs` e `/players`.
    byCountry: {
      title: string;
      filterPlaceholder: string;
      filterLabel: string;
      clear: string;
      empty: string;
      /** `{n}` é o total de países. */
      showAll: string;
      clubs: string;
      players: string;
      /** T577 — rotulo da contagem de competicoes no indice. */
      competitions: string;
      error: string;
      /** Segundo nível do agrupamento: cidades dentro do país escolhido. */
      citiesTitle: string;
      citiesLabel: string;
      /** `{n}` é o total de cidades. */
      citiesShowAll: string;
      /** `{com}` e `{total}` — lacuna declarada quando a cobertura de cidade é baixa. */
      citiesGapPartial: string;
      /** `{n}` — nenhum clube do país tem cidade registrada. */
      citiesGapNone: string;
      /** `{n}` — clubes do país sem cidade, mesmo com cobertura boa. */
      citiesPartial: string;
      citiesLoadError: string;
      /** T563 — `{com}`, `{total}` e `{pct}`: a cobertura, declarada ao lado do titulo. */
      citiesCoverage: string;
      citiesFilter: string;
      citiesEmpty: string;
    };
    // T548 — mensagem honesta quando a API falha (antes imprimia "0 clubes").
    clubs: { title: string; subtitle: string; placeholder: string; loadError: string };
    players: { title: string; subtitle: string; placeholder: string };
    competitions: {
      title: string;
      subtitle: string;
      empty: string;
      filtersLabel: string;
      filters: {
        gender: string;
        type: string;
        country: string;
        all: string;
        league: string;
        cup: string;
        apply: string;
        /** T577 — sair do recorte atual (limpar filtros). */
        clear: string;
        /** T577 — rótulo da contagem no índice de países. */
        competitionsLabel: string;
      };
      paginationLabel: string;
      prev: string;
      next: string;
      sections: {
        continental: string;
        nacionais: string;
        feminino: string;
        femininoNota: string;
        selecoes: string;
        selecoesVazio: string;
        verTodasFeminino: string;
        todas: string;
        /** T577 — faixa dos destaques curados, no topo da página. */
        destaques: string;
        destaquesNota: string;
        /** T587 — rótulos dos degraus de alcance. Ver `lib/competition-tier.ts`. */
        degrauMundial: string;
        degrauContinental: string;
        degrauContinentalSecundaria: string;
        degrauNacional: string;
        /** T587 — o filtro de país virou seleção; este é o rótulo da opção "todos". */
        countryAll: string;
      };
    };
    market: {
      title: string;
      subtitle: string;
      emBreve: string;
      body: string;
      bodyCta: string;
      cta: string;
    };
    competitionProfile: {
      international: string;
      level: string;
      spectators: string;
      country: string;
      type: string;
      currentChampion: string;
      emCatalogacao: string;
      totalEditions: string;
      yearShort: string;
      tabsLabel: string;
      tabs: {
        overview: string;
        editions: string;
        clubs: string;
        topWinners: string;
        seasons: string;
      };
      season: string;
      pos: string;
      club: string;
      played: string;
      won: string;
      drawn: string;
      lost: string;
      goalsFor: string;
      goalsAgainst: string;
      points: string;
      topScorer: string;
      seasonsEmpty: string;
      source: string;
      wikipedia: string;
      runnerUp: string;
      matches: string;
      goals: string;
      year: string;
      champion: string;
      titles: string;
      editionsEmpty: string;
      participantsNote: string;
      participantsEmpty: string;
      overviewHint: string;
    };
    playerProfile: {
      currentClub: string;
      year: string;
      club: string;
      careerTitle: string;
      careerEmpty: string;
      achievementsTitle: string;
      achievementsEmpty: string;
      clubsTitle: string;
      clubsEmpty: string;
      position: string;
      birth: string;
      ageYears: string;
      height: string;
      heightCmValue: string;
      preferredFoot: string;
      footLeft: string;
      footRight: string;
      footBoth: string;
      nickname: string;
      season: string;
      apps: string;
      goals: string;
      individualAwardsTitle: string;
      individualAwardsEmpty: string;
      metricsTitle: string;
      metricTitles: string;
      metricAwards: string;
      goalsByStintTitle: string;
      goalsByStintAria: string;
    };
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
      feedTitle: string;
      feedEmpty: string;
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
      nonFifaTag: string;
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
      historyYears: string;
      radarTitle: string;
      radarNote: string;
      radarExcluded: string;
      exportPdf: string;
      printTitle: string;
    };
    rankings: {
      title: string;
      subtitle: string;
      pilotBadge: string;
      pilotSubtitle: string;
      pilotMethodology: string;
      filterYear: string;
      filterCompetition: string;
      filterType: string;
      typeClubs: string;
      typePlayers: string;
      filterGender: string;
      filterCountry: string;
      searchClub: string;
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
      viewDivision: string;
      viewPyramid: string;
      pyramidDisclaimer: string;
      colDivision: string;
      colLevel: string;
      colMultiplier: string;
      pyramidEmpty: string;
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
    terms: {
      title: string;
      intro: string;
      sections: LegalSection[];
      version?: string;
      updated?: string;
    };
    privacy: {
      title: string;
      intro: string;
      sections: LegalSection[];
      version?: string;
      updated?: string;
    };
  };
  langSelector: { label: string; current: string };
  mapExplorer: {
    world: string;
    clubs: string;
    regions: string;
    loading: string;
    noClubs: string;
    loadMore: string;
    searchLabel: string;
    mapAlt: string;
    states: string;
  };
  checkout: {
    title: string;
    intro: string;
    beforeTitle: string;
    compare: string;
    compareSuffix: string;
    terms: string;
    privacy: string;
    termsMid: string;
    cancelInfo: string;
    withdrawInfo: string;
    includedTitle: string;
    paymentsSoon: string;
    /** T555 — resumo pré-confirmação que os Termos (seção 5) prometem exibir. */
    summaryTitle: string;
    priceLabel: string;
    monthlyWord: string;
    yearlyWord: string;
    discountLabel: string;
    discountValue: string;
    taxesLabel: string;
    taxesValue: string;
    methodLabel: string;
    methodValue: string;
    providerLabel: string;
    providerValue: string;
    nextChargeLabel: string;
    renewalLabel: string;
    renewalValue: string;
  };
}

export type { Locale };
