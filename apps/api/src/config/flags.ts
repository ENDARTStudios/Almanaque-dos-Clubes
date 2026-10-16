/**
 * Leitura de feature flags de ambiente — FONTE ÚNICA.
 *
 * Por que existe (T568): o painel de diagnóstico encontrou o mesmo padrão de bug em três
 * lugares diferentes — cada consumidor comparava a variável do seu jeito:
 *
 *  - `BIRTHDAY_GIFT_ENABLED`: o boot registrava o job com `'1' || 'true'`, mas o gate do
 *    handler exigia `'true'` → com `'1'` o job rodava e **não concedia nada** (falha
 *    silenciosa: nem erro, nem efeito).
 *  - `ETL_SCHEDULER_ENABLED`: um consumidor testava `'1'`, outro `'true'`.
 *
 * Regra daqui em diante: TODA flag booleana passa por `envFlag`. Aceita as formas que as
 * pessoas realmente escrevem (`1`, `true`, `yes`, `on`, sem diferenciar maiúsculas) e trata
 * vazio como ausente — nunca como "ligado".
 */
const VERDADEIROS = new Set(['1', 'true', 'yes', 'on', 'sim']);

/**
 * Lê uma flag booleana do ambiente.
 * @param nome variável de ambiente (ex.: `BIRTHDAY_GIFT_ENABLED`)
 * @param padrao valor quando a variável está ausente ou vazia (default: `false`)
 */
export function envFlag(nome: string, padrao = false): boolean {
  const bruto = (process.env[nome] ?? '').trim().toLowerCase();
  if (bruto === '') return padrao;
  return VERDADEIROS.has(bruto);
}
