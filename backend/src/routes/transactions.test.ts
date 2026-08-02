import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { Prisma } from '@prisma/client';
import { createTransactionsRouter } from './transactions';

test('POSTing the same clientId twice creates one transaction', async () => {
  const rows: Array<Record<string, unknown>> = [];
  const fakeDatabase = {
    transaction: {
      upsert: async ({ where, create }: { where: { clientId: string }; create: Record<string, unknown> }) => {
        const existing = rows.find((row) => row.clientId === where.clientId);
        if (existing) return existing;
        const row = { id: `tx-${rows.length + 1}`, ...create, amount: new Prisma.Decimal(String(create.amount)), createdAt: new Date(), updatedAt: new Date(), occurredAt: create.occurredAt ?? new Date() };
        rows.push(row);
        return row;
      },
    },
  } as never;
  const app = express();
  app.use(express.json());
  app.use(createTransactionsRouter(fakeDatabase));
  const server = await new Promise<http.Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const payload = { amount: 999999.99, type: 'EXPENSE', category: ' food ', clientId: 'same-client-id' };
  try {
    const first = await fetch(`http://127.0.0.1:${address.port}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const second = await fetch(`http://127.0.0.1:${address.port}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(rows.length, 1);
    assert.equal((await first.json()).amount, '999999.99');
    assert.equal((await second.json()).amount, '999999.99');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
