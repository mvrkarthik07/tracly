import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getTransactions, login, logout, type Transaction } from './api/client';
import { Dashboard } from './components/Dashboard';
import { useAnalytics } from './hooks/useAnalytics';
import { useSync } from './hooks/useSync';

function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (!prompt) return null;
  return <div className="install-prompt"><span>Keep your ledger close.</span><button onClick={() => { void prompt.prompt(); setPrompt(null); }}>Install app</button><button className="dismiss" onClick={() => setPrompt(null)}>×</button></div>;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await login(password); onLogin(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not sign in.'); setLoading(false); }
  };
  return <div className="login-shell"><div className="login-card"><div className="brand large"><span className="brand-mark">↗</span><span>ledger / private</span></div><h1>Your money,<br /><em>quietly clear.</em></h1><p>A focused place to keep track of what comes in and what goes out.</p><form onSubmit={submit}><label htmlFor="password">Passphrase</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /><button className="primary-button" disabled={loading}>{loading ? 'Opening…' : 'Open ledger'}</button>{error && <div className="inline-error">{error}</div>}</form></div></div>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { summary, weekSummary, latestReport, loading: analyticsLoading, refresh: refreshAnalytics } = useAnalytics();
  const replaceSynced = useCallback((clientId: string, transaction: Transaction) => setTransactions((items) => items.map((item) => item.clientId === clientId ? transaction : item)), []);
  const sync = useSync(replaceSynced);

  const refresh = useCallback(async () => {
    try { setTransactions(await getTransactions()); setAuthenticated(true); await refreshAnalytics(); } catch { setAuthenticated(false); }
  }, [refreshAnalytics]);
  useEffect(() => { void refresh(); }, [refresh]);
  const addOptimistic = (transaction: Transaction) => setTransactions((items) => [transaction, ...items]);
  const handleLogout = async () => { await logout().catch(() => undefined); setAuthenticated(false); setTransactions([]); };

  if (!authenticated) return <><LoginScreen onLogin={() => void refresh()} /><InstallPrompt /></>;
  if (analyticsLoading && !summary) return <div className="loading-screen">Opening your ledger…</div>;
  return <><Dashboard transactions={transactions} summary={summary} weekSummary={weekSummary} report={latestReport} onAdd={addOptimistic} onQueued={() => void sync.flush()} onRefresh={() => void refresh()} pendingCount={sync.pendingCount} failedCount={sync.failedCount} onLogout={() => void handleLogout()} /><InstallPrompt /></>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>; }
}
