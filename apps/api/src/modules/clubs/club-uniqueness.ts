/**
 * T448b-2f — Validação de negócio CONTEXTUAL de unicidade de clube. PURO.
 *
 * Substitui o único físico (name,country) removido na migration: permite homônimos
 * nacionais legítimos (diferentes por state/city) e bloqueia apenas duplicata EXATA
 * (name+country+state+city iguais, incluindo ambos sem state/city). Caso parcial
 * (um lado com state/city, outro sem) => ambíguo (revisão humana), nunca auto-bloqueio
 * nem auto-permissão cega. Identidade canônica continua sendo o QID.
 */

export function normalizeClubContextKey(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class DuplicateExactContextError extends Error {
  readonly conflictingClubId: string;
  readonly normalizedKeyUsed: string;
  constructor(conflictingClubId: string, normalizedKeyUsed: string) {
    super(
      `Já existe um clube com o mesmo contexto (name/country/state/city): id ${conflictingClubId}`,
    );
    this.name = 'DuplicateExactContextError';
    this.conflictingClubId = conflictingClubId;
    this.normalizedKeyUsed = normalizedKeyUsed;
  }
}

export interface ClubDedupCandidate {
  id: string;
  name: string;
  state: string | null;
  city: string | null;
}

export interface ClubUniquenessInput {
  name: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  /** Em update: ignora o próprio registro. */
  existingId?: string | null;
}

export type ClubUniquenessDecision =
  | { decision: 'allow' }
  | { decision: 'block'; conflictingClubId: string; normalizedKeyUsed: string }
  | { decision: 'ambiguous'; conflictingClubId: string };

/** Decide (puro) se o novo clube colide com algum candidato ativo do mesmo país. */
export function decideClubUniqueness(
  input: ClubUniquenessInput,
  candidates: ClubDedupCandidate[],
): ClubUniquenessDecision {
  const nName = normalizeClubContextKey(input.name);
  const nState = normalizeClubContextKey(input.state);
  const nCity = normalizeClubContextKey(input.city);

  for (const c of candidates) {
    if (input.existingId && c.id === input.existingId) continue;
    if (normalizeClubContextKey(c.name) !== nName) continue;

    const cState = normalizeClubContextKey(c.state);
    const cCity = normalizeClubContextKey(c.city);

    const stateUndefined = nState === '' && cState === '';
    const cityUndefined = nCity === '' && cCity === '';
    const stateEqualDefined = nState !== '' && cState !== '' && nState === cState;
    const cityEqualDefined = nCity !== '' && cCity !== '' && nCity === cCity;

    // Duplicata EXATA: state e city iguais (ou ambos ausentes).
    if ((stateEqualDefined || stateUndefined) && (cityEqualDefined || cityUndefined)) {
      return {
        decision: 'block',
        conflictingClubId: c.id,
        normalizedKeyUsed: [nName, normalizeClubContextKey(input.country), nState, nCity].join('|'),
      };
    }

    // Ambíguo: um lado define state/city e o outro não.
    const statePartial = (nState === '') !== (cState === '');
    const cityPartial = (nCity === '') !== (cCity === '');
    if (statePartial || cityPartial) {
      return { decision: 'ambiguous', conflictingClubId: c.id };
    }

    // Ambos definidos e diferentes ⇒ homônimo legítimo ⇒ permite.
  }
  return { decision: 'allow' };
}
