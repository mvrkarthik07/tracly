import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authGuard } from './middleware/authGuard';
import { authRouter } from './routes/auth';
import { transactionsRouter } from './routes/transactions';
import { analyticsRouter } from './routes/analytics';
import { reportsRouter } from './routes/reports';
import { prisma } from './lib/prisma';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/transactions', authGuard, transactionsRouter);
app.use('/api/analytics', authGuard, analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
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
