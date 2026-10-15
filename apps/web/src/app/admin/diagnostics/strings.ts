import type { Locale } from '@/i18n/config';

/**
 * Strings LOCAIS do painel de diagnóstico (/admin/diagnostics).
 *
 * Módulo aditivo dentro da própria pasta da rota (mesmo padrão de
 * `app/admin/metricas/strings.ts`): NÃO toca dicionários globais nem os módulos
 * de outros agentes. Nenhum texto visível fica literal no componente.
 */
export interface DiagnosticsStrings {
  title: string;
  subtitle: string;
  restricted: string;
  loading: string;
  error: string;
  refresh: string;
  generatedAt: string;

  processTitle: string;
  processNote: string;
  apiProcess: string;
  webProcess: string;
  nodeEnv: string;
  commit: string;
  commitUnknown: string;
  deployment: string;
  uptime: string;
  uptimeUnit: string;
  scheduler: string;
  schedulerOn: string;
  schedulerOff: string;
  redis: string;
  redisOn: string;
  redisOff: string;
  separateServices: string;

  flagsTitle: string;
  flagsNote: string;
  noOverrideNote: string;
  valueOn: string;
  valueOff: string;
  valueUnknown: string;
  valueUnknownShort: string;
  ownerLabel: string;
  ownerApi: string;
  ownerWeb: string;
  ownerWorker: string;
  kindLabel: string;
  kindEnv: string;
  kindDerived: string;
  scopeLabel: string;
  effectOnLabel: string;
  effectOffLabel: string;
  defaultLabel: string;
  defaultOn: string;
  defaultOff: string;
  sourceLabel: string;
  changeLabel: string;
  rawLabel: string;
  rawAbsent: string;
  driftLabel: string;
  driftTitle: string;

  divergenceTitle: string;
  divergenceNone: string;
  divergenceBody: string;

  jobsTitle: string;
  jobsNote: string;
  colQueue: string;
  colJob: string;
  colCadence: string;
  colNext: string;
  colLastRun: string;
  colLastResult: string;
  never: string;
  nextUnknown: string;
  schedulerDisabled: string;
  resultSuccess: string;
  resultFailure: string;
  resultUnknown: string;
  schedulersGap: string;
  queueLabel: string;
  queueFailed: string;
  queueActive: string;
  healthGap: string;
  viewObservability: string;

  pkgTitle: string;
  pkgState: string;
  pkgColFlag: string;
  pkgColPlan: string;

  notesTitle: string;
}

const PT: DiagnosticsStrings = {
  title: 'Diagnóstico',
  subtitle: 'Feature flags com valor real, processo que responde e próxima execução dos jobs.',
  restricted: 'Acesso restrito a administradores.',
  loading: 'Lendo o diagnóstico…',
  error: 'Não foi possível carregar o diagnóstico.',
  refresh: 'Atualizar',
  generatedAt: 'Leitura de',

  processTitle: 'Processos',
  processNote:
    'A API (Railway) e o site (Vercel) são serviços separados: cada um tem o próprio ambiente. ' +
    'Uma flag só vale no processo que a lê.',
  apiProcess: 'API (Railway)',
  webProcess: 'Site / web (Vercel)',
  nodeEnv: 'Ambiente',
  commit: 'Commit do deploy',
  commitUnknown: 'não exposto pelo runtime',
  deployment: 'Deployment',
  uptime: 'No ar há',
  uptimeUnit: 'min',
  scheduler: 'Scheduler de ETL',
  schedulerOn: 'ligado',
  schedulerOff: 'desligado',
  redis: 'Redis configurado',
  redisOn: 'sim',
  redisOff: 'não',
  separateServices:
    'Os valores abaixo vêm de cada processo: as flags “API” foram lidas na API no momento desta ' +
    'consulta; as “web” foram lidas no servidor do site.',

  flagsTitle: 'Feature flags',
  flagsNote:
    'Valor efetivo no instante desta leitura, com a origem no código e o que muda em cada estado.',
  noOverrideNote:
    'Não existe override persistido de flag neste projeto: o valor é variável de ambiente do ' +
    'processo, fixada no boot do container. Mudar uma flag exige alterar a variável no provedor e ' +
    'redeployar — por isso esta tela é somente leitura e NÃO tem botão de alternar (um interruptor ' +
    'aqui não persistiria e mentiria na tela).',
  valueOn: 'Ligada',
  valueOff: 'Desligada',
  valueUnknown: 'Outro processo',
  valueUnknownShort: 'valor em outro processo',
  ownerLabel: 'Origem',
  ownerApi: 'API',
  ownerWeb: 'WEB',
  ownerWorker: 'worker',
  kindLabel: 'Tipo',
  kindEnv: 'variável de ambiente',
  kindDerived: 'derivada',
  scopeLabel: 'Superfície',
  effectOnLabel: 'Ligada:',
  effectOffLabel: 'Desligada:',
  defaultLabel: 'Padrão',
  defaultOn: 'ligada',
  defaultOff: 'desligada',
  sourceLabel: 'Lida em',
  changeLabel: 'Como mudar',
  rawLabel: 'Valor bruto',
  rawAbsent: 'variável ausente',
  driftLabel: 'Leitura divergente no código',
  driftTitle: 'Atenção: a mesma variável é lida com comparadores diferentes',

  divergenceTitle: 'Divergência entre processos',
  divergenceNone: 'Nenhuma flag com valor conhecido nos dois processos divergiu nesta leitura.',
  divergenceBody:
    'A variável {key} vale “{api}” no processo que responde pela API e “{web}” no site. A mesma ' +
    'flag com valores diferentes em serviços diferentes produz comportamento incoerente (uma ' +
    'superfície liberada e a outra não).',

  jobsTitle: 'Jobs agendados e próxima execução',
  jobsNote:
    'Cadência e próxima execução vêm do agendador (BullMQ, Redis). Último resultado por job vem de ' +
    'GET /jobs/health — a mesma rota que a página de observabilidade consome.',
  colQueue: 'Fila',
  colJob: 'Job',
  colCadence: 'Cadência',
  colNext: 'Próxima execução',
  colLastRun: 'Última execução',
  colLastResult: 'Resultado',
  never: 'nunca registrada',
  nextUnknown: 'não informada pelo agendador',
  schedulerDisabled:
    'O scheduler de ETL está DESLIGADO (ETL_SCHEDULER_ENABLED): as agendas abaixo podem existir ' +
    'no Redis de uma execução anterior, mas nenhum processo desta instância as dispara.',
  resultSuccess: 'sucesso',
  resultFailure: 'falha',
  resultUnknown: 'sem registro',
  schedulersGap:
    'Lacuna declarada: o agendador não respondeu, então a próxima execução não é exibida. Erro ' +
    'informado pela API: {error}',
  queueLabel: 'Fila data-refresh',
  queueFailed: 'falhas',
  queueActive: 'ativas',
  healthGap: 'Não foi possível ler o último resultado dos jobs (rota /jobs/health da API).',
  viewObservability: 'Ver detalhe em Observabilidade',

  pkgTitle: 'Pacote feature-flags',
  pkgState:
    'Sem override persistido (Map em memória, por processo) e SEM consumo em runtime por API, ' +
    'site ou worker: ligar uma flag do pacote não muda comportamento nenhum. Por isso não há ' +
    'interruptor para elas nesta tela — as flags que governam o sistema estão na tabela acima.',
  pkgColFlag: 'Flag do pacote',
  pkgColPlan: 'Plano mínimo',

  notesTitle: 'Limites desta leitura',
};

const EN: DiagnosticsStrings = {
  title: 'Diagnostics',
  subtitle:
    'Feature flags with their real value, the process that reads them and the next job run.',
  restricted: 'Restricted to administrators.',
  loading: 'Reading diagnostics…',
  error: 'Could not load the diagnostics.',
  refresh: 'Refresh',
  generatedAt: 'Read at',

  processTitle: 'Processes',
  processNote:
    'The API (Railway) and the site (Vercel) are separate services: each one has its own ' +
    'environment. A flag only applies to the process that reads it.',
  apiProcess: 'API (Railway)',
  webProcess: 'Site / web (Vercel)',
  nodeEnv: 'Environment',
  commit: 'Deploy commit',
  commitUnknown: 'not exposed by the runtime',
  deployment: 'Deployment',
  uptime: 'Up for',
  uptimeUnit: 'min',
  scheduler: 'ETL scheduler',
  schedulerOn: 'on',
  schedulerOff: 'off',
  redis: 'Redis configured',
  redisOn: 'yes',
  redisOff: 'no',
  separateServices:
    'The values below come from each process: “API” flags were read in the API at the moment of ' +
    'this query; “web” flags were read in the site server.',

  flagsTitle: 'Feature flags',
  flagsNote: 'Effective value at this read, with the code origin and what each state changes.',
  noOverrideNote:
    'There is no persisted flag override in this project: the value is a process environment ' +
    'variable fixed at container boot. Changing a flag requires editing the variable in the ' +
    'provider and redeploying — so this screen is read-only and has NO toggle (a switch here ' +
    'would not persist and would lie on screen).',
  valueOn: 'On',
  valueOff: 'Off',
  valueUnknown: 'Other process',
  valueUnknownShort: 'value in another process',
  ownerLabel: 'Read by',
  ownerApi: 'API',
  ownerWeb: 'WEB',
  ownerWorker: 'worker',
  kindLabel: 'Kind',
  kindEnv: 'environment variable',
  kindDerived: 'derived',
  scopeLabel: 'Area',
  effectOnLabel: 'On:',
  effectOffLabel: 'Off:',
  defaultLabel: 'Default',
  defaultOn: 'on',
  defaultOff: 'off',
  sourceLabel: 'Read at',
  changeLabel: 'How to change',
  rawLabel: 'Raw value',
  rawAbsent: 'variable absent',
  driftLabel: 'Divergent read in code',
  driftTitle: 'Warning: the same variable is read with different comparators',

  divergenceTitle: 'Divergence between processes',
  divergenceNone: 'No flag with a known value in both processes diverged in this read.',
  divergenceBody:
    '{key} is “{api}” in the API process and “{web}” on the site. The same flag with different ' +
    'values in different services produces incoherent behaviour (one surface released, the other not).',

  jobsTitle: 'Scheduled jobs and next run',
  jobsNote:
    'Cadence and next run come from the scheduler (BullMQ, Redis). Last result per job comes from ' +
    'GET /jobs/health — the same route the observability page consumes.',
  colQueue: 'Queue',
  colJob: 'Job',
  colCadence: 'Cadence',
  colNext: 'Next run',
  colLastRun: 'Last run',
  colLastResult: 'Result',
  never: 'never recorded',
  nextUnknown: 'not provided by the scheduler',
  schedulerDisabled:
    'The ETL scheduler is OFF (ETL_SCHEDULER_ENABLED): the schedules below may exist in Redis from ' +
    'a previous run, but no process in this instance fires them.',
  resultSuccess: 'success',
  resultFailure: 'failure',
  resultUnknown: 'no record',
  schedulersGap:
    'Declared gap: the scheduler did not respond, so the next run is not shown. Error reported by ' +
    'the API: {error}',
  queueLabel: 'data-refresh queue',
  queueFailed: 'failed',
  queueActive: 'active',
  healthGap: 'Could not read the last job results (API route /jobs/health).',
  viewObservability: 'See details in Observability',

  pkgTitle: 'feature-flags package',
  pkgState:
    'No persisted override (in-memory Map, per process) and NO runtime consumption by API, site or ' +
    'worker: flipping a package flag changes nothing. That is why there is no switch for them on ' +
    'this screen — the flags that govern the system are in the table above.',
  pkgColFlag: 'Package flag',
  pkgColPlan: 'Minimum plan',

  notesTitle: 'Limits of this read',
};

const ES: DiagnosticsStrings = {
  title: 'Diagnóstico',
  subtitle: 'Feature flags con valor real, proceso que las lee y próxima ejecución de los jobs.',
  restricted: 'Acceso restringido a administradores.',
  loading: 'Leyendo el diagnóstico…',
  error: 'No se pudo cargar el diagnóstico.',
  refresh: 'Actualizar',
  generatedAt: 'Lectura de',

  processTitle: 'Procesos',
  processNote:
    'La API (Railway) y el sitio (Vercel) son servicios separados: cada uno tiene su propio ' +
    'entorno. Una flag solo vale en el proceso que la lee.',
  apiProcess: 'API (Railway)',
  webProcess: 'Sitio / web (Vercel)',
  nodeEnv: 'Entorno',
  commit: 'Commit del deploy',
  commitUnknown: 'no expuesto por el runtime',
  deployment: 'Deployment',
  uptime: 'En línea hace',
  uptimeUnit: 'min',
  scheduler: 'Scheduler de ETL',
  schedulerOn: 'activado',
  schedulerOff: 'desactivado',
  redis: 'Redis configurado',
  redisOn: 'sí',
  redisOff: 'no',
  separateServices:
    'Los valores vienen de cada proceso: las flags «API» se leyeron en la API al momento de esta ' +
    'consulta; las «web» se leyeron en el servidor del sitio.',

  flagsTitle: 'Feature flags',
  flagsNote: 'Valor efectivo en esta lectura, con el origen en el código y qué cambia cada estado.',
  noOverrideNote:
    'No existe override persistido de flag en este proyecto: el valor es una variable de entorno ' +
    'del proceso, fijada en el arranque del contenedor. Cambiar una flag exige alterar la variable ' +
    'en el proveedor y redesplegar — por eso esta pantalla es de solo lectura y NO tiene ' +
    'interruptor (un switch aquí no persistiría y mentiría en pantalla).',
  valueOn: 'Activada',
  valueOff: 'Desactivada',
  valueUnknown: 'Otro proceso',
  valueUnknownShort: 'valor en otro proceso',
  ownerLabel: 'Leída por',
  ownerApi: 'API',
  ownerWeb: 'WEB',
  ownerWorker: 'worker',
  kindLabel: 'Tipo',
  kindEnv: 'variable de entorno',
  kindDerived: 'derivada',
  scopeLabel: 'Superficie',
  effectOnLabel: 'Activada:',
  effectOffLabel: 'Desactivada:',
  defaultLabel: 'Por defecto',
  defaultOn: 'activada',
  defaultOff: 'desactivada',
  sourceLabel: 'Leída en',
  changeLabel: 'Cómo cambiar',
  rawLabel: 'Valor bruto',
  rawAbsent: 'variable ausente',
  driftLabel: 'Lectura divergente en el código',
  driftTitle: 'Atención: la misma variable se lee con comparadores diferentes',

  divergenceTitle: 'Divergencia entre procesos',
  divergenceNone: 'Ninguna flag con valor conocido en ambos procesos divergió en esta lectura.',
  divergenceBody:
    '{key} vale «{api}» en el proceso de la API y «{web}» en el sitio. La misma flag con valores ' +
    'distintos en servicios distintos produce comportamiento incoherente (una superficie liberada ' +
    'y la otra no).',

  jobsTitle: 'Jobs agendados y próxima ejecución',
  jobsNote:
    'La cadencia y la próxima ejecución vienen del agendador (BullMQ, Redis). El último resultado ' +
    'por job viene de GET /jobs/health — la misma ruta que consume la página de observabilidad.',
  colQueue: 'Cola',
  colJob: 'Job',
  colCadence: 'Cadencia',
  colNext: 'Próxima ejecución',
  colLastRun: 'Última ejecución',
  colLastResult: 'Resultado',
  never: 'nunca registrada',
  nextUnknown: 'no informada por el agendador',
  schedulerDisabled:
    'El scheduler de ETL está DESACTIVADO (ETL_SCHEDULER_ENABLED): las agendas pueden existir en ' +
    'Redis de una ejecución anterior, pero ningún proceso de esta instancia las dispara.',
  resultSuccess: 'éxito',
  resultFailure: 'fallo',
  resultUnknown: 'sin registro',
  schedulersGap:
    'Brecha declarada: el agendador no respondió, por eso la próxima ejecución no se muestra. ' +
    'Error informado por la API: {error}',
  queueLabel: 'Cola data-refresh',
  queueFailed: 'fallos',
  queueActive: 'activas',
  healthGap: 'No se pudo leer el último resultado de los jobs (ruta /jobs/health de la API).',
  viewObservability: 'Ver detalle en Observabilidad',

  pkgTitle: 'Paquete feature-flags',
  pkgState:
    'Sin override persistido (Map en memoria, por proceso) y SIN consumo en runtime por API, sitio ' +
    'o worker: activar una flag del paquete no cambia nada. Por eso no hay interruptor para ellas ' +
    'en esta pantalla — las flags que gobiernan el sistema están en la tabla de arriba.',
  pkgColFlag: 'Flag del paquete',
  pkgColPlan: 'Plan mínimo',

  notesTitle: 'Límites de esta lectura',
};

export const diagnosticsStrings: Record<Locale, DiagnosticsStrings> = {
  'pt-br': PT,
  'en-us': EN,
  'es-es': ES,
};
