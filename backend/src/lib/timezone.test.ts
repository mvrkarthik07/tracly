import assert from 'node:assert/strict';
import test from 'node:test';
import { getCurrentSingaporeWeekRange, getLastCompletedSingaporeWeekRange } from './timezone';

test('includes Sunday 23:30 SGT in the completed Singapore week', () => {
  const reportGeneratedAt = new Date('2026-08-03T00:30:00+08:00');
  const transactionOccurredAt = new Date('2026-08-02T23:30:00+08:00');
  const nextWeekTransaction = new Date('2026-08-03T00:00:00+08:00');
  const range = getLastCompletedSingaporeWeekRange(reportGeneratedAt);

  assert.ok(transactionOccurredAt >= range.from && transactionOccurredAt <= range.to);
  assert.ok(!(nextWeekTransaction >= range.from && nextWeekTransaction <= range.to));
});

test('analytics current-week range uses the same Singapore Monday boundary', () => {
  const now = new Date('2026-08-02T23:30:00+08:00');
  const transactionOccurredAt = new Date('2026-08-02T23:30:00+08:00');
  const range = getCurrentSingaporeWeekRange(now);

  assert.equal(range.from.toISOString(), '2026-07-26T16:00:00.000Z');
  assert.ok(transactionOccurredAt >= range.from && transactionOccurredAt <= range.to);
});
