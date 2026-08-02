import { useState } from 'react';
import { deleteTransaction, type AnalyticsSummary, type Transaction, updateTransaction, type WeeklyReport } from '../api/client';
import { CategoryBreakdown } from './CategoryBreakdown';
import { QuickAdd } from './QuickAdd';
import { WeeklyReportCard } from './WeeklyReportCard';

type Props = { transactions: Transaction[]; summary: AnalyticsSummary | null; weekSummary: AnalyticsSummary | null; report: WeeklyReport | null; onAdd: (transaction: Transaction) => void; onQueued: () => void; onRefresh: () => void; pendingCount: number; failedCount: number; onLogout: () => void };

export function Dashboard({ transactions, summary, weekSummary, report, onAdd, onQueued, onRefresh, pendingCount, failedCount, onLogout }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Transaction>>({});
  const startEdit = (transaction: Transaction) => { setEditingId(transaction.id); setDraft(transaction); };
  const saveEdit = async () => { if (!editingId) return; await updateTransaction(editingId, { amount: Number(draft.amount), category: draft.category, note: draft.note ?? '', type: draft.type }); setEditingId(null); onRefresh(); };
  const remove = async (id: string) => { if (!window.confirm('Delete this transaction?')) return; await deleteTransaction(id); onRefresh(); };
  const weekNet = weekSummary?.net ?? 0;
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">↗</span><span>ledger / private</span></div><div className="top-actions"><span className="online-dot" />{navigator.onLine ? 'online' : 'offline'}<button className="text-button" onClick={onLogout}>Lock</button></div></header>
    <div className="content">
      <QuickAdd onOptimistic={onAdd} onQueued={onQueued} />
      <section className="hero"><div><span className="eyebrow">THIS WEEK'S NET</span><h1 className={weekNet >= 0 ? 'positive' : 'negative'}>{weekNet >= 0 ? '+' : '-'}${Math.abs(weekNet).toFixed(2)}</h1><p>{summary ? `${summary.totalIncome.toFixed(2)} in · ${summary.totalExpense.toFixed(2)} out` : 'Loading your numbers…'}</p></div><div className="hero-date">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</div></section>
      {(pendingCount > 0 || failedCount > 0) && <div className="sync-banner">{pendingCount > 0 ? `${pendingCount} transaction${pendingCount === 1 ? '' : 's'} waiting to sync.` : `${failedCount} transaction${failedCount === 1 ? '' : 's'} could not sync after 5 attempts.`}</div>}
      <div className="grid-two"><CategoryBreakdown categories={summary?.byCategory ?? []} /><WeeklyReportCard report={report} /></div>
      <section className="panel transactions-panel"><div className="section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Last 10 transactions</h2></div><button className="text-button" onClick={onRefresh}>Refresh</button></div>{transactions.length === 0 ? <p className="muted">Nothing here yet. Add your first transaction above.</p> : <div className="transactions-list">{transactions.slice(0, 10).map((transaction) => editingId === transaction.id ? <div className="transaction edit-row" key={transaction.id}><input value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /><input className="amount-input" type="number" step="0.01" value={draft.amount ?? ''} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /><input value={draft.note ?? ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /><button className="small-button" onClick={saveEdit}>Save</button><button className="small-button muted-button" onClick={() => setEditingId(null)}>Cancel</button></div> : <button className="transaction" key={transaction.id} onClick={() => startEdit(transaction)}><span className="tx-icon">{transaction.type === 'INCOME' ? '↗' : '↘'}</span><span className="tx-main"><strong>{transaction.category}</strong><small>{transaction.note || new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(transaction.occurredAt))}</small></span><span className={transaction.type === 'INCOME' ? 'positive mono' : 'negative mono'}>{transaction.type === 'INCOME' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}</span><span className="delete-hint" onClick={(e) => { e.stopPropagation(); void remove(transaction.id); }}>×</span></button>)}</div>}</section>
      <footer className="footer">Tap a transaction to edit · data stays yours</footer>
    </div>
  </main>;
}
