import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);
categoriesRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('categories').select('id,user_id,name,slug,transaction_type').or(`user_id.is.null,user_id.eq.${req.userId}`).order('transaction_type').order('name');
    if (error) throw new HttpError(502, 'Could not load categories.');
    res.json({ data });
  } catch (error) { next(error); }
});
