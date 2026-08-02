import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const analyticsRouter = Router();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const money = (value: unknown) => Number(value?.toString?.() ?? value ?? 0);

analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const range = req.query.range === 'month' || req.query.range === 'ytd' ? req.query.range : 'week';
    let from = startOfDay(now);
    if (range === 'week') from.setDate(from.getDate() - 6);
    if (range === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === 'ytd') from = new Date(now.getFullYear(), 0, 1);
    const to = endOfDay(now);
    const transactions = await prisma.transaction.findMany({ where: { occurredAt: { gte: from, lte: to } }, orderBy: { occurredAt: 'asc' } });
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = new Map<string, number>();
    const dailyTotals = new Map<string, { income: number; expense: number }>();
    for (const transaction of transactions) {
      const amount = money(transaction.amount);
      const date = transaction.occurredAt.toISOString().slice(0, 10);
      const day = dailyTotals.get(date) ?? { income: 0, expense: 0 };
      if (transaction.type === 'INCOME') { totalIncome += amount; day.income += amount; }
      else { totalExpense += amount; day.expense += amount; categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + amount); }
      dailyTotals.set(date, day);
    }
    const dailySeries = Array.from(dailyTotals, ([date, values]) => ({ date, income: Number(values.income.toFixed(2)), expense: Number(values.expense.toFixed(2)) }));
    const byCategory = Array.from(categoryTotals, ([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);
    res.json({ totalIncome: Number(totalIncome.toFixed(2)), totalExpense: Number(totalExpense.toFixed(2)), net: Number((totalIncome - totalExpense).toFixed(2)), byCategory, dailySeries });
  } catch (error) {
    next(error);
  }
});
