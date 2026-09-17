/**
 * T444 — Máquina de estados da assinatura (WS-P).
 *
 * Transições SÓ acontecem via eventos verificados (webhook HMAC) ou ações
 * autenticadas do próprio usuário. Toda transição válida é auditada
 * (auditLog). Transição inválida → rejeitada (nunca aplicada).
 *
 * Estados (SubscriptionStatus): PENDING · ACTIVE · PAST_DUE · CANCELLED ·
 * EXPIRED · INACTIVE (conta desativada).
 */

export type SubStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INACTIVE';

/** Transições permitidas por estado atual. */
export const ALLOWED_TRANSITIONS: Record<SubStatus, SubStatus[]> = {
  PENDING: ['ACTIVE', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'CANCELLED', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  CANCELLED: ['ACTIVE'], // reassinatura
  EXPIRED: ['ACTIVE'], // reassinatura
  INACTIVE: ['ACTIVE'],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: SubStatus,
    public readonly to: SubStatus,
  ) {
    super(`Transição de assinatura inválida: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/** Puro: valida a transição. Lança InvalidTransitionError se proibida. */
export function assertTransition(from: SubStatus, to: SubStatus): void {
  if (from === to) return; // idempotente (mesmo estado = no-op válido)
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) throw new InvalidTransitionError(from, to);
}

/** Puro: verifica sem lançar. */
export function canTransition(from: SubStatus, to: SubStatus): boolean {
  try {
    assertTransition(from, to);
    return true;
  } catch {
    return false;
  }
}
