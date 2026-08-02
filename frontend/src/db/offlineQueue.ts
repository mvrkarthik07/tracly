import { createStore, get, set, del } from 'idb-keyval';
import type { NewTransaction } from '../api/client';

export type QueueOperation = 'create' | 'update' | 'delete';
export type QueueItem = {
  id: string;
  operation?: QueueOperation;
  transactionId?: string;
  payload?: NewTransaction | Partial<NewTransaction>;
  attempts: number;
  nextAttemptAt: number;
  failed?: boolean;
};
const store = createStore('finance-tracker', 'pending-tx');
const queueKey = 'transactions';

const readQueue = async (): Promise<QueueItem[]> => (await get<QueueItem[]>(queueKey, store)) ?? [];
const writeQueue = (items: QueueItem[]) => set(queueKey, items, store);

export const getPendingTransactions = readQueue;
export const enqueueTransaction = async (payload: NewTransaction): Promise<void> => {
  const queue = await readQueue();
  await writeQueue([...queue, { id: payload.clientId, operation: 'create', payload, attempts: 0, nextAttemptAt: 0 }]);
};
export const enqueueUpdateTransaction = async (transactionId: string, payload: Partial<NewTransaction>): Promise<void> => {
  const queue = await readQueue();
  await writeQueue([...queue, { id: crypto.randomUUID(), operation: 'update', transactionId, payload, attempts: 0, nextAttemptAt: 0 }]);
};
export const enqueueDeleteTransaction = async (transactionId: string): Promise<void> => {
  const queue = await readQueue();
  await writeQueue([...queue, { id: crypto.randomUUID(), operation: 'delete', transactionId, attempts: 0, nextAttemptAt: 0 }]);
};
export const removeQueuedTransaction = async (id: string): Promise<void> => {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
};
export const updateQueuedTransaction = async (id: string, update: Partial<QueueItem>): Promise<void> => {
  const queue = await readQueue();
  await writeQueue(queue.map((item) => item.id === id ? { ...item, ...update } : item));
};
export const clearQueue = () => del(queueKey, store);
