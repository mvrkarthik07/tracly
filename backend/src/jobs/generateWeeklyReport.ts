import { prisma } from '../lib/prisma';

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

const startOfMondaySgt = (date: Date): Date => {
  const local = new Date(date.getTime() + SGT_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  const day = local.getUTCDay();
  local.setUTCDate(local.getUTCDate() - (day === 0 ? 6 : day - 1));
  return new Date(local.getTime() - SGT_OFFSET_MS);
};

export const generateWeeklyReport = async (): Promise<unknown> => {
  const currentMonday = startOfMondaySgt(new Date());
  const weekStart = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(currentMonday.getTime() - 1);
  const transactions = await prisma.transaction.findMany({ where: { occurredAt: { gte: weekStart, lte: weekEnd } } });
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map<string, number>();
  for (const transaction of transactions) {
    const amount = Number(transaction.amount.toString());
    if (transaction.type === 'INCOME') totalIncome += amount;
    else { totalExpense += amount; byCategory.set(transaction.category, (byCategory.get(transaction.category) ?? 0) + amount); }
  }
  const categoryData = Array.from(byCategory, ([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount);
  return prisma.weeklyReport.upsert({
    where: { weekStart_weekEnd: { weekStart, weekEnd } },
    create: { weekStart, weekEnd, totalIncome: totalIncome.toFixed(2), totalExpense: totalExpense.toFixed(2), net: (totalIncome - totalExpense).toFixed(2), byCategory: categoryData, topCategory: categoryData[0]?.category ?? null },
    update: { totalIncome: totalIncome.toFixed(2), totalExpense: totalExpense.toFixed(2), net: (totalIncome - totalExpense).toFixed(2), byCategory: categoryData, topCategory: categoryData[0]?.category ?? null, generatedAt: new Date() },
  });
};
