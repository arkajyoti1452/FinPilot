import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const month = req.query.month ? z.iso.date().refine((value) => value.endsWith('-01')).parse(req.query.month) : `${new Date().toISOString().slice(0, 7)}-01`;
    const start = new Date(`${month}T00:00:00.000Z`);
    const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin.from('transactions').select('type,amount_minor,currency,occurred_on').eq('user_id', req.userId!).gte('occurred_on', month).lt('occurred_on', nextMonth);
    if (error) throw new HttpError(502, 'Could not calculate dashboard summary.');

    const totals = new Map<string, { income: number; expenses: number }>();
    for (const transaction of data ?? []) {
      const current = totals.get(transaction.currency) ?? { income: 0, expenses: 0 };
      if (transaction.type === 'income') current.income += Number(transaction.amount_minor);
      else current.expenses += Number(transaction.amount_minor);
      totals.set(transaction.currency, current);
    }
    res.json({ data: { month, currencies: [...totals.entries()].map(([currency, value]) => ({ currency, income_minor: value.income, expenses_minor: value.expenses, net_cashflow_minor: value.income - value.expenses, savings_rate: value.income > 0 ? (value.income - value.expenses) / value.income : null })) } });
  } catch (error) { next(error); }
});
