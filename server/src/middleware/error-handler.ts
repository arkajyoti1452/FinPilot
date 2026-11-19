import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof Error && error.name === 'TimeoutError') {
    res.status(504).json({ error: { code: 'UPSTREAM_TIMEOUT', message: 'The AI service took too long to respond. Please try again.' } });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.status === 401 ? 'UNAUTHORIZED' : 'REQUEST_ERROR', message: error.message } });
    return;
  }
  console.error('Unhandled request error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
};
