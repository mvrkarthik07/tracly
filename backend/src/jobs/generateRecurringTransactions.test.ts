import assert from 'node:assert/strict';
import test from 'node:test';
import { DateTime } from 'luxon';
import { getRecurringOccurrence } from './generateRecurringTransactions';

test('clamps day 31 to February 28 in a non-leap year', () => {
  const occurrence = getRecurringOccurrence(DateTime.fromISO('2026-02-28T12:00:00', { zone: 'Asia/Singapore' }), 31);
  assert.equal(occurrence.effectiveDay, 28);
  assert.equal(occurrence.period, '2026-02');
  assert.equal(occurrence.occurredAt.toISOString(), '2026-02-27T16:00:00.000Z');
});

test('clamps day 31 to February 29 in a leap year', () => {
  const occurrence = getRecurringOccurrence(DateTime.fromISO('2028-02-29T12:00:00', { zone: 'Asia/Singapore' }), 31);
  assert.equal(occurrence.effectiveDay, 29);
  assert.equal(occurrence.occurredAt.toISOString(), '2028-02-28T16:00:00.000Z');
});

test('clamps day 31 to April 30', () => {
  const occurrence = getRecurringOccurrence(DateTime.fromISO('2026-04-30T12:00:00', { zone: 'Asia/Singapore' }), 31);
  assert.equal(occurrence.effectiveDay, 30);
  assert.equal(occurrence.period, '2026-04');
  assert.equal(occurrence.occurredAt.toISOString(), '2026-04-29T16:00:00.000Z');
});
