import type { Locale } from './config';

/**
 * Copy do shell legal no conceito FICHA (legal.png). Os documentos continuam nos dicionários
 * (dict.legal / dict.pages.cookiePolicy); aqui vivem a moldura, as abas e a frase única de cada
 * documento — a leitura que o leitor precisa saber antes do detalhe.
 */
export type LegalTabKey = 'privacidade' | 'termos' | 'cookies' | 'direitos' | 'lgpd';

export interface ConceitoLegalStrings {
  kicker: string;
  title: string;
  intro: string;
  tabs: Record<LegalTabKey, string>;
  summaryTitle: string;
  inPage: string;
  updatedLabel: string;
  historyTitle: string;
  historyBody: string;
  contactBody: string;
  localeLabel: string;
  note: string;
  summaries: Record<LegalTabKey, string>;
}

export const wsConceitoLegal: Record<Locale, ConceitoLegalStrings> = {
  'pt-br': {
    kicker: 'Institucional · documentos legais',
    title: 'Legal',
    intro:
      'Cinco documentos, uma estrutura. Cada um abre dizendo em uma frase o que o leitor precisa saber — e o resto é o detalhe para quem quiser conferir.',
    tabs: {
      privacidade: 'Privacidade',
      termos: 'Termos de uso',
      cookies: 'Cookies',
      direitos: 'Direitos autorais',
      lgpd: 'LGPD',
    },
    summaryTitle: 'Em uma frase',
    inPage: 'Nesta página',
    updatedLabel: 'Última atualização',
    historyTitle: 'Histórico e contato',
    historyBody:
      'As versões anteriores ficam arquivadas e continuam acessíveis por data. Pedidos do titular são respondidos em até 15 dias, pelo canal indicado no documento.',
    contactBody: 'Canal manual (sem conta): endart.studios+privacidade@gmail.com.',
    localeLabel: 'Idioma',
    note: 'Este documento é a regra publicada, não uma peça de marketing. O conteúdo real passa por revisão antes de publicar.',
    summaries: {
      privacidade:
        'Guardamos o mínimo para a conta funcionar; nada é vendido, e o acervo público não exige que você se identifique.',
      termos:
        'O acervo é público; a conta e a assinatura têm regras próprias, e uso abusivo pode ser suspenso com motivo.',
      cookies:
        'Só instalamos cookie depois da sua escolha: necessários para sessão e segurança, opcionais para medir audiência.',
      direitos:
        'Conteúdo nosso tem licença declarada; conteúdo de terceiro só entra com licença — e há canal para notificar erro de atribuição.',
      lgpd: 'Você pode pedir acesso, correção, portabilidade e exclusão com protocolo rastreável, sem justificar o pedido.',
    },
  },
  'en-us': {
    kicker: 'Institutional · legal documents',
    title: 'Legal',
    intro:
      'Five documents, one structure. Each opens by saying in one sentence what the reader needs to know — the rest is detail for those who want to check.',
    tabs: {
      privacidade: 'Privacy',
      termos: 'Terms of use',
      cookies: 'Cookies',
      direitos: 'Copyright',
      lgpd: 'LGPD',
    },
    summaryTitle: 'In one sentence',
    inPage: 'On this page',
    updatedLabel: 'Last updated',
    historyTitle: 'History and contact',
    historyBody:
      'Previous versions are archived and remain accessible by date. Data subject requests are answered within 15 days through the channel named in the document.',
    contactBody: 'Manual channel (no account): endart.studios+privacidade@gmail.com.',
    localeLabel: 'Language',
    note: 'This document is the published rule, not marketing copy. Real content is reviewed before publishing.',
    summaries: {
      privacidade:
        'We keep the minimum to run an account; nothing is sold, and the public archive does not require you to identify yourself.',
      termos:
        'The archive is public; account and subscription have their own rules, and abuse can be suspended with a reason.',
      cookies:
        'We only set a cookie after your choice: necessary ones for session and security, optional ones to measure audience.',
      direitos:
        'Our content has a declared licence; third-party content only enters with a licence — and there is a channel to report attribution errors.',
      lgpd: 'You can request access, correction, portability and deletion with a traceable protocol, without justifying the request.',
    },
  },
  'es-es': {
    kicker: 'Institucional · documentos legales',
    title: 'Legal',
    intro:
      'Cinco documentos, una estructura. Cada uno abre diciendo en una frase lo que el lector necesita saber — el resto es el detalle para quien quiera comprobar.',
    tabs: {
      privacidade: 'Privacidad',
      termos: 'Términos de uso',
      cookies: 'Cookies',
      direitos: 'Derechos de autor',
      lgpd: 'LGPD',
    },
    summaryTitle: 'En una frase',
    inPage: 'En esta página',
    updatedLabel: 'Última actualización',
    historyTitle: 'Historial y contacto',
    historyBody:
      'Las versiones anteriores quedan archivadas y siguen accesibles por fecha. Las solicitudes del titular se responden en hasta 15 días por el canal indicado en el documento.',
    contactBody: 'Canal manual (sin cuenta): endart.studios+privacidade@gmail.com.',
    localeLabel: 'Idioma',
    note: 'Este documento es la regla publicada, no una pieza de marketing. El contenido real pasa por revisión antes de publicar.',
    summaries: {
      privacidade:
        'Guardamos lo mínimo para que la cuenta funcione; nada se vende y el acervo público no exige identificarte.',
      termos:
        'El acervo es público; la cuenta y la suscripción tienen reglas propias, y el abuso puede suspenderse con motivo.',
      cookies:
        'Solo instalamos cookies después de tu elección: necesarias para sesión y seguridad, opcionales para medir audiencia.',
      direitos:
        'Nuestro contenido tiene licencia declarada; el de terceros solo entra con licencia — y hay canal para notificar errores de atribución.',
      lgpd: 'Puedes pedir acceso, corrección, portabilidad y eliminación con protocolo rastreable, sin justificar la solicitud.',
    },
  },
};
