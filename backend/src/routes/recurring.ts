import { Prisma, PrismaClient, TxType } from '@prisma/client';
import { Router } from 'express';
import { CATEGORIES, type Category } from '../constants/categories';
import { prisma } from '../lib/prisma';

const isCategory = (value: unknown): value is Category => typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
const isType = (value: unknown): value is TxType => value === 'INCOME' || value === 'EXPENSE';
const parseAmount = (value: unknown): Prisma.Decimal | null => {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? new Prisma.Decimal(amount.toFixed(2)) : null;
};
const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const parseDay = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31 ? value : null;
const serializeRule = (rule: Prisma.RecurringTransactionGetPayload<{}>) => ({ ...rule, amount: rule.amount.toString() });

export const createRecurringRouter = (database: PrismaClient = prisma) => {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const rules = await database.recurringTransaction.findMany({ orderBy: { dayOfMonth: 'asc' } });
      res.json(rules.map(serializeRule));
    } catch (error) { next(error); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const amount = parseAmount(req.body?.amount);
      const type = req.body?.type;
      const categoryValue = typeof req.body?.category === 'string' ? req.body.category.trim().toUpperCase() : '';
      const dayOfMonth = parseDay(req.body?.dayOfMonth);
      const startDate = parseDate(req.body?.startDate);
      const endDate = req.body?.endDate === undefined || req.body.endDate === null ? null : parseDate(req.body.endDate);
      if (req.body?.active !== undefined && typeof req.body.active !== 'boolean') { res.status(400).json({ error: 'active must be boolean' }); return; }
      if (req.body?.frequency !== undefined && req.body.frequency !== 'MONTHLY') { res.status(400).json({ error: 'frequency must be MONTHLY' }); return; }
      if (!amount || !isType(type) || !isCategory(categoryValue) || !dayOfMonth || !startDate || (req.body?.endDate !== undefined && req.body.endDate !== null && !endDate)) {
        res.status(400).json({ error: 'amount, type, category, dayOfMonth, and startDate are required and valid' });
        return;
      }
      if (endDate && endDate <= startDate) { res.status(400).json({ error: 'endDate must be after startDate' }); return; }
      const rule = await database.recurringTransaction.create({
        data: {
          amount,
          type,
          category: categoryValue,
          note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null,
          frequency: 'MONTHLY',
          dayOfMonth,
          startDate,
          endDate,
          active: req.body?.active ?? true,
        },
      });
      res.status(201).json(serializeRule(rule));
    } catch (error) { next(error); }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const existing = await database.recurringTransaction.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
      const data: Prisma.RecurringTransactionUpdateInput = {};
      const amount = req.body?.amount === undefined ? existing.amount : parseAmount(req.body.amount);
      const type = req.body?.type === undefined ? existing.type : req.body.type;
      const categoryValue = req.body?.category === undefined ? existing.category : typeof req.body.category === 'string' ? req.body.category.trim().toUpperCase() : '';
      const dayOfMonth = req.body?.dayOfMonth === undefined ? existing.dayOfMonth : parseDay(req.body.dayOfMonth);
      const startDate = req.body?.startDate === undefined ? existing.startDate : parseDate(req.body.startDate);
      const endDate = req.body?.endDate === undefined ? existing.endDate : req.body.endDate === null ? null : parseDate(req.body.endDate);
      if (!amount || !isType(type) || !isCategory(categoryValue) || !dayOfMonth || !startDate || (req.body?.endDate !== undefined && req.body.endDate !== null && !endDate)) {
        res.status(400).json({ error: 'Recurring transaction fields are invalid' });
        return;
      }
      if (endDate && endDate <= startDate) { res.status(400).json({ error: 'endDate must be after startDate' }); return; }
      if (req.body?.amount !== undefined) data.amount = amount;
      if (req.body?.type !== undefined) data.type = type;
      if (req.body?.category !== undefined) data.category = categoryValue;
      if (req.body?.dayOfMonth !== undefined) data.dayOfMonth = dayOfMonth;
      if (req.body?.startDate !== undefined) data.startDate = startDate;
      if (req.body?.endDate !== undefined) data.endDate = endDate;
      if (req.body?.note !== undefined) data.note = typeof req.body.note === 'string' ? req.body.note.trim() || null : null;
      if (req.body?.frequency !== undefined) {
        if (req.body.frequency !== 'MONTHLY') { res.status(400).json({ error: 'frequency must be MONTHLY' }); return; }
        data.frequency = 'MONTHLY';
      }
      if (req.body?.active !== undefined) {
        if (typeof req.body.active !== 'boolean') { res.status(400).json({ error: 'active must be boolean' }); return; }
        data.active = req.body.active;
      }
      const rule = await database.recurringTransaction.update({ where: { id: req.params.id }, data });
      res.json(serializeRule(rule));
    } catch (error) { next(error); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await database.recurringTransaction.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { next(error); }
  });

  return router;
};

export const recurringRouter = createRecurringRouter();
