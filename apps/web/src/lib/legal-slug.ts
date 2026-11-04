/**
 * Slug estável do título de uma seção legal (âncora de "Nesta página").
 * Módulo SEM 'use client': é usado tanto por componentes clientes quanto pelo Server Component
 * de /cookies — importar a função de um módulo 'use client' no servidor daria apenas a referência
 * de cliente, não a função.
 */
export function slugDaSecao(title: string): string {
  return title
    .replace(/^\d+\.\s*/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
