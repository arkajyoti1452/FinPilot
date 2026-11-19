import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createBudgetSchema, updateBudgetSchema } from '../schemas/budget.js';

export const budgetsRouter = Router();
budgetsRouter.use(authenticate);

function presentBudget(row: Record<string, unknown>) {
  const { month_start, ...rest } = row;
  return { ...rest, month: month_start };
}

budgetsRouter.get('/', async (req, res, next) => {
  try {
    const month = req.query.month ? z.iso.date().refine((value) => value.endsWith('-01')).parse(req.query.month) : `${new Date().toISOString().slice(0, 7)}-01`;
    const { data, error } = await supabaseAdmin.from('budgets').select('*').eq('user_id', req.userId!).eq('month_start', month).order('category_id', { ascending: true, nullsFirst: true });
    if (error) throw new HttpError(502, 'Could not load budgets.');
    res.json({ data: (data ?? []).map((row) => presentBudget(row)) });
  } catch (error) { next(error); }
});

budgetsRouter.post('/', async (req, res, next) => {
  try {
    const body = createBudgetSchema.parse(req.body);
    const { month, ...budgetFields } = body;
    const { data, error } = await supabaseAdmin.from('budgets').insert({ ...budgetFields, month_start: month, user_id: req.userId! }).select('*').single();
    if (error) {
      console.error('Budget insert rejected by Supabase:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      throw new HttpError(400, 'Could not create budget. A budget may already exist for this month and category.');
    }
    res.status(201).json({ data: presentBudget(data) });
  } catch (error) { next(error); }
});

budgetsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateBudgetSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('budgets').update(body).eq('id', id).eq('user_id', req.userId!).select('*').maybeSingle();
    if (error) throw new HttpError(400, 'Could not update budget.');
    if (!data) throw new HttpError(404, 'Budget not found.');
    res.json({ data: presentBudget(data) });
  } catch (error) { next(error); }
});

budgetsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { data, error } = await supabaseAdmin.from('budgets').delete().eq('id', id).eq('user_id', req.userId!).select('id').maybeSingle();
    if (error) throw new HttpError(502, 'Could not delete budget.');
    if (!data) throw new HttpError(404, 'Budget not found.');
    res.status(204).end();
  } catch (error) { next(error); }
});
