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
    competitions: 'Competitions',
    map: 'Map',
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
    platformCompetitions: 'Competitions',
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
    cookies: 'Cookies',
    terms: 'Terms of Use',
    security: 'Security',
    dataSubjectRights: 'Data Subject Rights',
    copyrightClaims: 'Copyright (DMCA)',
    copyright: 'Copyright © 2026 END ART Studios',
  },
  common: {
    loading: 'Loading...',
    back: 'Back',
    backHome: 'Back to home',
    viewAll: 'View all',
    learnMore: 'Learn more',
    comingSoonTitle: 'Module under development',
    comingSoonDesc: 'Coming soon: complete content for this module.',
    resultsFor: 'Results for:',
    resultsNote:
      'Full-text search will be implemented with PostgreSQL tsvector + pg_trgm to provide fast results even with large data volumes.',
    notFoundTitle: 'Page not found',
    cookieBanner: {
      title: 'Your privacy matters',
      body: 'We use necessary cookies for authentication, security and core functionality. With your authorisation, we may also use optional cookies to measure audience, improve the service and, where applicable, run marketing. You can accept, reject or choose by category; refusing optional cookies does not block essential functions.',
      accept: 'Accept optional',
      reject: 'Reject optional',
      manage: 'Manage preferences',
      save: 'Save preferences',
      necessary: 'Necessary cookies — always active',
      necessaryAlways: 'Always active: essential for functionality and security',
      preferences: 'Preference cookies',
      analytics: 'Analytics cookies',
      personalization: 'Personalisation cookies',
      marketing: 'Marketing/advertising cookies',
      footerManage: 'Manage cookies',
    },
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
      rankings: 'Published rankings',
      growing: 'Archive growing',
    },
    featuresTitle: 'All About World Football',
    featuresSubtitle: 'Complete historical data with modern search and analysis tools.',
    features: [
      {
        title: 'Complete History',
        desc: 'Access the full collection of clubs, players and competitions since the 19th century.',
      },
      {
        title: 'Auditable Rankings',
        desc: 'Historical rankings with verified sources and publication dates.',
      },
      {
        title: 'Smart Search',
        desc: 'Advanced text search with full-text indexes and fuzzy search.',
      },
      {
        title: 'AI with Citations',
        desc: 'Ask about football and get answers with verifiable sources.',
      },
      {
        title: 'Structured Data',
        desc: 'REST API with normalized data and cursor-based pagination.',
      },
      {
        title: 'Multilingual',
        desc: 'Support for clubs and competitions from every country and federation.',
      },
    ],
  },
  auth: {
    loginTitle: 'Log in',
    loginSubtitle: 'Access your Almanaque dos Clubes account',
    email: 'Email',
    password: 'Password',
    passwordHelp: 'Min. 8 characters, with uppercase, lowercase and a number.',
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
    forgotPasswordLink: 'Forgot your password?',
    forgotPasswordTitle: 'Recover password',
    forgotPasswordSubtitle: 'Enter your email to receive a reset link.',
    forgotPasswordSubmit: 'Send link',
    forgotPasswordSent: 'If the email exists, you will receive a reset link.',
    resetPasswordTitle: 'Reset password',
    resetPasswordSubtitle: 'Set a new password.',
    resetPasswordNew: 'New password',
    resetPasswordConfirm: 'Confirm password',
    resetPasswordSubmit: 'Save new password',
    resetPasswordSuccess: 'Password reset successfully. You can now sign in.',
    backToLogin: 'Back to login',
    passwordMismatch: 'Passwords do not match.',
  },
  pages: {
    clubs: {
      title: 'Clubs',
      subtitle: 'Explore {n} football clubs registered.',
      placeholder: 'Search clubs by name, country or city...',
    },
    players: {
      title: 'Players',
      subtitle: 'Search football players from all eras and places.',
      placeholder: 'Search players by name, country or position...',
    },
    competitions: {
      title: 'Competitions',
      subtitle: 'Explore {n} football competitions.',
      empty: 'No competitions found.',
    },
    favoritos: {
      title: 'My Almanaque',
      heartAdd: 'Favorite',
      heartRemove: 'Favorited',
      remove: 'Remove',
      empty: "You haven't favorited any club yet. Use the heart on a club page to start.",
      live: 'Live',
      offline: 'Connecting…',
      error: 'Error loading favorites.',
      rankingBadge: '#{position} in {name}',
    },
    champions: {
      title: 'Current champions',
      empty: 'No champions registered at the moment — the titles archive is growing.',
      season: 'Season',
      rankingBadge: '#{position} in {name}',
      dots: 'Card',
      prev: 'Previous',
      next: 'Next',
      hierarchy_mundial: 'World',
      hierarchy_continental: 'Continental',
      hierarchy_nacional: 'National',
      hierarchy_estadual: 'State',
      hierarchy_municipal: 'Municipal',
    },
    compare: {
      title: 'Compare',
      subtitle: 'Side-by-side comparison of clubs and players with auditable metrics.',
      typeClubs: 'Clubs',
      typePlayers: 'Players',
      searchPlaceholderA: 'Search club A…',
      searchPlaceholderB: 'Search club B…',
      compareBtn: 'Compare',
      metric: 'Metric',
      leader: 'Leader',
      titlesTotal: 'Titles (archive)',
      foundedYear: 'Founded (older leads)',
      stadiumCapacity: 'Stadium (largest capacity)',
      rankingPoints: 'Current ranking points (0-100)',
      matches: 'Matches in archive',
      timelineTitle: 'Ranking evolution (by season)',
      titlesTitle: 'Titles by hierarchy',
      noData: 'Not enough archive data to compare.',
      selectBoth: 'Select both items to compare.',
      world: 'World',
      continental: 'Continental',
      national: 'National',
      state: 'State',
      municipal: 'Municipal',
    },
    rankings: {
      title: 'Rankings',
      subtitle: 'Historical rankings with verified sources and publication dates.',
      filterYear: 'Year',
      filterGender: 'Gender',
      filterCountry: 'Country',
      all: 'All',
      genderMen: 'Men',
      genderWomen: 'Women',
      colPosition: 'Position',
      colClub: 'Club',
      colPoints: 'Points (0-100)',
      colBase: 'Auditable base',
      baseOf: 'based on {m} matches / {t} titles',
      loadMore: 'Load more',
      empty: 'No ranking published yet for this filter.',
      updated: 'Ranking: {name}',
    },
    search: {
      title: 'Advanced Search',
      subtitle: 'Search clubs, players, competitions and statistics with advanced filters.',
      placeholder: 'Type a term to search...',
    },
    sobre: {
      title: 'About us',
      intro:
        'Almanaque dos Clubes is a digital platform dedicated to researching and organising historical football information. We collect data on clubs, players, competitions, matches and rankings, with search tools and AI-assisted features.',
      sections: [
        {
          title: 'Our commitment',
          body: [
            'Our commitment is to offer a useful, transparent and responsible experience. Information may be compiled from public sources, licensed databases, user contributions and internal review processes. The existence of a source or citation does not mean Almanaque endorses all of its content, nor that every record is free of error.',
            'The update date and, when available, the source of each piece of information should be consulted on the record page itself.',
          ],
        },
        {
          title: 'Not an official body',
          body: [
            'Almanaque is not an official body of any federation, club, league, athlete or competition, unless expressly stated. Names, brands, crests, images and other signs belonging to third parties remain with their respective owners.',
            'Nominative or informational use does not imply sponsorship, affiliation or authorisation, and protected material should only be used under licence, authorisation, legal basis or permitted purpose.',
          ],
        },
        {
          title: 'Operation and identification',
          body: [
            'The operation and provision of the services are carried out by END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brazil. For support, content, privacy or security matters, use the channels shown in the footer and on the relevant pages.',
          ],
        },
      ],
    },
    planos: {
      title: 'Plans',
      intro:
        'Almanaque dos Clubes offers one free tier and two paid subscriptions. For visitors in Brazil, prices are shown in reais ({free}, {proMonthly}, {eliteMonthly}). The total price, features, limits, period and next charge will be presented before payment confirmation. Last updated: September 2, 2026.',
      sections: [
        {
          title: 'Free',
          body: [
            '{free} — initial access and use of the available free features. No automatic conversion to a paid plan.',
          ],
        },
        {
          title: 'Pro',
          body: [
            '{proMonthly}/month or {proMonthly} annual with 15% off (12 × monthly). Expanded search and analysis, with AI features and citations when indicated at checkout. Payment via Stripe, only after express confirmation.',
          ],
        },
        {
          title: 'Elite',
          body: [
            '{eliteMonthly}/month or {eliteMonthly} annual with 15% off (12 × monthly). Advanced limits and features indicated at checkout, including API or export when expressly included.',
          ],
        },
        {
          title: 'Features and limits',
          body: [
            'All features and limits effectively included will be described in a comparison table at checkout and in the account panel (queries, AI credits, API calls, exports, storage, support and fair-use limits).',
            'The absence of a feature or limit in the table means it is not automatically included. END ART will not advertise "unlimited access" or "API included" without defining scope, technical restrictions and the fair-use policy.',
          ],
        },
        {
          title: 'Transparent contracting',
          body: [
            "Contracting is processed after the consumer's express confirmation. Before payment, it will be possible to review plan, period, total price, discount, automatic renewal, payment method, limits, cancellation, refund and these Terms of Use.",
            'The Free plan does not automatically become paid. Pro and Elite renew only when this condition has been informed and accepted at checkout. The consumer may cancel through the same channels used to contract or via endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Cancellation and withdrawal',
          body: [
            'Cancellation stops future charges. Unless a more favorable condition applies, paid features remain until the end of the already paid period. For off-premises contracting, the consumer may exercise the legal 7-day withdrawal right (article 49 of the CDC), through the panel or endart.studios@gmail.com.',
            "Refund will be requested through the payment method used, with confirmation to the consumer. END ART will not replace legal restitution with credit without the consumer's consent.",
          ],
        },
        {
          title: 'Payment',
          body: [
            'Payment may be processed by Stripe or the provider identified at checkout. END ART does not request the card password and, when not necessary, does not store full card data.',
          ],
        },
        {
          title: 'Artificial intelligence and sources',
          body: [
            "AI features are aids. They may generate incorrect, incomplete or outdated responses. Verify sources and dates before publishing or making decisions. Do not insert passwords, banking data, health data, children's data or trade secrets in prompts.",
          ],
        },
        {
          title: 'Service and identification',
          body: [
            'Questions about plans, cancellation, billing, refund or features: endart.studios@gmail.com.',
            'END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brazil.',
          ],
        },
      ],
      note: 'The values and features shown here are informational; the binding offer is the one presented at checkout, subject to the Terms of Use and the Privacy Policy.',
    },
    seguranca: {
      title: 'Security and Vulnerabilities',
      intro:
        'Security is a shared responsibility. This page describes the controls in place and the channel for reporting vulnerabilities.',
      sections: [
        {
          title: 'Controls in place',
          body: [
            'Technical controls in production: Content Security Policy (CSP) and security headers via Helmet; passwords hashed with argon2id; httpOnly + SameSite session cookies with rotating refresh token; single-use CSRF protection on all write operations; layered rate limiting (global per-IP limit, login brute-force protection per IP+email, sliding window per user+IP on auth routes); Row-Level Security (RLS) on PostgreSQL for sessions; append-only audit log for critical entities; HTTP hardening (method gate, payload limit, idempotency); continuous integration with gitleaks, pnpm audit, security-gate and migration drift detection; documented backup and restore procedure; least privilege (application user distinct from the database owner); secrets kept out of code; environment separation; and monitoring of requests, 5xx and authentication failures.',
          ],
        },
        {
          title: 'Reporting vulnerabilities',
          body: [
            'Vulnerabilities may be reported at endart.studios@gmail.com. Include the affected asset, reproducible steps, impact, minimum evidence and contact details.',
            'Do not access, alter, delete or exfiltrate data beyond what is necessary to demonstrate the issue, nor cause outages, social engineering or tests on third parties.',
          ],
        },
        {
          title: 'Response and disclosure',
          body: [
            'We will acknowledge receipt, investigate, preserve evidence, fix or mitigate and report the status within a reasonable time. Coordinated disclosure is preferred.',
          ],
        },
        {
          title: 'Personal data incidents',
          body: [
            'In the event of a personal data incident, we classify the risk, contain the event, preserve logs, reset credentials, assess affected data subjects, record decisions and comply with the LGPD and ANPD communication duties.',
          ],
        },
      ],
    },
    cookiePolicy: {
      title: 'Cookie Policy',
      intro:
        'This Cookie Policy explains how END ART Studios (CNPJ 45.370.930/0001-75) uses cookies and similar technologies on Almanaque dos Clubes. The inventory will be updated according to the cookies, providers and technologies actually installed.',
      sections: [
        {
          title: 'What are cookies',
          body: [
            'Cookies are small files or identifiers stored in the browser to enable functionality, security, preferences and metrics. Similar technologies (pixels, SDKs, local storage) are treated equivalently when they can recognise or track the user.',
          ],
        },
        {
          title: 'Categories',
          body: [
            'Necessary: session, login, security (CSRF), fraud prevention, consent-choice record and language preference — minimised and always active where indispensable. Refusal does not apply to this category.',
            'Preferences: language, theme and interface choices — consent where not essential.',
            'Analytics: audience, error and performance measurement — NOT currently used. If a vendor is contracted in the future (e.g., PostHog, Plausible), it will be listed in the inventory below and will only load after granular consent.',
            'Marketing/advertising: campaigns, attribution and remarketing — NOT currently used; if contracted, they will require specific and revocable consent.',
          ],
        },
        {
          title: 'Choice, withdrawal and proof',
          body: [
            'Users may accept, reject or select categories. Withdrawal must be as easy as granting consent. We keep proof of the choice only with the necessary data. Refusing optional cookies does not prevent use of essential functions.',
          ],
        },
        {
          title: 'Third parties and transfers',
          body: [
            'Current providers: Vercel (frontend), Railway (API and PostgreSQL database), Cloudflare (DNS/network) and Google Fonts (fonts); payments via Stripe. Hosting, authentication, payment, analytics, support, AI and security providers may receive identifiers according to the purpose, always minimised and contractually bound. Where there is an international transfer, the LGPD and (if applicable) GDPR must be observed.',
          ],
        },
        {
          title: 'Privacy contact',
          body: [
            'Questions, preference withdrawal and data-subject rights: endart.studios@gmail.com. The current support channel is endart.studios@gmail.com.',
          ],
        },
      ],
      inventoryTitle: 'Cookie inventory in use',
      inventoryHeaders: ['Cookie', 'Purpose', 'Category', 'Duration', 'Form'],
      inventory: [
        {
          name: 'access_token',
          purpose: 'Authentication (user session)',
          category: 'Necessary',
          duration: '≈ 15 minutes',
          form: 'httpOnly cookie, first party',
        },
        {
          name: 'refresh_token',
          purpose: 'Secure session renewal (rotating token)',
          category: 'Necessary',
          duration: '7 days',
          form: 'httpOnly cookie, first party',
        },
        {
          name: 'almanaque_locale',
          purpose: 'Interface language preference',
          category: 'Necessary (functional)',
          duration: '1 year',
          form: 'First-party cookie',
        },
        {
          name: 'consent_v',
          purpose: "Stores your consent choice (so the banner isn't shown again)",
          category: 'Necessary (consent proof)',
          duration: '1 year',
          form: 'localStorage + first-party cookie',
        },
        {
          name: '— (x-csrf-token)',
          purpose:
            'CSRF protection for writes — via HTTP header and server-side storage; uses NO cookie',
          category: 'Necessary',
          duration: '24 h (single use)',
          form: 'HTTP header',
        },
      ],
      note: 'Classification and inventory follow the real function of each cookie, not the vendor commercial name. No analytics or advertising cookies are installed today; this table is updated on every inventory change (last reviewed: 2026-09-15 — policy version 1.0).',
    },
    ia: {
      title: 'How we use AI',
      intro:
        'Almanaque dos Clubes uses artificial intelligence as a research, synthesis, classification and presentation aid. This page explains how it works, its limitations, use guidelines and your rights. AI-assisted responses are not an official source and do not replace human verification.',
      sections: [
        {
          title: 'Function and limitations',
          body: [
            'Almanaque dos Clubes AI features are aids for research, synthesis, classification and navigation of the collection. Responses may be incorrect, incomplete, outdated, ambiguous or have inadequate citations.',
            'Notice near the query: "AI-assisted response. It may contain errors, omissions or outdated information. Check sources, dates and context before using or sharing. Do not insert unnecessary confidential or personal data."',
            'Notice near the response: "Important: this response was generated or organized with AI assistance. It is not an official source, does not guarantee accuracy or completeness and does not replace human verification. Consult the indicated sources and report a possible inaccuracy to endart.studios@gmail.com."',
          ],
        },
        {
          title: 'Permitted use',
          body: [
            'The AI should be used for historical research, locating records, synthesis, comparison, organization and navigation of the collection, always within plan limits. The user must verify the response in primary sources, cited sources, official records or other independent sources before publishing, sharing or making a decision.',
          ],
        },
        {
          title: 'Prohibited use',
          body: [
            "It is prohibited to use the AI to: generate malware, ransomware, phishing, false credentials or intrusion instructions; commit fraud, falsehood, impersonation, threats, harassment, defamation or unlawful discrimination; insert, infer, expose or exploit third-party personal data without authorization; insert passwords, card data, documents, health data, children's data, trade secrets or unnecessary confidential information; violate copyright, trademarks, image, personality, secrecy, contracts or licenses; manipulate rankings, fabricate sources, remove citations or attribute a response to END ART or an official source without authorization; reverse-engineer, bypass filters, circumvent rate limits, exploit vulnerabilities or interfere with availability; extract in mass or use the database, responses or API to build, train or feed a competing product; make high-impact decisions about people without human review, explanation, legal basis and adequate safeguards; or use outputs as legal, medical, financial advice or as the sole basis for contracting, investment, reputation or security decisions.",
          ],
        },
        {
          title: 'Sources, citations and provider data',
          body: [
            'When there is a citation, show the source and date of consultation or update when technically available. Do not present a fabricated citation as a verifiable source.',
            'END ART maintains an updated list of AI providers, their functions, countries, subprocessors, retention, security measures and whether they use data for training. The Privacy Policy informs which prompts, context, metadata, feedback and responses may be sent. END ART will not use identifiable user content for training outside the informed purpose, unless with adequate legal basis.',
          ],
        },
        {
          title: 'Filters and contestation',
          body: [
            "The user must not insert passwords, banking data, health data, children's data, identity documents, trade secrets or unnecessary confidential information in prompts.",
            'In case of abuse, security risk or violation, END ART may block a query, reduce limits, temporarily suspend, revoke API or terminate an account proportionally. When possible, it will communicate the reason and offer contestation at endart.studios@gmail.com. Urgent measures may occur without prior notice when necessary to prevent serious harm.',
          ],
        },
      ],
    },
    termosAssinatura: {
      title: 'Subscription Terms — Pro and Elite',
      intro:
        'These Terms govern the subscription to the Pro and Elite plans of Almanaque dos Clubes, provided by END ART Studios (CNPJ 45.370.930/0001-75), Osasco, SP - Brazil. Effective: 01/09/2026. In conflict, the mandatory rule and the condition most favourable to the consumer prevail.',
      sections: [
        {
          title: 'Subject, plans and price',
          body: [
            'Pro: {proMonthly}/month (annual 15% off). Elite: {eliteMonthly}/month (annual 15% off). Currency follows the real location of the consumer: South and Central America in reais (R$), dollar countries in dollars ($), Europe in euros (€). Paid via Stripe. The frequency, taxes, renewal, limits and features are shown at checkout and on the receipt. No free plan is automatically converted to paid; payment requires an affirmative consumer action.',
          ],
        },
        {
          title: 'Renewal and changes',
          body: [
            'Automatic renewal only occurs if informed and authorised before purchase, with prior notice. A change in price, frequency or substantial feature reduction will be communicated before taking effect; when it materially changes the contract, the consumer may cancel without disproportionate penalty.',
          ],
        },
        {
          title: 'Use and AI limitations',
          body: [
            'AI tools are auxiliary and can be wrong. It is forbidden to use the platform for fraud, malware, harassment, rights infringement, relevant automated decision without review, mass extraction, reverse engineering, bypassing limits or training a competing model without written licence.',
          ],
        },
        {
          title: 'Cancellation and withdrawal',
          body: [
            'Consumers may cancel renewal through the dashboard or the same channel used to subscribe, without justification. Under Art. 49 of the CDC, they may exercise withdrawal within 7 days, without barriers, with refund of amounts paid as per law. Ordinary cancellation after the period does not automatically imply a proportional refund, except for service failure, undue charge or breach of the offer.',
          ],
        },
        {
          title: 'Liability and data protection',
          body: [
            'END ART answers under the CDC, LGPD and applicable law for failures attributable to it. No clause excludes non-waivable legal liability. Data processing follows the Privacy Policy; the consumer may exercise rights via endart.studios@gmail.com. Marketing is optional and does not condition the purchase.',
          ],
        },
        {
          title: 'Law and jurisdiction',
          body: [
            'Brazilian law applies. In consumer relations, the consumer domicile forum and any other legally favourable forum are preserved, without prejudice to consumer protection bodies.',
          ],
        },
      ],
      note: 'Provider: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brazil. Gateway: Stripe. Effective: 01/09/2026.',
    },
  },
  langSelector: { label: 'Language', current: 'Current language' },
  legal: {
    updatedLabel: 'Last updated',
    terms: {
      title: 'Terms of Use and Service',
      intro:
        'These Terms of Use and Service ("Terms") govern access to and use of the Almanaque dos Clubes Platform, operated by END ART Studios, CNPJ nº 45.370.930/0001-75 ("END ART"). By creating an account, contracting a plan or using the Platform, the user declares they have read and accepted these Terms. Last updated: September 2, 2026 · Version 2.0.',
      sections: [
        {
          title: 'Provider identification',
          body: [
            'END ART Studios — trade name: END ART Studios — CNPJ nº 45.370.930/0001-75 — Osasco, São Paulo, Brazil — contact: endart.studios@gmail.com.',
          ],
        },
        {
          title: 'Terms of Use and Service ("Terms")',
          body: [
            'These Terms govern access to and use of the website, application, search tools, historical data, rankings, API, AI-assisted features and the Free, Pro and Elite plans of Almanaque dos Clubes ("Platform").',
            'Contracting and use are also subject to the Privacy Policy, Cookie Policy and Security Policy. In case of conflict between these Terms and a mandatory consumer-protection or data-protection rule, the mandatory rule prevails.',
          ],
        },
        {
          title: '1. Separate acceptance and prior information',
          body: [
            'The user will have access to these Terms before creating an account or contracting a plan. Contractual acceptance is a separate mechanism from any consent for marketing, optional cookies or other purposes not necessary to provide the service.',
            'By checking "I accept the Terms of Use", creating an account or contracting a plan, the user confirms they had the opportunity to read the document. The Platform will record the version, date and time of acceptance. Lack of consent for marketing or optional cookies does not prevent sign-up or contracting.',
          ],
        },
        {
          title: '2. Identification and object',
          body: [
            'The Platform is operated by END ART Studios, CNPJ nº 45.370.930/0001-75, trade name END ART Studios, in Osasco, São Paulo, Brazil, contact endart.studios@gmail.com.',
            'Almanaque dos Clubes gathers and organizes historical information about clubs, players, competitions, matches and rankings, with search tools and AI-assisted features. The Platform may use public sources, licensed databases, authorized contributions and internal review processes.',
            'Almanaque is not an official body of any federation, club, league, athlete or competition, unless expressly and documented. The presence of a name, crest, mark, image or record does not imply sponsorship, endorsement, affiliation or third-party authorization.',
          ],
        },
        {
          title: '3. Account and sign-up',
          body: [
            'To create an account, the user must provide true, current and necessary information, keep their email updated and protect their password. Passwords must be stored by the Platform in protected form, never in clear text.',
            'The user must not share credentials, create an account for another person without authorization, bypass controls, access third-party data, or allow their account to be used for fraud, intrusion, abusive extraction or rights violation.',
            'The Platform may request proportional identity confirmation for security, refund, sensitive change or exercise of rights. Passwords will never be requested by email.',
          ],
        },
        {
          title: '4. Plans, price and offer characteristics',
          body: [
            'The Platform offers the Free plan and the paid Pro and Elite plans, billed monthly or annually (the annual cycle applies a discount over 12 monthly payments). The current prices of each plan, currencies per region and included features are those described on the /planos page, which is an integral part of these Terms, as described at /planos.',
            'The checkout will show, before confirmation, the total price of the period, billing period, discount, any applicable taxes, payment method, next charge date and relevant limitations.',
            'The Free plan allows use of the free features identified on the Platform, with no automatic conversion to a paid plan. Pro and Elite allow the paid features described at checkout, including, when indicated, expanded search, AI-assisted features with citations, technical limits and, for Elite, API or export when expressly included.',
            'END ART will not assume that API, export, unlimited AI credits, unrestricted access or priority support are included unless expressly described in the summary. The current limits of queries, credits, requests, exports, storage and rate limits will be shown before payment and in the subscriber panel.',
          ],
        },
        {
          title: '5. Checkout, contracting and renewal',
          body: [
            'Before finalizing payment, the consumer will see a summary with: provider, plan, features, limits, price, discount, total price, taxes, period, automatic renewal, payment method, next charge date, cancellation rules, withdrawal right and links to these Terms and the Privacy Policy.',
            'The consumer may correct data, plan or payment method before confirmation. Contracting only completes after express confirmation of the payment button. END ART will send confirmation and a storable electronic copy of the contract.',
            'The monthly or annual subscription renews automatically only if prominently informed before payment. There is no conversion from Free to a paid plan without new express contracting. No price increase, substantial feature reduction or period change will apply without clear prior notice and, when required, new acceptance.',
          ],
        },
        {
          title: '6. Payment and charge failure',
          body: [
            'Payments may be processed by Stripe or another provider indicated at checkout. END ART does not request or store the card password and, when not necessary, does not store full card data.',
            'In case of charge failure, END ART may inform the issue, allow payment-method update and temporarily limit paid features after reasonable notice. No hidden, duplicate or different charges from the confirmed price will be made.',
          ],
        },
        {
          title: '7. Cancellation',
          body: [
            'The consumer may cancel renewal through the account panel or the same channel used to contract, or via endart.studios@gmail.com, without justification.',
            'Cancelling renewal stops future charges. Unless immediate termination is requested by the consumer or required due to proven violation, access to paid features remains until the end of the already paid period. Cancellation does not eliminate refund or withdrawal rights.',
            'Account deletion and data removal follow the Privacy Policy. Records required for refund, accounting, security, fraud prevention, legal obligation or defense may be kept restricted for the necessary period.',
          ],
        },
        {
          title: '8. Withdrawal right and refund',
          body: [
            'For off-premises contracting, the consumer may exercise the withdrawal right within 7 days from signing or receiving the service, under article 49 of the Brazilian Consumer Protection Code (CDC).',
            'The request may be made through the panel, the cancellation flow, or endart.studios@gmail.com. END ART will provide confirmation and protocol, stop renewal and request restitution through the payment method used. The consumer will not be required to accept credit when the law requires restitution.',
            'Use of the service will not, in isolation, be used to automatically deny the legal withdrawal right. Fraud, chargeback or third-party use disputes will be investigated separately.',
          ],
        },
        {
          title: '9. Content, sources and accuracy',
          body: [
            'Historical information may contain gaps, source divergences, later changes, transcription errors or unreviewed data. The expression "verified sources" means the Platform seeks to identify and review sources, not that every record is infallible or officially recognized.',
            'The update date, source and methodology, when available, should be consulted on the record or ranking page. The user may report inaccuracies to endart.studios@gmail.com.',
          ],
        },
        {
          title: '10. AI use guidelines',
          body: [
            'AI features are research and organization aids. Responses may be incorrect, incomplete, outdated, ambiguous or have inadequate citations. The user must verify sources, dates and context before publishing, sharing or making a decision based on an output.',
            'It is prohibited to use the AI or the Platform to: generate or spread malware, phishing or intrusion instructions; commit fraud, threats, harassment, defamation or unlawful discrimination; produce forgeries or impersonations; insert or exploit third-party personal data without authorization; violate copyright, trademarks, image or trade secrets; manipulate rankings or historical information; bypass filters, rate limits or controls; reverse-engineer; copy or extract the database at scale; train or feed a competing model with Platform data; or make high-impact decisions without adequate human review.',
            "The user must not insert passwords, banking data, health data, children's data, identity documents, trade secrets or unnecessary confidential information in prompts. The handling of prompts, responses, metadata and logs is described in the Privacy Policy.",
            'END ART may apply filters, limit requests, revoke API keys, suspend or terminate access proportionally when there is reasonable indication of abuse, security risk or violation. When possible, it will inform the reason, preserve minimal evidence and provide a contest channel.',
          ],
        },
        {
          title: '11. Intellectual property',
          body: [
            'END ART or its licensors hold applicable rights over the brand, visual identity, software, code, layout, architecture, API, documentation, taxonomies, data models, indexes, scripts, pipelines, methodologies, original editorial texts, own images, proprietary prompts, selection, organization, normalization, curation and creative arrangement of the collection.',
            'Historical facts, names, dates, results, statistics, public records, trademarks, crests, photographs, videos and third-party materials do not become END ART exclusive property merely by being displayed, aggregated or organized on the Platform. These materials remain subject to the rights and licenses of their respective owners.',
            'During the plan term, END ART grants the user a limited, personal, non-exclusive, non-transferable license without sublicensing right to access and use the Platform per the contracted plan. This license does not transfer ownership nor authorize substantially copying, extracting, mirroring, reselling, redistributing at scale, publishing in a competing database, removing notices, bypassing limits or abusive scraping.',
            'The user retains rights over content they submit, when they have them, and grants END ART only the technical license necessary to host, process, display to the user, execute the requested feature, maintain security, support, backup and comply with legal obligations.',
            'AI outputs may be non-exclusive, may contain non-protectable or third-party elements and may require review. To the extent permitted by law, the user may use a legitimate output for a purpose compatible with the plan.',
          ],
        },
        {
          title: '12. API and extraction',
          body: [
            'When the API is included in the plan, access is limited to the documentation, individual key, limits and checkout purposes. It is prohibited to share keys, bypass rate limits, extract the database integrally or substantially, build a mirror, resell responses, redistribute at scale or create a competing service without written authorization.',
            'END ART may block anomalous requests to protect availability and data. The measure will be proportional and may be contested at endart.studios@gmail.com.',
          ],
        },
        {
          title: '13. Security, suspension and termination',
          body: [
            'END ART adopts controls proportional to risk, including credential protection, access control, secret management, TLS where applicable, logs, backups, updates, monitoring and rate limiting. No internet-connected service is absolutely invulnerable.',
            'In case of violation, fraud, security risk or abusive use, END ART may warn, limit function, revoke a key, temporarily suspend or terminate an account, according to severity and urgency. When possible, it will communicate the reason and offer contestation. Emergency measures may be applied immediately to prevent serious harm.',
            'When termination occurs due to END ART decision without consumer fault during a paid period, a proportional solution will be evaluated, such as correction, equivalent resource, abatement or due refund.',
          ],
        },
        {
          title: '14. Liability',
          body: [
            'END ART will respond per the Consumer Protection Code, LGPD and applicable laws for damages and failures attributable to it. Nothing in these Terms excludes non-waivable legal liability, service defect, undue charge, data breach or basic consumer rights.',
            'END ART does not guarantee continuous availability, absolute absence of error or instant update of the entire collection. This limitation does not authorize breach of the offer, denial of legal rights or prevention of correction, support or repair where due.',
            'The user may be responsible for demonstrably caused damages by unlawful use, unauthorized content insertion, fraud, abusive extraction or third-party rights violations.',
          ],
        },
        {
          title: '15. Changes',
          body: [
            'Non-material changes may be incorporated with indication of the update date. Material changes will be communicated before taking effect, with a clear summary and new acceptance when necessary. Continued use will not, in isolation, be used to impose a material change to an adhesion contract without adequate communication.',
          ],
        },
        {
          title: '16. Communications and contact',
          body: [
            'Service, cancellation, refund, content correction, privacy and contractual questions: endart.studios@gmail.com. For security, the dedicated channel indicated in the Security Policy is recommended when available.',
          ],
        },
        {
          title: '17. Governing law and jurisdiction',
          body: [
            "Brazilian law applies. In consumer relations, the forum of the consumer's domicile and any other forum recognized by law as competent or more favorable is preserved. The indication of Osasco, São Paulo does not prevent the consumer from using their legal forum, consumer protection bodies or the Judiciary.",
          ],
        },
        {
          title: 'References',
          body: [
            '[1] CDC — Law nº 8.078/1990 · [2] Decree nº 7.962/2013 (e-commerce) · [3] LGPD — Law nº 13.709/2018 · [4] Law nº 9.610/1998 (Copyright) · [5] GDPR — Regulation (EU) 2016/679, where applicable.',
          ],
        },
        {
          title: '18. Copyright (DMCA) and version history',
          body: [
            'Copyright holders may report alleged infringement through the form at /direitos-autorais (material description, location, legal grounds and contact) or through the channel endart.studios@gmail.com. Notices go through triage and a reasoned decision; unequivocally infringing content is removed.',
            'Version history: v1.0 (2026-09-01) — initial version; v1.1 (2026-09-18) — added the copyright notice channel; v1.2 (2026-09-19) — Stripe activated as the production payment processor.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro:
        'This Privacy Policy describes how END ART Studios (CNPJ 45.370.930/0001-75) collects, uses, stores and protects the personal data of users of the Almanaque dos Clubes platform, in accordance with the Brazilian General Data Protection Law (Law No. 13,709/2018 — LGPD) and other applicable rules.',
      sections: [
        {
          title: '1. Data collected',
          body: [
            'Registration data: name, email and password (stored securely as a hash).',
            'Usage data: browsing information, devices and access logs, for security and service improvement.',
            'Billing data: processed by external payment providers; END ART Studios does not store full card details.',
          ],
        },
        {
          title: '2. Purposes of processing',
          body: [
            'To create and manage the account, authenticate the user and protect access.',
            'To provide contracted services, including paid plans and AI features.',
            'To ensure platform security and prevent fraud and abusive activity.',
            'To communicate updates, changes to terms and relevant information.',
          ],
        },
        {
          title: '3. Legal basis',
          body: [
            'Processing is based on consent (Art. 7, I, LGPD), performance of contract, legitimate interest and compliance with legal obligations, as applicable.',
          ],
        },
        {
          title: '4. Sharing',
          body: [
            'We do not sell personal data. Data may be shared with infrastructure and payment providers, strictly necessary for operation, and with authorities when required by law.',
            'Current environment providers: Vercel (frontend hosting), Railway (API and PostgreSQL database hosting), Cloudflare (DNS and network protection) and Google Fonts (typographic fonts). Payments are processed by Stripe, which acts as an independent controller of payment data towards the data subject. This list is updated whenever a provider is contracted or replaced.',
            'The payment processor Stripe (Stripe, Inc., USA) processes payment and fraud-prevention data, with international transfer to the USA under the LGPD (art. 33 et seq.) and standard contractual clauses where applicable; full card data never touches our servers (Stripe PCI DSS).',
          ],
        },
        {
          title: '5. Data subject rights (LGPD)',
          body: [
            'Users may request confirmation, access, correction, anonymization, portability, deletion and withdrawal of consent.',
            'To exercise your rights, contact the privacy channel indicated below.',
          ],
        },
        {
          title: '6. Cookies',
          body: [
            'We use necessary cookies for authentication, security and preferences (such as language) and keep proof of your consent choice. Optional cookies (analytics/marketing) are only activated with consent and can be withdrawn at any time via the footer ("Manage cookies"). Full inventory: Cookie Policy (/cookies).',
          ],
        },
        {
          title: '7. Security',
          body: [
            'We adopt technical and organizational measures (password encryption, access control, monitoring) to protect data. No system is infallible; we store passwords hashed and never in clear text.',
          ],
        },
        {
          title: '8. Retention',
          body: [
            'Data is kept for as long as necessary for the purposes and legal obligations, or until deletion at the request of the data subject or account closure.',
          ],
        },
        {
          title: '9. Minors',
          body: [
            'The platform is not intended for minors without the consent of their guardians. We do not intentionally collect data from minors.',
          ],
        },
        {
          title: '10. Data Protection Officer (DPO) and contact',
          body: [
            'Privacy requests and exercise of rights: endart.studios@gmail.com.',
            'END ART Studios is the controller of the data processed on the platform.',
          ],
        },
        {
          title: '11. Location, geolocation and currency',
          body: [
            'To display and charge the price in the correct currency, we determine the country of the user from the IP address (approximate location). For this, the IP may be processed by geolocation providers (e.g., ipwho.is) and by our hosting provider (e.g., Vercel, Railway), strictly to identify the country and set the currency (South/Central America: reais; dollar countries: dollars; Europe: euros).',
            'Legal basis: contract performance and legitimate interest. Location is not used for advertising, profiling or automated decisions outside pricing, and is processed in a minimised way only to set the currency.',
          ],
        },
        {
          title: '12. Exercising rights, channels and version history',
          body: [
            'The rights set out in art. 18 of the LGPD (confirmation, access, correction, anonymization, portability, deletion, information on sharing, information on the consequences of not providing data, review of automated decisions and withdrawal of consent) may be exercised through the form at /direitos-titular, which issues a tracking protocol, or through the channel endart.studios@gmail.com.',
            'Confirmation and access requests receive an immediate response; all others within 15 days, extendable under art. 18, §3, with notification to the ANPD.',
            'Version history: v1.0 (2026-09-01) — initial version; v1.1 (2026-09-18) — added data subject rights channels and copyright notice channels; v1.2 (2026-09-19) — Stripe activated as the production payment processor.',
          ],
        },
      ],
    },
  },
  direitosTitular: {
    title: 'Data Subject Rights (LGPD art. 18)',
    intro: 'Exercise your rights over personal data without needing an account. Confirmation and access receive an immediate response; all others within 15 days (ANPD deadline), extendable under art. 18, §3. You receive a protocol to track your request.',
    formTitle: 'New request',
    rightTypeLabel: 'Right you wish to exercise',
    emailLabel: 'Your contact e-mail',
    notesLabel: 'Request details',
    notesOptional: '(optional)',
    submit: 'Submit request',
    submitting: 'Submitting…',
    successTitle: 'Request registered',
    successBody: 'Keep the protocol below to track progress.',
    protocolLabel: 'Protocol',
    trackNow: 'Track it now',
    trackTitle: 'Track request',
    trackInputLabel: 'Protocol',
    trackButton: 'Look up',
    notFound: 'Protocol not found. Check the characters and try again.',
    errorGeneric: 'Could not complete. Try again or write to endart.studios@gmail.com.',
    statusLabel: 'Status',
    slaLabel: 'Response deadline',
    createdAtLabel: 'Received on',
    rightTypes: {
      confirmacao: 'Confirmation that data is being processed',
      acesso: 'Access to the data',
      correcao: 'Correction of incomplete or outdated data',
      anonimizacao: 'Anonymization, blocking or deletion of unnecessary data',
      portabilidade: 'Data portability',
      eliminacao: 'Deletion of data processed with consent',
      infoCompartilhamento: 'Information on with whom data is shared',
      infoConsequencia: 'Information on the consequences of not providing data',
      revisaoAutomatizada: 'Review of decisions made solely by automated means',
      revogacao: 'Withdrawal of consent',
    },
    statusLabels: {
      recebido: 'Received',
      em_andamento: 'In progress',
      atendido: 'Fulfilled',
      indeferido: 'Denied',
    },
  },
  copyrightForm: {
    title: 'Copyright Notice (DMCA)',
    intro: 'Copyright holders may report alleged infringement (DMCA §512 / Brazilian Law 9.610/98). Notices go through triage with a reasoned decision; unequivocally infringing content is removed.',
    materialLabel: 'Allegedly infringed material (describe the work)',
    locationLabel: 'Location on the platform (URL)',
    fundamentLabel: 'Legal grounds and good-faith statement',
    emailLabel: 'Contact e-mail',
    submit: 'Submit notice',
    submitting: 'Submitting…',
    successTitle: 'Notice received',
    successBody: 'Keep the protocol below. Triage occurs within 5 business days and decisions are always reasoned.',
    protocolLabel: 'Protocol',
    errorGeneric: 'Could not submit. Try again or write to endart.studios@gmail.com.',
  },

};

export default en;
