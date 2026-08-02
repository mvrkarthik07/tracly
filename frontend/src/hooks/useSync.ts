import { useCallback, useEffect, useState } from 'react';
import { createTransaction, type Transaction } from '../api/client';
import { getPendingTransactions, removeQueuedTransaction, updateQueuedTransaction } from '../db/offlineQueue';

export const useSync = (onSynced: (clientId: string, transaction: Transaction) => void) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const refreshCounts = useCallback(async () => {
    const items = await getPendingTransactions();
    setPendingCount(items.filter((item) => !item.failed).length);
    setFailedCount(items.filter((item) => item.failed).length);
  }, []);
  const flush = useCallback(async () => {
    if (!navigator.onLine) { await refreshCounts(); return; }
    const items = await getPendingTransactions();
    for (const item of items) {
      if (item.failed || item.nextAttemptAt > Date.now()) continue;
      try {
        const transaction = await createTransaction(item.payload);
        await removeQueuedTransaction(item.id);
        onSynced(item.id, transaction);
      } catch {
        const attempts = item.attempts + 1;
        await updateQueuedTransaction(item.id, { attempts, failed: attempts >= 5, nextAttemptAt: Date.now() + Math.min(60_000, 2 ** attempts * 1000) });
      }
    }
    await refreshCounts();
  }, [onSynced, refreshCounts]);
  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => void flush(), 30_000);
    return () => { window.removeEventListener('online', onOnline); window.clearInterval(interval); };
  }, [flush]);
  return { pendingCount, failedCount, flush };
};
