/**
 * T470 — WS-L: schemas Zod do processo de direitos do titular e notificação autoral.
 * Toda entrada externa é validada aqui (dado externo é hostil).
 */
import { z } from 'zod';

export const DSR_TYPES = [
  'confirmation_access',
  'correction',
  'anonymization_blockage_deletion',
  'portability',
  'sharing_information',
  'consent_revocation',
  'objection',
  'automated_decision_review',
] as const;

export const DSR_JURISDICTIONS = ['BR', 'EEA_UK', 'OTHER'] as const;
export const DSR_STATUSES = [
  'received',
  'needs_verification',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const DSR_REQUESTED_FIELDS = [
  'account',
  'billing',
  'subscriptions',
  'favorites',
  'sessions_metadata',
  'consent',
  'requests',
  'notices',
] as const;

export const NOTICE_TYPES = ['infringement_notice', 'counter_notice'] as const;
export const NOTICE_STATUSES = [
  'received',
  'under_review',
  'action_taken',
  'rejected',
  'closed',
] as const;

/** Confirmação exata exigida para exclusão de conta. */
export const DELETE_CONFIRMATION = 'EXCLUIR CONTA';

/** Sanitiza texto livre: remove controles, colapsa espaços e limita tamanho. */
export function sanitizeText(value: string | undefined | null, max = 2000): string | null {
  if (value == null) return null;
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length ? cleaned.slice(0, max) : null;
}

export const CreateRightsRequestSchema = z.object({
  type: z.enum(DSR_TYPES),
  jurisdiction: z.enum(DSR_JURISDICTIONS).default('BR'),
  description: z.string().max(2000).optional(),
  requestedFields: z.array(z.enum(DSR_REQUESTED_FIELDS)).max(8).optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
});

export const DeleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION),
  password: z.string().min(1).max(200),
});

export const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

export const CreateNoticeSchema = z.object({
  workTitle: z.string().min(2).max(300),
  workUrl: z.string().url().max(500).optional(),
  materialUrl: z.string().url().max(500),
  description: z.string().min(10).max(2000),
  goodFaithDeclaration: z.literal(true),
  accuracyDeclaration: z.literal(true),
  signatureText: z.string().min(2).max(200),
});

export const CounterNoticeSchema = z.object({
  description: z.string().min(10).max(2000),
  goodFaithDeclaration: z.literal(true),
  accuracyDeclaration: z.literal(true),
  signatureText: z.string().min(2).max(200),
});

export const AdminUpdateDsrSchema = z.object({
  status: z.enum(DSR_STATUSES),
  responseSummary: z.string().max(2000).optional(),
  internalNote: z.string().max(2000).optional(),
});

export const AdminUpdateNoticeSchema = z.object({
  status: z.enum(NOTICE_STATUSES),
  responseSummary: z.string().max(2000).optional(),
  internalNote: z.string().max(2000).optional(),
});

export type CreateRightsRequestInput = z.infer<typeof CreateRightsRequestSchema>;
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;
export type CreateCounterNoticeInput = z.infer<typeof CounterNoticeSchema>;
