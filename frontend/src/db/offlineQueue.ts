import { createStore, get, set, del } from 'idb-keyval';
import type { NewTransaction } from '../api/client';

export type QueueItem = { id: string; payload: NewTransaction; attempts: number; nextAttemptAt: number; failed?: boolean };
const store = createStore('finance-tracker', 'pending-tx');
const queueKey = 'transactions';

const readQueue = async (): Promise<QueueItem[]> => (await get<QueueItem[]>(queueKey, store)) ?? [];
const writeQueue = (items: QueueItem[]) => set(queueKey, items, store);

export const getPendingTransactions = readQueue;
export const enqueueTransaction = async (payload: NewTransaction): Promise<void> => {
  const queue = await readQueue();
  await writeQueue([...queue, { id: payload.clientId, payload, attempts: 0, nextAttemptAt: 0 }]);
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
