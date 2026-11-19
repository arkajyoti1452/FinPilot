import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get('/', async (req, res, next) => {
  try {
    const { months } = z.object({ months: z.coerce.number().int().refine((value) => value === 6 || value === 12, 'months must be 6 or 12').default(6) }).parse(req.query);
    const now = new Date();
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const from = firstMonth.toISOString().slice(0, 10);
    const toExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const rows: Array<{ type: 'income' | 'expense'; amount_minor: number; currency: string; category_id: string | null; occurred_on: string }> = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin.from('transactions').select('type,amount_minor,currency,category_id,occurred_on').eq('user_id', req.userId!).gte('occurred_on', from).lt('occurred_on', toExclusive).order('occurred_on', { ascending: true }).range(offset, offset + pageSize - 1);
      if (error) throw new HttpError(502, 'Could not load analytics data.');
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }

    const monthly = new Map<string, { month: string; currency: string; income_minor: number; expenses_minor: number }>();
    const categories = new Map<string, { category_id: string | null; currency: string; type: 'income' | 'expense'; amount_minor: number; transaction_count: number }>();
    for (const row of rows) {
      const month = `${row.occurred_on.slice(0, 7)}-01`;
      const monthKey = `${month}:${row.currency}`;
      const monthSummary = monthly.get(monthKey) ?? { month, currency: row.currency, income_minor: 0, expenses_minor: 0 };
      if (row.type === 'income') monthSummary.income_minor += Number(row.amount_minor);
      else monthSummary.expenses_minor += Number(row.amount_minor);
      monthly.set(monthKey, monthSummary);

      const categoryKey = `${row.category_id ?? 'uncategorized'}:${row.currency}:${row.type}`;
      const categorySummary = categories.get(categoryKey) ?? { category_id: row.category_id, currency: row.currency, type: row.type, amount_minor: 0, transaction_count: 0 };
      categorySummary.amount_minor += Number(row.amount_minor);
      categorySummary.transaction_count += 1;
      categories.set(categoryKey, categorySummary);
    }

    res.json({ data: {
      from,
      to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
      monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency)),
      categories: [...categories.values()].sort((a, b) => b.amount_minor - a.amount_minor)
    } });
  } catch (error) { next(error); }
});
