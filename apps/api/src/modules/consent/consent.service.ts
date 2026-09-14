import { createHash } from 'node:crypto';
import { consentRepository, policyVersionRepository } from './repository.js';
import type { CreateConsentInput } from './schema.js';

// Versão vigente da Política de Cookies (/cookies). Ao alterar o conteúdo da
// política, bump aqui + nova linha em cookie_policy_versions (upsert automático
// no primeiro POST que chegar com a versão nova).
export const CURRENT_COOKIE_POLICY_VERSION = '1.0';

// Salt do hash de IP: dedicated env quando presente; fallback ao segredo JWT já
// validado no boot. O IP NUNCA é persistido em claro (LGPD — minimização).
function ipSalt(): string {
  return process.env.CONSENT_IP_SALT || process.env.JWT_SECRET || 'almanaque-dev-salt';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${ipSalt()}:${ip}`).digest('hex');
}

export interface ConsentRecord {
  id: string;
  visitorId: string;
  version: string;
  categories: unknown;
  consentedAt: Date;
}

export async function recordConsent(
  input: CreateConsentInput,
  context: { ip: string; userAgent?: string | null },
): Promise<ConsentRecord> {
  // Proveniência da política: primeira vez que esta versão é vista, registra.
  await policyVersionRepository.upsert(input.version);

  const created = await consentRepository.create({
    visitorId: input.visitorId,
    version: input.version,
    categories: input.categories,
    userAgent: context.userAgent ?? null,
    ipHash: hashIp(context.ip),
    metadata: input.metadata ?? null,
  });
  return created as unknown as ConsentRecord;
}

export async function getCurrentConsent(visitorId: string): Promise<ConsentRecord | null> {
  return (await consentRepository.findCurrentByVisitorId(visitorId)) as ConsentRecord | null;
}
