/**
 * WS-C-13 — Zod de social links (PATCH /clubs/:id/social, editors only).
 * Handles por rede com padrões frouxos o suficiente para IDs de canal
 * (YouTube UC…) e apertados o suficiente para bloquear HTML/espacos.
 */
import { z } from 'zod';

const HANDLE = /^[A-Za-z0-9._@-]{1,100}$/;

export const SocialLinkEntrySchema = z.object({
  handle: z.string().regex(HANDLE, 'handle inválido'),
  url: z.string().url().max(500),
});

export const SocialLinksSchema = z.object({
  youtube: SocialLinkEntrySchema.nullable().optional(),
  twitter: SocialLinkEntrySchema.nullable().optional(),
  facebook: SocialLinkEntrySchema.nullable().optional(),
  instagram: SocialLinkEntrySchema.nullable().optional(),
});

export const FollowersSnapshotSchema = z
  .object({
    youtube: z.number().int().min(0).nullable().optional(),
    twitter: z.number().int().min(0).nullable().optional(),
    facebook: z.number().int().min(0).nullable().optional(),
    instagram: z.number().int().min(0).nullable().optional(),
    updatedAt: z.string().optional(),
  })
  .nullable()
  .optional();

export const SocialPatchSchema = z.object({
  officialSite: z.string().url().max(500).nullable().optional(),
  socialLinks: SocialLinksSchema,
  followersSnapshot: FollowersSnapshotSchema,
});

export type SocialPatchInput = z.infer<typeof SocialPatchSchema>;
