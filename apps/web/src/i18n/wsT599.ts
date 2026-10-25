/** T599/DQ-04 — strings de /admin/revisao (fila de revisão de dados). */
export interface WsT599Strings {
  title: string;
  subtitle: string;
  empty: string;
  resolve: string;
  dismiss: string;
  notePlaceholder: string;
  resolved: string;
  dismissed: string;
  error: string;
  filterAll: string;
  filterPending: string;
  loading: string;
  resolvedBy: string;
}

export const wsT599Strings: Record<'pt-br' | 'en-us' | 'es-es', WsT599Strings> = {
  'pt-br': {
    title: 'Fila de revisão de dados',
    subtitle:
      'Anomalias sinalizadas pelo integrity-check antes de virarem produto. Resolver = corrigido; Descartar = falso positivo aceito. Se o problema persistir, a checagem reabre a pendência.',
    empty: 'Nenhuma pendência — o acervo passou nas validações.',
    resolve: 'Resolver',
    dismiss: 'Descartar',
    notePlaceholder: 'Nota da resolução (opcional)',
    resolved: 'Resolvido',
    dismissed: 'Descartado',
    error: 'Não foi possível carregar a fila.',
    filterAll: 'Todas',
    filterPending: 'Pendentes',
    loading: 'Carregando…',
    resolvedBy: 'por',
  },
  'en-us': {
    title: 'Data review queue',
    subtitle:
      'Anomalies flagged by the integrity check before reaching the product. Resolve = fixed; Dismiss = accepted false positive. If the problem persists, the check re-opens the entry.',
    empty: 'No pending items — the archive passed all validations.',
    resolve: 'Resolve',
    dismiss: 'Dismiss',
    notePlaceholder: 'Resolution note (optional)',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
    error: 'Could not load the queue.',
    filterAll: 'All',
    filterPending: 'Pending',
    loading: 'Loading…',
    resolvedBy: 'by',
  },
  'es-es': {
    title: 'Fila de revisión de datos',
    subtitle:
      'Anomalías señaladas por el integrity-check antes de llegar al producto. Resolver = corregido; Descartar = falso positivo aceptado. Si el problema persiste, la comprobación vuelve a abrir la entrada.',
    empty: 'Ninguna pendencia: el acervo pasó todas las validaciones.',
    resolve: 'Resolver',
    dismiss: 'Descartar',
    notePlaceholder: 'Nota de resolución (opcional)',
    resolved: 'Resuelto',
    dismissed: 'Descartado',
    error: 'No se pudo cargar la fila.',
    filterAll: 'Todas',
    filterPending: 'Pendientes',
    loading: 'Cargando…',
    resolvedBy: 'por',
  },
};
