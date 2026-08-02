import { FormEvent, useEffect, useState } from 'react';
import type { NewTransaction, Transaction } from '../api/client';
import type { Category } from '../constants/categories';
import { CategoryChips } from './CategoryChips';
import { enqueueTransaction } from '../db/offlineQueue';
import { parseQuickAdd, QuickAddError } from '../utils/quickAddParser';

type Props = { transactions: Transaction[]; onOptimistic: (transaction: Transaction) => void; onQueued: () => void };

export function QuickAdd({ transactions, onOptimistic, onQueued }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = parseQuickAdd(value);
      const category = selectedCategory ?? parsed.category;
      const clientId = crypto.randomUUID();
      const occurredAt = new Date().toISOString();
      const payload: NewTransaction = { ...parsed, category, clientId, occurredAt };
      await enqueueTransaction(payload);
      onOptimistic({ id: `local-${clientId}`, ...payload, amount: payload.amount.toFixed(2), note: payload.note ?? null, occurredAt, createdAt: occurredAt, updatedAt: occurredAt, clientId });
      setValue(''); setSelectedCategory(null); setError('');
      onQueued();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add transaction.'); }
  };
  const handleInput = (nextValue: string) => {
    setValue(nextValue);
    try { setSelectedCategory(parseQuickAdd(nextValue).category); } catch { setSelectedCategory(null); }
  };
  return <form className="quick-add" onSubmit={submit}>
    <div className="quick-add-label"><span>QUICK ADD</span><span className="quick-add-status"><span className={`quick-add-status-dot${isOnline ? ' online' : ''}`} aria-hidden="true" />{isOnline ? 'OFFLINE READY' : 'OFFLINE / PENDING'}</span></div>
    <div className="quick-add-row"><input aria-label="Add transaction" value={value} onChange={(event) => handleInput(event.target.value)} placeholder="-12.50 lunch with Maya" autoComplete="off" /><button type="submit" aria-label="Add transaction" disabled={value.trim().length === 0}>+</button></div>
    <CategoryChips transactions={transactions} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
    <div className="quick-add-divider" aria-hidden="true" />
    {error && <div className="inline-error">{error}</div>}
  </form>;
}
