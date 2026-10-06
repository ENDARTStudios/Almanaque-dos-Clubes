/**
 * T493/T472 — strings do canal de direitos autorais (/direitos-autorais) ×3 locales.
 * Mesmo padrão de wsC9/wsO1: módulo próprio importado direto pelo componente
 * (não entra no Dictionary monolítico). PT é a língua de prevalência.
 */
import type { Locale } from './config';

export interface WsCopyrightStrings {
  h1: string;
  subtitle: string;
  loading: string;
  loggedIntro: string;
  loggedStrong: string;
  loggedManual: string;
  loggedWith: string;
  framingTitle: string;
  framingP1: string;
  framingLaw: string;
  framingP2: string;
  framingNoAgent: string;
  framingP3: string;
  repeatTitle: string;
  repeatBody: string;
  noticeTitle: string;
  work: string;
  workUrl: string;
  materialUrl: string;
  description: string;
  goodFaith: string;
  accuracy: string;
  signature: string;
  submitNotice: string;
  sending: string;
  counterTitle: string;
  protoLabel: string;
  justLabel: string;
  submitCounter: string;
  mineTitle: string;
  empty: string;
  counterTag: string;
  noticeTag: string;
  noticeOk: string;
  counterOk: string;
  submitError: string;
  status: Record<string, string>;
}

export const wsCopyrightStrings: Record<Locale, WsCopyrightStrings> = {
  'pt-br': {
    h1: 'Direitos Autorais',
    subtitle: 'Lei 9.610/98 e normas análogas · END ART Studios',
    loading: 'Carregando…',
    loggedIntro: 'Envie notificações pelo fluxo com protocolo',
    loggedStrong: 'entrando na sua conta',
    loggedManual: '. Sem conta, use o canal manual:',
    loggedWith:
      'com: identificação da obra, URL exata, dados do titular/representante, declaração de boa-fé, declaração de exatidão e contato.',
    framingTitle: 'Enquadramento',
    framingP1: 'Este é um processo interno de notificação/contranotificação à luz da',
    framingLaw: 'Lei 9.610/98',
    framingP2: 'e normas análogas.',
    framingNoAgent: 'Não há agente DMCA registrado nos EUA',
    framingP3: 'e não se invoca procedimento formal de safe harbor americano.',
    repeatTitle: 'Reincidentes',
    repeatBody:
      'análise manual, com suspensão/encerramento proporcional se comprovado — sem automação.',
    noticeTitle: 'Notificação de violação',
    work: 'Obra',
    workUrl: 'URL da obra (opcional)',
    materialUrl: 'URL do material na plataforma',
    description: 'Descrição',
    goodFaith: 'Declaro, de boa-fé, que o uso não é autorizado.',
    accuracy: 'Declaro que as informações são exatas.',
    signature: 'Assinatura (nome)',
    submitNotice: 'Registrar notificação',
    sending: 'Enviando…',
    counterTitle: 'Contranotificação',
    protoLabel: 'Protocolo da notificação',
    justLabel: 'Justificativa',
    submitCounter: 'Registrar contranotificação',
    mineTitle: 'Minhas notificações',
    empty: 'Nenhuma notificação registrada.',
    counterTag: 'Contranotificação',
    noticeTag: 'Notificação',
    noticeOk: 'Notificação registrada. Protocolo: {protocol}',
    counterOk: 'Contranotificação registrada. Protocolo: {protocol}',
    submitError: 'Erro ao registrar.',
    status: {
      received: 'Recebida',
      under_review: 'Em análise',
      action_taken: 'Providência adotada',
      rejected: 'Indeferida',
      closed: 'Encerrada',
    },
  },
  'en-us': {
    h1: 'Copyright',
    subtitle: 'Brazilian law 9.610/98 and analogous rules · END ART Studios',
    loading: 'Loading…',
    loggedIntro: 'Submit notices through the protocol flow by',
    loggedStrong: 'signing in to your account',
    loggedManual: '. Without an account, use the manual channel:',
    loggedWith:
      'including: work identification, exact URL, owner/representative details, good-faith statement, accuracy statement and contact information.',
    framingTitle: 'Legal framework',
    framingP1: 'This is an internal notice/counter-notice process under Brazilian',
    framingLaw: 'Law 9.610/98',
    framingP2: 'and analogous rules.',
    framingNoAgent: 'There is no DMCA agent registered in the US',
    framingP3: 'and no US safe-harbor formal procedure is invoked.',
    repeatTitle: 'Repeat infringers',
    repeatBody:
      'manual review, with proportionate suspension/termination where substantiated — no automation.',
    noticeTitle: 'Infringement notice',
    work: 'Work',
    workUrl: 'Work URL (optional)',
    materialUrl: 'URL of the material on the platform',
    description: 'Description',
    goodFaith: 'I declare, in good faith, that the use is not authorized.',
    accuracy: 'I declare that the information is accurate.',
    signature: 'Signature (name)',
    submitNotice: 'Submit notice',
    sending: 'Sending…',
    counterTitle: 'Counter-notice',
    protoLabel: 'Notice protocol number',
    justLabel: 'Justification',
    submitCounter: 'Submit counter-notice',
    mineTitle: 'My notices',
    empty: 'No notices registered.',
    counterTag: 'Counter-notice',
    noticeTag: 'Notice',
    noticeOk: 'Notice registered. Protocol: {protocol}',
    counterOk: 'Counter-notice registered. Protocol: {protocol}',
    submitError: 'Could not submit.',
    status: {
      received: 'Received',
      under_review: 'Under review',
      action_taken: 'Action taken',
      rejected: 'Rejected',
      closed: 'Closed',
    },
  },
  'es-es': {
    h1: 'Derechos de Autor',
    subtitle: 'Ley 9.610/98 (Brasil) y normas análogas · END ART Studios',
    loading: 'Cargando…',
    loggedIntro: 'Envía notificaciones por el flujo con protocolo',
    loggedStrong: 'iniciando sesión en tu cuenta',
    loggedManual: '. Sin cuenta, usa el canal manual:',
    loggedWith:
      'con: identificación de la obra, URL exacta, datos del titular/representante, declaración de buena fe, declaración de exactitud y contacto.',
    framingTitle: 'Enmarcamiento legal',
    framingP1: 'Este es un proceso interno de notificación/contranotificación a la luz de la',
    framingLaw: 'Ley 9.610/98',
    framingP2: 'y normas análogas.',
    framingNoAgent: 'No hay agente DMCA registrado en EE. UU.',
    framingP3: 'y no se invoca el procedimiento formal de safe harbor estadounidense.',
    repeatTitle: 'Reincidentes',
    repeatBody:
      'análisis manual, con suspensión/cierre proporcional si se comprueba — sin automatización.',
    noticeTitle: 'Notificación de infracción',
    work: 'Obra',
    workUrl: 'URL de la obra (opcional)',
    materialUrl: 'URL del material en la plataforma',
    description: 'Descripción',
    goodFaith: 'Declaro, de buena fe, que el uso no está autorizado.',
    accuracy: 'Declaro que la información es exacta.',
    signature: 'Firma (nombre)',
    submitNotice: 'Registrar notificación',
    sending: 'Enviando…',
    counterTitle: 'Contranotificación',
    protoLabel: 'Protocolo de la notificación',
    justLabel: 'Justificación',
    submitCounter: 'Registrar contranotificación',
    mineTitle: 'Mis notificaciones',
    empty: 'Ninguna notificación registrada.',
    counterTag: 'Contranotificación',
    noticeTag: 'Notificación',
    noticeOk: 'Notificación registrada. Protocolo: {protocol}',
    counterOk: 'Contranotificación registrada. Protocolo: {protocol}',
    submitError: 'Error al registrar.',
    status: {
      received: 'Recibida',
      under_review: 'En análisis',
      action_taken: 'Providencia adoptada',
      rejected: 'Denegada',
      closed: 'Cerrada',
    },
  },
};
