import type { Metadata } from 'next';

/**
 * T493/T472 — hreflang das páginas legais (pt-BR prevalente).
 * As páginas servem os 3 idiomas na mesma rota; o `?locale=` dá endereço
 * distinto por idioma (o Provider aceita o override) e o x-default cai no
 * português, língua da versão vigente.
 */
export function legalAlternates(path: string): Metadata['alternates'] {
  return {
    canonical: path,
    languages: {
      'pt-BR': `${path}?locale=pt-br`,
      'en-US': `${path}?locale=en-us`,
      'es-ES': `${path}?locale=es-es`,
      'x-default': path,
    },
  };
}
