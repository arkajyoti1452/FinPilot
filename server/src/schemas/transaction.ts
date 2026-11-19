import { z } from 'zod';

const currency = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code.');
const amountMinor = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const transactionFields = {
  type: z.enum(['income', 'expense']),
  amount_minor: amountMinor,
  currency,
  category_id: z.string().uuid().nullable().optional(),
  occurred_on: z.iso.date(),
  merchant: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional()
};

export const createTransactionSchema = z.object(transactionFields);
export const updateTransactionSchema = z.object(transactionFields).partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');
export const transactionQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  type: z.enum(['income', 'expense']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
}).refine((value) => !value.from || !value.to || value.from <= value.to, { path: ['to'], message: 'The to date must be on or after from.' });
