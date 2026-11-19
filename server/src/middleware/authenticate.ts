import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request { userId?: string }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    const match = header?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new HttpError(401, 'A valid bearer token is required.');

    const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
    if (error || !data.user) throw new HttpError(401, 'The access token is invalid or expired.');
    req.userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
}
