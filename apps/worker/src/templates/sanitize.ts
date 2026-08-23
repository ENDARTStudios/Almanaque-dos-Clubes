/**
 * Sanitização compartilhada de templates de email do worker (T342).
 * Nenhum log é emitido aqui — token/corpo nunca são logados.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
