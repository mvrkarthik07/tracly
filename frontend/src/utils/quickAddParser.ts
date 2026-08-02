import type { NewTransaction } from '../api/client.ts';
import { CATEGORIES, KEYWORD_MAP, type Category } from '../constants/categories.ts';

export class QuickAddError extends Error { constructor(message: string) { super(message); this.name = 'QuickAddError'; } }

const findCategoryKeyword = (text: string): { category: Category; start: number; end: number } | null => {
  const words = [...text.matchAll(/[A-Za-z0-9]+/g)];
  for (const word of words) {
    const normalized = word[0].toLowerCase();
    const category = CATEGORIES.find((candidate) => KEYWORD_MAP[candidate].includes(normalized));
    if (category) return { category, start: word.index ?? 0, end: (word.index ?? 0) + word[0].length };
  }
  return null;
};

type ParsedQuickAdd = Omit<NewTransaction, 'clientId' | 'category'> & { category: Category };

export const parseQuickAdd = (input: string): ParsedQuickAdd => {
  const trimmed = input.trim();
  const match = trimmed.match(/^([+-]?)(\d+(?:\.\d{1,2})?)\s+(.+)$/);
  if (!match) throw new QuickAddError('Use: amount category note — for example, -12.50 food lunch');
  const amount = Number(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) throw new QuickAddError('Enter an amount greater than zero.');
  const remaining = match[3];
  const matched = findCategoryKeyword(remaining);
  const note = matched ? `${remaining.slice(0, matched.start)}${remaining.slice(matched.end)}`.replace(/\s{2,}/g, ' ').trim() : remaining;
  return { type: match[1] === '+' ? 'INCOME' : 'EXPENSE', amount, category: matched?.category ?? 'OTHER', ...(note ? { note } : {}) };
};
