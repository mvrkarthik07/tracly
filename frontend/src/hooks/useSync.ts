import { useCallback, useEffect, useState } from 'react';
import { createTransaction, deleteTransaction, updateTransaction, type Transaction } from '../api/client';
import { getPendingTransactions, removeQueuedTransaction, updateQueuedTransaction } from '../db/offlineQueue';

export const useSync = (onSynced: (clientId: string, transaction: Transaction) => void, enabled: boolean) => {
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
        const operation = item.operation ?? 'create';
        let transaction: Transaction | undefined;
        if (operation === 'create' && item.payload) {
          transaction = await createTransaction(item.payload as Parameters<typeof createTransaction>[0]);
        } else if (operation === 'update' && item.transactionId && item.payload) {
          transaction = await updateTransaction(item.transactionId, item.payload);
        } else if (operation === 'delete' && item.transactionId) {
          await deleteTransaction(item.transactionId);
        } else {
          throw new Error('Invalid queued transaction operation');
        }
        await removeQueuedTransaction(item.id);
        if (transaction) {
          if (operation === 'create') {
            const localId = `local-${item.id}`;
            await Promise.all(items.filter((queued) => queued.transactionId === localId).map(async (queued) => {
              queued.transactionId = transaction!.id;
              await updateQueuedTransaction(queued.id, { transactionId: transaction!.id });
            }));
          }
          onSynced(operation === 'update' ? item.transactionId! : item.id, transaction);
        }
      } catch {
        const attempts = item.attempts + 1;
        await updateQueuedTransaction(item.id, { attempts, failed: attempts >= 5, nextAttemptAt: Date.now() + Math.min(60_000, 2 ** attempts * 1000) });
      }
    }
    await refreshCounts();
  }, [onSynced, refreshCounts]);
  useEffect(() => {
    if (!enabled) return;
    void flush();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => void flush(), 30_000);
    return () => { window.removeEventListener('online', onOnline); window.clearInterval(interval); };
  }, [enabled, flush]);
  return { pendingCount, failedCount, flush };
};
