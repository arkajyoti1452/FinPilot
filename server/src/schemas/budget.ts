import { z } from 'zod';

const month = z.iso.date().refine((value) => value.endsWith('-01'), 'month must be the first day of a month.');
export const createBudgetSchema = z.object({
  month,
  category_id: z.string().uuid().nullable().optional(),
  amount_minor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/)
});
export const updateBudgetSchema = z.object({
  amount_minor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional()
}).refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');
