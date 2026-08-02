import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsSummary, Transaction, WeeklyReport } from '../api/client';
import { enqueueDeleteTransaction, enqueueUpdateTransaction } from '../db/offlineQueue';
import { CategoryBreakdown } from './CategoryBreakdown';
import { QuickAdd } from './QuickAdd';
import { WeeklyReportCard } from './WeeklyReportCard';
import { WeeklyTrendChart } from './WeeklyTrendChart';
import { RecurringPanel } from './RecurringPanel';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../constants/categories';

const iconPath = 'M 26 74 L 64 36 L 46 36 L 46 20 L 80 20 L 80 54 L 64 54 L 64 36';

type Props = { transactions: Transaction[]; summary: AnalyticsSummary | null; weekSummary: AnalyticsSummary | null; report: WeeklyReport | null; onAdd: (transaction: Transaction) => void; onQueued: () => void; onRefresh: () => void; pendingCount: number; failedCount: number; onLogout: () => void };

export function Dashboard({ transactions, summary, weekSummary, report, onAdd, onQueued, onRefresh, pendingCount, failedCount, onLogout }: Props) {
  const { theme, toggleTheme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Transaction>>({});
  const [editError, setEditError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Transaction>>({});
  const [optimisticDeletes, setOptimisticDeletes] = useState<Set<string>>(new Set());
  const startEdit = (transaction: Transaction) => { setEditingId(transaction.id); setDraft(transaction); setEditError(''); };
  const displayTransactions = useMemo(() => transactions.filter((transaction) => !optimisticDeletes.has(transaction.id)).map((transaction) => optimisticUpdates[transaction.id] ?? transaction), [optimisticDeletes, optimisticUpdates, transactions]);
  useEffect(() => {
    setOptimisticUpdates((updates) => Object.fromEntries(Object.entries(updates).filter(([id, update]) => {
      const current = transactions.find((transaction) => transaction.id === id);
      return !current || current.amount !== update.amount || current.category !== update.category || current.note !== update.note || current.type !== update.type;
    })));
    setOptimisticDeletes((deleted) => new Set([...deleted].filter((id) => transactions.some((transaction) => transaction.id === id))));
  }, [transactions]);
  const saveEdit = async () => {
    if (!editingId) return;
    const amount = Number(draft.amount);
    if (Number.isNaN(amount) || amount <= 0) { setEditError('Enter an amount greater than zero.'); return; }
    const current = transactions.find((transaction) => transaction.id === editingId);
    if (!current) { setEditError('Transaction is no longer available.'); return; }
    const occurredAt = new Date().toISOString();
    const category = draft.category?.trim().toUpperCase() || current.category;
    const payload = { amount, category, note: draft.note ?? '', type: draft.type };
    const optimistic = { ...current, ...payload, amount: amount.toFixed(2), category: payload.category ?? current.category, type: payload.type ?? current.type, note: payload.note ?? null, updatedAt: occurredAt };
    try {
      await enqueueUpdateTransaction(editingId, payload);
      setOptimisticUpdates((updates) => ({ ...updates, [editingId]: optimistic }));
      setEditError('');
      setRowErrors((errors) => ({ ...errors, [editingId]: '' }));
      setEditingId(null);
      onQueued();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not queue this edit.');
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await enqueueDeleteTransaction(id);
      setOptimisticDeletes((deleted) => new Set(deleted).add(id));
      setRowErrors((errors) => ({ ...errors, [id]: '' }));
      if (editingId === id) setEditingId(null);
      onQueued();
    } catch (error) {
      setRowErrors((errors) => ({ ...errors, [id]: error instanceof Error ? error.message : 'Could not queue deletion.' }));
    }
  };
  const weekNet = weekSummary?.net ?? 0;
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><svg viewBox="0 0 100 100" className="brand-mark" width="20" height="20" aria-hidden="true"><path d={iconPath} fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="miter" strokeLinecap="square" /></svg></div><div className="top-actions"><span className="online-dot" />{navigator.onLine ? 'online' : 'offline'}<button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l-1.41-1.41M17.66 6.34l1.41-1.41" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" /></svg>}</button><button className="text-button" onClick={onLogout}>Lock</button></div></header>
    <div className="content">
      <QuickAdd transactions={transactions} onOptimistic={onAdd} onQueued={onQueued} />
      {(pendingCount > 0 || failedCount > 0) && <div className="sync-banner">{pendingCount > 0 ? `${pendingCount} transaction${pendingCount === 1 ? '' : 's'} waiting to sync.` : `${failedCount} transaction${failedCount === 1 ? '' : 's'} could not sync after 5 attempts.`}</div>}
      <div className="top-section"><section className="hero"><div className="hero-glow" aria-hidden="true" /><div className="hero-content"><span className="eyebrow">THIS WEEK'S NET</span><h1 className={weekNet >= 0 ? 'positive' : 'negative'}>{weekNet >= 0 ? '+' : '-'}${Math.abs(weekNet).toFixed(2)}</h1><p>{weekSummary ? `${weekSummary.totalIncome.toFixed(2)} in · ${weekSummary.totalExpense.toFixed(2)} out` : 'Loading your numbers…'}</p></div><div className="hero-date">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</div></section>
      <div className="grid-two chart-grid"><WeeklyTrendChart /><CategoryBreakdown categories={summary?.byCategory ?? []} /></div></div>
      <div className="report-grid"><WeeklyReportCard report={report} /></div>
      <RecurringPanel />
      <section className="panel transactions-panel"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Last 10 transactions</h2></div><button className="text-button" onClick={onRefresh}>Refresh</button></div>{displayTransactions.length === 0 ? <p className="muted">Nothing here yet. Add your first transaction above.</p> : <div className="transactions-list">{displayTransactions.slice(0, 10).map((transaction) => editingId === transaction.id ? <div className="transaction edit-row" key={transaction.id}><select aria-label="Transaction category" value={draft.category ?? transaction.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select><input className="amount-input" aria-label="Transaction amount" type="number" step="0.01" value={draft.amount ?? ''} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /><input className="edit-note" aria-label="Transaction note" value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /><button type="button" className="small-button" onClick={saveEdit}>Save</button><button type="button" className="small-button muted-button" onClick={() => { setEditingId(null); setEditError(''); }}>Cancel</button>{editError && <small className="row-error">{editError}</small>}</div> : <div className="transaction" key={transaction.id} onClick={() => startEdit(transaction)} role="button" tabIndex={0}><span className="tx-icon">{transaction.type === 'INCOME' ? '↗' : '↘'}</span><span className="tx-main"><strong>{transaction.category}</strong><small>{transaction.note || new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(transaction.occurredAt))}</small>{rowErrors[transaction.id] && <small className="row-error">{rowErrors[transaction.id]}</small>}</span><span className={transaction.type === 'INCOME' ? 'positive mono' : 'negative mono'}>{transaction.type === 'INCOME' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}</span><button type="button" className="delete-hint" aria-label="Delete transaction" onClick={(e) => { e.stopPropagation(); void remove(transaction.id); }}>×</button></div>)}</div>}</section>
      <footer className="footer">Tap a transaction to edit · data stays yours</footer>
    </div>
  </main>;
}
