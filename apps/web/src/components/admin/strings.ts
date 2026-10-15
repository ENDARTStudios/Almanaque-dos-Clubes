import type { Locale } from '@/i18n/config';

/**
 * T-ADMIN — strings da área administrativa (índice, navegação, usuários e auditoria).
 *
 * Módulo ADITIVO: não toca o dicionário global nem os módulos `wsC*`/`wsO1` (fonte de
 * outros agentes). É o mesmo padrão do `wsO1Strings` — um objeto por locale consumido
 * por Client Components —, só que vivendo sob `components/admin/` porque estas telas
 * são de propriedade exclusiva desta rodada.
 *
 * Regra do design system: nenhum texto visível literal na tela. Toda string da UI
 * passa por aqui (os nomes de status/ação do domínio, que são identificadores de
 * máquina, ficam em constantes próprias no componente).
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
  };
  users: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
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
    count: string;
    empty: string;
    emptyFiltered: string;
    loading: string;
    forbidden: string;
    error: string;
    planGap: string;
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
    missingEndpoint: string;
    page: string;
    prev: string;
    next: string;
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
        href: '/admin/reports',
        label: 'Denúncias',
        desc: 'Moderação da fila de denúncias da comunidade.',
      },
    ],
  },
  index: {
    title: 'Administração',
    subtitle: 'Ferramentas internas do Almanaque dos Clubes.',
    accessNote:
      'O acesso é decidido pela API (authenticate + requireRole + allowlist de operador). ' +
      'Esta tela não é o portão: sem permissão no servidor, cada ferramenta responde 403.',
  },
  users: {
    title: 'Usuários',
    subtitle: 'Busca, filtro por plano e moderação de contas.',
    searchLabel: 'Buscar por nome ou e-mail',
    searchPlaceholder: 'ex.: maria@ ou Maria Silva',
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
    count: '{n} conta(s)',
    empty: 'Nenhuma conta cadastrada.',
    emptyFiltered: 'Nenhuma conta corresponde aos filtros aplicados.',
    loading: 'Carregando contas…',
    forbidden: 'Acesso restrito a administradores.',
    error: 'Não foi possível carregar as contas.',
    planGap:
      'Lacuna declarada: a API não expõe o plano em GET /admin/users (e não há rota de ' +
      'administração para alterar o plano de outra conta — PUT /billing/plan muda apenas o ' +
      'plano de quem chama). Por isso o filtro por plano está desativado e a coluna Plano ' +
      'mostra “—” até o endpoint incluir o campo.',
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
    missingEndpoint:
      'Lacuna declarada: a API ainda NÃO expõe a trilha de auditoria. Este painel consome ' +
      'GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=, com resposta ' +
      '{ data: { items, total } }. Enquanto a rota não existir (ver apps/api/src/modules/audit — ' +
      'há apenas o serviço de escrita), a lista abaixo fica vazia e a página pronta para consumo.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Próxima',
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
    count: '{n} account(s)',
    empty: 'No accounts found.',
    emptyFiltered: 'No account matches the applied filters.',
    loading: 'Loading accounts…',
    forbidden: 'Restricted to administrators.',
    error: 'Could not load the accounts.',
    planGap:
      'Declared gap: the API does not expose the plan in GET /admin/users (and there is no ' +
      'admin route to change another account’s plan — PUT /billing/plan only changes the ' +
      'caller’s own plan). The plan filter is therefore disabled and the Plan column shows “—” ' +
      'until the endpoint includes the field.',
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
    missingEndpoint:
      'Declared gap: the API does NOT expose the audit trail yet. This panel consumes ' +
      'GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=, answering ' +
      '{ data: { items, total } }. While the route does not exist (see apps/api/src/modules/audit — ' +
      'only the write service is there), the list stays empty and the page is ready to consume it.',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
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
        desc: 'Crons activos, cola y alertas internas.',
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
    count: '{n} cuenta(s)',
    empty: 'No hay cuentas registradas.',
    emptyFiltered: 'Ninguna cuenta coincide con los filtros aplicados.',
    loading: 'Cargando cuentas…',
    forbidden: 'Acceso restringido a administradores.',
    error: 'No se pudieron cargar las cuentas.',
    planGap:
      'Brecha declarada: la API no expone el plan en GET /admin/users (y no hay ruta de ' +
      'administración para cambiar el plan de otra cuenta — PUT /billing/plan cambia solo el ' +
      'plan de quien llama). Por eso el filtro por plan está desactivado y la columna Plan ' +
      'muestra «—» hasta que el endpoint incluya el campo.',
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
    missingEndpoint:
      'Brecha declarada: la API todavía NO expone el rastro de auditoría. Este panel consume ' +
      'GET /admin/audit-logs?userId=&action=&from=&to=&limit=&offset=, con respuesta ' +
      '{ data: { items, total } }. Mientras la ruta no exista (ver apps/api/src/modules/audit — ' +
      'solo está el servicio de escritura), la lista queda vacía y la página lista para consumirla.',
    page: 'Página {page} de {total}',
    prev: 'Anterior',
    next: 'Siguiente',
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
