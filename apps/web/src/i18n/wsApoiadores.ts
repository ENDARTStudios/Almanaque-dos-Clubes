import type { Locale } from './config';

/**
 * T-28 — /apoiadores: landing de apoio em Gancho → Promessa → Prova → CTA
 * (skill `conversion-copy`), para três audiências: apoiador (plano), parceiro
 * (instituições/pesquisa) e patrocinador (marcas). Módulo ADITIVO (`wsC*`), como
 * `wsLegends`/`wsMapPage` — o `Dictionary` global é arquivo quente.
 *
 * HONESTIDADE (não negociável, skill + docs):
 *  - NENHUM valor de plano ou cota de patrocínio nesta página — o billing real é
 *    Stripe e vive em /planos; aqui só apontamos para lá;
 *  - PROVA = números lidos da API na renderização (server component) — se a API
 *    falha, a lacuna é declarada ("em catalogação"), nunca estimada;
 *  - sem depoimento inventado, sem logo de parceiro, sem prêmio, sem promessa de
 *    retorno que o projeto não controla;
 *  - contato = aliases REAIS do Operador (mesmo padrão do +contato do rodapé e
 *    de /metodologia): +parcerias e +patrocinio.
 */
export interface WsApoiadoresStrings {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  /** CTA primário da dobra (exatamente 1) → /planos. */
  ctaPrimary: string;
  /** Microcopy de atrito abaixo do CTA — responde a objeção real sem inventar valor. */
  ctaPrimaryNote: string;
  proofTitle: string;
  proofNote: string;
  proofClubs: string;
  proofPlayers: string;
  proofMatches: string;
  proofTitles: string;
  proofRankings: string;
  proofCompetitions: string;
  /** Lacuna declarada quando a API não responde — nunca número estimado. */
  proofGap: string;
  audiencesTitle: string;
  audiencesSubtitle: string;
  supporterTitle: string;
  supporterBody: string;
  partnerTitle: string;
  partnerBody: string;
  sponsorTitle: string;
  sponsorBody: string;
  sponsorNote: string;
  ctaPartner: string;
  ctaSponsor: string;
  howTitle: string;
  howSupporter: string[];
  howPartner: string[];
  howSponsor: string[];
  transparencyTitle: string;
  transparencyBody: string;
  transparencyMethodology: string;
  transparencyRights: string;
}

export const wsApoiadoresStrings: Record<Locale, WsApoiadoresStrings> = {
  'pt-br': {
    heroEyebrow: 'Apoie o Almanaque dos Clubes',
    heroTitle: 'Toda história precisa de quem a mantenha viva.',
    heroSubtitle:
      'O Almanaque é um acervo aberto: clubes, jogadores, competições e títulos com fonte verificada, de graça, para qualquer torcedor. Seu apoio mantém o acervo no ar, a ingestão de fontes rodando e a memória do futebol crescendo.',
    ctaPrimary: 'Sustentar o acervo',
    ctaPrimaryNote: 'Os planos e os valores ficam em /planos — a escolha é sua.',
    proofTitle: 'O acervo, hoje',
    proofNote:
      'Números reais, lidos da API quando esta página abriu — nada arredondado, nada estimado. A metodologia mostra como cada um entra no acervo.',
    proofClubs: 'clubes e seleções',
    proofPlayers: 'jogadores',
    proofMatches: 'partidas',
    proofTitles: 'títulos auditáveis',
    proofRankings: 'rankings catalogados',
    proofCompetitions: 'competições catalogadas',
    proofGap: 'em catalogação',
    audiencesTitle: 'Três formas de apoiar',
    audiencesSubtitle:
      'Torcedor, instituição ou marca: cada apoio sustenta uma parte do chão que a memória precisa.',
    supporterTitle: 'Você, torcedor — sustente o acervo',
    supporterBody:
      'Cada plano paga o chão que a memória precisa: servidores, ingestão de fontes abertas e curadoria. Em troca, o acervo inteiro continua aberto e auditável — do primeiro escanteio ao último título.',
    partnerTitle: 'Instituições e pesquisadores',
    partnerBody:
      'Universidades, museus, imprensa e projetos de pesquisa trabalham com o acervo com proveniência documento a documento. Se o seu trabalho precisa da história do futebol com fonte, vamos conversar sobre acesso e colaboração.',
    sponsorTitle: 'Marcas ao lado da história',
    sponsorBody:
      'Patrocínio aqui não é banner: é sustentar infraestrutura, ingestão de fontes e a digitalização de acervos que, muitas vezes, não existem em nenhum outro lugar.',
    sponsorNote:
      'Sem cota fechada nesta página — cada parceria é desenhada caso a caso, com o que a marca busca e o que o acervo sustenta.',
    ctaPartner: 'Enviar e-mail de parcerias',
    ctaSponsor: 'Enviar e-mail de patrocínio',
    howTitle: 'Como apoiar, passo a passo',
    howSupporter: [
      'Abra a página de planos.',
      'Escolha o plano que couber no seu bolso.',
      'O pagamento é processado pelo Stripe — e o acervo segue aberto para todo mundo.',
    ],
    howPartner: [
      'Escreva para o e-mail de parcerias contando quem você é e o que pesquisa.',
      'Alinhamos escopo, uso dos dados e proveniência.',
      'Você recebe o material com a fonte de cada número.',
    ],
    howSponsor: [
      'Escreva para o e-mail de patrocínio apresentando a marca e o objetivo.',
      'Conversamos sobre o que o patrocínio sustenta: infraestrutura, ingestão e fontes.',
      'Fechamos o formato juntos — sem cota pronta e sem promessa de retorno que não podemos controlar.',
    ],
    transparencyTitle: 'Transparência',
    transparencyBody:
      'O apoio vira infraestrutura, ingestão de fontes e digitalização. O critério do que entra no acervo — e de onde cada dado vem — está documentado e aberto.',
    transparencyMethodology: 'Ver a metodologia',
    transparencyRights: 'Direitos autorais e remoção',
  },
  'en-us': {
    heroEyebrow: 'Support Almanaque dos Clubes',
    heroTitle: 'Every story needs someone to keep it alive.',
    heroSubtitle:
      'The Almanaque is an open archive: clubs, players, competitions and titles with verified sources, free, for any football lover. Your support keeps the archive online, the source ingestion running and football memory growing.',
    ctaPrimary: 'Sustain the archive',
    ctaPrimaryNote: 'Plans and prices live on /planos — the choice is yours.',
    proofTitle: 'The archive, today',
    proofNote:
      'Real numbers, read from the API when this page opened — nothing rounded, nothing estimated. The methodology shows how each one enters the archive.',
    proofClubs: 'clubs and national teams',
    proofPlayers: 'players',
    proofMatches: 'matches',
    proofTitles: 'auditable titles',
    proofRankings: 'rankings cataloged',
    proofCompetitions: 'competitions cataloged',
    proofGap: 'in cataloging',
    audiencesTitle: 'Three ways to support',
    audiencesSubtitle:
      'Fan, institution or brand: each kind of support sustains part of the ground memory stands on.',
    supporterTitle: 'You, fan — sustain the archive',
    supporterBody:
      'Every plan pays for the ground memory needs: servers, open-source ingestion and curation. In return, the whole archive stays open and auditable — from the first corner kick to the last title.',
    partnerTitle: 'Institutions and researchers',
    partnerBody:
      'Universities, museums, press and research projects work with the archive with document-by-document provenance. If your work needs football history with sources, let us talk about access and collaboration.',
    sponsorTitle: 'Brands beside history',
    sponsorBody:
      'Sponsorship here is not a banner: it sustains infrastructure, source ingestion and the digitization of archives that often exist nowhere else.',
    sponsorNote:
      'No fixed tiers on this page — every partnership is designed case by case, matching what the brand seeks and what the archive can stand on.',
    ctaPartner: 'Send a partnerships e-mail',
    ctaSponsor: 'Send a sponsorship e-mail',
    howTitle: 'How to support, step by step',
    howSupporter: [
      'Open the plans page.',
      'Choose the plan that fits your budget.',
      'Payment is processed by Stripe — and the archive stays open to everyone.',
    ],
    howPartner: [
      'Write to the partnerships e-mail telling who you are and what you research.',
      'We align scope, data use and provenance.',
      'You receive the material with the source of every number.',
    ],
    howSponsor: [
      'Write to the sponsorship e-mail presenting your brand and your goal.',
      'We talk about what sponsorship sustains: infrastructure, ingestion and sources.',
      'We design the format together — no ready-made tier, no promise of return we cannot control.',
    ],
    transparencyTitle: 'Transparency',
    transparencyBody:
      'Support becomes infrastructure, source ingestion and digitization. The criterion for what enters the archive — and where every datum comes from — is documented and open.',
    transparencyMethodology: 'See the methodology',
    transparencyRights: 'Copyright and removal',
  },
  'es-es': {
    heroEyebrow: 'Apoya el Almanaque dos Clubes',
    heroTitle: 'Toda historia necesita quien la mantenga viva.',
    heroSubtitle:
      'El Almanaque es un acervo abierto: clubes, jugadores, competiciones y títulos con fuente verificada, gratis, para cualquier aficionado. Tu apoyo mantiene el acervo en el aire, la ingesta de fuentes rodando y la memoria del fútbol creciendo.',
    ctaPrimary: 'Sostener el acervo',
    ctaPrimaryNote: 'Los planes y los valores quedan en /planos — la elección es tuya.',
    proofTitle: 'El acervo, hoy',
    proofNote:
      'Números reales, leídos de la API cuando esta página abrió — nada redondeado, nada estimado. La metodología muestra cómo entra cada uno en el acervo.',
    proofClubs: 'clubes y selecciones',
    proofPlayers: 'jugadores',
    proofMatches: 'partidos',
    proofTitles: 'títulos auditables',
    proofRankings: 'rankings catalogados',
    proofCompetitions: 'competiciones catalogadas',
    proofGap: 'en catalogación',
    audiencesTitle: 'Tres formas de apoyar',
    audiencesSubtitle:
      'Aficionado, institución o marca: cada apoyo sostiene una parte del suelo que la memoria necesita.',
    supporterTitle: 'Tú, aficionado — sostén el acervo',
    supporterBody:
      'Cada plan paga el suelo que la memoria necesita: servidores, ingesta de fuentes abiertas y curaduría. A cambio, el acervo entero sigue abierto y auditable — del primer saque de esquina al último título.',
    partnerTitle: 'Instituciones e investigadores',
    partnerBody:
      'Universidades, museos, prensa y proyectos de investigación trabajan con el acervo con procedencia documento a documento. Si tu trabajo necesita la historia del fútbol con fuente, hablemos de acceso y colaboración.',
    sponsorTitle: 'Marcas al lado de la historia',
    sponsorBody:
      'El patrocinio aquí no es un banner: es sostener infraestructura, ingesta de fuentes y la digitalización de acervos que, muchas veces, no existen en ningún otro lugar.',
    sponsorNote:
      'Sin cota cerrada en esta página — cada alianza se diseña caso a caso, con lo que la marca busca y lo que el acervo sostiene.',
    ctaPartner: 'Enviar correo de alianzas',
    ctaSponsor: 'Enviar correo de patrocinio',
    howTitle: 'Cómo apoyar, paso a paso',
    howSupporter: [
      'Abre la página de planes.',
      'Elige el plan que quepa en tu bolsillo.',
      'El pago lo procesa Stripe — y el acervo sigue abierto para todos.',
    ],
    howPartner: [
      'Escribe al correo de alianzas contando quién eres y qué investigas.',
      'Alineamos alcance, uso de los datos y procedencia.',
      'Recibes el material con la fuente de cada número.',
    ],
    howSponsor: [
      'Escribe al correo de patrocinio presentando la marca y el objetivo.',
      'Conversamos sobre lo que el patrocinio sostiene: infraestructura, ingesta y fuentes.',
      'Cerramos el formato juntos — sin cota lista y sin promesa de retorno que no podamos controlar.',
    ],
    transparencyTitle: 'Transparencia',
    transparencyBody:
      'El apoyo se convierte en infraestructura, ingesta de fuentes y digitalización. El criterio de lo que entra en el acervo — y de dónde viene cada dato — está documentado y abierto.',
    transparencyMethodology: 'Ver la metodología',
    transparencyRights: 'Derechos de autor y remoción',
  },
};
