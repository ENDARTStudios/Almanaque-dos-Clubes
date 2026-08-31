import type { Dictionary } from '../types';

const en: Dictionary = {
  site: {
    name: 'Almanaque dos Clubes',
    tagline: 'The history of world football in one place',
    description:
      'The largest historical football dataset in the world. Search clubs, players, competitions and rankings with artificial intelligence and verified sources.',
  },
  nav: {
    clubs: 'Clubs',
    players: 'Players',
    rankings: 'Rankings',
    search: 'Search',
    login: 'Log in',
    dashboard: 'Dashboard',
    signOut: 'Sign out',
  },
  footer: {
    tagline:
      'The complete history of world football at your fingertips. Clubs, players, competitions and auditable rankings.',
    platformTitle: 'Platform',
    platformClubs: 'Clubs',
    platformPlayers: 'Players',
    platformRankings: 'Rankings',
    platformSearch: 'Advanced Search',
    aboutTitle: 'About',
    aboutUs: 'About us',
    plans: 'Plans',
    api: 'API',
    blog: 'Blog',
    contact: 'Contact',
    telegram: 'Telegram',
    legalTitle: 'Legal',
    privacy: 'Privacy',
    terms: 'Terms of Use',
    security: 'Security',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Loading...',
    backHome: 'Back to home',
    viewAll: 'View all',
    learnMore: 'Learn more',
    comingSoonTitle: 'Module under development',
    comingSoonDesc: 'Coming soon: complete content for this module.',
    resultsFor: 'Results for:',
    resultsNote: 'Full-text search will be implemented with PostgreSQL tsvector + pg_trgm to provide fast results even with large data volumes.',
    notFoundTitle: 'Page not found',
    notFoundDesc: 'The content you are looking for does not exist or has been moved.',
  },
  home: {
    heroTitle: 'The History of Football',
    heroTitleAccent: 'in One Place',
    heroSubtitle:
      'The largest historical football dataset in the world. Search clubs, players, competitions and rankings with artificial intelligence and verified sources.',
    ctaSearch: 'Start Searching',
    ctaRegister: 'Create Free Account',
    stats: {
      clubs: 'Registered clubs',
      players: 'Registered players',
      competitions: 'Historical competitions',
      matches: 'Catalogued matches',
    },
    featuresTitle: 'All About World Football',
    featuresSubtitle: 'Complete historical data with modern search and analysis tools.',
    features: [
      { title: 'Complete History', desc: 'Access the full collection of clubs, players and competitions since the 19th century.' },
      { title: 'Auditable Rankings', desc: 'Historical rankings with verified sources and publication dates.' },
      { title: 'Smart Search', desc: 'Advanced text search with full-text indexes and fuzzy search.' },
      { title: 'AI with Citations', desc: 'Ask about football and get answers with verifiable sources.' },
      { title: 'Structured Data', desc: 'REST API with normalized data and cursor-based pagination.' },
      { title: 'Multilingual', desc: 'Support for clubs and competitions from every country and federation.' },
    ],
  },
  auth: {
    loginTitle: 'Log in',
    loginSubtitle: 'Access your Almanaque dos Clubes account',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    loginSubmit: 'Log in',
    loginErrorDefault: 'Error logging in',
    noAccount: "Don't have an account?",
    loginLink: 'Create one free',
    registerTitle: 'Create Account',
    registerSubtitle: 'Sign up free on Almanaque dos Clubes',
    registerSubmit: 'Sign up',
    haveAccount: 'Already have an account?',
    registerLink: 'Log in',
    acceptTerms: 'I have read and accept the Terms of Use and Service',
    acceptPrivacy: 'I have read and accept the Privacy Policy (LGPD)',
    acceptRequired: 'You must accept the Terms of Use and the Privacy Policy to sign up.',
    registerErrorDefault: 'Error creating account',
  },
  pages: {
    clubs: { title: 'Clubs', subtitle: 'Explore {n} football clubs registered.', placeholder: 'Search clubs by name, country or city...' },
    players: { title: 'Players', subtitle: 'Search football players from all eras and places.', placeholder: 'Search players by name, country or position...' },
    rankings: { title: 'Rankings', subtitle: 'Historical rankings with verified sources and publication dates.' },
    search: { title: 'Advanced Search', subtitle: 'Search clubs, players, competitions and statistics with advanced filters.', placeholder: 'Type a term to search...' },
  },
  langSelector: { label: 'Language', current: 'Current language' },
  legal: {
    updatedLabel: 'Last updated',
    terms: {
      title: 'Terms of Use and Service',
      intro:
        'These Terms of Use and Service ("Terms") govern access to and use of the Almanaque dos Clubes platform, operated by END ART Studios (CNPJ 45.370.930/0001-75). By creating an account or using the platform, the user declares that they have read, understood and fully accepted these Terms.',
      sections: [
        { title: '1. Acceptance', body: [
          'By signing up or using the platform, the user agrees to these Terms and the Privacy Policy. If you do not agree, do not use the platform.',
          'Acceptance is required at registration as express consent and cannot be waived.',
        ]},
        { title: '2. Account registration', body: [
          'Registration requires true and up-to-date information (name and valid email) and a secure password.',
          'The user is responsible for keeping access credentials confidential and for all activity carried out on their account.',
          'Users must have legal capacity to contract; minors require authorization from their legal guardians.',
        ]},
        { title: '3. Permitted use', body: [
          'The platform is intended for consulting, researching and analysing historical world football data.',
          'It is prohibited to use the platform for any unlawful purpose, to infringe third-party rights, to attempt to access other users’ data, or to compromise the security of the platform.',
        ]},
        { title: '4. Plans and payments (CDC)', body: [
          'The platform offers free and paid plans (Free, Pro and Elite), as described on the site.',
          'Charging may be processed by an external payment provider. Consumer relations follow the Brazilian Consumer Protection Code (Law No. 8,078/1990), including the right of withdrawal where applicable.',
        ]},
        { title: '5. Intellectual property', body: [
          'All content, brand, software and source code of the platform are the property of END ART Studios and are protected by copyright and applicable law.',
          'The user may not copy, modify, distribute, sublicense or use the software without prior written authorization, as set out in the LICENSE file.',
        ]},
        { title: '6. Content and data', body: [
          'Historical data is displayed based on verified sources. END ART Studios does not guarantee continuous updates of all data but makes every verification effort.',
          'Users may report inaccuracies for review.',
        ]},
        { title: '7. Limitation of liability', body: [
          'The platform is provided "as is". END ART Studios is not liable for indirect damages arising from use, to the extent permitted by law.',
        ]},
        { title: '8. Suspension and termination', body: [
          'Failure to comply with these Terms may lead to suspension or cancellation of the account, without prejudice to other legal measures.',
        ]},
        { title: '9. Changes', body: [
          'These Terms may be updated. Relevant changes will be communicated, and continued use of the platform after an update implies acceptance of the new version.',
        ]},
        { title: '10. Contact and jurisdiction', body: [
          'Questions about these Terms: endart.studios@gmail.com. Competent court: district of Osasco, São Paulo, unless otherwise provided by law.',
        ]},
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro:
        'This Privacy Policy describes how END ART Studios (CNPJ 45.370.930/0001-75) collects, uses, stores and protects the personal data of users of the Almanaque dos Clubes platform, in accordance with the Brazilian General Data Protection Law (Law No. 13,709/2018 — LGPD) and other applicable rules.',
      sections: [
        { title: '1. Data collected', body: [
          'Registration data: name, email and password (stored securely as a hash).',
          'Usage data: browsing information, devices and access logs, for security and service improvement.',
          'Billing data: processed by external payment providers; END ART Studios does not store full card details.',
        ]},
        { title: '2. Purposes of processing', body: [
          'To create and manage the account, authenticate the user and protect access.',
          'To provide contracted services, including paid plans and AI features.',
          'To ensure platform security and prevent fraud and abusive activity.',
          'To communicate updates, changes to terms and relevant information.',
        ]},
        { title: '3. Legal basis', body: [
          'Processing is based on consent (Art. 7, I, LGPD), performance of contract, legitimate interest and compliance with legal obligations, as applicable.',
        ]},
        { title: '4. Sharing', body: [
          'We do not sell personal data. Data may be shared with infrastructure and payment providers, strictly necessary for operation, and with authorities when required by law.',
        ]},
        { title: '5. Data subject rights (LGPD)', body: [
          'Users may request confirmation, access, correction, anonymization, portability, deletion and withdrawal of consent.',
          'To exercise your rights, contact the privacy channel indicated below.',
        ]},
        { title: '6. Cookies', body: [
          'We use cookies and similar technologies for operation, authentication and preferences (such as language). Users can manage cookies in their browser.',
        ]},
        { title: '7. Security', body: [
          'We adopt technical and organizational measures (password encryption, access control, monitoring) to protect data. No system is infallible; we store passwords hashed and never in clear text.',
        ]},
        { title: '8. Retention', body: [
          'Data is kept for as long as necessary for the purposes and legal obligations, or until deletion at the request of the data subject or account closure.',
        ]},
        { title: '9. Minors', body: [
          'The platform is not intended for minors without the consent of their guardians. We do not intentionally collect data from minors.',
        ]},
        { title: '10. Data Protection Officer (DPO) and contact', body: [
          'Privacy requests and exercise of rights: endart.studios@gmail.com.',
          'END ART Studios is the controller of the data processed on the platform.',
        ]},
      ],
    },
  },
};

export default en;
