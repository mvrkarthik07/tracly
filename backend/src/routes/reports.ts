import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { generateWeeklyReport } from '../jobs/generateWeeklyReport';
import { authGuard } from '../middleware/authGuard';

export const reportsRouter = Router();

const serializeReport = (report: { id: string; weekStart: Date; weekEnd: Date; totalIncome: unknown; totalExpense: unknown; net: unknown; byCategory: unknown; topCategory: string | null; generatedAt: Date }) => ({
  ...report,
  totalIncome: Number(report.totalIncome?.toString?.() ?? report.totalIncome),
  totalExpense: Number(report.totalExpense?.toString?.() ?? report.totalExpense),
  net: Number(report.net?.toString?.() ?? report.net),
});

reportsRouter.get('/weekly', authGuard, async (req, res, next) => {
  try {
    const parsedLimit = Number(req.query.limit ?? 8);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 52) : 8;
    const reports = await prisma.weeklyReport.findMany({ orderBy: { weekStart: 'desc' }, take: limit });
    res.json(reports.map(serializeReport));
  } catch (error) { next(error); }
});

reportsRouter.get('/weekly/latest', authGuard, async (_req, res, next) => {
  try {
    const report = await prisma.weeklyReport.findFirst({ orderBy: { weekStart: 'desc' } });
    if (!report) { res.status(404).json({ error: 'No weekly report found' }); return; }
    res.json(serializeReport(report));
  } catch (error) { next(error); }
});

reportsRouter.post('/generate', async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.header('X-Cron-Secret') !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Invalid cron secret' });
    return;
  }
  try {
    const report = await generateWeeklyReport();
    res.json(serializeReport(report as never));
  } catch (error) { next(error); }
});
