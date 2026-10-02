/**
 * Serializa JSON-LD de forma segura para injeção em <script type="application/ld+json">.
 *
 * JSON.stringify NÃO escapa `<`/`>`/`&`: um valor persistido contendo `</script>`
 * fecharia o bloco e injetaria HTML executável (stored XSS). Escapar para
 * sequências \uXXXX mantém o JSON semanticamente idêntico ao consumidor
 * (o parser JSON decodifica de volta) e neutro como vetor de injeção.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
