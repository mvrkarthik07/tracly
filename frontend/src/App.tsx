import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkSession, getTransactions, logout, type Transaction } from './api/client';
import { Dashboard } from './components/Dashboard';
import { LandingScreen } from './components/LandingScreen';
import { useAnalytics } from './hooks/useAnalytics';
import { useSync } from './hooks/useSync';

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const aggregateTransactions = (transactions: Transaction[], from: Date, to: Date) => {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<string, { income: number; expense: number }>();
  for (const transaction of transactions) {
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < from || occurredAt > to) continue;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) continue;
    const date = occurredAt.toISOString().slice(0, 10);
    const daily = dailyTotals.get(date) ?? { income: 0, expense: 0 };
    if (transaction.type === 'INCOME') {
      totalIncome += amount;
      daily.income += amount;
    } else {
      totalExpense += amount;
      daily.expense += amount;
      categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + amount);
    }
    dailyTotals.set(date, daily);
  }
  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    net: Number((totalIncome - totalExpense).toFixed(2)),
    byCategory: Array.from(categoryTotals, ([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount),
    dailySeries: Array.from(dailyTotals, ([date, values]) => ({ date, income: Number(values.income.toFixed(2)), expense: Number(values.expense.toFixed(2)) })),
  };
};

function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (!prompt) return null;
  return <div className="install-prompt"><span>Keep tracly close.</span><button onClick={() => { void prompt.prompt(); setPrompt(null); }}>Install app</button><button className="dismiss" onClick={() => setPrompt(null)}>×</button></div>;
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState('');
  const [serverSummaryReady, setServerSummaryReady] = useState(false);
  const { summary, weekSummary, latestReport, loading: analyticsLoading, refresh: refreshAnalytics } = useAnalytics();
  const replaceSynced = useCallback((clientId: string, transaction: Transaction) => setTransactions((items) => items.map((item) => item.clientId === clientId ? transaction : item)), []);
  const sync = useSync(replaceSynced, authStatus === 'authenticated');

  const refreshDashboard = useCallback(async () => {
    try {
      setTransactions(await getTransactions());
      setLoadError('');
      await refreshAnalytics();
      setServerSummaryReady(true);
    } catch {
      setAuthStatus('unauthenticated');
      setLoadError(navigator.onLine ? 'Unable to load tracly right now. Try again.' : "You're offline and have no local data yet.");
      setServerSummaryReady(false);
    }
  }, [refreshAnalytics]);
  const handleAuthenticated = useCallback(() => {
    setAuthStatus('authenticated');
    void refreshDashboard();
  }, [refreshDashboard]);
  useEffect(() => {
    let active = true;
    void checkSession()
      .then(() => { if (active) handleAuthenticated(); })
      .catch(() => { if (active) setAuthStatus('unauthenticated'); });
    return () => { active = false; };
  }, [handleAuthenticated]);
  const addOptimistic = (transaction: Transaction) => {
    setServerSummaryReady(false);
    setTransactions((items) => [transaction, ...items]);
  };
  const handleLogout = async () => { await logout().catch(() => undefined); setAuthStatus('unauthenticated'); setTransactions([]); };
  const derivedSummaries = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      weekSummary: aggregateTransactions(transactions, weekStart, now),
      summary: aggregateTransactions(transactions, monthStart, now),
    };
  }, [transactions]);
  const displayedSummary = serverSummaryReady ? (summary ?? derivedSummaries.summary) : derivedSummaries.summary;
  const displayedWeekSummary = serverSummaryReady ? (weekSummary ?? derivedSummaries.weekSummary) : derivedSummaries.weekSummary;

  if (authStatus === 'checking') return <div className="loading-screen">Checking session…</div>;
  if (authStatus === 'unauthenticated') return <><LandingScreen initialError={loadError} onLogin={handleAuthenticated} /><InstallPrompt /></>;
  if (analyticsLoading && !summary) return <div className="loading-screen">Opening tracly…</div>;
  return <><Dashboard transactions={transactions} summary={displayedSummary} weekSummary={displayedWeekSummary} report={latestReport} onAdd={addOptimistic} onQueued={() => void sync.flush()} onRefresh={() => void refreshDashboard()} pendingCount={sync.pendingCount} failedCount={sync.failedCount} onLogout={() => void handleLogout()} /><InstallPrompt /></>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>; }
}
