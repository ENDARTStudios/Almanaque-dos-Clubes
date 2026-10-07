/**
 * T493 — strings do painel de direitos do titular (/direitos-titular, LGPD
 * art. 18) ×3 locales. Módulo próprio no padrão wsC9/wsCopyright: importado
 * direto pelo componente, pt é a língua de prevalência (disclaimer nos en/es).
 * A frase de confirmação de exclusão é comparada em código — traduzida junto.
 */
import type { Locale } from './config';

export interface WsTitularStrings {
  loading: string;
  loggedIntro: string;
  loggedStrong: string;
  loggedManual: string;
  menoresTail: string;
  dpoLabel: string;
  dpoTeam: string;
  dpoSame: string;
  prazos: string;
  menores: string;
  menoresStrong: string;
  saibaMais: string;
  saibaMaisPrivacidade: string;
  saibaMaisTermos: string;
  saibaMaisMetodologia: string;
  types: Array<{ value: string; label: string }>;
  jurisdictions: Array<{ value: string; label: string }>;
  status: Record<string, string>;
  novoPedido: string;
  direito: string;
  jurisdicao: string;
  escopo: string;
  descricao: string;
  opcional: string;
  enviando: string;
  registrar: string;
  pedidoOk: string;
  errRegistrar: string;
  errCancelar: string;
  errExport: string;
  exportFail: string;
  errExcluir: string;
  meusPedidos: string;
  nenhumPedido: string;
  prazoPrefix: string;
  cancelar: string;
  exportar: string;
  baixarJson: string;
  baixarCsv: string;
  excluirTitle: string;
  excluirExplicacao: string;
  digiteExatamente: string;
  excluirFrase: string;
  suaSenha: string;
  excluirBtn: string;
  ariaNovo: string;
  ariaPedidos: string;
  ariaPortabilidade: string;
  ariaExcluir: string;
}

export const wsTitularStrings: Record<Locale, WsTitularStrings> = {
  'pt-br': {
    loading: 'Carregando…',
    loggedIntro: 'Para o fluxo automatizado com protocolo rastreável,',
    loggedStrong: 'entre na sua conta',
    loggedManual:
      ' e use esta página. Sem conta, exerça seus direitos pelo canal manual:',
    menoresTail:
      ' e não direciona o serviço a crianças; responsáveis podem contatar o canal de privacidade.',
    dpoLabel: 'Encarregado (DPO):',
    dpoTeam: 'Equipe END ART Studios',
    dpoSame: '— mesmo canal.',
    prazos:
      'Prazos: confirmação/acesso imediatos quando possível; demais pedidos em até 15 dias no Brasil (LGPD, art. 18, §3, prorrogável, com comunicação à ANPD) ou 1 mês no EEE/Reino Unido quando aplicável. Escalonamento: ANPD e, quando aplicável, autoridade supervisora.',
    menores: 'Menores: a plataforma',
    menoresStrong: 'não realiza verificação de idade',
    saibaMais: 'Saiba mais na',
    saibaMaisPrivacidade: 'Política de Privacidade',
    saibaMaisTermos: 'Termos',
    saibaMaisMetodologia: 'Metodologia',
    types: [
      { value: 'confirmation_access', label: 'Confirmação e acesso' },
      { value: 'correction', label: 'Correção' },
      { value: 'anonymization_blockage_deletion', label: 'Anonimização / bloqueio / eliminação' },
      { value: 'portability', label: 'Portabilidade' },
      { value: 'sharing_information', label: 'Informação sobre compartilhamento' },
      { value: 'consent_revocation', label: 'Revogação de consentimento' },
      { value: 'objection', label: 'Oposição' },
      { value: 'automated_decision_review', label: 'Revisão de decisão automatizada' },
    ],
    jurisdictions: [
      { value: 'BR', label: 'Brasil (LGPD)' },
      { value: 'EEA_UK', label: 'EEE / Reino Unido' },
      { value: 'OTHER', label: 'Outro' },
    ],
    status: {
      received: 'Recebido',
      needs_verification: 'Aguardando verificação',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      rejected: 'Indeferido',
      cancelled: 'Cancelado',
    },
    novoPedido: 'Novo pedido',
    direito: 'Direito',
    jurisdicao: 'Jurisdição',
    escopo: 'Escopo (opcional)',
    descricao: 'Descrição',
    opcional: '(opcional)',
    enviando: 'Enviando…',
    registrar: 'Registrar pedido',
    pedidoOk: 'Pedido registrado. Protocolo: {protocol}',
    errRegistrar: 'Erro ao registrar.',
    errCancelar: 'Erro ao cancelar.',
    errExport: 'Erro na exportação.',
    exportFail: 'Falha na exportação',
    errExcluir: 'Erro ao excluir.',
    meusPedidos: 'Meus pedidos',
    nenhumPedido: 'Nenhum pedido registrado.',
    prazoPrefix: 'prazo',
    cancelar: 'Cancelar pedido',
    exportar: 'Exportar meus dados',
    baixarJson: 'Baixar JSON',
    baixarCsv: 'Baixar CSV',
    excluirTitle: 'Excluir minha conta',
    excluirExplicacao:
      'A conta é anonimizada (e-mail não reutilizável) e as sessões são revogadas. Registros fiscais e de segurança são preservados por obrigação legal.',
    digiteExatamente: 'Digite EXATAMENTE',
    excluirFrase: 'EXCLUIR CONTA',
    suaSenha: 'Sua senha',
    excluirBtn: 'Excluir conta definitivamente',
    ariaNovo: 'Novo pedido',
    ariaPedidos: 'Meus pedidos',
    ariaPortabilidade: 'Portabilidade',
    ariaExcluir: 'Excluir conta',
  },
  'en-us': {
    loading: 'Loading…',
    loggedIntro: 'For the automated flow with a trackable protocol,',
    loggedStrong: 'sign in to your account',
    loggedManual:
      ' and use this page. Without an account, exercise your rights through the manual channel:',
    menoresTail:
      " and does not direct the service to children; guardians may contact the privacy channel.",
    dpoLabel: 'Data Protection Officer (DPO):',
    dpoTeam: 'END ART Studios Team',
    dpoSame: '— same channel.',
    prazos:
      'Deadlines: confirmation/access immediate where possible; other requests within 15 days in Brazil (LGPD, art. 18, §3, extendable, with notice to the ANPD) or 1 month in the EEA/United Kingdom when applicable. Escalation: ANPD and, where applicable, the supervisory authority. This English version is informative; the Portuguese version prevails.',
    menores: 'Minors: the platform',
    menoresStrong: 'does not perform age verification',
    saibaMais: 'Learn more in the',
    saibaMaisPrivacidade: 'Privacy Policy',
    saibaMaisTermos: 'Terms',
    saibaMaisMetodologia: 'Methodology',
    types: [
      { value: 'confirmation_access', label: 'Confirmation and access' },
      { value: 'correction', label: 'Correction' },
      { value: 'anonymization_blockage_deletion', label: 'Anonymization / blocking / deletion' },
      { value: 'portability', label: 'Portability' },
      { value: 'sharing_information', label: 'Information about sharing' },
      { value: 'consent_revocation', label: 'Consent revocation' },
      { value: 'objection', label: 'Objection' },
      { value: 'automated_decision_review', label: 'Automated decision review' },
    ],
    jurisdictions: [
      { value: 'BR', label: 'Brazil (LGPD)' },
      { value: 'EEA_UK', label: 'EEA / United Kingdom' },
      { value: 'OTHER', label: 'Other' },
    ],
    status: {
      received: 'Received',
      needs_verification: 'Awaiting verification',
      in_progress: 'In progress',
      completed: 'Completed',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    },
    novoPedido: 'New request',
    direito: 'Right',
    jurisdicao: 'Jurisdiction',
    escopo: 'Scope (optional)',
    descricao: 'Description',
    opcional: '(optional)',
    enviando: 'Sending…',
    registrar: 'Submit request',
    pedidoOk: 'Request registered. Protocol: {protocol}',
    errRegistrar: 'Could not submit.',
    errCancelar: 'Could not cancel.',
    errExport: 'Export error.',
    exportFail: 'Export failed',
    errExcluir: 'Deletion error.',
    meusPedidos: 'My requests',
    nenhumPedido: 'No requests registered.',
    prazoPrefix: 'deadline',
    cancelar: 'Cancel request',
    exportar: 'Export my data',
    baixarJson: 'Download JSON',
    baixarCsv: 'Download CSV',
    excluirTitle: 'Delete my account',
    excluirExplicacao:
      'The account is anonymized (e-mail becomes non-reusable) and sessions are revoked. Tax and security records are retained under legal obligation.',
    digiteExatamente: 'Type EXACTLY',
    excluirFrase: 'DELETE ACCOUNT',
    suaSenha: 'Your password',
    excluirBtn: 'Delete account permanently',
    ariaNovo: 'New request',
    ariaPedidos: 'My requests',
    ariaPortabilidade: 'Portability',
    ariaExcluir: 'Delete account',
  },
  'es-es': {
    loading: 'Cargando…',
    loggedIntro: 'Para el flujo automatizado con protocolo rastreable,',
    loggedStrong: 'inicia sesión en tu cuenta',
    loggedManual:
      ' y usa esta página. Sin cuenta, ejerce tus derechos por el canal manual:',
    menoresTail:
      ' y no dirige el servicio a niños; los responsables pueden contactar el canal de privacidad.',
    dpoLabel: 'Encargado (DPO):',
    dpoTeam: 'Equipo END ART Studios',
    dpoSame: '— mismo canal.',
    prazos:
      'Plazos: confirmación/acceso inmediatos cuando sea posible; demás solicitudes en hasta 15 días en Brasil (LGPD, art. 18, §3, prorrogable, con comunicación a la ANPD) o 1 mes en el EEE/Reino Unido cuando aplique. Escalamiento: ANPD y, cuando aplique, autoridad supervisora. Esta versión en español es informativa; prevalece la versión en portugués.',
    menores: 'Menores: la plataforma',
    menoresStrong: 'no realiza verificación de edad',
    saibaMais: 'Sabe más en la',
    saibaMaisPrivacidade: 'Política de Privacidad',
    saibaMaisTermos: 'Términos',
    saibaMaisMetodologia: 'Metodología',
    types: [
      { value: 'confirmation_access', label: 'Confirmación y acceso' },
      { value: 'correction', label: 'Corrección' },
      { value: 'anonymization_blockage_deletion', label: 'Anonimización / bloqueo / eliminación' },
      { value: 'portability', label: 'Portabilidad' },
      { value: 'sharing_information', label: 'Información sobre compartilhamiento' },
      { value: 'consent_revocation', label: 'Revocación del consentimiento' },
      { value: 'objection', label: 'Oposición' },
      { value: 'automated_decision_review', label: 'Revisión de decisión automatizada' },
    ],
    jurisdictions: [
      { value: 'BR', label: 'Brasil (LGPD)' },
      { value: 'EEA_UK', label: 'EEE / Reino Unido' },
      { value: 'OTHER', label: 'Otro' },
    ],
    status: {
      received: 'Recibido',
      needs_verification: 'Esperando verificación',
      in_progress: 'En progreso',
      completed: 'Concluido',
      rejected: 'Denegado',
      cancelled: 'Cancelado',
    },
    novoPedido: 'Nueva solicitud',
    direito: 'Derecho',
    jurisdicao: 'Jurisdicción',
    escopo: 'Alcance (opcional)',
    descricao: 'Descripción',
    opcional: '(opcional)',
    enviando: 'Enviando…',
    registrar: 'Registrar solicitud',
    pedidoOk: 'Solicitud registrada. Protocolo: {protocol}',
    errRegistrar: 'Error al registrar.',
    errCancelar: 'Error al cancelar.',
    errExport: 'Error en la exportación.',
    exportFail: 'Falló la exportación',
    errExcluir: 'Error al eliminar.',
    meusPedidos: 'Mis solicitudes',
    nenhumPedido: 'Ninguna solicitud registrada.',
    prazoPrefix: 'plazo',
    cancelar: 'Cancelar solicitud',
    exportar: 'Exportar mis datos',
    baixarJson: 'Descargar JSON',
    baixarCsv: 'Descargar CSV',
    excluirTitle: 'Eliminar mi cuenta',
    excluirExplicacao:
      'La cuenta es anonimizada (e-mail no reutilizable) y las sesiones son revocadas. Los registros fiscales y de seguridad se conservan por obligación legal.',
    digiteExatamente: 'Escribe EXACTAMENTE',
    excluirFrase: 'ELIMINAR CUENTA',
    suaSenha: 'Tu contraseña',
    excluirBtn: 'Eliminar cuenta definitivamente',
    ariaNovo: 'Nueva solicitud',
    ariaPedidos: 'Mis solicitudes',
    ariaPortabilidade: 'Portabilidad',
    ariaExcluir: 'Eliminar cuenta',
  },
};
