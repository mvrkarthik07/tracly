import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuickAdd } from './quickAddParser.ts';

test('ambiguous quick-add text falls back to OTHER and preserves the note', () => {
  const parsed = parseQuickAdd('-8.20 something completely ambiguous');
  assert.equal(parsed.category, 'OTHER');
  assert.equal(parsed.note, 'something completely ambiguous');
});
