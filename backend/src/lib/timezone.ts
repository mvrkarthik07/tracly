import { DateTime } from 'luxon';

export const SINGAPORE_TIMEZONE = 'Asia/Singapore';

export type DateRange = { from: Date; to: Date };

export const getSingaporeNow = (now = new Date()) => DateTime.fromJSDate(now, { zone: SINGAPORE_TIMEZONE });

export const getCurrentSingaporeWeekRange = (now = new Date()): DateRange => {
  const current = getSingaporeNow(now);
  const monday = current.startOf('day').minus({ days: current.weekday - 1 });
  return { from: monday.toUTC().toJSDate(), to: current.endOf('day').toUTC().toJSDate() };
};

export const getCurrentSingaporeCalendarRange = (range: 'month' | 'ytd', now = new Date()): DateRange => {
  const current = getSingaporeNow(now);
  const from = current.startOf(range === 'month' ? 'month' : 'year');
  return { from: from.toUTC().toJSDate(), to: current.endOf('day').toUTC().toJSDate() };
};

export const getLastCompletedSingaporeWeekRange = (now = new Date()): DateRange => {
  const current = getSingaporeNow(now);
  const currentMonday = current.startOf('day').minus({ days: current.weekday - 1 });
  const weekStart = currentMonday.minus({ weeks: 1 });
  const weekEnd = currentMonday.minus({ milliseconds: 1 });
  return { from: weekStart.toUTC().toJSDate(), to: weekEnd.toUTC().toJSDate() };
};
