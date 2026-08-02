import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getSingaporeNow } from '../lib/timezone';

export const getRecurringOccurrence = (current: ReturnType<typeof getSingaporeNow>, dayOfMonth: number) => {
  const effectiveDay = Math.min(dayOfMonth, current.daysInMonth ?? 31);
  return {
    period: current.toFormat('yyyy-MM'),
    effectiveDay,
    occurredAt: current.set({ day: effectiveDay }).startOf('day').toUTC().toJSDate(),
  };
};

export const generateRecurringTransactions = async (now = new Date()) => {
  const current = getSingaporeNow(now);
  const today = current.startOf('day');
  const { period: currentPeriod } = getRecurringOccurrence(current, 1);
  const nowUtc = current.toUTC().toJSDate();
  const todayUtc = today.toUTC().toJSDate();
  const rules = await prisma.recurringTransaction.findMany({
    where: {
      active: true,
      startDate: { lte: nowUtc },
      OR: [{ endDate: null }, { endDate: { gte: todayUtc } }],
    },
    orderBy: { dayOfMonth: 'asc' },
  });
  const generated: Array<{ id: string; recurringId: string; amount: string; period: string }> = [];

  for (const rule of rules) {
    const { effectiveDay, occurredAt } = getRecurringOccurrence(current, rule.dayOfMonth);
    if (current.day < effectiveDay) continue;
    const existing = await prisma.transaction.findFirst({ where: { recurringId: rule.id, generatedForPeriod: currentPeriod }, select: { id: true } });
    if (existing) continue;

    try {
      const transaction = await prisma.transaction.create({
        data: {
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          note: rule.note,
          occurredAt,
          recurringId: rule.id,
          generatedForPeriod: currentPeriod,
        },
      });
      const amount = rule.amount.toString();
      console.log(`Generated recurring transaction rule=${rule.id} amount=${amount} period=${currentPeriod}`);
      generated.push({ id: transaction.id, recurringId: rule.id, amount, period: currentPeriod });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }
  }

  return generated;
};
