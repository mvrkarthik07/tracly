import { Router } from 'express';
import { Prisma, TxType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const transactionsRouter = Router();

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseAmount = (value: unknown): Prisma.Decimal | null => {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? new Prisma.Decimal(amount.toFixed(2)) : null;
};

const serializeTransaction = (transaction: Prisma.TransactionGetPayload<{}>) => ({
  ...transaction,
  amount: transaction.amount.toString(),
});

transactionsRouter.get('/', async (req, res, next) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : undefined;
    const type = req.query.type === 'INCOME' || req.query.type === 'EXPENSE' ? req.query.type : undefined;
    const transactions = await prisma.transaction.findMany({
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
    const category = typeof req.body?.category === 'string' ? req.body.category.trim().toLowerCase() : '';
    const clientId = typeof req.body?.clientId === 'string' && req.body.clientId.trim() ? req.body.clientId.trim() : null;
    const occurredAt = parseDate(req.body?.occurredAt);
    if (!amount || !type || !category || !clientId) {
      res.status(400).json({ error: 'amount, type, category, and clientId are required' });
      return;
    }

    const transaction = await prisma.transaction.upsert({
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
    if (req.body?.type === 'INCOME' || req.body?.type === 'EXPENSE') data.type = req.body.type;
    if (typeof req.body?.category === 'string' && req.body.category.trim()) data.category = req.body.category.trim().toLowerCase();
    if (typeof req.body?.note === 'string') data.note = req.body.note.trim() || null;
    const occurredAt = parseDate(req.body?.occurredAt);
    if (req.body?.occurredAt !== undefined && !occurredAt) { res.status(400).json({ error: 'occurredAt must be a valid date' }); return; }
    if (occurredAt) data.occurredAt = occurredAt;
    const transaction = await prisma.transaction.update({ where: { id: req.params.id }, data });
    res.json(serializeTransaction(transaction));
  } catch (error) {
    next(error);
  }
});

transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
