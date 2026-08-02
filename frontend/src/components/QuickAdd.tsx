import { FormEvent, useState } from 'react';
import type { NewTransaction, Transaction } from '../api/client';
import { enqueueTransaction } from '../db/offlineQueue';

export class QuickAddError extends Error { constructor(message: string) { super(message); this.name = 'QuickAddError'; } }

export const parseQuickAdd = (input: string): Omit<NewTransaction, 'clientId'> => {
  const trimmed = input.trim();
  const match = trimmed.match(/^([+-]?)(\d+(?:\.\d{1,2})?)\s+([^\s]+)(?:\s+(.+))?$/);
  if (!match) throw new QuickAddError('Use: amount category note — for example, -12.50 food lunch');
  const amount = Number(match[2]);
  if (!Number.isFinite(amount) || amount <= 0) throw new QuickAddError('Enter an amount greater than zero.');
  return { type: match[1] === '+' ? 'INCOME' : 'EXPENSE', amount, category: match[3].toLowerCase(), ...(match[4] ? { note: match[4].trim() } : {}) };
};

type Props = { onOptimistic: (transaction: Transaction) => void; onQueued: () => void };

export function QuickAdd({ onOptimistic, onQueued }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = parseQuickAdd(value);
      const clientId = crypto.randomUUID();
      const occurredAt = new Date().toISOString();
      const payload: NewTransaction = { ...parsed, clientId, occurredAt };
      await enqueueTransaction(payload);
      onOptimistic({ id: `local-${clientId}`, ...payload, amount: payload.amount.toFixed(2), note: payload.note ?? null, occurredAt, createdAt: occurredAt, updatedAt: occurredAt, clientId });
      setValue(''); setError('');
      onQueued();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add transaction.'); }
  };
  return <form className="quick-add" onSubmit={submit}>
    <div className="quick-add-label"><span>QUICK ADD</span><span className="quick-add-hint">offline ready</span></div>
    <div className="quick-add-row"><input aria-label="Add transaction" value={value} onChange={(event) => setValue(event.target.value)} placeholder="-12.50 food lunch with Maya" autoComplete="off" /><button type="submit" aria-label="Add transaction">+</button></div>
    {error && <div className="inline-error">{error}</div>}
  </form>;
}
