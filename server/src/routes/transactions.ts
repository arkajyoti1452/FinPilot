import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createTransactionSchema, transactionQuerySchema, updateTransactionSchema } from '../schemas/transaction.js';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

transactionsRouter.get('/', async (req, res, next) => {
  try {
    const query = transactionQuerySchema.parse(req.query);
    let request = supabaseAdmin.from('transactions').select('id,user_id,type,amount_minor,currency,category_id,occurred_on,merchant,note,created_at,updated_at', { count: 'exact' }).eq('user_id', req.userId!).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).range(query.offset, query.offset + query.limit - 1);
    if (query.from) request = request.gte('occurred_on', query.from);
    if (query.to) request = request.lte('occurred_on', query.to);
    if (query.type) request = request.eq('type', query.type);
    const { data, error, count } = await request;
    if (error) throw new HttpError(502, 'Could not load transactions from the database.');
    res.json({ data, pagination: { limit: query.limit, offset: query.offset, total: count ?? 0 } });
  } catch (error) { next(error); }
});

transactionsRouter.post('/', async (req, res, next) => {
  try {
    const body = createTransactionSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('transactions').insert({ ...body, user_id: req.userId! }).select('*').single();
    if (error) {
      console.error('Transaction insert rejected by Supabase:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      throw new HttpError(400, 'Could not create transaction. Check category, currency, and values.');
    }
    res.status(201).json({ data });
  } catch (error) { next(error); }
});

transactionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateTransactionSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('transactions').update(body).eq('id', id).eq('user_id', req.userId!).select('*').maybeSingle();
    if (error) throw new HttpError(400, 'Could not update transaction. Check category, currency, and values.');
    if (!data) throw new HttpError(404, 'Transaction not found.');
    res.json({ data });
  } catch (error) { next(error); }
});

transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { data, error } = await supabaseAdmin.from('transactions').delete().eq('id', id).eq('user_id', req.userId!).select('id').maybeSingle();
    if (error) throw new HttpError(502, 'Could not delete transaction.');
    if (!data) throw new HttpError(404, 'Transaction not found.');
    res.status(204).end();
  } catch (error) { next(error); }
});
