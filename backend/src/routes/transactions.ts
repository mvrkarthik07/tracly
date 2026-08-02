import { Router } from 'express';
import { Prisma, PrismaClient, TxType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CATEGORIES, type Category } from '../constants/categories';

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const isCategory = (value: unknown): value is Category => typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);

export const parseAmount = (value: unknown): Prisma.Decimal | null => {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? new Prisma.Decimal(amount.toFixed(2)) : null;
};

const serializeTransaction = (transaction: Prisma.TransactionGetPayload<{}>) => ({
  ...transaction,
  amount: transaction.amount.toString(),
});

export const createTransactionsRouter = (database: PrismaClient = prisma) => {
  const transactionsRouter = Router();

  transactionsRouter.get('/', async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const queryCategory = typeof req.query.category === 'string' ? req.query.category.trim().toUpperCase() : '';
    const category = isCategory(queryCategory) ? queryCategory : undefined;
    const type = req.query.type === 'INCOME' || req.query.type === 'EXPENSE' ? req.query.type : undefined;
    const transactions = await database.transaction.findMany({
      where: {
        ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(category ? { category } : {}),
        ...(type ? { type: type as TxType } : {}),
      },
      orderBy: { occurredAt: 'desc' },
    });
    res.json(transactions.map(serializeTransaction));
  } catch (error) {
    next(error);
  }
  });

  transactionsRouter.post('/', async (req, res, next) => {
  try {
    const amount = parseAmount(req.body?.amount);
    const type = req.body?.type === 'INCOME' || req.body?.type === 'EXPENSE' ? req.body.type : null;
    const categoryValue = typeof req.body?.category === 'string' ? req.body.category.trim().toUpperCase() : '';
    const category = isCategory(categoryValue) ? categoryValue : null;
    const clientId = typeof req.body?.clientId === 'string' && req.body.clientId.trim() ? req.body.clientId.trim() : null;
    const occurredAt = parseDate(req.body?.occurredAt);
    if (!amount || !type || !category || !clientId) {
      res.status(400).json({ error: 'amount, type, category, and clientId are required; category must be one of the supported categories' });
      return;
    }

    const transaction = await database.transaction.upsert({
      where: { clientId },
      create: {
        amount,
        type,
        category,
        note: typeof req.body.note === 'string' && req.body.note.trim() ? req.body.note.trim() : null,
        ...(occurredAt ? { occurredAt } : {}),
        clientId,
      },
      update: {},
    });
    res.status(201).json(serializeTransaction(transaction));
  } catch (error) {
    next(error);
  }
  });

  transactionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data: Prisma.TransactionUpdateInput = {};
    if (req.body?.amount !== undefined) {
      const amount = parseAmount(req.body.amount);
      if (!amount) { res.status(400).json({ error: 'amount must be a positive number' }); return; }
      data.amount = amount;
    }
    if (req.body?.type !== undefined) {
      if (req.body.type !== 'INCOME' && req.body.type !== 'EXPENSE') { res.status(400).json({ error: 'type must be INCOME or EXPENSE' }); return; }
      data.type = req.body.type;
    }
    if (req.body?.category !== undefined) {
      const categoryValue = typeof req.body.category === 'string' ? req.body.category.trim().toUpperCase() : '';
      if (!isCategory(categoryValue)) { res.status(400).json({ error: 'category must be one of the supported categories' }); return; }
      data.category = categoryValue;
    }
    if (typeof req.body?.note === 'string') data.note = req.body.note.trim() || null;
    const occurredAt = parseDate(req.body?.occurredAt);
    if (req.body?.occurredAt !== undefined && !occurredAt) { res.status(400).json({ error: 'occurredAt must be a valid date' }); return; }
    if (occurredAt) data.occurredAt = occurredAt;
    const transaction = await database.transaction.update({ where: { id: req.params.id }, data });
    res.json(serializeTransaction(transaction));
  } catch (error) {
    next(error);
  }
  });

  transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    await database.transaction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
  });

  return transactionsRouter;
};

export const transactionsRouter = createTransactionsRouter();
