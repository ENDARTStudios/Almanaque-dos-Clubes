import type { Locale } from '@/i18n/config';

/**
 * T-ADMIN — strings da área administrativa.
 *
 * Módulo ADITIVO: não toca o dicionário global nem os módulos `wsC*`/`wsO1`. É o
 * mesmo padrão do `wsO1Strings` — um objeto por locale consumido por Client
 * Components —, só que vivendo sob `components/admin/`.
 *
 * Regra do design system: nenhum texto visível literal na tela. Toda string da UI
 * passa por aqui (nomes de status/ação do domínio, que são identificadores de
 * máquina, ficam em constantes próprias nos componentes).
 */

export interface AdminAreaStrings {
  href: string;
  label: string;
  desc: string;
}

export interface AdminStrings {
  nav: {
    label: string;
    back: string;
    areas: AdminAreaStrings[];
  };
  index: {
    title: string;
    subtitle: string;
    accessNote: string;
    /* T571 — a TELA DE LOGIN da area restrita. Estas quatro chaves faltavam, e a ausencia delas
       era VISIVEL: o `OperatorGate` pedia `pages.admin.*` (caminho que nao existe) e o `t()`
       devolvia a propria chave, entao o Operador via "pages.admin.title" no lugar de
       "Administracao". Ver a nota no fim deste arquivo sobre por que isso passou. */
    loginTitle: string;
    loginRequired: string;
    login: string;
    checking: string;
    forbidden: string;
    /* T571 — separada de `forbidden` de proposito: dizer "sua conta nao tem acesso" quando o
       servidor esta fora e uma AFIRMACAO FALSA sobre o usuario, e ele vai procurar um problema de
       permissao que nao existe. */
    unavailable: string;
  };
  users: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    apply: string;
    clear: string;
    planLabel: string;
    planAll: string;
    colUser: string;
    colStatus: string;
    colPlan: string;
    colCreated: string;
    colLastLogin: string;
    colActions: string;
    never: string;
    suspend: string;
    reactivate: string;
    confirmSuspendTitle: string;
    confirmSuspendBody: string;
    confirmReactivateTitle: string;
    confirmReactivateBody: string;
    confirmYes: string;
    confirmNo: string;
    planAction: string;
    planNewLabel: string;
    planConfirmTitle: string;
    planConfirmBody: string;
    count: string;
    empty: string;
    emptyFiltered: string;
    loading: string;
    forbidden: string;
    error: string;
    page: string;
    prev: string;
    next: string;
    done: string;
  };
  audit: {
    title: string;
    subtitle: string;
    userLabel: string;
    userPlaceholder: string;
    actionLabel: string;
    actionPlaceholder: string;
    fromLabel: string;
    toLabel: string;
    apply: string;
    clear: string;
    colWhen: string;
    colAction: string;
    colEntity: string;
    colUser: string;
    colIp: string;
    system: string;
    count: string;
    empty: string;
    loading: string;
    forbidden: string;
    error: string;
    page: string;
    prev: string;
    next: string;
  };
  catalog: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    colClub: string;
    colMedia: string;
    colUpdated: string;
    hasMedia: string;
    noMedia: string;
    edit: string;
    add: string;
    remove: string;
    removeTitle: string;
    removeBody: string;
    removeConfirm: string;
    removeCancel: string;
    editTitle: string;
    clubIdLabel: string;
    save: string;
    cancel: string;
    fieldLogo: string;
    fieldStadium: string;
    fieldColors: string;
    fieldKits: string;
    fieldAnthem: string;
    fieldPennants: string;
    fieldEditorial: string;
    colorsHint: string;
    jsonHint: string;
    invalidJson: string;
    needOneField: string;
    empty: string;
    emptyFiltered: string;
    loading: string;
    forbidden: string;
    error: string;
    done: string;
    count: string;
    page: string;
    prev: string;
    next: string;
  };
  lgpd: {
    title: string;
    subtitle: string;
    consentsTitle: string;
    consentsSubtitle: string;
    consentsColVisitor: string;
    consentsColVersion: string;
    consentsColWhen: string;
    consentsColCategories: string;
    consentsColRevoked: string;
    consentsActive: string;
    deletionsTitle: string;
    deletionsSubtitle: string;
    deletionsGrace: string;
    deletionsColProtocol: string;
    deletionsColUser: string;
    deletionsColStatus: string;
    deletionsColDeletedAt: string;
    deletionsColEligible: string;
    purgeTitle: string;
    purgeSubtitle: string;
    purgeDryRun: string;
    purgeRun: string;
    purgeConfirmTitle: string;
    purgeConfirmBody: string;
    purgeConfirmRealBody: string;
    purgeConfirmYes: string;
    purgeConfirmNo: string;
    purgeEligible: string;
    purgeSessions: string;
    purgeNotifications: string;
    purgeFavorites: string;
    purgeActivities: string;
    purgeDryRunBadge: string;
    purgeRealBadge: string;
    purgeNote: string;
    empty: string;
    loading: string;
    forbidden: string;
    error: string;
  };
  ownership: {
    title: string;
    subtitle: string;
    statusLabel: string;
    statusPending: string;
    statusAll: string;
    badgeNational: string;
    approve: string;
    revoke: string;
    revokeReason: string;
    revokeReasonPlaceholder: string;
    revokeConfirm: string;
    revokeCancel: string;
    count: string;
    page: string;
    prev: string;
    next: string;
    empty: string;
    loading: string;
    forbidden: string;
    error: string;
  };
}

const PT: AdminStrings = {
  nav: {
    label: 'Áreas de administração',
    back: 'Voltar ao painel',
    areas: [
      { href: '/admin', label: 'Visão geral', desc: 'Índice das ferramentas internas.' },
      {
        href: '/admin/usuarios',
        label: 'Usuários',
        desc: 'Buscar contas, filtrar por plano e banir ou desbanir.',
      },
      {
        href: '/admin/catalogo',
        label: 'Catálogo',
        desc: 'Curadoria de clubes, competições e dados do acervo.',
      },
      {
        href: '/admin/metricas',
        label: 'Métricas',
        desc: 'Números de uso e de conteúdo do acervo.',
      },
      {
        href: '/admin/auditoria',
        label: 'Auditoria',
        desc: 'Trilha append-only: quem fez o quê e quando.',
      },
      {
        href: '/admin/lgpd',
        label: 'LGPD',
        desc: 'Pedidos do titular, exportação e exclusão de conta.',
      },
      {
        href: '/admin/diagnostics',
        label: 'Diagnóstico',
        desc: 'Saúde técnica dos serviços e da integração.',
      },
      {
        href: '/admin/upload',
        label: 'Upload',
        desc: 'Envio de arquivos e mídia do acervo.',
      },
      {
        href: '/admin/observability',
        label: 'Observabilidade',
        desc: 'Crons ativos, fila e alertas internos.',
      },
      {
        href: '/admin/moderacao-clubes',
        label: 'Moderação de clubes',
        desc: 'Editores de clube: aprovar posses pendentes e revogar com motivo.',
      },
      {
        href: '/admin/moderacao-clubes',
        label: 'Club editors',
        desc: 'Club editors queue: approve pending claims and revoke with a reason.',
      },
      {
        href: '/admin/moderacao-clubes',
        label: 'Moderación de clubes',
        desc: 'Editores del club: aprobar posesiones pendientes y revocar con motivo.',
      },
      {
        href: '/admin/reports',
        label: 'Denúncias',
        desc: 'Moderação da fila de denúncias da comunidade.',
      },
    ],
  },
  index: {
    title: 'Administração',
    subtitle: 'Ferramentas internas do Almanaque dos Clubes.',
    loginTitle: 'Entrar na administração',
    loginRequired: 'Esta área é restrita ao operador. Entre com a sua conta para continuar.',
    login: 'Entrar',
    checking: 'Verificando acesso…',
    forbidden: 'Esta conta não tem acesso a esta área.',
    unavailable: 'Não foi possível confirmar o seu acesso agora — tente de novo em instantes.',
    accessNote:
      'O acesso é decidido pela API (authenticate + requireRole + allowlist de operador). ' +
      'Esta tela não é o portão: sem permissão no servidor, cada ferramenta responde 403.',
  },
  users: {
    title: 'Usuários',
    subtitle: 'Busca, filtro por plano e moderação de contas.',
    searchLabel: 'Buscar por nome ou e-mail',
    searchPlaceholder: 'ex.: maria@ ou Maria Silva',
    apply: 'Buscar',
    clear: 'Limpar',
    planLabel: 'Plano',
    planAll: 'Todos os planos',
    colUser: 'Usuário',
    colStatus: 'Status',
    colPlan: 'Plano',
    colCreated: 'Criada em',
    colLastLogin: 'Último login',
    colActions: 'Ações',
    never: 'Nunca',
    suspend: 'Banir',
    reactivate: 'Desbanir',
    confirmSuspendTitle: 'Banir esta conta?',
    confirmSuspendBody:
      'A conta de {email} fica com status SUSPENDED e perde o acesso imediatamente. ' +
      'O dado não é apagado: o banimento é reversível por “Desbanir”.',
    confirmReactivateTitle: 'Desbanir esta conta?',
    confirmReactivateBody:
      'A conta de {email} volta ao status ACTIVE e o acesso é restabelecido. ' +
      'Nenhuma sessão antiga é revogada por esta ação.',
    confirmYes: 'Confirmar',
    confirmNo: 'Voltar',
    planAction: 'Definir plano',
    planNewLabel: 'Novo plano',
    planConfirmTitle: 'Trocar o plano desta conta?',
    planConfirmBody:
      'A conta {email} passa para o plano {plan}. A troca usa o serviço de assinatura ' +
      '(não altera cobrança no provedor) e fica registrada na trilha de auditoria.',
    count: '{n} conta(s)',
    empty: 'Nenhuma conta cadastrada.',
    emptyFiltered: 'Nenhuma conta corresponde aos filtros aplicados.',
    loading: 'Carregando contas…',
    forbidden: 'Acesso restrito a administradores.',
    error: 'Não foi possível carregar as contas.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Próxima',
    done: 'Feito.',
  },
  audit: {
    title: 'Auditoria',
    subtitle: 'Trilha append-only: quem fez o quê, quando e de onde.',
    userLabel: 'Usuário',
    userPlaceholder: 'ID do usuário',
    actionLabel: 'Ação',
    actionPlaceholder: 'ex.: user.suspended',
    fromLabel: 'De',
    toLabel: 'Até',
    apply: 'Aplicar filtros',
    clear: 'Limpar',
    colWhen: 'Quando',
    colAction: 'Ação',
    colEntity: 'Entidade',
    colUser: 'Executado por',
    colIp: 'IP',
    system: 'sistema',
    count: '{n} evento(s)',
    empty: 'Nenhum evento de auditoria no período.',
    loading: 'Carregando a trilha…',
    forbidden: 'Acesso restrito a administradores.',
    error: 'Não foi possível carregar a trilha de auditoria.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Próxima',
  },
  catalog: {
    title: 'Catálogo de mídia',
    subtitle: 'Curadoria da mídia dos clubes do acervo (escudo, estádio, cores, uniformes, hino).',
    searchLabel: 'Buscar clube',
    searchPlaceholder: 'ex.: Flamengo ou Q179885',
    colClub: 'Clube',
    colMedia: 'Mídia presente',
    colUpdated: 'Atualizado',
    hasMedia: 'Com mídia',
    noMedia: 'Sem mídia',
    edit: 'Editar',
    add: 'Adicionar mídia',
    remove: 'Remover mídia',
    removeTitle: 'Remover a mídia deste clube?',
    removeBody:
      'A mídia de {club} (escudo, estádio, cores, uniformes, hino, flâmulas, editorial) é ' +
      'limpa do perfil público. O CLUBE permanece no acervo e um snapshot reversível é ' +
      'guardado nos metadados. A ação é auditada.',
    removeConfirm: 'Remover',
    removeCancel: 'Voltar',
    editTitle: 'Editar mídia',
    clubIdLabel: 'ID do clube',
    save: 'Salvar',
    cancel: 'Cancelar',
    fieldLogo: 'Escudo (logoUrl)',
    fieldStadium: 'Imagem do estádio (stadiumImage)',
    fieldColors: 'Cores do time (teamColors)',
    fieldKits: 'Histórico de uniformes (kitHistory)',
    fieldAnthem: 'Hino (anthem)',
    fieldPennants: 'Flâmulas (pennants)',
    fieldEditorial: 'Texto editorial (editorialText)',
    colorsHint: 'Cores separadas por vírgula (hex).',
    jsonHint: 'JSON válido; vazio limpa o campo.',
    invalidJson: 'JSON inválido no campo {field}.',
    needOneField: 'Informe ao menos um campo de mídia para adicionar.',
    empty: 'Nenhum clube no acervo.',
    emptyFiltered: 'Nenhum clube corresponde à busca.',
    loading: 'Carregando o catálogo…',
    forbidden: 'Acesso restrito a administradores.',
    error: 'Não foi possível carregar o catálogo.',
    done: 'Feito.',
    count: '{n} clube(s)',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Próxima',
  },
  lgpd: {
    title: 'LGPD',
    subtitle: 'Prova de consentimento, exclusões agendadas e purga de dados de contas removidas.',
    consentsTitle: 'Consentimentos (últimos 1.000)',
    consentsSubtitle:
      'Logs de consentimento de cookies (CookieConsent), do mais recente ao mais antigo.',
    consentsColVisitor: 'Visitante',
    consentsColVersion: 'Versão',
    consentsColWhen: 'Quando',
    consentsColCategories: 'Categorias aceitas',
    consentsColRevoked: 'Revogado',
    consentsActive: 'Vigente',
    deletionsTitle: 'Exclusões agendadas',
    deletionsSubtitle: 'Solicitações de exclusão de conta (soft-delete) e a data-limite de purga.',
    deletionsGrace:
      'Política deste painel: a purga fica elegível 30 dias após a exclusão da conta. ' +
      'A exclusão original já anonimiza a PII; a purga remove apenas dados efêmeros restantes.',
    deletionsColProtocol: 'Protocolo',
    deletionsColUser: 'Conta',
    deletionsColStatus: 'Status',
    deletionsColDeletedAt: 'Excluída em',
    deletionsColEligible: 'Purga elegível em',
    purgeTitle: 'Purga de dados',
    purgeSubtitle:
      'Remove sessions, notifications, favorites e userActivity de contas excluídas há mais de ' +
      '30 dias. NÃO apaga contas, cobranças nem auditoria.',
    purgeDryRun: 'Simular (dry-run)',
    purgeRun: 'Executar purga',
    purgeConfirmTitle: 'Simular a purga?',
    purgeConfirmBody:
      'O modo simulado apenas CONTA o que seria removido (contas excluídas há mais de 30 dias). ' +
      'Nada é apagado e nenhuma auditoria é gravada.',
    purgeConfirmRealBody:
      'A purga REAL remove permanentemente sessions, notifications, favorites e userActivity das ' +
      'contas excluídas há mais de 30 dias. Contas, cobranças e auditoria são preservadas. Esta ' +
      'ação é auditada e não pode ser desfeita.',
    purgeConfirmYes: 'Confirmar',
    purgeConfirmNo: 'Voltar',
    purgeEligible: 'Contas elegíveis',
    purgeSessions: 'Sessões',
    purgeNotifications: 'Notificações',
    purgeFavorites: 'Favoritos',
    purgeActivities: 'Atividades',
    purgeDryRunBadge: 'Simulação (nada foi apagado)',
    purgeRealBadge: 'Purga executada',
    purgeNote:
      'dryRun=true (padrão) só conta. Só dryRun=false executa e registra auditoria. ' +
      'Nenhuma verificação em produção executa o modo real.',
    empty: 'Nada a exibir.',
    loading: 'Carregando…',
    forbidden: 'Acesso restrito a administradores.',
    error: 'Não foi possível carregar os dados de LGPD.',
  },
  ownership: {
    title: 'Editores de clube',
    subtitle:
      'Fila de posses (WS-C-9): aprovar é humano e fica registrado — quem aprovou, quando e com qual evidência.',
    statusLabel: 'Fila',
    statusPending: 'Pendentes',
    statusAll: 'Todas (exceto revogadas)',
    badgeNational: 'Seleção',
    approve: 'Aprovar',
    revoke: 'Revogar',
    revokeReason: 'Motivo da revogação (obrigatório, fica registrado)',
    revokeReasonPlaceholder: 'Ex.: evidência não verificada; conduta abusiva…',
    revokeConfirm: 'Confirmar revogação',
    revokeCancel: 'Cancelar',
    count: '{n} posse(s)',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Próxima',
    empty: 'Nenhuma posse nesta fila.',
    loading: 'Carregando posses…',
    forbidden: 'Acesso restrito ao operador.',
    error: 'Não foi possível carregar a fila.',
  },
};

const EN: AdminStrings = {
  ...PT,
  nav: {
    label: 'Administration areas',
    back: 'Back to dashboard',
    areas: [
      { href: '/admin', label: 'Overview', desc: 'Index of the internal tools.' },
      {
        href: '/admin/usuarios',
        label: 'Users',
        desc: 'Search accounts, filter by plan and ban or unban.',
      },
      {
        href: '/admin/catalogo',
        label: 'Catalog',
        desc: 'Curation of clubs, competitions and archive data.',
      },
      { href: '/admin/metricas', label: 'Metrics', desc: 'Usage and content numbers.' },
      {
        href: '/admin/auditoria',
        label: 'Audit',
        desc: 'Append-only trail: who did what and when.',
      },
      { href: '/admin/lgpd', label: 'LGPD', desc: 'Data subject requests, export and deletion.' },
      {
        href: '/admin/diagnostics',
        label: 'Diagnostics',
        desc: 'Technical health of services and integrations.',
      },
      { href: '/admin/upload', label: 'Upload', desc: 'File and media upload for the archive.' },
      {
        href: '/admin/observability',
        label: 'Observability',
        desc: 'Active crons, queue and internal alerts.',
      },
      {
        href: '/admin/reports',
        label: 'Reports',
        desc: 'Moderation of the community report queue.',
      },
    ],
  },
  index: {
    title: 'Administration',
    subtitle: 'Internal tools of Almanaque dos Clubes.',
    loginTitle: 'Sign in to administration',
    loginRequired:
      'This area is restricted to the operator. Sign in with your account to continue.',
    login: 'Sign in',
    checking: 'Checking access…',
    forbidden: 'This account does not have access to this area.',
    unavailable: 'Could not confirm your access right now — try again in a moment.',
    accessNote:
      'Access is decided by the API (authenticate + requireRole + operator allowlist). ' +
      'This screen is not the gate: without server permission each tool answers 403.',
  },
  users: {
    ...PT.users,
    title: 'Users',
    subtitle: 'Search, plan filter and account moderation.',
    searchLabel: 'Search by name or e-mail',
    searchPlaceholder: 'e.g.: maria@ or Maria Silva',
    apply: 'Search',
    clear: 'Clear',
    planLabel: 'Plan',
    planAll: 'All plans',
    colUser: 'User',
    colStatus: 'Status',
    colPlan: 'Plan',
    colCreated: 'Created',
    colLastLogin: 'Last login',
    colActions: 'Actions',
    never: 'Never',
    suspend: 'Ban',
    reactivate: 'Unban',
    confirmSuspendTitle: 'Ban this account?',
    confirmSuspendBody:
      'The account {email} gets status SUSPENDED and loses access immediately. ' +
      'No data is erased: the ban is reversible through “Unban”.',
    confirmReactivateTitle: 'Unban this account?',
    confirmReactivateBody:
      'The account {email} goes back to ACTIVE and access is restored. ' +
      'No existing session is revoked by this action.',
    confirmYes: 'Confirm',
    confirmNo: 'Back',
    planAction: 'Set plan',
    planNewLabel: 'New plan',
    planConfirmTitle: 'Change this account’s plan?',
    planConfirmBody:
      'The account {email} moves to the {plan} plan. The change uses the subscription service ' +
      '(it does not alter provider billing) and is recorded in the audit trail.',
    count: '{n} account(s)',
    empty: 'No accounts found.',
    emptyFiltered: 'No account matches the applied filters.',
    loading: 'Loading accounts…',
    forbidden: 'Restricted to administrators.',
    error: 'Could not load the accounts.',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
    done: 'Done.',
  },
  audit: {
    ...PT.audit,
    title: 'Audit',
    subtitle: 'Append-only trail: who did what, when and from where.',
    userLabel: 'User',
    userPlaceholder: 'user ID',
    actionLabel: 'Action',
    actionPlaceholder: 'e.g.: user.suspended',
    fromLabel: 'From',
    toLabel: 'To',
    apply: 'Apply filters',
    clear: 'Clear',
    colWhen: 'When',
    colAction: 'Action',
    colEntity: 'Entity',
    colUser: 'Performed by',
    colIp: 'IP',
    system: 'system',
    count: '{n} event(s)',
    empty: 'No audit event in the period.',
    loading: 'Loading the trail…',
    forbidden: 'Restricted to administrators.',
    error: 'Could not load the audit trail.',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
  },
  catalog: {
    ...PT.catalog,
    title: 'Media catalog',
    subtitle: 'Curation of club media in the archive (crest, stadium, colors, kits, anthem).',
    searchLabel: 'Search club',
    searchPlaceholder: 'e.g.: Flamengo or Q179885',
    colClub: 'Club',
    colMedia: 'Media present',
    colUpdated: 'Updated',
    hasMedia: 'Has media',
    noMedia: 'No media',
    edit: 'Edit',
    add: 'Add media',
    remove: 'Remove media',
    removeTitle: 'Remove this club’s media?',
    removeBody:
      'The media of {club} (crest, stadium, colors, kits, anthem, pennants, editorial) is cleared ' +
      'from the public profile. The CLUB stays in the archive and a reversible snapshot is kept ' +
      'in the metadata. The action is audited.',
    removeConfirm: 'Remove',
    removeCancel: 'Back',
    editTitle: 'Edit media',
    clubIdLabel: 'Club ID',
    save: 'Save',
    cancel: 'Cancel',
    fieldLogo: 'Crest (logoUrl)',
    fieldStadium: 'Stadium image (stadiumImage)',
    fieldColors: 'Team colors (teamColors)',
    fieldKits: 'Kit history (kitHistory)',
    fieldAnthem: 'Anthem (anthem)',
    fieldPennants: 'Pennants (pennants)',
    fieldEditorial: 'Editorial text (editorialText)',
    colorsHint: 'Colors separated by commas (hex).',
    jsonHint: 'Valid JSON; empty clears the field.',
    invalidJson: 'Invalid JSON in field {field}.',
    needOneField: 'Provide at least one media field to add.',
    empty: 'No club in the archive.',
    emptyFiltered: 'No club matches the search.',
    loading: 'Loading the catalog…',
    forbidden: 'Restricted to administrators.',
    error: 'Could not load the catalog.',
    done: 'Done.',
    count: '{n} club(s)',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
  },
  lgpd: {
    ...PT.lgpd,
    title: 'LGPD',
    subtitle: 'Consent proof, scheduled deletions and purge of removed accounts’ data.',
    consentsTitle: 'Consents (last 1,000)',
    consentsSubtitle: 'Cookie consent logs (CookieConsent), newest first.',
    consentsColVisitor: 'Visitor',
    consentsColVersion: 'Version',
    consentsColWhen: 'When',
    consentsColCategories: 'Accepted categories',
    consentsColRevoked: 'Revoked',
    consentsActive: 'Current',
    deletionsTitle: 'Scheduled deletions',
    deletionsSubtitle: 'Account deletion requests (soft-delete) and the purge deadline.',
    deletionsGrace:
      'Policy of this panel: purge becomes eligible 30 days after the account deletion. ' +
      'The original deletion already anonymizes PII; purge removes only leftover ephemeral data.',
    deletionsColProtocol: 'Protocol',
    deletionsColUser: 'Account',
    deletionsColStatus: 'Status',
    deletionsColDeletedAt: 'Deleted at',
    deletionsColEligible: 'Purge eligible at',
    purgeTitle: 'Data purge',
    purgeSubtitle:
      'Removes sessions, notifications, favorites and userActivity from accounts deleted more than ' +
      '30 days ago. It does NOT delete accounts, billing or audit records.',
    purgeDryRun: 'Simulate (dry-run)',
    purgeRun: 'Run purge',
    purgeConfirmTitle: 'Simulate the purge?',
    purgeConfirmBody:
      'Simulation only COUNTS what would be removed (accounts deleted more than 30 days ago). ' +
      'Nothing is deleted and no audit is written.',
    purgeConfirmRealBody:
      'The REAL purge permanently removes sessions, notifications, favorites and userActivity from ' +
      'accounts deleted more than 30 days ago. Accounts, billing and audit are preserved. This ' +
      'action is audited and cannot be undone.',
    purgeConfirmYes: 'Confirm',
    purgeConfirmNo: 'Back',
    purgeEligible: 'Eligible accounts',
    purgeSessions: 'Sessions',
    purgeNotifications: 'Notifications',
    purgeFavorites: 'Favorites',
    purgeActivities: 'Activities',
    purgeDryRunBadge: 'Simulation (nothing deleted)',
    purgeRealBadge: 'Purge executed',
    purgeNote:
      'dryRun=true (default) only counts. Only dryRun=false executes and writes audit. ' +
      'No verification in production runs the real mode.',
    empty: 'Nothing to show.',
    loading: 'Loading…',
    forbidden: 'Restricted to administrators.',
    error: 'Could not load the LGPD data.',
  },
  ownership: {
    title: 'Club editors',
    subtitle:
      'Ownership queue (WS-C-9): approval is human and recorded — who approved, when and with which evidence.',
    statusLabel: 'Queue',
    statusPending: 'Pending',
    statusAll: 'All (except revoked)',
    badgeNational: 'National team',
    approve: 'Approve',
    revoke: 'Revoke',
    revokeReason: 'Revocation reason (required, gets recorded)',
    revokeReasonPlaceholder: 'E.g.: evidence not verified; abusive conduct…',
    revokeConfirm: 'Confirm revocation',
    revokeCancel: 'Cancel',
    count: '{n} ownership(ies)',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
    empty: 'No ownership in this queue.',
    loading: 'Loading ownerships…',
    forbidden: 'Operator-only access.',
    error: 'Could not load the queue.',
  },
};

const ES: AdminStrings = {
  ...PT,
  nav: {
    label: 'Áreas de administración',
    back: 'Volver al panel',
    areas: [
      { href: '/admin', label: 'Visión general', desc: 'Índice de las herramientas internas.' },
      {
        href: '/admin/usuarios',
        label: 'Usuarios',
        desc: 'Buscar cuentas, filtrar por plan y banear o desbanear.',
      },
      {
        href: '/admin/catalogo',
        label: 'Catálogo',
        desc: 'Curaduría de clubes, competiciones y datos del acervo.',
      },
      { href: '/admin/metricas', label: 'Métricas', desc: 'Números de uso y de contenido.' },
      {
        href: '/admin/auditoria',
        label: 'Auditoría',
        desc: 'Rastro append-only: quién hizo qué y cuándo.',
      },
      {
        href: '/admin/lgpd',
        label: 'LGPD',
        desc: 'Solicitudes del titular, exportación y eliminación de cuenta.',
      },
      {
        href: '/admin/diagnostics',
        label: 'Diagnóstico',
        desc: 'Salud técnica de los servicios y de la integración.',
      },
      { href: '/admin/upload', label: 'Upload', desc: 'Envío de archivos y medios del acervo.' },
      {
        href: '/admin/observability',
        label: 'Observabilidad',
        desc: 'Crons activos, cola y alertas internos.',
      },
      {
        href: '/admin/reports',
        label: 'Denuncias',
        desc: 'Moderación de la cola de denuncias.',
      },
    ],
  },
  index: {
    title: 'Administración',
    subtitle: 'Herramientas internas de Almanaque dos Clubes.',
    loginTitle: 'Entrar en la administración',
    loginRequired: 'Esta área está restringida al operador. Entra con tu cuenta para continuar.',
    login: 'Entrar',
    checking: 'Verificando acceso…',
    forbidden: 'Esta cuenta no tiene acceso a esta área.',
    unavailable: 'No se pudo confirmar tu acceso ahora — inténtalo de nuevo en un momento.',
    accessNote:
      'El acceso lo decide la API (authenticate + requireRole + allowlist de operador). ' +
      'Esta pantalla no es el portón: sin permiso en el servidor cada herramienta responde 403.',
  },
  users: {
    ...PT.users,
    title: 'Usuarios',
    subtitle: 'Búsqueda, filtro por plan y moderación de cuentas.',
    searchLabel: 'Buscar por nombre o correo',
    searchPlaceholder: 'ej.: maria@ o María Silva',
    apply: 'Buscar',
    clear: 'Limpiar',
    planLabel: 'Plan',
    planAll: 'Todos los planes',
    colUser: 'Usuario',
    colStatus: 'Estado',
    colPlan: 'Plan',
    colCreated: 'Creada',
    colLastLogin: 'Último acceso',
    colActions: 'Acciones',
    never: 'Nunca',
    suspend: 'Banear',
    reactivate: 'Desbanear',
    confirmSuspendTitle: '¿Banear esta cuenta?',
    confirmSuspendBody:
      'La cuenta {email} pasa a estado SUSPENDED y pierde el acceso de inmediato. ' +
      'No se borra ningún dato: el baneo es reversible con «Desbanear».',
    confirmReactivateTitle: '¿Desbanear esta cuenta?',
    confirmReactivateBody:
      'La cuenta {email} vuelve a estado ACTIVE y el acceso se restablece. ' +
      'Esta acción no revoca sesiones antiguas.',
    confirmYes: 'Confirmar',
    confirmNo: 'Volver',
    planAction: 'Definir plan',
    planNewLabel: 'Nuevo plan',
    planConfirmTitle: '¿Cambiar el plan de esta cuenta?',
    planConfirmBody:
      'La cuenta {email} pasa al plan {plan}. El cambio usa el servicio de suscripción ' +
      '(no altera el cobro del proveedor) y queda registrado en la auditoría.',
    count: '{n} cuenta(s)',
    empty: 'No hay cuentas registradas.',
    emptyFiltered: 'Ninguna cuenta coincide con los filtros aplicados.',
    loading: 'Cargando cuentas…',
    forbidden: 'Acceso restringido a administradores.',
    error: 'No se pudieron cargar las cuentas.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Siguiente',
    done: 'Hecho.',
  },
  audit: {
    ...PT.audit,
    title: 'Auditoría',
    subtitle: 'Rastro append-only: quién hizo qué, cuándo y desde dónde.',
    userLabel: 'Usuario',
    userPlaceholder: 'ID del usuario',
    actionLabel: 'Acción',
    actionPlaceholder: 'ej.: user.suspended',
    fromLabel: 'Desde',
    toLabel: 'Hasta',
    apply: 'Aplicar filtros',
    clear: 'Limpiar',
    colWhen: 'Cuándo',
    colAction: 'Acción',
    colEntity: 'Entidad',
    colUser: 'Ejecutado por',
    colIp: 'IP',
    system: 'sistema',
    count: '{n} evento(s)',
    empty: 'Ningún evento de auditoría en el período.',
    loading: 'Cargando el rastro…',
    forbidden: 'Acceso restringido a administradores.',
    error: 'No se pudo cargar el rastro de auditoría.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Siguiente',
  },
  catalog: {
    ...PT.catalog,
    title: 'Catálogo de medios',
    subtitle: 'Curaduría de los medios de los clubes (escudo, estadio, colores, uniformes, himno).',
    searchLabel: 'Buscar club',
    searchPlaceholder: 'ej.: Flamengo o Q179885',
    colClub: 'Club',
    colMedia: 'Medios presentes',
    colUpdated: 'Actualizado',
    hasMedia: 'Con medios',
    noMedia: 'Sin medios',
    edit: 'Editar',
    add: 'Añadir medios',
    remove: 'Quitar medios',
    removeTitle: '¿Quitar los medios de este club?',
    removeBody:
      'Los medios de {club} (escudo, estadio, colores, uniformes, himno, banderines, editorial) se ' +
      'limpian del perfil público. El CLUB permanece en el acervo y se guarda un snapshot ' +
      'reversible en los metadatos. La acción es auditada.',
    removeConfirm: 'Quitar',
    removeCancel: 'Volver',
    editTitle: 'Editar medios',
    clubIdLabel: 'ID del club',
    save: 'Guardar',
    cancel: 'Cancelar',
    fieldLogo: 'Escudo (logoUrl)',
    fieldStadium: 'Imagen del estadio (stadiumImage)',
    fieldColors: 'Colores del equipo (teamColors)',
    fieldKits: 'Historial de uniformes (kitHistory)',
    fieldAnthem: 'Himno (anthem)',
    fieldPennants: 'Banderines (pennants)',
    fieldEditorial: 'Texto editorial (editorialText)',
    colorsHint: 'Colores separados por comas (hex).',
    jsonHint: 'JSON válido; vacío limpia el campo.',
    invalidJson: 'JSON inválido en el campo {field}.',
    needOneField: 'Indique al menos un campo de medios para añadir.',
    empty: 'Ningún club en el acervo.',
    emptyFiltered: 'Ningún club coincide con la búsqueda.',
    loading: 'Cargando el catálogo…',
    forbidden: 'Acceso restringido a administradores.',
    error: 'No se pudo cargar el catálogo.',
    done: 'Hecho.',
    count: '{n} club(es)',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Siguiente',
  },
  lgpd: {
    ...PT.lgpd,
    title: 'LGPD',
    subtitle: 'Prueba de consentimiento, eliminaciones agendadas y purga de cuentas eliminadas.',
    consentsTitle: 'Consentimientos (últimos 1.000)',
    consentsSubtitle: 'Registros de consentimiento de cookies (CookieConsent), del más reciente.',
    consentsColVisitor: 'Visitante',
    consentsColVersion: 'Versión',
    consentsColWhen: 'Cuándo',
    consentsColCategories: 'Categorías aceptadas',
    consentsColRevoked: 'Revocado',
    consentsActive: 'Vigente',
    deletionsTitle: 'Eliminaciones agendadas',
    deletionsSubtitle:
      'Solicitudes de eliminación de cuenta (soft-delete) y la fecha límite de purga.',
    deletionsGrace:
      'Política de este panel: la purga es elegible 30 días después de la eliminación. ' +
      'La eliminación original ya anonimiza la PII; la purga quita solo datos efímeros restantes.',
    deletionsColProtocol: 'Protocolo',
    deletionsColUser: 'Cuenta',
    deletionsColStatus: 'Estado',
    deletionsColDeletedAt: 'Eliminada en',
    deletionsColEligible: 'Purga elegible en',
    purgeTitle: 'Purga de datos',
    purgeSubtitle:
      'Quita sessions, notifications, favorites y userActivity de cuentas eliminadas hace más de ' +
      '30 días. NO borra cuentas, cobros ni auditoría.',
    purgeDryRun: 'Simular (dry-run)',
    purgeRun: 'Ejecutar purga',
    purgeConfirmTitle: '¿Simular la purga?',
    purgeConfirmBody:
      'La simulación solo CUENTA lo que se quitaría (cuentas eliminadas hace más de 30 días). ' +
      'No se borra nada y no se escribe auditoría.',
    purgeConfirmRealBody:
      'La purga REAL quita permanentemente sessions, notifications, favorites y userActivity de ' +
      'cuentas eliminadas hace más de 30 días. Cuentas, cobros y auditoría se preservan. Esta ' +
      'acción se audita y no se puede deshacer.',
    purgeConfirmYes: 'Confirmar',
    purgeConfirmNo: 'Volver',
    purgeEligible: 'Cuentas elegibles',
    purgeSessions: 'Sesiones',
    purgeNotifications: 'Notificaciones',
    purgeFavorites: 'Favoritos',
    purgeActivities: 'Actividades',
    purgeDryRunBadge: 'Simulación (nada borrado)',
    purgeRealBadge: 'Purga ejecutada',
    purgeNote:
      'dryRun=true (por defecto) solo cuenta. Solo dryRun=false ejecuta y registra auditoría. ' +
      'Ninguna verificación en producción ejecuta el modo real.',
    empty: 'Nada que mostrar.',
    loading: 'Cargando…',
    forbidden: 'Acceso restringido a administradores.',
    error: 'No se pudieron cargar los datos de LGPD.',
  },
  ownership: {
    title: 'Editores del club',
    subtitle:
      'Fila de posesiones (WS-C-9): aprobar es humano y queda registrado — quién aprobó, cuándo y con qué evidencia.',
    statusLabel: 'Fila',
    statusPending: 'Pendientes',
    statusAll: 'Todas (excepto revocadas)',
    badgeNational: 'Selección',
    approve: 'Aprobar',
    revoke: 'Revocar',
    revokeReason: 'Motivo de la revocación (obligatorio, queda registrado)',
    revokeReasonPlaceholder: 'Ej.: evidencia no verificada; conducta abusiva…',
    revokeConfirm: 'Confirmar revocación',
    revokeCancel: 'Cancelar',
    count: '{n} posesión(ones)',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Siguiente',
    empty: 'Ninguna posesión en esta fila.',
    loading: 'Cargando posesiones…',
    forbidden: 'Acceso restringido al operador.',
    error: 'No se pudo cargar la fila.',
  },
};

export const adminStrings: Record<Locale, AdminStrings> = {
  'pt-br': PT,
  'en-us': EN,
  'es-es': ES,
};

/** Interpolação mínima no formato do Provider (`{nome}`) — para strings locais. */
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
