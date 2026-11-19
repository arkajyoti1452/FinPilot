import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { budgetsRouter } from './routes/budgets.js';
import { analyticsRouter } from './routes/analytics.js';
import { assistantRouter } from './routes/assistant.js';
import { insightsRouter } from './routes/insights.js';
import { categoriesRouter } from './routes/categories.js';
import { dashboardRouter } from './routes/dashboard.js';
import { transactionsRouter } from './routes/transactions.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});
app.use(cors({
  origin(origin, callback) {
    const isConfiguredOrigin = origin === config.CLIENT_ORIGIN;
    const isLocalViteOrigin = config.NODE_ENV !== 'production'
      && origin !== undefined
      && /^http:\/\/(localhost|127\.0\.0\.1):5\d{3}$/.test(origin);
    if (!origin || isConfiguredOrigin || isLocalViteOrigin) callback(null, true);
    else callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', service: 'finpilot-api' } });
});
app.use('/api/transactions', transactionsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/dashboard/insights', insightsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
app.use(errorHandler);
