import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authGuard } from './middleware/authGuard';
import { authRouter } from './routes/auth';
import { transactionsRouter } from './routes/transactions';
import { analyticsRouter } from './routes/analytics';
import { reportsRouter } from './routes/reports';
import { recurringRouter } from './routes/recurring';
import { generateRecurringTransactions } from './jobs/generateRecurringTransactions';
import { prisma } from './lib/prisma';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN) throw new Error('FRONTEND_ORIGIN is not configured');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

app.set('trust proxy', 1);
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/transactions', authGuard, transactionsRouter);
app.use('/api/analytics', authGuard, analyticsRouter);
app.use('/api/reports', reportsRouter);
app.post('/api/recurring/generate', async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.header('X-Cron-Secret') !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Invalid cron secret' });
    return;
  }
  try {
    res.json({ generated: await generateRecurringTransactions() });
  } catch (error) { next(error); }
});
app.use('/api/recurring', authGuard, recurringRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API request failed');
  const status = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025' ? 404 : 500;
  res.status(status).json({ error: status === 404 ? 'Not found' : 'Internal server error' });
});

const server = app.listen(port, () => console.log(`Finance Tracker API listening on ${port}`));

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
