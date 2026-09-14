import { z } from 'zod';

export const ConsentCategoriesSchema = z.object({
  necessary: z.literal(true),
  preferences: z.boolean(),
  analytics: z.boolean(),
  personalization: z.boolean(),
  marketing: z.boolean(),
});

export const CreateConsentSchema = z.object({
  visitorId: z.string().min(8).max(128),
  version: z.string().min(1).max(32),
  categories: ConsentCategoriesSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type CreateConsentInput = z.infer<typeof CreateConsentSchema>;
export type ConsentCategories = z.infer<typeof ConsentCategoriesSchema>;
