import type { Locale } from './config';

/**
 * WS-C-12 — strings da dobra de aquisição (home/hero).
 *
 * Módulo ADITIVO (não altera o `Dictionary` global). Copy construída no framework
 * Gancho → Promessa → Prova → CTA (ver skill `conversion-copy`) e com duas regras
 * de honestidade do acervo:
 *
 *  - o estado "em construção" é declarado UMA vez (em `promiseNote`), nunca repetido
 *    como bordão em cada seção;
 *  - `statsNoData` substitui três placeholders idênticos quando a API não responde —
 *    a lacuna é declarada uma vez, não fingida como métrica.
 *
 * `{count}` é interpolado por `t('…', { count })` — ver `i18n/Provider.tsx`.
 */
export interface HeroLandingStrings {
  /** Gancho: chip que situa o produto acima do H1. */
  eyebrow: string;
  /** Gancho: pergunta/dor que o visitante reconhece. */
  hook: string;
  /** Promessa: o que a pessoa ganha, em duas linhas. */
  promise: string;
  /** Nota de honestidade — declarada uma única vez na página. */
  promiseNote: string;
  ctaPrimary: string;
  /** Remove a objeção do passo primário (busca é livre). */
  ctaPrimaryNote: string;
  ctaSecondary: string;
  /** Prova: título do cartão com dado real do acervo. */
  proofTitle: string;
  proofSource: string;
  proofSeason: string;
  proofEmpty: string;
  proofDisclaimer: string;
  /** T568 — carrossel de campeoes na hero (mundial + continentais). */
  carousel: {
    tierWorld: string;
    tierContinental: string;
    tierOther: string;
    carouselRole: string;
    carouselLabel: string;
    slideRole: string;
    prev: string;
    next: string;
    /** Conector "de": "1 de 4". */
    of: string;
    source: string;
  };
  /** Prova quantitativa — legenda com a origem e a data da consulta (não bordão). */
  statsProvenance: string;
  /** Lacuna declarada: quando a API não responde, uma nota substitui os cartões. */
  statsNoData: string;
  featuresTitle: string;
  featuresSubtitle: string;
  howTitle: string;
  howSteps: { title: string; desc: string }[];
  closingTitle: string;
  closingDesc: string;
}

export const wsC12Strings: Record<Locale, HeroLandingStrings> = {
  'pt-br': {
    /* POSICIONAMENTO (2ª correção do Operador). A 1ª versão vendia MÉTODO ("o seu palpite ou o
       dado com fonte") — reprovada: futebol é paixão, não auditoria. A 2ª vendia ESCOPO
       ESTREITO ("todo clube tem uma história") — reprovada também, e a objeção foi cirúrgica:
       "a história de um clube é só uma fração dela". O torcedor quer o jogo inteiro: todos os
       clubes, todos os ídolos, todas as eras, todas as competições. O gancho agora pega o que o
       Operador nomeou — o futebol é ETERNO — e a promessa entrega a totalidade, não a fração.

       3ª correção do Operador (2026-10): a segunda metade era "A memória dele, também" e virou
       "A paixão por ele, também". A troca não é sinônimo — muda o que o site promete. "Memória"
       coloca o acervo como um arquivo do que passou, e o próprio comentário abaixo já rejeitava
       isso ("o futebol não é um acervo do que passou — é uma coisa viva e presente"). "Paixão"
       devolve o sentimento ao presente e casa com a razão que o Operador já havia dado para
       rejeitar a 1ª versão: "futebol é paixão, não auditoria". */
    hook: 'O futebol é eterno.\u00a0A paixão por ele, também.',
    /* "é", não "já foi": o futebol não é um acervo do que passou — é uma coisa viva e presente
       (correção do Operador). O presente também é coerente com o H1 "é eterno". */
    eyebrow: 'Tudo o que o futebol é, num só lugar.',
    promise:
      'Clubes, ídolos, campeões e as eras que não acabam — de todos os países e competições.',
    promiseNote: 'E cada número com a fonte ao lado, para a história resistir à conferência.',
    ctaPrimary: 'Começar a explorar',
    ctaPrimaryNote: 'Sem cadastro para explorar.',
    ctaSecondary: 'Criar conta gratuita',
    proofTitle: 'Campeão vigente no acervo',
    proofSource: 'Fonte',
    proofSeason: 'Temporada',
    proofEmpty: 'Nenhum campeão auditável publicado ainda.',
    carousel: {
      tierWorld: 'Campeão mundial',
      tierContinental: 'Campeão continental',
      tierOther: 'Campeão',
      carouselRole: 'carrossel',
      carouselLabel: 'Campeões vigentes no acervo',
      slideRole: 'slide',
      prev: 'Campeão anterior',
      next: 'Próximo campeão',
      of: 'de',
      source: 'ver fonte',
    },
    proofDisclaimer:
      'Escolhido entre os campeões com fonte verificada; hierarquias sem dado auditável ficam de fora.',
    statsProvenance: 'Contagens do acervo, lidas da API pública e conferíveis em /metodologia.',
    statsNoData:
      'Contagens indisponíveis agora — a lacuna é declarada, não estimada. Elas voltam quando a API pública responde.',
    featuresTitle: 'Um acervo, quatro respostas',
    featuresSubtitle:
      'O que você procura já existe espalhado em dez sites: aqui está junto, com a fonte ao lado de cada número.',
    howTitle: 'Como conferir em 30 segundos',
    howSteps: [
      {
        title: 'Busque o clube ou a competição',
        desc: 'Busca textual sobre o acervo indexado — sem cadastro, sem paywall na consulta.',
      },
      {
        title: 'Abra a ficha e olhe a fonte',
        desc: 'Cada título, ranking e partida traz a proveniência e a data em que foi obtido.',
      },
      {
        title: 'Compare e decida com o número',
        desc: 'Rankings 0-100 explicam como foram calculados, em vez de pedir que você confie.',
      },
    ],
    closingTitle: 'Comece pela pergunta que te trouxe aqui',
    closingDesc:
      'Leve o debate para o dado: pesquise, confira a fonte e compare. A conta é gratuita e leva menos de um minuto.',
  },
  'en-us': {
    hook: 'Football is eternal.\u00a0So is the passion for it.',
    eyebrow: 'Everything football is, in one place.',
    promise:
      'Clubs, idols, champions and the eras that never end — from every country and competition.',
    promiseNote: 'And a source beside every number, so the story survives being checked.',
    ctaPrimary: 'Start exploring',
    ctaPrimaryNote: 'No sign-up to explore.',
    ctaSecondary: 'Create a free account',
    proofTitle: 'Reigning champion in the archive',
    proofSource: 'Source',
    proofSeason: 'Season',
    proofEmpty: 'No auditable champion published yet.',
    carousel: {
      tierWorld: 'World champion',
      tierContinental: 'Continental champion',
      tierOther: 'Champion',
      carouselRole: 'carousel',
      carouselLabel: 'Reigning champions in the archive',
      slideRole: 'slide',
      prev: 'Previous champion',
      next: 'Next champion',
      of: 'of',
      source: 'view source',
    },
    proofDisclaimer:
      'Picked from champions with a verified source; hierarchies without auditable data stay out.',
    statsProvenance:
      'Counts from the archive, read from the public API and checkable at /metodologia.',
    statsNoData:
      'Counts unavailable right now — the gap is declared, not estimated. They return when the public API answers.',
    featuresTitle: 'One archive, four answers',
    featuresSubtitle:
      'What you need is scattered across ten sites: here it sits together, with a source next to every number.',
    howTitle: 'How to check in 30 seconds',
    howSteps: [
      {
        title: 'Search the club or competition',
        desc: 'Full-text search over the indexed archive — no sign-up, no paywall on lookup.',
      },
      {
        title: 'Open the record and read the source',
        desc: 'Every title, ranking and match carries its provenance and the date it was retrieved.',
      },
      {
        title: 'Compare and decide with the number',
        desc: '0-100 rankings explain how they were computed instead of asking you to trust them.',
      },
    ],
    closingTitle: 'Start with the question that brought you here',
    closingDesc:
      'Take the debate to the data: search, check the source and compare. The account is free and takes under a minute.',
  },
  'es-es': {
    hook: 'El fútbol es eterno.\u00a0La pasión por él, también.',
    eyebrow: 'Todo lo que el fútbol es, en un solo lugar.',
    promise:
      'Clubes, ídolos, campeones y las eras que no terminan — de todos los países y competiciones.',
    promiseNote: 'Y cada número con su fuente al lado, para que la historia resista el cotejo.',
    ctaPrimary: 'Empezar a explorar',
    ctaPrimaryNote: 'Sin registro para explorar.',
    ctaSecondary: 'Crear cuenta gratuita',
    proofTitle: 'Campeón vigente en el acervo',
    proofSource: 'Fuente',
    proofSeason: 'Temporada',
    proofEmpty: 'Aún no hay campeón auditable publicado.',
    carousel: {
      tierWorld: 'Campeón mundial',
      tierContinental: 'Campeón continental',
      tierOther: 'Campeón',
      carouselRole: 'carrusel',
      carouselLabel: 'Campeones vigentes en el acervo',
      slideRole: 'slide',
      prev: 'Campeón anterior',
      next: 'Campeón siguiente',
      of: 'de',
      source: 'ver fuente',
    },
    proofDisclaimer:
      'Elegido entre campeones con fuente verificada; las jerarquías sin dato auditable quedan fuera.',
    statsProvenance:
      'Recuentos del acervo, leídos de la API pública y verificables en /metodologia.',
    statsNoData:
      'Recuentos no disponibles ahora — la laguna se declara, no se estima. Vuelven cuando responde la API pública.',
    featuresTitle: 'Un acervo, cuatro respuestas',
    featuresSubtitle:
      'Lo que buscas ya está disperso en diez sitios: aquí está junto, con la fuente al lado de cada número.',
    howTitle: 'Cómo comprobarlo en 30 segundos',
    howSteps: [
      {
        title: 'Busca el club o la competición',
        desc: 'Búsqueda textual sobre el acervo indexado — sin registro y sin muro de pago en la consulta.',
      },
      {
        title: 'Abre la ficha y mira la fuente',
        desc: 'Cada título, ranking y partido trae su procedencia y la fecha en que se obtuvo.',
      },
      {
        title: 'Compara y decide con el número',
        desc: 'Los rankings 0-100 explican cómo se calcularon en vez de pedirte que confíes.',
      },
    ],
    closingTitle: 'Empieza por la pregunta que te trajo aquí',
    closingDesc:
      'Lleva el debate al dato: busca, comprueba la fuente y compara. La cuenta es gratuita y toma menos de un minuto.',
  },
};
