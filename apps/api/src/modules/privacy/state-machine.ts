/**
 * T445 — Máquinas de estado dos direitos do titular (LGPD art. 18) e das
 * copyright claims (DMCA).
 *
 * Cadeia ESTRITA (decisão do HANDOFF-T445, não re-discutir):
 *   PrivacyRequest:  recebido → em_andamento → atendido | indeferido
 *   CopyrightClaim:  recebida → em_analise → deferida | indeferida | retirado
 * Mesmo estado = no-op válido (idempotência, padrão T444). Transição
 * inválida lança — nunca aplica silenciosamente.
 */

export type PrivacyStatus = 'recebido' | 'em_andamento' | 'atendido' | 'indeferido';
export type ClaimStatus =
  | 'recebida'
  | 'em_analise'
  | 'deferida'
  | 'indeferida'
  | 'retirado';

export const PRIVACY_TRANSITIONS: Record<PrivacyStatus, PrivacyStatus[]> = {
  recebido: ['em_andamento'],
  em_andamento: ['atendido', 'indeferido'],
  atendido: [],
  indeferido: [],
};

export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  recebida: ['em_analise'],
  em_analise: ['deferida', 'indeferida', 'retirado'],
  deferida: [],
  indeferida: [],
  retirado: [],
};

export const PRIVACY_RIGHT_TYPES = [
  'confirmação',
  'acesso',
  'correção',
  'anonimização',
  'portabilidade',
  'eliminação',
  'info_compartilhamento',
  'info_consequência',
  'revisão_automatizada',
  'revogação',
] as const;
export type PrivacyRightType = (typeof PRIVACY_RIGHT_TYPES)[number];

/** Direitos com atendimento imediato (art. 18, §1º — confirmação e acesso). */
export const IMMEDIATE_RIGHTS: readonly string[] = ['confirmação', 'acesso'];

/** Prazo geral ANPD (art. 18): 15 dias para os demais direitos. */
export const ANPD_SLA_DAYS = 15;

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly entity: 'privacy' | 'claim',
  ) {
    super(`Transição inválida (${entity}): ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertPrivacyTransition(from: string, to: string): void {
  if (from === to) return;
  const allowed = PRIVACY_TRANSITIONS[from as PrivacyStatus] ?? [];
  if (!allowed.includes(to as PrivacyStatus)) {
    throw new InvalidTransitionError(from, to, 'privacy');
  }
}

export function assertClaimTransition(from: string, to: string): void {
  if (from === to) return;
  const allowed = CLAIM_TRANSITIONS[from as ClaimStatus] ?? [];
  if (!allowed.includes(to as ClaimStatus)) {
    throw new InvalidTransitionError(from, to, 'claim');
  }
}
