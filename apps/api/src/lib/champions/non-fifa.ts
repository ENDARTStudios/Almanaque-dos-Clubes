/**
 * Auditoria 2026-10-08 (P1) — competições mundiais de federações ALTERNATIVAS
 * (não-FIFA) presentes no acervo. Elas SÃO mundiais de facto (por isso o
 * `resolveHierarchy` as classifica como 'mundial'), mas lado-a-lado com a
 * FIFA Club World Cup o carrossel induz o usuário comum a erro — o escopo do
 * carrossel ganha `nonFifa: true` para a UI etiquetar.
 *
 * Lista EXPLÍCITA por QID (auditável; R4: só entra o que existe no acervo).
 * Candidatas a adicionar SE um dia entrarem: ConIFA World Football Cup,
 * ConIFA European Football Cup etc. — sempre com PR + evidência.
 */
const NON_FIFA_COMPETITION_QIDS: ReadonlySet<string> = new Set([
  'Q318443', // VIVA World Cup (NF-Board/ConIFA)
]);

export function isNonFifaWorldCompetition(qid: string | null | undefined): boolean {
  return qid != null && NON_FIFA_COMPETITION_QIDS.has(qid);
}
